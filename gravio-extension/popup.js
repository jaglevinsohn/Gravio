document.getElementById('sync-btn').addEventListener('click', () => {
  const statusEl = document.getElementById('status');
  const btn = document.getElementById('sync-btn');
  
  btn.disabled = true;
  statusEl.textContent = "Extracting session...";
  statusEl.className = "";

// Send a message to the content script in the Gravio tab to get the user ID
  // Chrome match patterns do not support port numbers, so we match all localhost and filter manually
  chrome.tabs.query({url: ["http://localhost/*", "https://*.gravio.us/*", "https://gravio.us/*"]}, function(tabs) {
    if (chrome.runtime.lastError || !tabs) {
      statusEl.textContent = "Please open the Gravio connect page and log in first.";
      statusEl.className = "error";
      btn.disabled = false;
      return;
    }
    
    // Manually filter for port 3000 if it's localhost
    const clearViewTabs = tabs.filter(t => t.url.includes('localhost:3000') || t.url.includes('gravio.us'));
    
    if (clearViewTabs.length === 0) {
      statusEl.textContent = "Please open the Gravio connect page and log in first.";
      statusEl.className = "error";
      btn.disabled = false;
      return;
    }
    
    // Send message to the first matching Gravio tab
    chrome.tabs.sendMessage(clearViewTabs[0].id, {action: "getUserIdFromPage"}, function(response) {
      if (chrome.runtime.lastError || !response || !response.userId) {
        statusEl.textContent = "Please open the Gravio connect page and log in first.";
        statusEl.className = "error";
        btn.disabled = false;
        return;
      }
      
      const userId = response.userId;
      
      // Now send the message to the background script to start the extraction, passing the ID
      chrome.runtime.sendMessage({ action: 'captureSchoologySession', userId: userId }, (bgResponse) => {
        if (chrome.runtime.lastError) {
          statusEl.textContent = "Error communicating with extension background.";
          statusEl.className = "error";
          btn.disabled = false;
          return;
        }

        if (bgResponse && bgResponse.success) {
          statusEl.textContent = "Successfully connected to Gravio!";
          statusEl.className = "success";
          btn.textContent = "Connected";
        } else {
          statusEl.textContent = bgResponse.error || "Failed to capture session.";
          statusEl.className = "error";
          btn.disabled = false;
        }
      });
    });
  });
});
