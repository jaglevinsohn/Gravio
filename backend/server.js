require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// MOCK STATE for MVP: Store connection status in memory
let mockConnectionStatus = {
  connected: false,
  sync_status: 'idle', // 'idle', 'validating', 'syncing_courses', 'syncing_assignments', 'syncing', 'success', 'failed'
  stats: {
    courses_imported: 0,
    assignments_imported: 0,
    grades_imported: 0,
    error: null
  }
};

// Routes
app.post('/api/connect-schoology-extension', (req, res) => {
  console.log('Received Schoology extension connection request.');
  const { user_id, cookies } = req.body;
  
  if (!cookies || !Array.isArray(cookies) || cookies.length === 0) {
    return res.status(400).json({ error: 'No cookies provided' });
  }

  console.log(`Received ${cookies.length} cookies from extension for user ${user_id}.`);
  
  // Update mock state to simulate a successful connection and sync
  mockConnectionStatus = {
    connected: true,
    sync_status: 'success', 
    stats: {
      courses_imported: 5,
      assignments_imported: 42,
      grades_imported: 42,
      error: null
    }
  };
  
  res.json({ success: true, message: 'Cookies received successfully' });
});

app.get('/api/check-connection', (req, res) => {
  console.log('Check connection requested by frontend.');
  res.json(mockConnectionStatus);
});

app.use('/api/schoology', require('./routes/schoology'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
