const fs = require('fs');
const path = require('path');

const apiEndpoint = process.env.API_ENDPOINT || '';
const template = fs.readFileSync(path.join(__dirname, '../src/config.template.json'), 'utf8');
const config = template.replace('"{{API_ENDPOINT}}"', `"${apiEndpoint}"`);

fs.writeFileSync(path.join(__dirname, '../src/config.json'), config);

console.log(`Generated config with API endpoint: ${apiEndpoint}`); 
