
const fs = require('fs');
const filePath = 'c:\\Users\\CNS\\Desktop\\BlackHat Traffic\\Movie Streaming.txt';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.includes('apiKey')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
