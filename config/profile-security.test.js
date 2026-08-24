const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');
const qx = read('qx/qx.conf');
const shadowrocket = read('Shadowrocket/Shadowrocket.conf');
const mihomoProfiles = ['clash/mihomo.sparkle.yaml', 'clash/mihomo.sublinkpro.yaml'].map((file) => [file, read(file)]);

function assertAbsent(content, patterns, profile) {
  for (const pattern of patterns) {
    assert.doesNotMatch(content, pattern, `${profile} contains forbidden ${pattern}`);
  }
}

assertAbsent(
  qx,
  [
    /dns_exclusion_list/i,
    /resource_parser_url/i,
    /^\[(?:rewrite|mitm|task|http_backend)\]/im,
    /skip_validating_cert/i,
    /img-url\s*=/i,
    /opt-parser\s*=\s*true/i,
    /http:\/\//i
  ],
  'Quantumult X'
);
assert.match(qx, /^no-ipv6$/m);
assert.match(qx, /^no-system$/m);
assert.match(qx, /^doh-server\s*=\s*https:\/\//m);
assert.match(qx, /^fallback_udp_policy\s*=\s*reject$/m);
assert.match(qx, /^final,\s*🐟 漏网之鱼$/m);

const qxGroups = new Set([...qx.matchAll(/^(?:static|url-latency-benchmark)=([^,\n]+)/gm)].map((match) => match[1].trim()));
const qxReferences = [
  ...qx.matchAll(/force-policy=([^,\n]+)/g),
  ...qx.matchAll(/^(?:host(?:-suffix)?|ip-cidr|geoip|final),\s*[^,]+,\s*([^,\n]+)/gim)
].map((match) => match[1].trim());
for (const policy of qxReferences) {
  assert.ok(qxGroups.has(policy) || /^(?:direct|reject)$/i.test(policy), `Quantumult X references missing policy: ${policy}`);
}
const qxRemoteLines = qx.match(/^https:\/\/.*$/gm) || [];
const qxRemoteUrls = qxRemoteLines.map((line) => line.split(',')[0]);
const qxRemoteTags = qxRemoteLines.map((line) => line.match(/\btag=([^,]+)/)?.[1]);
assert.equal(new Set(qxRemoteUrls).size, qxRemoteUrls.length, 'Quantumult X contains duplicate remote resources');
assert.equal(new Set(qxRemoteTags).size, qxRemoteTags.length, 'Quantumult X contains duplicate remote tags');

assertAbsent(
  shadowrocket,
  [/^\[(?:Module|MITM|URL Rewrite|Script)\]$/im, /url=http:\/\//i, /^ipv6\s*=\s*true$/im],
  'Shadowrocket'
);
assert.match(shadowrocket, /^ipv6\s*=\s*false$/m);
assert.match(shadowrocket, /^bypass-system\s*=\s*true$/m);
assert.match(shadowrocket, /^dns-fallback-system\s*=\s*false$/m);
assert.match(shadowrocket, /^dns-direct-system\s*=\s*false$/m);
assert.match(shadowrocket, /^udp-policy-not-supported-behaviour\s*=\s*REJECT$/m);
assert.match(shadowrocket, /^FINAL,🐟 漏网之鱼$/m);

const shadowSection = shadowrocket.match(/\[Proxy Group\]\n([\s\S]*?)\n\[Rule\]/)?.[1];
assert.ok(shadowSection, 'Shadowrocket is missing Proxy Group or Rule sections');
const shadowGroups = new Set(
  shadowSection
    .split('\n')
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => line.split('=')[0].trim())
);
const shadowRules = shadowrocket.match(/\[Rule\]\n([\s\S]*?)\n\[Host\]/)?.[1];
assert.ok(shadowRules, 'Shadowrocket is missing Rule or Host sections');
for (const line of shadowRules.split('\n').filter((entry) => entry && !entry.startsWith('#'))) {
  const parts = line.split(',').map((part) => part.trim());
  const policy = parts[0] === 'FINAL' ? parts[1] : parts[2];
  if (policy) {
    assert.ok(
      shadowGroups.has(policy) || /^(?:DIRECT|REJECT|TAILSCALE)$/i.test(policy),
      `Shadowrocket references missing policy: ${policy}`
    );
  }
}

for (const [file, profile] of mihomoProfiles) {
  const bootstrap = profile.match(/^  default-nameserver:\n((?:    .*\n)+)/m);
  assert.ok(bootstrap, `${file} is missing default-nameserver`);
  assert.doesNotMatch(bootstrap[1], /^    -\s+(?!https:\/\/)/m, `${file} has a non-DoH bootstrap resolver`);
  assert.match(profile, /^\s+direct-nameserver-follow-policy:\s+true$/m);
  assert.match(profile, /^\s+- IP-CIDR6,fc00::\/7,DIRECT,no-resolve$/m);
  assert.match(profile, /^\s+- IP-CIDR6,fe80::\/10,DIRECT,no-resolve$/m);
  assertAbsent(profile, [/^\s+gfw_domain:\s*$/m, /🛑 广告/], file);

  const providerSection = profile.match(/^rule-providers:\n([\s\S]*)$/m)?.[1];
  assert.ok(providerSection, `${file} is missing rule-providers`);
  const providers = new Set([...providerSection.matchAll(/^  ([^\s:#][^:]*):/gm)].map((match) => match[1]));
  const usedProviders = new Set([...profile.matchAll(/RULE-SET,([^,\n]+)/g)].map((match) => match[1]));
  assert.deepEqual([...providers].sort(), [...usedProviders].sort(), `${file} has missing or unused rule providers`);
}

const publicProfiles = [qx, shadowrocket, ...mihomoProfiles.map(([, profile]) => profile)].join('\n');
assert.doesNotMatch(publicProfiles, /raw\.githubusercontent\.com\/hiven425\/hiven\/(?:master|main)\//);

console.log('profile security: all DNS, routing, and public-profile assertions passed');
