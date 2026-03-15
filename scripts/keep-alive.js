const axios = require('axios');

// The Render application URL
const TARGET_URL = 'https://blackhat-traffic.onrender.com/dashboard';

// Ping interval in milliseconds (14 minutes)
// Render free tier spins down after 15 minutes of inactivity
const PING_INTERVAL = 14 * 60 * 1000;

console.log(`Starting keep-alive script for ${TARGET_URL}`);
console.log(`Ping interval set to ${PING_INTERVAL / 1000 / 60} minutes.`);

const pingServer = async () => {
    try {
        const response = await axios.get(TARGET_URL);
        console.log(`[${new Date().toISOString()}] Ping successful. Status: ${response.status}`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Ping failed: ${error.message}`);
    }
};

// Initial ping
pingServer();

// Schedule subsequent pings
setInterval(pingServer, PING_INTERVAL);
