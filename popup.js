// 获取DOM元素
const classifyTabsBtn = document.getElementById('classifyTabs');
const ungroupAllBtn = document.getElementById('ungroupAll');
const openSettingsBtn = document.getElementById('openSettings');
const status = document.getElementById('status');
const tabCountSpan = document.getElementById('tabCount');
const groupCountSpan = document.getElementById('groupCount');
const groupsInfo = document.getElementById('groupsInfo');

// 预设的API配置
const API_CONFIGS = {
    openai: {
        endpoint: 'https://api.openai.com/v1/chat/completions',
        defaultModel: 'gpt-3.5-turbo'
    },
    anthropic: {
        endpoint: 'https://api.anthropic.com/v1/messages',
        defaultModel: 'claude-3-haiku-20240307'
    },
    deepseek: {
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        defaultModel: 'deepseek-chat'
    },
    gemini: {
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/',
        defaultModel: 'gemini-2.5-flash-lite'
    },
    custom: {
        endpoint: '',
        defaultModel: ''
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    await updateTabCount();
    setupEventListeners();
});

// 设置事件监听
function setupEventListeners() {
    classifyTabsBtn.addEventListener('click', classifyTabs);
    ungroupAllBtn.addEventListener('click', ungroupAll);
    openSettingsBtn.addEventListener('click', openSettings);
}

// 打开设置页面
function openSettings() {
    chrome.runtime.openOptionsPage();
}

// 更新标签页和分组数量
async function updateTabCount() {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    tabCountSpan.textContent = tabs.length;

    // 获取当前窗口的所有分组
    const allTabs = await chrome.tabs.query({ currentWindow: true });
    const currentWindowId = allTabs.length > 0 ? allTabs[0].windowId : undefined;

    if (currentWindowId) {
        const groups = await chrome.tabGroups.query({ windowId: currentWindowId });
        groupCountSpan.textContent = groups.length;
    } else {
        groupCountSpan.textContent = 0;
    }
}

// 分类标签页
async function classifyTabs() {
    classifyTabsBtn.disabled = true;
    showStatus(status, 'info', '正在分类标签页...');
    groupsInfo.innerHTML = '';

    try {
        // 获取配置
        const config = await chrome.storage.sync.get(['apiProvider', 'apiKey', 'apiEndpoint', 'model']);

        if (!config.apiKey) {
            showStatus(status, 'error', '请先配置API Key，点击右上角 ⚙️ 按钮打开设置');
            classifyTabsBtn.disabled = false;
            return;
        }

        // 获取所有标签页
        const tabs = await chrome.tabs.query({ currentWindow: true });

        if (tabs.length === 0) {
            showStatus(status, 'error', '没有找到标签页');
            classifyTabsBtn.disabled = false;
            return;
        }

        // 只获取未分组的标签页 (groupId === -1 表示未分组)
        const ungroupedTabs = tabs.filter(tab => tab.groupId === -1);

        if (ungroupedTabs.length === 0) {
            showStatus(status, 'info', '所有标签页都已经分组，无需再次分类');
            classifyTabsBtn.disabled = false;
            return;
        }

        // 准备标签页信息
        const tabsInfo = ungroupedTabs.map(tab => ({
            id: tab.id,
            title: tab.title,
            url: tab.url
        }));

        // 调用AI进行分类
        const groups = await callAIForClassification(tabsInfo, config);

        console.log('AI返回的分组数据:', groups);

        // 验证返回的数据格式
        if (!groups || !Array.isArray(groups) || groups.length === 0) {
            showStatus(status, 'error', 'AI返回的分组数据格式不正确');
            classifyTabsBtn.disabled = false;
            return;
        }

        // 应用分组
        await applyGroups(groups);

        // 显示分组信息
        displayGroups(groups);

        // 更新统计信息
        await updateTabCount();

        showStatus(status, 'success', `成功分类 ${ungroupedTabs.length} 个标签页到 ${groups.length} 个分组！`);
    } catch (error) {
        console.error('分类失败:', error);
        showStatus(status, 'error', `分类失败: ${error.message}`);
    } finally {
        classifyTabsBtn.disabled = false;
    }
}

// 调用AI API进行分类
async function callAIForClassification(tabs, config) {
    const prompt = `请分析以下浏览器标签页，并将它们按照主题分组。对于每个组，提供一个简洁的中文组名。

标签页列表:
${tabs.map((tab, i) => `${i + 1}. ID: ${tab.id}\n   标题: ${tab.title}\n   URL: ${tab.url}`).join('\n\n')}

请以JSON格式返回结果，格式如下:
{
  "groups": [
    {
      "name": "组名",
      "tabIds": [标签页的ID数字数组，例如: [123, 456, 789]],
      "color": "颜色(grey/blue/red/yellow/green/pink/purple/cyan/orange)"
    }
  ]
}

重要提示：
1. tabIds 必须使用上面列表中提供的实际ID数字
2. 每个标签页只能属于一个分组
3. 根据主题合理分组（如：购物、新闻、开发、娱乐等）
4. 组名要简洁明了（2-4个字）
5. 选择合适的颜色来区分不同主题
6. 只返回JSON，不要有其他文字

示例：如果有ID为123的购物网站和ID为456的电商网站，应该返回：
{
  "groups": [
    {
      "name": "购物",
      "tabIds": [123, 456],
      "color": "red"
    }
  ]
}`;

    let response;

    if (config.apiProvider === 'anthropic') {
        // Anthropic API
        response = await fetch(config.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: config.model,
                max_tokens: 2048,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });
    } else if (config.apiProvider === 'gemini') {
        // Google Gemini API
        const url = `${config.apiEndpoint}${config.model}:generateContent?key=${config.apiKey}`;
        response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });
    } else {
        // OpenAI, DeepSeek or custom API (compatible with OpenAI format)
        response = await fetch(config.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: config.model,
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                temperature: 0.7
            })
        });
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // 提取AI响应内容
    let content;
    if (config.apiProvider === 'anthropic') {
        content = data.content[0].text;
    } else if (config.apiProvider === 'gemini') {
        content = data.candidates[0].content.parts[0].text;
    } else {
        // OpenAI, DeepSeek or custom (OpenAI-compatible)
        content = data.choices[0].message.content;
    }

    // 解析JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('无法从AI响应中提取JSON');
    }

    const result = JSON.parse(jsonMatch[0]);
    return result.groups;
}

