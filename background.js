// Background Service Worker for AI Tab Classifier

// 监听扩展安装
chrome.runtime.onInstalled.addListener(() => {
    console.log('AI Tab Classifier 已安装');

    // 创建右键菜单（如果支持）
    if (chrome.contextMenus) {
        chrome.contextMenus.create({
            id: 'classifyCurrentTabs',
            title: '🤖 AI分类当前标签页',
            contexts: ['page']
        });
    }
});

// 处理右键菜单点击（如果支持）
if (chrome.contextMenus) {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (info.menuItemId === 'classifyCurrentTabs') {
            // 打开popup（注意：chrome.action.openPopup() 可能不被支持）
            chrome.action.openPopup();
        }
    });
}

// 监听来自popup的消息（如果需要）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'classifyTabs') {
        sendResponse({ success: true, data: { status: 'completed' } });
        return true;
    }
});
