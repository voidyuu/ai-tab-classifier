// Background Service Worker for AI Tab Classifier

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('AI Tab Classifier installed');

    // Create context menus
    chrome.contextMenus.create({
        id: 'classifyTabs',
        title: '🎯 Classify Tabs with AI',
        contexts: ['action']
    });

    chrome.contextMenus.create({
        id: 'ungroupAll',
        title: '📋 Ungroup All Tabs',
        contexts: ['action']
    });

    chrome.contextMenus.create({
        id: 'openSettings',
        title: '⚙️ Settings',
        contexts: ['action']
    });
});

// Handle extension icon click - classify directly
chrome.action.onClicked.addListener(async (tab) => {
    await classifyTabs();
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'classifyTabs') {
        await classifyTabs();
    } else if (info.menuItemId === 'ungroupAll') {
        await ungroupAll();
    } else if (info.menuItemId === 'openSettings') {
        chrome.runtime.openOptionsPage();
    }
});

// Main function to classify tabs
async function classifyTabs() {
    try {
        console.log('Starting tab classification...');

        // Set icon to loading state
        setIconState('loading');

        // Get configuration
        const config = await chrome.storage.sync.get(['apiProvider', 'apiKey', 'apiEndpoint', 'model']);

        if (!config.apiKey) {
            setIconState('error', 'Please configure API Key in settings');
            chrome.runtime.openOptionsPage();
            setTimeout(() => setIconState('idle'), 3000);
            return;
        }

        // Get all tabs
        const tabs = await chrome.tabs.query({ currentWindow: true });

        if (tabs.length === 0) {
            setIconState('error', 'No tabs found');
            setTimeout(() => setIconState('idle'), 3000);
            return;
        }

        // Get only ungrouped tabs (groupId === -1 means ungrouped)
        const ungroupedTabs = tabs.filter(tab => tab.groupId === -1);

        if (ungroupedTabs.length === 0) {
            setIconState('idle', 'All tabs are already grouped');
            return;
        }

        // Prepare tab information
        const tabsInfo = ungroupedTabs.map(tab => ({
            id: tab.id,
            title: tab.title,
            url: tab.url
        }));

        // Call AI for classification
        const groups = await callAIForClassification(tabsInfo, config);

        console.log('AI returned group data:', groups);

        // Validate returned data format
        if (!groups || !Array.isArray(groups) || groups.length === 0) {
            setIconState('error', 'Invalid group data format from AI');
            setTimeout(() => setIconState('idle'), 3000);
            return;
        }

        // Apply groups
        await applyGroups(groups);

        setIconState('success', `Successfully classified ${ungroupedTabs.length} tabs into ${groups.length} groups!`);
        setTimeout(() => setIconState('idle'), 3000);
    } catch (error) {
        console.error('Classification failed:', error);
        setIconState('error', `Classification failed: ${error.message}`);
        setTimeout(() => setIconState('idle'), 3000);
    }
}