// 应用分组
async function applyGroups(groups) {
    const colors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];

    console.log('开始应用分组，共', groups.length, '个分组');

    // 为每个分组创建或更新标签组
    for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        console.log(`处理分组 ${i + 1}:`, group.name, '包含标签:', group.tabIds);

        // 验证标签ID是否有效
        const validTabIds = [];
        for (const tabId of group.tabIds) {
            try {
                const tab = await chrome.tabs.get(tabId);
                validTabIds.push(tabId);
                console.log(`  ✓ 标签 ${tabId} 有效: ${tab.title}`);
            } catch (e) {
                console.warn(`  ✗ 标签 ${tabId} 不存在，跳过`);
            }
        }

        if (validTabIds.length === 0) {
            console.warn(`分组 "${group.name}" 没有有效的标签，跳过`);
            continue;
        }

        const color = colors.includes(group.color) ? group.color : colors[i % colors.length];

        try {
            console.log(`创建分组 "${group.name}"，标签IDs:`, validTabIds, '颜色:', color);

            // 创建标签组（不使用createProperties，让Chrome自动处理）
            const groupId = await chrome.tabs.group({
                tabIds: validTabIds
            });

            console.log(`  → 分组ID: ${groupId}`);

            // 设置组属性
            await chrome.tabGroups.update(groupId, {
                title: group.name,
                color: color,
                collapsed: false  // 默认展开分组
            });

            console.log(`✓ 成功创建分组: ${group.name} (${validTabIds.length} 个标签)`);
        } catch (error) {
            console.error(`✗ 创建分组 "${group.name}" 失败:`, error);
            // 显示更详细的错误信息
            showStatus(status, 'error', `创建分组 "${group.name}" 失败: ${error.message}`);
        }
    }

    console.log('所有分组应用完成');
}

// 显示分组信息
function displayGroups(groups) {
    groupsInfo.innerHTML = '<h3 style="margin-bottom: 12px;">分组详情:</h3>';

    groups.forEach(group => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'group-item';
        groupDiv.innerHTML = `
      <h3>${group.name}</h3>
      <p>${group.tabIds.length} 个标签页</p>
    `;
        groupsInfo.appendChild(groupDiv);
    });
}

// 取消所有分组
async function ungroupAll() {
    try {
        ungroupAllBtn.disabled = true;
        showStatus(status, 'info', '正在取消分组...');

        // 获取当前窗口ID
        const allTabs = await chrome.tabs.query({ currentWindow: true });
        const currentWindowId = allTabs.length > 0 ? allTabs[0].windowId : undefined;

        if (!currentWindowId) {
            showStatus(status, 'error', '无法获取当前窗口');
            ungroupAllBtn.disabled = false;
            return;
        }

        // 使用 tabGroups API 查询所有分组
        const groups = await chrome.tabGroups.query({ windowId: currentWindowId });

        if (groups.length === 0) {
            showStatus(status, 'info', '当前没有分组的标签页');
            ungroupAllBtn.disabled = false;
            return;
        }

        // 获取所有分组中的标签
        const allGroupedTabIds = [];
        for (const group of groups) {
            const tabs = await chrome.tabs.query({ groupId: group.id });
            allGroupedTabIds.push(...tabs.map(tab => tab.id));
        }

        if (allGroupedTabIds.length > 0) {
            await chrome.tabs.ungroup(allGroupedTabIds);
        }

        groupsInfo.innerHTML = '';
        showStatus(status, 'success', `已取消 ${groups.length} 个分组，共 ${allGroupedTabIds.length} 个标签页`);
    } catch (error) {
        console.error('取消分组失败:', error);
        showStatus(status, 'error', `取消分组失败: ${error.message}`);
    } finally {
        ungroupAllBtn.disabled = false;
    }
}

// 获取颜色代码
function getColorCode(colorName) {
    const colorMap = {
        grey: '#5f6368',
        blue: '#1a73e8',
        red: '#d93025',
        yellow: '#f9ab00',
        green: '#34a853',
        pink: '#f538a0',
        purple: '#a142f4',
        cyan: '#24c1e0',
        orange: '#fa903e'
    };
    return colorMap[colorName] || '#5f6368';
}

// 显示状态消息
function showStatus(element, type, message) {
    element.className = `status ${type}`;
    element.textContent = message;
    element.style.display = 'block';

    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

