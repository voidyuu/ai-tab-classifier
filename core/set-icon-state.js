// Set icon state
function setIconState(state, title = '') {
    const defaultTitle = 'Click to classify tabs with AI';
    const notificationTitle = 'AI Tab Classifier';

    function showErrorNotification(message) {
        if (!chrome.notifications) {
            return;
        }

        chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon128.png'),
            title: notificationTitle,
            message: message || 'An unexpected error occurred.'
        });
    }

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
            showErrorNotification(title || 'Operation failed');
            break;

        case 'idle':
        default:
            // Idle - clear badge
            chrome.action.setBadgeText({ text: '' });
            chrome.action.setTitle({ title: title || defaultTitle });
            break;
    }
}