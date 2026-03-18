// content.js
// This script runs in the context of the gravio frontend webpage and bridges communication

// Listen for messages from the popup script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getUserIdFromPage') {
        
        // Setup a listener for the page's response
        const handlePageResponse = (event) => {
            if (event.source !== window || !event.data || event.data.type !== 'PROVIDE_USER_ID') return;
            
            // Cleanup listener
            window.removeEventListener('message', handlePageResponse);
            
            // Send the user ID back to the popup
            sendResponse({ userId: event.data.userId });
        };
        
        window.addEventListener('message', handlePageResponse);

        // Ask the page for the user ID
        window.postMessage({ type: 'REQUEST_USER_ID' }, '*');
        
        return true; // Indicate we will respond asynchronously
    }
});