// Call AI API for classification
async function callAIForClassification(tabs, config) {
    const prompt = `Analyze the following browser tabs and group them by theme. Provide a concise group name for each group.

Tab list:
${tabs.map((tab, i) => `${i + 1}. ID: ${tab.id}\n   Title: ${tab.title}\n   URL: ${tab.url}`).join('\n\n')}

Return the result in JSON format as follows:
{
  "groups": [
    {
      "name": "Group Name",
      "tabIds": [Array of tab ID numbers, e.g.: [123, 456, 789]],
      "color": "Color (grey/blue/red/yellow/green/pink/purple/cyan/orange)"
    }
  ]
}

Important notes:
1. tabIds must use the actual ID numbers from the list above
2. Each tab can only belong to one group
3. Group by theme reasonably (e.g.: Shopping, News, Development, Entertainment, etc.)
4. Group names should be concise (2-4 words)
5. Choose appropriate colors to distinguish different themes
6. Return only JSON, no other text

Example: If there are shopping sites with IDs 123 and 456, return:
{
  "groups": [
    {
      "name": "Shopping",
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
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Extract AI response content
    let content;
    if (config.apiProvider === 'anthropic') {
        content = data.content[0].text;
    } else if (config.apiProvider === 'gemini') {
        content = data.candidates[0].content.parts[0].text;
    } else {
        // OpenAI, DeepSeek or custom (OpenAI-compatible)
        content = data.choices[0].message.content;
    }

    // Parse JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Unable to extract JSON from AI response');
    }

    const result = JSON.parse(jsonMatch[0]);
    return result.groups;
}

// Apply groups
async function applyGroups(groups) {
    const colors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];

    console.log('Starting to apply groups, total:', groups.length, 'groups');

    // Create or update tab groups for each group
    for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        console.log(`Processing group ${i + 1}:`, group.name, 'includes tabs:', group.tabIds);

        // Validate tab IDsab IDs
        const validTabIds = [];
        for (const tabId of group.tabIds) {
            try {
                const tab = await chrome.tabs.get(tabId);
                validTabIds.push(tabId);
                console.log(`  ✓ Tab ${tabId} valid: ${tab.title}`);
            } catch (e) {
                console.warn(`  ✗ Tab ${tabId} does not exist, skipping`);
            }
        }

        if (validTabIds.length === 0) {
            console.warn(`Group "${group.name}" has no valid tabs, skipping`);
            continue;
        }

        const color = colors.includes(group.color) ? group.color : colors[i % colors.length];

        try {
            console.log(`Creating group "${group.name}", tab IDs:`, validTabIds, 'color:', color);

            // Create tab group
            const groupId = await chrome.tabs.group({
                tabIds: validTabIds
            });

            console.log(`  → Group ID: ${groupId}`);

            // Set group properties
            await chrome.tabGroups.update(groupId, {
                title: group.name,
                color: color,
                collapsed: false
            });

            console.log(`✓ Successfully created group: ${group.name} (${validTabIds.length} tabs)`);
        } catch (error) {
            console.error(`✗ Failed to create group "${group.name}":`, error);
        }
    }

    console.log('All groups applied successfully');
}

// Ungroup all tabs
async function ungroupAll() {
    try {
        console.log('Starting to ungroup all tabs...');

        setIconState('loading');

        // Get current window ID
        const allTabs = await chrome.tabs.query({ currentWindow: true });
        const currentWindowId = allTabs.length > 0 ? allTabs[0].windowId : undefined;

        if (!currentWindowId) {
            setIconState('error', 'Unable to get current window');
            setTimeout(() => setIconState('idle'), 3000);
            return;
        }

        // Query all groups using tabGroups API
        const groups = await chrome.tabGroups.query({ windowId: currentWindowId });

        if (groups.length === 0) {
            setIconState('idle', 'No grouped tabs currently');
            return;
        }

        // Get all tabs in groups
        const allGroupedTabIds = [];
        for (const group of groups) {
            const tabs = await chrome.tabs.query({ groupId: group.id });
            allGroupedTabIds.push(...tabs.map(tab => tab.id));
        }

        if (allGroupedTabIds.length > 0) {
            await chrome.tabs.ungroup(allGroupedTabIds);
        }

        setIconState('success', `Ungrouped ${groups.length} groups, ${allGroupedTabIds.length} tabs total`);
        setTimeout(() => setIconState('idle'), 3000);
    } catch (error) {
        console.error('Ungroup failed:', error);
        setIconState('error', `Ungroup failed: ${error.message}`);
        setTimeout(() => setIconState('idle'), 3000);
    }
}

// Set icon state
function setIconState(state, title = '') {
    const defaultTitle = 'Click to classify tabs with AI';

    switch (state) {
        case 'loading':
            // Loading - display badge
            chrome.action.setBadgeText({ text: '...' });
            chrome.action.setBadgeBackgroundColor({ color: '#1a73e8' });
            chrome.action.setTitle({ title: title || 'Processing...' });
            break;

        case 'success':
            // Success - green badge
            chrome.action.setBadgeText({ text: '✓' });
            chrome.action.setBadgeBackgroundColor({ color: '#34a853' });
            chrome.action.setTitle({ title: title || 'Operation successful' });
            break;

        case 'error':
            // Error - red badge
            chrome.action.setBadgeText({ text: '✗' });
            chrome.action.setBadgeBackgroundColor({ color: '#ea4335' });
            chrome.action.setTitle({ title: title || 'Operation failed' });
            break;

        case 'idle':
        default:
            // Idle - clear badge
            chrome.action.setBadgeText({ text: '' });
            chrome.action.setTitle({ title: title || defaultTitle });
            break;
    }
}
