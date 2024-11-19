const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-secret-key'; // Replace with a secure key

// Middleware
app.use(bodyParser.json());
app.use(cors());

// In-memory storage for logs
let logs = [];

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Load users from JSON file
const users = JSON.parse(fs.readFileSync('./users.json', 'utf8')).users;

// Login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // Find the user with matching credentials
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate a JWT token
    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ token });
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

// Endpoint to receive logs from authenticated clients
app.post('/api/logs', authenticateJWT, (req, res) => {
    const { serviceName, host, clientId, logText } = req.body;

    // Validate required fields
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
    };

    logs.push(logEntry);
    console.log(`[LOG RECEIVED] ${JSON.stringify(logEntry)}`);

    // Broadcast the new log entry to all connected WebSocket clients
    broadcastLog(logEntry);

    res.status(200).json({ message: 'Log received successfully' });
});

// Endpoint to fetch all logs (protected route)
app.get('/api/logs', authenticateJWT, (req, res) => {
    res.status(200).json(logs);
});

// WebSocket server setup
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Broadcast function to send logs to all connected WebSocket clients
const broadcastLog = (logEntry) => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(logEntry));
        }
    });
};

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New client connected');

    // Send existing logs to the newly connected client
    ws.send(JSON.stringify(logs));

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
