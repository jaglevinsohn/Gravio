const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { runSyncForUser } = require('../services/syncJob');

const { getRequestToken, getAccessToken, testSchoologyAuth } = require('../services/schoologyClient');

// An in-memory store for temporary Request Secret tokens. 
// In a real production app, this should be stored in Redis or a DB session.
const tokenCache = {};

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-123';

const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized' });
        req.userId = decoded.userId;
        next();
    });
};

// Step 1: Initialize Login / Get Request Token
router.get('/login', authMiddleware, async (req, res) => {
    try {
        console.log(`Getting Schoology Request Token for user ${req.userId}...`);

        const { token, tokenSecret } = await getRequestToken();

        // Temporarily store the tokenSecret associated with the user so we can use it during the callback
        tokenCache[req.userId] = tokenSecret;

        // Construct the URL to redirect the user to Schoology's authorization page
        // Schoology requires the oauth_token and a return_url
        const returnUrl = encodeURIComponent(`http://localhost:4000/api/schoology/callback?userId=${req.userId}&schoologyToken=${token}`);
        const authorizeUrl = `https://app.schoology.com/oauth/authorize?oauth_token=${token}&return_url=${returnUrl}`;

        // Return the authorize URL to the frontend so it can perform the redirect
        res.json({ authorizeUrl });

    } catch (err) {
        console.error('Schoology Login Init Error:', err.message || err);
        res.status(500).json({ error: 'Failed to initiate Schoology login' });
    }
});

// Step 2: Callback from Schoology / Get Access Token
router.get('/callback', async (req, res) => {
    // Schoology sends the user back to the return_url we provided in Step 1.
    const { userId, schoologyToken } = req.query;

    if (!userId || !schoologyToken) {
        return res.status(400).send('Missing required OAuth parameters');
    }

    try {
        // Retrieve the temporary secret we saved in Step 1
        const requestSecret = tokenCache[userId];
        if (!requestSecret) {
            return res.status(400).send('OAuth session expired or invalid');
        }

        console.log(`Exchanging request token for access token for user ${userId}...`);

        // Exchange the temporary Request Token for a permanent Access Token
        const { token: accessToken, tokenSecret: accessSecret } = await getAccessToken(schoologyToken, requestSecret);

        // --- SUCCESS! ---
        // At this point, we have the user's permanent accessToken and accessSecret.
        // We would save these to the database associated with the user so we can make API calls on their behalf.
        console.log('\n--- SUCCESSFUL SCHOOLOGY AUTHENTICATION ---');
        console.log('Permanent Access Token:', accessToken);
        console.log('Permanent Access Secret:', accessSecret);
        console.log('-------------------------------------------\n');

        // Test the credentials by fetching their profile
        const profile = await testSchoologyAuth(accessToken, accessSecret);
        console.log('Schoology Profile retrieved:', profile.name_display);

        // For the MVP, we just trigger the mock data sync to populate the dashboard
        await runSyncForUser(userId);

        // Clean up the temporary secret
        delete tokenCache[userId];

        // Redirect the user back to their ClearView dashboard
        res.redirect('http://localhost:3000/dashboard');

    } catch (err) {
        console.error('Schoology Callback Error:', err.message || err);
        res.status(500).send('Failed to complete Schoology authentication');
    }
});

router.post('/sync', authMiddleware, async (req, res) => {
    try {
        await runSyncForUser(req.userId);
        res.json({ success: true, message: 'Sync complete' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to sync with Schoology' });
    }
});

module.exports = router;
