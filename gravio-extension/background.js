chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureSchoologySession') {
    handleSessionCapture(request.userId, sendResponse);
    return true; // Indicates async response
  }
});

async function handleSessionCapture(userId, sendResponse) {
  try {
    // Grab all cookies and filter for schoology and google to properly bypass SSO 
    const allCookies = await chrome.cookies.getAll({});
    const cookies = allCookies.filter(c => 
      c.domain.includes("schoology") || c.domain.includes("google.com")
    );
    
    // Transform chrome cookies into standard Playwright/FastAPI expected cookie format
    // (Playwright expects: name, value, domain, path, expires, httpOnly, secure, sameSite)
    const formattedCookies = cookies.map(cookie => {
      // Chrome extension API has a `hostOnly` flag we don't need for Playwright,
      // and renames `expirationDate` to `expires`.
      let parsedSameSite = "Lax";
      if (cookie.sameSite === "no_restriction") parsedSameSite = "None";
      else if (cookie.sameSite === "strict") parsedSameSite = "Strict";
      else if (cookie.sameSite === "lax") parsedSameSite = "Lax";

      const formatted = {
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: parsedSameSite
      };
      
      if (cookie.expirationDate) {
        // Playwright accepts UNIX time in seconds
        formatted.expires = cookie.expirationDate;
      }
      return formatted;
    });

    // Check if the SESS cookie (or main auth cookie) is present
    // Schoology typically uses SESS followed by a unique string for logged-in sessions
    const hasSessCookie = cookies.some(c => c.name.startsWith('SESS'));
    
    const hasSchoologyCookie = cookies.some(c => c.domain.includes('schoology'));

    if (!hasSchoologyCookie) {
         sendResponse({ 
            success: false, 
            error: "No Schoology cookies found. Please log into Schoology first." 
        });
        return;
    }
    
    // Send cookies to the Python Backend
    console.log("Found cookies, sending to backend:", formattedCookies.length);
    
    const response = await fetch('https://gravio-backend.onrender.com/api/connect-schoology-extension', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        cookies: formattedCookies
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error:", errorText);
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("Backend response:", data);
    
    sendResponse({ success: true, count: formattedCookies.length });

  } catch (err) {
    console.error("Error capturing session:", err);
    sendResponse({ success: false, error: err.message });
  }
}
