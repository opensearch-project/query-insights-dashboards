const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../../opensearch_dashboards.json');

if (fs.existsSync(filePath)) {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  if (content.version) {
    console.log(content.version);
    process.exit(0);
  }
}

console.error('Could not determine OpenSearch version');
process.exit(1);
