const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');
const mihomoProfiles = [
  'clash/mihomo.sparkle.yaml',
  'clash/clash.ios.yaml',
  'clash/mihomo.sublinkpro.yaml',
  'clash/mihomo.android.yaml',
  'clash/mihomo.nikki.yaml',
  'clash/mihomo.docker.yaml',
].map((file) => [file, read(file)]);

function assertAbsent(content, patterns, profile) {
  for (const pattern of patterns) {
    assert.doesNotMatch(content, pattern, `${profile} contains forbidden ${pattern}`);
  }
}

for (const [file, profile] of mihomoProfiles) {
  const bootstrap = profile.match(/^  default-nameserver:\n((?:    .*\n)+)/m);
  assert.ok(bootstrap, `${file} is missing default-nameserver`);
  assert.doesNotMatch(bootstrap[1], /^    -\s+(?!https:\/\/)/m, `${file} has a non-DoH bootstrap resolver`);
  assert.match(profile, /^\s+direct-nameserver-follow-policy:\s+true$/m);
  assert.match(profile, /^\s+- IP-CIDR6,fc00::\/7,DIRECT,no-resolve$/m);
  assert.match(profile, /^\s+- IP-CIDR6,fe80::\/10,DIRECT,no-resolve$/m);
  assert.match(profile, /^  - name: 💻 Cursor$/m);
  assert.match(profile, /^  - RULE-SET,my_cursor,💻 Cursor$/m);
  assert.match(profile, /^  my_cursor:/m);
  assertAbsent(profile, [/^\s+gfw_domain:\s*$/m, /🛑 广告/], file);

  const providerSection = profile.match(/^rule-providers:\n([\s\S]*)$/m)?.[1];
  assert.ok(providerSection, `${file} is missing rule-providers`);
  const providers = new Set([...providerSection.matchAll(/^  ([^\s:#][^:]*):/gm)].map((match) => match[1]));
  const usedProviders = new Set([...profile.matchAll(/RULE-SET,([^,\n]+)/g)].map((match) => match[1]));
  assert.deepEqual([...providers].sort(), [...usedProviders].sort(), `${file} has missing or unused rule providers`);

  if (file !== 'clash/clash.ios.yaml') continue;
  assertAbsent(profile, [
    /^(?:tun|port|(?:mixed|socks|redir|tproxy)-port|external-controller(?:-tls|-unix|-pipe)?|external-ui(?:-url|-name)?|geo-auto-update|geo-update-interval|geox-url):/m,
    /^  - PROCESS-/m,
    /geosite:/,
  ], file);
  assert.match(profile, /^mode: rule$/m);
  assert.match(profile, /^ipv6: true$/m);
  assert.match(profile, /^find-process-mode: ['"]?off['"]?$/m);

  const dns = profile.match(/^dns:\n([\s\S]*?)(?=^\S)/m)?.[1];
  assert.ok(dns, `${file} is missing DNS settings`);
  assert.doesNotMatch(dns, /^  listen:/m, 'Clash-Client must own the iOS DNS listener');
  assert.match(dns, /^  ipv6: true$/m);
  assert.match(dns, /^  enhanced-mode: fake-ip$/m);
  assert.match(dns, /^  fake-ip-range: 198\.18\.0\.0\/15$/m);
  assert.match(dns, /^  fake-ip-range6: fdfe:dcba:9876::1\/64$/m);
  assert.match(dns, /^  respect-rules: true$/m);
  for (const provider of ['private_domain', 'cn_domain']) {
    assert.match(dns, new RegExp(`^    - ['"]?rule-set:${provider}['"]?$`, 'm'), `${file} Fake-IP filtering must reuse ${provider}`);
  }
  assert.match(dns, /^    ['"]?rule-set:private_domain,cn_domain['"]?:$/m);
  assert.match(dns, /^    ['"]?rule-set:geolocation-!cn['"]?:$/m);
  for (const resolver of ['default-nameserver', 'proxy-server-nameserver', 'nameserver', 'direct-nameserver']) {
    const entries = dns.match(new RegExp(`^  ${resolver}:\\n((?:    .*\\n)+)`, 'm'))?.[1];
    assert.ok(entries, `${file} is missing ${resolver}`);
    assert.doesNotMatch(entries, /^    -\s+(?!https:\/\/)/m, `${file} ${resolver} must use DoH`);
  }

  const groupSection = profile.match(/^proxy-groups:\n([\s\S]*?)(?=^\S)/m)?.[1];
  assert.ok(groupSection, `${file} is missing proxy groups`);
  const groups = new Map(groupSection.split(/^  - name: /m).slice(1).map((block) => {
    const newline = block.indexOf('\n');
    return [block.slice(0, newline), block.slice(newline + 1)];
  }));
  const xPolicy = groups.get('🗽 x');
  assert.ok(xPolicy, 'iOS X policy is missing');
  assert.match(xPolicy, /^    type: select$/m);
  const xChoices = xPolicy.match(/^    proxies: \[([^\]]+)\]$/m)?.[1].split(',').map((choice) => choice.trim());
  assert.equal(xChoices?.[0], '🗽 X 自动', 'iOS X should default to its own health check');
  assert.ok(!xChoices.includes('DIRECT'), 'iOS X must not offer accidental direct routing');

  const xAuto = groups.get('🗽 X 自动');
  assert.ok(xAuto, 'iOS X automatic group is missing');
  for (const field of ['type: url-test', 'include-all: true', 'exclude-type: direct', 'interval: 600', 'timeout: 8000', 'tolerance: 100', 'lazy: true', 'max-failed-times: 3']) {
    assert.ok(xAuto.split('\n').includes(`    ${field}`), `iOS X automatic group is missing ${field}`);
  }
  assert.match(xAuto, /^    url: ['"]?https:\/\/x\.com\/favicon\.ico['"]?$/m);
  assert.match(xAuto, /^    expected-status: ['"]200['"]$/m);
  const xNodePattern = xAuto.match(/^    filter: '(.+)'$/m)?.[1];
  assert.ok(xNodePattern, 'iOS X must filter injected nodes directly');
  // Mihomo's inline case flag becomes the equivalent JS flag for these fixtures.
  const xNodeFilter = new RegExp(xNodePattern.replaceAll('(?i)', ''), 'i');
  for (const nodeName of ['香港 01', '日本 1.6x', '美国 5.99x']) {
    assert.ok(xNodeFilter.test(nodeName), `${nodeName} must be available in iOS X automatic selection`);
  }
  for (const nodeName of ['香港 家宽 01', '日本 专线', '官网 剩余流量', '香港 6x', '美国 16.5x', '日本 倍率 6']) {
    assert.ok(!xNodeFilter.test(nodeName), `${nodeName} must not enter iOS X automatic selection`);
  }

  const ruleSection = profile.match(/^rules:\n([\s\S]*?)(?=^\S)/m)?.[1];
  assert.ok(ruleSection, `${file} is missing routing rules`);
  const rules = [...ruleSection.matchAll(/^  - (.+)$/gm)].map((match) => match[1]);
  for (const domain of ['x.com', 'twitter.com', 'twimg.com', 't.co']) {
    const rule = `DOMAIN-SUFFIX,${domain},🗽 x`;
    assert.ok(rules.includes(rule), `iOS X is missing explicit routing for ${domain}`);
    assert.ok(rules.indexOf(rule) < rules.indexOf('RULE-SET,my_proxylite,🚀 节点选择'), `${domain} must reach the X group before shared proxy rules`);
  }
  assert.deepEqual(rules.filter((rule) => rule.startsWith('RULE-SET,x_domain,')), ['RULE-SET,x_domain,🗽 x']);
  for (const [first, second] of [
    ['RULE-SET,youtube_domain,📹 YouTube', 'RULE-SET,google_domain,🍀 Google'],
    ['RULE-SET,microsoft_download,📦 微软大流量', 'RULE-SET,microsoft_direct,DIRECT'],
    ['RULE-SET,microsoft_direct,DIRECT', 'RULE-SET,microsoft_proxy,🍒 microsoft'],
    ['RULE-SET,microsoft_proxy,🍒 microsoft', 'RULE-SET,microsoft_domain,🍒 microsoft'],
    ['RULE-SET,facebook_ip,🐬 外贸,no-resolve', 'RULE-SET,cn_ip,🎯 全球直连'],
    ['RULE-SET,telegram_ip,📲 Telegram,no-resolve', 'RULE-SET,cn_ip,🎯 全球直连'],
    ['RULE-SET,cn_ip,🎯 全球直连', 'MATCH,🐟 漏网之鱼'],
  ]) {
    assert.ok(rules.includes(first) && rules.includes(second), `${file} is missing routing rules: ${first} / ${second}`);
    assert.ok(rules.indexOf(first) < rules.indexOf(second), `${file} must route ${first} before ${second}`);
  }
  assert.equal(rules.at(-1), 'MATCH,🐟 漏网之鱼', 'iOS unmatched traffic must use the proxy catch-all');
}

if (process.argv.includes('--mihomo-only')) {
  assert.doesNotMatch(mihomoProfiles.map(([, profile]) => profile).join('\n'), /raw\.githubusercontent\.com\/hiven425\/hiven\/(?:master|main)\//);
  console.log('profile security: all Mihomo DNS, routing, and public-profile assertions passed');
  process.exit(0);
}

const qx = read('qx/qx.conf');
const shadowrocket = read('Shadowrocket/Shadowrocket.conf');

// Preserve every header in the official full profile, including empty sections.
// Validate the native syntax subset used by this public profile, not arbitrary QX profiles.
const qxSectionSyntax = new Map([
  ['general', /^(?:server_check_url|server_check_timeout|network_check_url|excluded_routes|udp_whitelist|fallback_udp_policy)\s*=\s*\S.*$/],
  ['dns', /^(?:no-ipv6|no-system|(?:doh-server|server)\s*=\s*\S.*)$/],
  ['policy', /^(?:static|available|url-latency-benchmark)\s*=\s*[^,]+,\s*\S.*$/],
  ['server_remote', null],
  ['filter_remote', /^https:\/\/[^\s,]+, tag=[^,]+, force-policy=[^,]+, update-interval=\d+, opt-parser=false, enabled=(?:true|false)$/],
  ['rewrite_remote', /^https:\/\/[^\s,]+, tag=[^,]+, update-interval=\d+, opt-parser=false, enabled=(?:true|false)$/],
  ['server_local', null],
  ['filter_local', /^(?:(?:host(?:-suffix)?|ip6?-cidr|geoip),\s*[^,]+,\s*[^,]+|final,\s*[^,]+)$/i],
  ['rewrite_local', null],
  ['task_local', null],
  ['http_backend', null],
  ['mitm', null],
]);
const qxSections = new Map();
let qxSection;
for (const line of qx.split('\n').map((value) => value.trim())) {
  if (!line || /^(?:#|;|\/\/)/.test(line)) continue;
  const header = line.match(/^\[([^\]]+)\]$/);
  if (header) {
    qxSection = header[1];
    assert.ok(qxSectionSyntax.has(qxSection), `Quantumult X contains unknown section [${qxSection}]`);
    assert.ok(!qxSections.has(qxSection), `Quantumult X contains duplicate section [${qxSection}]`);
    qxSections.set(qxSection, []);
  } else {
    assert.ok(qxSection, 'Quantumult X contains an entry before its first section');
    qxSections.get(qxSection).push(line);
  }
}
for (const [section, syntax] of qxSectionSyntax) {
  assert.ok(qxSections.has(section), `Quantumult X is missing section [${section}]`);
  const entries = qxSections.get(section);
  if (syntax) {
    for (const line of entries) {
      assert.match(line, syntax, `Quantumult X contains an invalid or misplaced entry in [${section}]: ${line}`);
    }
  } else {
    assert.equal(entries.length, 0, `Public Quantumult X section [${section}] must remain empty`);
  }
}

assertAbsent(
  qx,
  [
    /dns_exclusion_list/i,
    /resource_parser_url/i,
    /^(?:ca-p12|ca-passphrase|p12|passphrase)\s*=/im,
    /skip_validating_cert/i,
    /img-url\s*=/i,
    /opt-parser\s*=\s*true/i
  ],
  'Quantumult X'
);
assert.match(qx, /^no-ipv6$/m);
assert.match(qx, /^no-system$/m);
assert.match(qx, /^doh-server\s*=\s*https:\/\//m);
assert.match(qx, /^fallback_udp_policy\s*=\s*reject$/m);
assert.match(qx, /^final,\s*🐟 漏网之鱼$/m);
assert.match(qx, /^static=💻 Cursor,/m);
assert.match(qx, /\/qx\/rules\/Cursor\.list, tag=Cursor, force-policy=💻 Cursor/);

// QX's probe URL parser rejects HTTPS; encrypted DNS and remote resources still require HTTPS.
for (const setting of ['server_check_url', 'network_check_url']) {
  const address = qx.match(new RegExp(`^${setting}\\s*=\\s*(\\S+)\\s*$`, 'm'))?.[1];
  assert.ok(address, `Quantumult X is missing ${setting}`);
  assert.equal(new URL(address).protocol, 'http:', `${setting} must use a QX-compatible HTTP probe`);
}
for (const line of qx.split('\n').map((value) => value.trim()).filter((value) => !/^(?:#|;|\/\/)/.test(value))) {
  if (/http:\/\//i.test(line)) {
    assert.match(line, /^(?:server_check_url|network_check_url)\s*=\s*http:\/\/\S+$/, 'Only QX probe settings may use HTTP');
  }
}

const qxGroups = new Set([...qx.matchAll(/^(?:static|available|url-latency-benchmark)=([^,\n]+)/gm)].map((match) => match[1].trim()));
const qxReferences = [
  ...qx.matchAll(/force-policy=([^,\n]+)/g),
  ...qx.matchAll(/^(?:host(?:-suffix)?|ip6?-cidr|geoip),\s*[^,]+,\s*([^,\n]+)/gim),
  ...qx.matchAll(/^final,\s*([^,\n]+)/gim)
].map((match) => match[1].trim());
for (const policy of qxReferences) {
  assert.ok(qxGroups.has(policy) || /^(?:direct|reject)$/i.test(policy), `Quantumult X references missing policy: ${policy}`);
}
for (const match of qx.matchAll(/^static=([^\n]+)/gm)) {
  for (const policy of match[1].split(',').slice(1).map((value) => value.trim())) {
    assert.ok(qxGroups.has(policy) || /^(?:direct|reject)$/i.test(policy), `Quantumult X group references missing policy: ${policy}`);
  }
}

// Use IP literals so resolving a DoH hostname cannot require plaintext bootstrap DNS.
const qxDohServers = qx.match(/^doh-server\s*=\s*(.+)$/m)[1].split(',').map((value) => new URL(value.trim()));
assert.ok(qxDohServers.length >= 2, 'Quantumult X needs multiple encrypted DNS endpoints');
for (const endpoint of qxDohServers) {
  assert.equal(endpoint.protocol, 'https:');
  assert.equal(net.isIP(endpoint.hostname), 4, 'Quantumult X DoH bootstrap must use an IPv4 literal');
}
const privateDnsDomains = ['lan', '*.lan', 'local', '*.local', 'home.arpa', '*.home.arpa'];
const qxDnsExceptions = [...qx.matchAll(/^server\s*=\s*(.+)$/gm)].map((match) => match[1].trim());
assert.deepEqual(qxDnsExceptions.sort(), privateDnsDomains.map((domain) => `/${domain}/system`).sort());
for (const domain of ['lan', 'local', 'home.arpa']) {
  assert.match(qx, new RegExp(`^host-suffix, ${domain.replaceAll('.', '\\.')}, direct$`, 'm'));
}
const ipv6RejectIndex = qx.indexOf('ip6-cidr, ::/0, reject');
assert.ok(ipv6RejectIndex >= 0 && ipv6RejectIndex < qx.indexOf('geoip, cn, direct'), 'Public IPv6 must fail closed before GEOIP/FINAL');
for (const subnet of ['::1/128', 'fc00::/7', 'fe80::/10', 'ff00::/8']) {
  assert.ok(qx.includes(`ip6-cidr, ${subnet}, direct`), `Missing local IPv6 route: ${subnet}`);
}
assert.ok(qx.indexOf('tag=YouTube,') < qx.indexOf('tag=Google,'), 'YouTube shared IP rules must precede Google');
assert.match(qx, /^static=🚀 节点选择, 🏠 家宽节点, ♻️ 故障切换,/m);
assert.match(qx, /^available=🏠 家宽节点,/m, 'Residential traffic should keep the first healthy exit instead of chasing latency');

const qxNodeFilters = new Map([...qx.matchAll(/^(?:available|url-latency-benchmark)=([^,]+), server-tag-regex=(.+?)(?:, check-interval=\d+.*)?$/gm)]
  // QX's ICU inline case flag becomes the equivalent JS flag for these fixtures.
  .map((match) => [match[1], new RegExp(match[2].replaceAll('(?i)', ''), 'i')]));
for (const [nodeName, group] of [
  ['🇺🇸 美国 01', '🇺🇲 美国节点'],
  ['US01 Network', '🇺🇲 美国节点'],
  ['San Francisco 01', '🇺🇲 美国节点'],
  ['🇯🇵 日本 01', '🇯🇵 日本节点'],
  ['JP01 Network', '🇯🇵 日本节点'],
  ['台湾 新北 01', '🇹🇼 台湾节点'],
  ['Taipei 01', '🇹🇼 台湾节点'],
  ['Singapore 01', '🇸🇬 新加坡节点'],
  ['Hong Kong 01', '🇭🇰 香港节点'],
  ['Australia 01', '🌍 其他节点'],
  ['Austria 01', '🌍 其他节点'],
  ['Russia 01', '🌍 其他节点'],
  ['🇰🇷 韩国 01', '🌍 其他节点'],
  ['南美 智利 01', '🌍 其他节点'],
  ['美国家宽 1.6x', '🏠 家宽节点'],
  ['美国家宽 5.99x', '🏠 家宽节点'],
]) {
  assert.ok(qxNodeFilters.get(group).test(nodeName), `${nodeName} must be selectable in ${group}`);
  if (group !== '🌍 其他节点') {
    assert.ok(!qxNodeFilters.get('🌍 其他节点').test(nodeName), `${nodeName} must not also enter the other-region group`);
  }
}
for (const nodeName of ['Australia 01', 'Austria 01', 'Russia 01', '南美 智利 01']) {
  assert.ok(!qxNodeFilters.get('🇺🇲 美国节点').test(nodeName), `${nodeName} must not be mistaken for a US node`);
}
for (const nodeName of ['🇺🇸 美国 6x', '日本 倍率 16.5', '台湾 已过期', '官网 流量剩余', '香港 专线']) {
  for (const [group, filter] of qxNodeFilters) {
    assert.ok(!filter.test(nodeName), `${group} must exclude metadata and expensive nodes: ${nodeName}`);
  }
}
assert.ok(qxNodeFilters.get('♻️ 故障切换').test('🇺🇸 美国 1.6x'));
assert.ok(!qxNodeFilters.get('♻️ 故障切换').test('美国家宽 01'), 'General failover must not consume residential quota');
const qxBenchmarks = [...qx.matchAll(/^url-latency-benchmark=.+, check-interval=(\d+), alive-checking=(\w+), tolerance=(\d+)$/gm)];
assert.equal(qxBenchmarks.length, 6, 'All six country/other groups need explicit benchmark settings');
for (const match of qxBenchmarks) {
  assert.ok(Number(match[1]) > 0 && Number(match[1]) <= 300, 'Active country groups should refresh within five minutes');
  assert.equal(match[2], 'false', 'Idle country groups should not keep probing on mobile');
  assert.ok(Number(match[3]) > 0, 'Latency tolerance should prevent needless exit changes');
}
const qxRemoteLines = qx.match(/^https:\/\/.*$/gm) || [];
const qxRemoteUrls = qxRemoteLines.map((line) => line.split(',')[0]);
const qxRemoteTags = qxRemoteLines.map((line) => line.match(/\btag=([^,]+)/)?.[1]);
assert.equal(new Set(qxRemoteUrls).size, qxRemoteUrls.length, 'Quantumult X contains duplicate remote resources');
assert.equal(new Set(qxRemoteTags).size, qxRemoteTags.length, 'Quantumult X contains duplicate remote tags');

// Optional rewrites may be listed, but public profiles must not activate HTTPS scripts or ship a CA.
const qxRewriteLines = qxSections.get('rewrite_remote');
const expectedRewrites = ['YoutubeAds.conf', 'AmapAds.conf', 'CainiaoAds.conf', 'Applet.conf', 'BingSimplify.conf'];
assert.deepEqual(qxRewriteLines.map((line) => line.split(',')[0].split('/').pop()).sort(), expectedRewrites.sort());
for (const line of qxRewriteLines) {
  const url = new URL(line.split(',')[0]);
  assert.equal(url.origin, 'https://raw.githubusercontent.com');
  assert.ok(url.pathname.startsWith('/ddgksf2013/Rewrite/refs/heads/master/AdBlock/'), 'Rewrite must use the selected upstream source');
  assert.match(line, /, enabled=false$/, 'Optional rewrites must stay disabled until configured on the device');
  assert.match(line, /, opt-parser=false,/, 'Native rewrites must not depend on a resource parser');
  assert.doesNotMatch(line, /force-policy=/, 'Rewrite resources must not replace service routing policies');
}

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
assert.match(shadowrocket, /^💻 Cursor = select,/m);

const shadowSection = shadowrocket.match(/\[Proxy Group\]\n([\s\S]*?)\n\[Rule\]/)?.[1];
assert.ok(shadowSection, 'Shadowrocket is missing Proxy Group or Rule sections');
assert.match(shadowSection, /^🚀 节点选择 = select,♻️ 自动选择,/m, 'The main policy should default to automatic selection');
const residentialAuto = shadowSection.match(/^🏠 家宽节点 = ([^\n]+)/m)?.[1];
assert.ok(residentialAuto, 'Shadowrocket residential automatic policy is missing');
const [residentialHealthCheck, residentialPattern] = residentialAuto.split(',policy-regex-filter=');
assert.equal(residentialHealthCheck.split(',')[0], 'url-test');
assert.match(residentialHealthCheck, /(?:^|,)url=https:\/\/www\.gstatic\.com\/generate_204(?:,|$)/);
assert.match(residentialHealthCheck, /(?:^|,)interval=300(?:,|$)/);
assert.match(residentialHealthCheck, /(?:^|,)timeout=5(?:,|$)/);
assert.match(residentialHealthCheck, /(?:^|,)tolerance=0(?:,|$)/, 'Residential selection should choose the lowest measured latency without tolerance');
assert.ok(residentialPattern, 'Residential automatic selection must filter nodes directly');
const residentialFilter = new RegExp(residentialPattern.replaceAll('(?i)', ''), 'i');
for (const nodeName of ['美国家宽 01', 'US 家宽 02', '美国家宽 1.6x', '美国家宽 5.99x']) {
  assert.ok(residentialFilter.test(nodeName), `${nodeName} must be available for residential automatic selection`);
}
for (const nodeName of ['美国 01', '香港 家宽 01', '美国家宽 专线', '美国家宽 6x', '美国家宽 16.5x', '美国家宽 倍率 6', '美国家宽 已过期']) {
  assert.ok(!residentialFilter.test(nodeName), `${nodeName} must not enter residential automatic selection`);
}
const xPolicy = shadowSection.match(/^🗽 x = select,([^\n]+)/m)?.[1].split(',');
assert.equal(xPolicy?.[0], '🗽 X 自动', 'X should default to its own automatic selection');
assert.ok(!xPolicy.includes('DIRECT'), 'X must not offer accidental direct routing');
const xAuto = shadowSection.match(/^🗽 X 自动 = ([^\n]+)/m)?.[1];
assert.ok(xAuto, 'Shadowrocket X automatic policy is missing');
const [xHealthCheck, xNodePattern] = xAuto.split(',policy-regex-filter=');
assert.equal(xHealthCheck.split(',')[0], 'url-test');
assert.match(xHealthCheck, /(?:^|,)url=https:\/\/x\.com\/favicon\.ico(?:,|$)/, 'X health must be checked against X');
const xInterval = Number(xHealthCheck.match(/(?:^|,)interval=(\d+)(?:,|$)/)?.[1]);
assert.ok(xInterval > 0 && xInterval <= 600, 'X health should refresh within ten minutes');
assert.match(xHealthCheck, /(?:^|,)timeout=8(?:,|$)/, 'Shadowrocket X timeout uses seconds');
assert.match(xHealthCheck, /(?:^|,)select=0(?:,|$)/, 'Shadowrocket X should initially select its first candidate');
assert.ok(xNodePattern, 'X automatic selection must filter nodes directly without nesting country groups');
// Shadowrocket's ICU case flags become the equivalent JS flag for these node fixtures.
const xNodeFilter = new RegExp(xNodePattern.replaceAll('(?i)', ''), 'i');
for (const nodeName of ['🇭🇰 香港 01', 'Hong Kong 02', '日本 01', '新加坡 02', 'US 03', '台湾 04', '香港 1.6x', '香港 5.99x']) {
  assert.ok(xNodeFilter.test(nodeName), `${nodeName} must be available for Shadowrocket X automatic selection`);
}
for (const nodeName of ['香港 家宽 01', '美国家宽 02', '香港 专线', '香港 6x', '香港 16.5x', '日本 倍率 6', '香港 已过期', '官网 剩余流量']) {
  assert.ok(!xNodeFilter.test(nodeName), `${nodeName} must not enter Shadowrocket X automatic selection`);
}
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

const publicProfiles = [qx, shadowrocket, ...mihomoProfiles.map(([, profile]) => profile)].join('\n');
assert.doesNotMatch(publicProfiles, /raw\.githubusercontent\.com\/hiven425\/hiven\/(?:master|main)\//);

console.log('profile security: all DNS, routing, and public-profile assertions passed');
