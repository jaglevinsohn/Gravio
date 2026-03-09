const crypto = require('crypto');
const OAuth = require('oauth-1.0a');

/**
 * Attempts to authenticate with the Schoology API using the provided credentials
 * and fetches the user's profile information.
 * 
 * @param {string} key - Schoology API Key
 * @param {string} secret - Schoology API Secret
 * @returns {Promise<Object>} - The Schoology user profile JSON
 */
async function testSchoologyAuth(key, secret) {
    const oauth = OAuth({
        consumer: { key: key, secret: secret },
        signature_method: 'HMAC-SHA1',
        hash_function(base_string, key) {
            return crypto
                .createHmac('sha1', key)
                .update(base_string)
                .digest('base64');
        },
    });

    const request_data = {
        url: 'https://api.schoology.com/v1/users/me',
        method: 'GET',
    };

    // Get the OAuth headers
    const authHeaders = oauth.toHeader(oauth.authorize(request_data));

    // Make the request using the Fetch API (native in Node.js 18+)
    const response = await fetch(request_data.url, {
        method: request_data.method,
        headers: {
            ...authHeaders,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Schoology API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
}

module.exports = {
    testSchoologyAuth,
};
