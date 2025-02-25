const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;

// MIME types for different file extensions
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
    console.log('Created data directory for storing gaze tracking sessions');
}

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    
    // Handle API requests
    if (req.url.startsWith('/api')) {
        handleApiRequest(req, res);
        return;
    }
    
    // Parse URL to get the file path
    let filePath = req.url === '/' ? 'index.html' : req.url;
    filePath = path.join(__dirname, filePath);
    
    // Get file extension
    const extname = path.extname(filePath);
    
    // Set default content type to text/plain
    let contentType = MIME_TYPES[extname] || 'text/plain';
    
    // Read file and serve it
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // File not found
                fs.readFile(path.join(__dirname, '404.html'), (err, content) => {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end(content, 'utf-8');
                });
            } else {
                // Server error
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            // Success
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Handle API requests
function handleApiRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const endpoint = url.pathname;
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    // Handle POST request to save session data
    if (endpoint === '/api/save-session' && req.method === 'POST') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const sessionId = data.sessionId || Date.now();
                const sessionData = data.sessionData;
                
                // Create session directory if it doesn't exist
                const sessionDir = path.join(dataDir, `session_${sessionId}`);
                if (!fs.existsSync(sessionDir)) {
                    fs.mkdirSync(sessionDir);
                }
                
                // Save session data to file
                const filePath = path.join(sessionDir, 'gaze_data.json');
                fs.writeFile(filePath, JSON.stringify(sessionData, null, 2), err => {
                    if (err) {
                        console.error('Error saving session data:', err);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: err.message }));
                    } else {
                        console.log(`Session data saved to ${filePath}`);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            success: true, 
                            sessionId, 
                            filePath: `data/session_${sessionId}/gaze_data.json` 
                        }));
                    }
                });
            } catch (err) {
                console.error('Error parsing request body:', err);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid JSON data' }));
            }
        });
    } else {
        // Endpoint not found
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'API endpoint not found' }));
    }
}

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`Press Ctrl+C to stop the server`);
}); 