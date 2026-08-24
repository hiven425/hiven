const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const ruleNames = ['Direct', 'AI', 'Talkatone', 'Payment', 'wm', 'ProxyLite'];
const typeMap = {
  DOMAIN: 'HOST',
  'DOMAIN-SUFFIX': 'HOST-SUFFIX',
  'DOMAIN-KEYWORD': 'HOST-KEYWORD',
  'IP-CIDR': 'IP-CIDR',
  'IP-CIDR6': 'IP6-CIDR'
};

function convertRule(line) {
  const parts = line.split(',').map((part) => part.trim());
  const qxType = typeMap[parts[0]];
  if (!qxType || !parts[1]) return null;

  const suffix = parts.includes('no-resolve') ? ',no-resolve' : '';
  return `${qxType},${parts[1]},HIVEN${suffix}`;
}

function expectedContent(name) {
  const source = fs.readFileSync(path.join(root, 'config', `${name}.list`), 'utf8');
  const rules = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map(convertRule)
    .filter(Boolean);

  return [
    `# Generated from config/${name}.list; run node config/qx-rules-sync.test.js --write after edits.`,
    '# The policy placeholder is overridden by force-policy in qx/qx.conf.',
    ...rules,
    ''
  ].join('\n');
}

const write = process.argv.includes('--write');
const outputDir = path.join(root, 'qx', 'rules');
if (write) fs.mkdirSync(outputDir, { recursive: true });

for (const name of ruleNames) {
  const expected = expectedContent(name);
  const target = path.join(outputDir, `${name}.list`);
  if (write) fs.writeFileSync(target, expected, 'utf8');
  assert.equal(fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n'), expected, `${name}.list is out of sync`);
}

console.log('qx rules: all generated files are in sync');
