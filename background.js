// Background Service Worker for AI Tab Classifier

// 监听扩展安装
chrome.runtime.onInstalled.addListener(() => {
    console.log('AI Tab Classifier 已安装');

    // 创建右键菜单
    chrome.contextMenus.create({
        id: 'classifyTabs',
        title: '🎯 AI分类标签页',
        contexts: ['action']
    });

    chrome.contextMenus.create({
        id: 'ungroupAll',
        title: '📋 取消所有分组',
        contexts: ['action']
    });

    chrome.contextMenus.create({
        id: 'openSettings',
        title: '⚙️ 打开设置',
        contexts: ['action']
    });
});

// 处理扩展图标点击 - 直接分类
chrome.action.onClicked.addListener(async (tab) => {
    await classifyTabs();
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'classifyTabs') {
        await classifyTabs();
    } else if (info.menuItemId === 'ungroupAll') {
        await ungroupAll();
    } else if (info.menuItemId === 'openSettings') {
        chrome.runtime.openOptionsPage();
    }
});

// 分类标签页的主函数
async function classifyTabs() {
    try {
        console.log('开始分类标签页...');

        // 设置图标为加载状态
        setIconState('loading');

        // 获取配置
        const config = await chrome.storage.sync.get(['apiProvider', 'apiKey', 'apiEndpoint', 'model']);

        if (!config.apiKey) {
            setIconState('error', '请先在设置中配置API Key');
            chrome.runtime.openOptionsPage();
            setTimeout(() => setIconState('idle'), 3000);
            return;
        }

        // 获取所有标签页
        const tabs = await chrome.tabs.query({ currentWindow: true });

        if (tabs.length === 0) {
            setIconState('error', '没有找到标签页');
            setTimeout(() => setIconState('idle'), 3000);
            return;
        }

        // 只获取未分组的标签页 (groupId === -1 表示未分组)
        const ungroupedTabs = tabs.filter(tab => tab.groupId === -1);

        if (ungroupedTabs.length === 0) {
            setIconState('idle', '所有标签页都已经分组');
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
            setIconState('error', 'AI返回的分组数据格式不正确');
            setTimeout(() => setIconState('idle'), 3000);
            return;
        }

        // 应用分组
        await applyGroups(groups);

        setIconState('success', `成功分类 ${ungroupedTabs.length} 个标签页到 ${groups.length} 个分组！`);
        setTimeout(() => setIconState('idle'), 3000);
    } catch (error) {
        console.error('分类失败:', error);
        setIconState('error', `分类失败: ${error.message}`);
        setTimeout(() => setIconState('idle'), 3000);
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

            // 创建标签组
            const groupId = await chrome.tabs.group({
                tabIds: validTabIds
            });

            console.log(`  → 分组ID: ${groupId}`);

            // 设置组属性
            await chrome.tabGroups.update(groupId, {
                title: group.name,
                color: color,
                collapsed: false
            });

            console.log(`✓ 成功创建分组: ${group.name} (${validTabIds.length} 个标签)`);
        } catch (error) {
            console.error(`✗ 创建分组 "${group.name}" 失败:`, error);
        }
    }

    console.log('所有分组应用完成');
}

// 取消所有分组
async function ungroupAll() {
    try {
        console.log('开始取消所有分组...');

        setIconState('loading');

        // 获取当前窗口ID
        const allTabs = await chrome.tabs.query({ currentWindow: true });
        const currentWindowId = allTabs.length > 0 ? allTabs[0].windowId : undefined;

        if (!currentWindowId) {
            setIconState('error', '无法获取当前窗口');
            setTimeout(() => setIconState('idle'), 3000);
            return;
        }

        // 使用 tabGroups API 查询所有分组
        const groups = await chrome.tabGroups.query({ windowId: currentWindowId });

        if (groups.length === 0) {
            setIconState('idle', '当前没有分组的标签页');
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

        setIconState('success', `已取消 ${groups.length} 个分组，共 ${allGroupedTabIds.length} 个标签页`);
        setTimeout(() => setIconState('idle'), 3000);
    } catch (error) {
        console.error('取消分组失败:', error);
        setIconState('error', `取消分组失败: ${error.message}`);
        setTimeout(() => setIconState('idle'), 3000);
    }
}

// 设置图标状态
function setIconState(state, title = '') {
    const defaultTitle = '点击开始AI分类标签页';

    switch (state) {
        case 'loading':
            // 加载中 - 使用badge显示
            chrome.action.setBadgeText({ text: '...' });
            chrome.action.setBadgeBackgroundColor({ color: '#1a73e8' });
            chrome.action.setTitle({ title: title || '正在处理...' });
            break;

        case 'success':
            // 成功 - 绿色badge
            chrome.action.setBadgeText({ text: '✓' });
            chrome.action.setBadgeBackgroundColor({ color: '#34a853' });
            chrome.action.setTitle({ title: title || '操作成功' });
            break;

        case 'error':
            // 错误 - 红色badge
            chrome.action.setBadgeText({ text: '✗' });
            chrome.action.setBadgeBackgroundColor({ color: '#ea4335' });
            chrome.action.setTitle({ title: title || '操作失败' });
            break;

        case 'idle':
        default:
            // 空闲 - 清除badge
            chrome.action.setBadgeText({ text: '' });
            chrome.action.setTitle({ title: title || defaultTitle });
            break;
    }
}
