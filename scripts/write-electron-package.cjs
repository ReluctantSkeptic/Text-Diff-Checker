const fs = require('node:fs');
const path = require('node:path');

const outDir = path.resolve(__dirname, '../dist-electron');
const packagePath = path.join(outDir, 'package.json');

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  packagePath,
  `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`,
  'utf8',
);
