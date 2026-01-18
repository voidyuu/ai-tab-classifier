// Background Service Worker for AI Tab Classifier
importScripts(
    'core/set-icon-state.js',
    'core/call-AI-for-classification.js',
    'core/apply-groups.js',
    'core/classify-tabs.js',
    'core/ungroup-all.js'
);

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {

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

});

// Handle extension icon click - classify directly
chrome.action.onClicked.addListener(async (tab) => {
    const windowId = tab.windowId;
    await classifyTabs(windowId);
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    const windowId = tab.windowId;
    if (info.menuItemId === 'classifyTabs') {
        await classifyTabs(windowId);
    } else if (info.menuItemId === 'ungroupAll') {
        await ungroupAll(windowId);
    } else if (info.menuItemId === 'openSettings') {
        chrome.runtime.openOptionsPage();
    }
});
