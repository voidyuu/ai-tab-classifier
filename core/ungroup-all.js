// Ungroup all tabs
async function ungroupAll(windowId) {
    try {

        setIconState('loading');

        // Check if it's a normal window
        const currentWindow = await chrome.windows.get(windowId);
        if (currentWindow.type !== 'normal') {
            setIconState('error', 'Tab groups only work in normal windows');
            setTimeout(() => setIconState('idle'), 3000);
            return;
        }

        // Query all groups using tabGroups API
        const groups = await chrome.tabGroups.query({ windowId: windowId });

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