const crypto = require('crypto');
const OAuth = require('oauth-1.0a');

// App Consumer Keys from the .env file
const CONSUMER_KEY = process.env.SCHOOLOGY_CONSUMER_KEY || '';
const CONSUMER_SECRET = process.env.SCHOOLOGY_CONSUMER_SECRET || '';

// Base OAuth configuration used for all Schoology API requests
const oauth = OAuth({
    consumer: { key: CONSUMER_KEY, secret: CONSUMER_SECRET },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
        return crypto
            .createHmac('sha1', key)
            .update(base_string)
            .digest('base64');
    },
});

/**
 * Step 1: Get a temporary Request Token from Schoology.
 * @returns {Promise<{token: string, tokenSecret: string}>}
 */
async function getRequestToken() {
    const request_data = {
        url: 'https://api.schoology.com/v1/oauth/request_token',
        method: 'GET',
    };

    const authHeaders = oauth.toHeader(oauth.authorize(request_data));

    const response = await fetch(request_data.url, {
        method: request_data.method,
        headers: {
            ...authHeaders,
            'Accept': 'application/json'
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to get request token: ${await response.text()}`);
    }

    // Schoology returns a form-urlencoded string (oauth_token=xxx&oauth_token_secret=yyy)
    const data = await response.text();
    const params = new URLSearchParams(data);

    return {
        token: params.get('oauth_token'),
        tokenSecret: params.get('oauth_token_secret')
    };
}

/**
 * Step 3: Exchange the authorized Request Token for a permanent Access Token.
 * @param {string} requestToken - The temporary token authorized by the user
 * @param {string} requestSecret - The temporary secret saved from Step 1
 * @returns {Promise<{token: string, tokenSecret: string}>}
 */
async function getAccessToken(requestToken, requestSecret) {
    const request_data = {
        url: 'https://api.schoology.com/v1/oauth/access_token',
        method: 'GET',
    };

    // For this step, we must sign the request identifying the specific temporary token
    const tokenOptions = {
        key: requestToken,
        secret: requestSecret
    };

    const authHeaders = oauth.toHeader(oauth.authorize(request_data, tokenOptions));

    const response = await fetch(request_data.url, {
        method: request_data.method,
        headers: {
            ...authHeaders,
            'Accept': 'application/json'
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to get access token: ${await response.text()}`);
    }

    const data = await response.text();
    const params = new URLSearchParams(data);

    return {
        token: params.get('oauth_token'),
        tokenSecret: params.get('oauth_token_secret')
    };
}

/**
 * Makes an authenticated request to the Schoology API using the user's permanent Access Token.
 * 
 * @param {string} userToken - The user's specific OAuth token
 * @param {string} userSecret - The user's specific OAuth token secret
 * @returns {Promise<Object>} - The Schoology user profile JSON
 */
async function testSchoologyAuth(userToken, userSecret) {
    const request_data = {
        url: 'https://api.schoology.com/v1/users/me',
        method: 'GET',
    };

    // Sign the request identifying the specific user token
    const tokenOptions = {
        key: userToken,
        secret: userSecret
    };

    // Get the OAuth headers
    const authHeaders = oauth.toHeader(oauth.authorize(request_data, tokenOptions));

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
    getRequestToken,
    getAccessToken,
    testSchoologyAuth,
};
