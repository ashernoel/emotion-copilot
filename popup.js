document.getElementById('startButton').addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (!tabs || tabs.length === 0) {
            console.error('No active tab found');
            return;
        }

        let activeTabId = tabs[0].id;

        chrome.scripting.executeScript({
            target: { tabId: activeTabId },
            files: ['content.js']
        });
    });
});
