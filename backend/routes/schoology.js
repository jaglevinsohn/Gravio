const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { runSyncForUser } = require('../services/syncJob');

const { testSchoologyAuth } = require('../services/schoologyClient');

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

router.post('/connect', authMiddleware, async (req, res) => {
    const { apiKey, apiSecret } = req.body;

    try {
        // Test genuine Schoology API credentials
        console.log(`Testing Schoology API auth for user ID ${req.userId}...`);
        const schoologyUser = await testSchoologyAuth(apiKey, apiSecret);

        console.log('\n--- SUCCESSFUL SCHOOLOGY AUTHENTICATION ---');
        console.log('Real Schoology Profile Retrieved:');
        console.log(JSON.stringify(schoologyUser, null, 2));
        console.log('-------------------------------------------\n');

        // Proceed to seed the mock data so the dashboard still loads for the MVP
        await runSyncForUser(req.userId);
        res.json({ success: true, message: 'Schoology account connected successfully', schoologyUser });
    } catch (err) {
        console.error('Schoology Auth Error:', err.message || err);
        res.status(500).json({ error: 'Failed to authenticate with Schoology API: ' + (err.message || 'Unknown error') });
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
