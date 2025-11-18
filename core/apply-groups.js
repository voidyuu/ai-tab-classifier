// Apply groups
async function applyGroups(groups, windowId) {
    const colors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];


    // Create or update tab groups for each group
    for (let i = 0; i < groups.length; i++) {
        const group = groups[i];

        // Validate each tab belongs to the target window
        const validTabIds = [];

        for (const tabId of group.tabIds) {
            try {
                const tab = await chrome.tabs.get(tabId);

                // Only include tabs in the target window
                if (tab.windowId === windowId) {
                    validTabIds.push(tabId);
                } else {
                    console.warn(`  ✗ Tab ${tabId} is in different window (${tab.windowId} vs ${windowId}), skipping`);
                }
            } catch (e) {
                console.warn(`  ✗ Tab ${tabId} does not exist, skipping`);
            }
        }

        if (validTabIds.length === 0) {
            console.warn(`Group "${group.name}" has no valid tabs in window ${windowId}, skipping`);
            continue;
        }

        const color = colors.includes(group.color) ? group.color : colors[i % colors.length];

        try {

            // Create tab group
            const groupId = await chrome.tabs.group({
                tabIds: validTabIds,
                createProperties: {
                    windowId: windowId
                }
            });


            // Set group properties
            await chrome.tabGroups.update(groupId, {
                title: group.name,
                color: color,
                collapsed: false
            });

        } catch (error) {
            console.error(`✗ Failed to create group "${group.name}":`, error);
        }
    }

}
