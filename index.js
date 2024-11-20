const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const cors = require('cors');
const User = require('./models/User'); // Ensure this model has a role field
require('dotenv').config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware
app.use(bodyParser.json());
app.use(cors({ origin: '*' }));

// MongoDB Connection
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// In-memory storage for logs
let logs = [];

// Define the duration for log retention (2 days in milliseconds)
const LOG_RETENTION_PERIOD = 2 * 24 * 60 * 60 * 1000; // 2 days in ms

// Function to clean up old logs
function cleanOldLogs() {
    const currentTime = Date.now();
    logs = logs.filter(log => (currentTime - log.timestamp) <= LOG_RETENTION_PERIOD);
}

// Call the cleanup function every hour
setInterval(cleanOldLogs, 60 * 60 * 1000);

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Check if user is admin before issuing a token
        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Admins only.' });
        }

        // Create a token with user role
        const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Middleware to authenticate JWT
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                return res.sendStatus(403); // Invalid token
            }

            req.user = user; // Attach decoded user info to request
            next();
        });
    } else {
        res.sendStatus(401); // No token provided
    }
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.user.role === 'admin') {
        next(); // User is admin, proceed to the next middleware/route handler
    } else {
        res.sendStatus(403); // Forbidden for non-admin users
    }
};

// Endpoint to receive logs from authenticated clients
app.post('/api/logs', authenticateJWT, (req, res) => {
    const { serviceName, host, clientId, logText } = req.body;

    if (!serviceName || !host || !clientId || !logText) {
        return res.status(400).json({
            error: 'Missing required fields: serviceName, host, clientId, and logText are required.',
        });
    }

    const logEntry = {
        serviceName,
        host,
        clientId,
        logText,
        timestamp: Date.now(),
    };

    logs.push(logEntry);
    console.log(`[LOG RECEIVED] ${JSON.stringify(logEntry)}`);

    broadcastLog(logEntry);
    res.status(200).json({ message: 'Log received successfully' });
});

// Endpoint to fetch all logs (protected route for admin)
app.get('/api/logs', authenticateJWT, isAdmin, (req, res) => {
    const recentLogs = logs.filter(log => (Date.now() - log.timestamp) <= LOG_RETENTION_PERIOD);
    res.status(200).json(recentLogs);
});

// WebSocket server setup
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const broadcastLog = (logEntry) => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(logEntry));
        }
    });
};

wss.on('connection', (ws) => {
    console.log('New client connected');

    // Send recent logs to the new client upon connection
    const recentLogs = logs.filter(log => (Date.now() - log.timestamp) <= LOG_RETENTION_PERIOD);
    ws.send(JSON.stringify(recentLogs));

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});