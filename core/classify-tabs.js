// Main function to classify tabs
async function classifyTabs(windowId) {
    if (!beginIconOperation()) {
        return;
    }

    try {

        // Set icon to loading state
        setIconState('loading');

        // Get configuration
        const config = await chrome.storage.sync.get(['apiProvider', 'apiKey', 'apiEndpoint', 'model']);

        if (!config.apiKey) {
            setIconState('error', 'Please configure API Key in settings');
            chrome.runtime.openOptionsPage();
            scheduleIconIdle();
            return;
        }

        // Check if it's a normal window
        const currentWindow = await chrome.windows.get(windowId);
        if (currentWindow.type !== 'normal') {
            setIconState('error', 'Tab groups only work in normal windows');
            scheduleIconIdle();
            return;
        }

        // Get all tabs
        const tabs = await chrome.tabs.query({ windowId: windowId });

        if (tabs.length === 0) {
            setIconState('error', 'No tabs found');
            scheduleIconIdle();
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


        // Validate returned data format
        if (!groups || !Array.isArray(groups) || groups.length === 0) {
            console.error('Invalid groups format:', groups);
            setIconState('error', 'Invalid group data format from AI');
            scheduleIconIdle();
            return;
        }

        // Re-validate tabs before applying (they might have been closed or grouped during AI processing)
        // Use the same windowId to avoid issues when window loses focus
        const currentTabs = await chrome.tabs.query({ windowId: windowId });

        const validTabIds = new Set(
            currentTabs
                .filter(tab => tab.groupId === -1)
                .map(tab => tab.id)
        );

        // Filter AI results to only include valid tabs
        const filteredGroups = groups
            .map(group => {
                const validIds = group.tabIds.filter(id => validTabIds.has(id));
                return {
                    ...group,
                    tabIds: validIds
                };
            })
            .filter(group => group.tabIds.length > 0);


        if (filteredGroups.length === 0) {
            console.warn('No valid groups after filtering. Original groups:', groups);
            setIconState('error', 'All tabs were closed or grouped during classification');
            scheduleIconIdle();
            return;
        }

        // Apply groups
        await applyGroups(filteredGroups, windowId);

        setIconState('success', `Successfully classified tabs into ${filteredGroups.length} groups!`);
        scheduleIconIdle();
    } catch (error) {
        console.error('Classification failed:', error);
        setIconState('error', `Classification failed: ${error.message}`);
        scheduleIconIdle();
    } finally {
        endIconOperation();
    }
}