document.getElementById('startButton').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (!tabs || tabs.length === 0) {
            console.error('No active tab found');
            return;
        }

        let activeTabId = tabs[0].id;

        // Send a message to content.js to start the camera
        chrome.tabs.sendMessage(activeTabId, { action: "startCamera" });
    });
});
