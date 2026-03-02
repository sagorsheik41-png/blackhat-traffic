
const fs = require('fs');
const filePath = 'c:\\Users\\CNS\\Desktop\\BlackHat Traffic\\Movie Streaming.txt';
const content = fs.readFileSync(filePath, 'utf8');
const regex = /database\.ref\(['"`](.*?)['"`]\)/g;
let match;
while ((match = regex.exec(content)) !== null) {
    console.log(`Path: ${match[1]}`);
}
