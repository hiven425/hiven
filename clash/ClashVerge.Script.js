/**
 * Clash Verge Rev global extension script.
 *
 * This is the script equivalent of mihomo.sparkle.yaml. The subscription's
 * proxies and proxy-providers are kept intact; include-all groups discover
 * those nodes after the subscription has been loaded.
 * Clash Verge Rev owns ports, the controller, and its UI, so those fields are
 * intentionally left unchanged.
 */

function httpProvider(behavior, format, url) {
  return {
    type: "http",
    interval: 86400,
    behavior: behavior,
    format: format,
    url: url,
  };
}

function domainProvider(url) {
  return httpProvider("domain", "mrs", url);
}

function classProvider(url) {
  return httpProvider("classical", "text", url);
}

function ipProvider(url) {
  return httpProvider("ipcidr", "mrs", url);
}

function selectGroup(name, proxies) {
  return { name: name, type: "select", proxies: proxies };
}

function urlTestGroup(name, filter) {
  return {
    name: name,
    type: "url-test",
    "include-all": true,
    url: "https://www.gstatic.com/generate_204",
    interval: 900,
    tolerance: 100,
    lazy: true,
    "max-failed-times": 3,
    filter: filter,
  };
}

var globalProxies = ["♻️ 自动选择", "🚀 节点选择"];
var usProxies = ["🏚️ 家宽节点", "🇺🇲 美国节点", "♻️ 自动选择", "🚀 节点选择"];
var directFirst = ["DIRECT", "🚀 节点选择"];
var aiProxies = [
  "🏚️ 家宽节点",
  "🇺🇲 美国节点",
  "🇯🇵 日本节点",
  "🇸🇬 新加坡节点",
  "🇹🇼 台湾节点",
  "♻️ 自动选择",
];
var officeProxies = aiProxies.concat(["🚀 节点选择"]);
var youtubeProxies = [
  "♻️ 自动选择",
  "🇺🇲 美国节点",
  "🇸🇬 新加坡节点",
  "🇯🇵 日本节点",
  "🇹🇼 台湾节点",
  "🏚️ 家宽节点",
  "🚀 节点选择",
];
var speedtestProxies = ["DIRECT", "♻️ 自动选择", "🚀 节点选择"];

var proxyGroups = [
  selectGroup("🚀 节点选择", [
    "手动选择",
    "🏚️ 家宽节点",
    "♻️ 自动选择",
    "🇭🇰 香港节点",
    "🇺🇲 美国节点",
    "🇯🇵 日本节点",
    "🇹🇼 台湾节点",
    "🇸🇬 新加坡节点",
    "🌍 其他节点",
  ]),
  { name: "手动选择", type: "select", "include-all": true },
  selectGroup("📹 YouTube", youtubeProxies),
  selectGroup("🍀 Google", aiProxies),
  selectGroup("🍒 microsoft", officeProxies),
  selectGroup("📦 微软大流量", ["DIRECT", "🚀 节点选择"]),
  selectGroup("🏹 ChatGPT", aiProxies),
  selectGroup("💻 GitHub", officeProxies),
  selectGroup("🐬 外贸", usProxies),
  selectGroup("🎵 TikTok", globalProxies),
  selectGroup("📲 Telegram", globalProxies),
  selectGroup("🎥 NETFLIX", globalProxies),
  selectGroup("✈️ Speedtest", speedtestProxies),
  selectGroup("💶 PayPal", globalProxies),
  selectGroup("☁️ cloudflare", globalProxies),
  selectGroup("🍎 Apple", directFirst),
  selectGroup("🎯 全球直连", directFirst),
  selectGroup("🐟 漏网之鱼", globalProxies),
  selectGroup("🛑 广告拦截", ["REJECT"]),
  urlTestGroup(
    "🇭🇰 香港节点",
    "^(?=.*(?i)(?:香港|港|🇭🇰|HK|Hong Kong|HKG|沪港|深港|Kowloon|Victoria))(?!.*(?i)(?:美|🇺🇸|US|台|🇹🇼|TW|日|🇯🇵|JP|新|🇸🇬|SG|韩|🇰🇷|KR|专线|到期|过期|剩余|流量|时间|官网|产品|倍率\\s*(?:[6-9]|[1-9]\\d)(?:\\.\\d+)?|(?:[6-9]|[1-9]\\d)(?:\\.\\d+)?\\s*(?:x|×|倍))).*$"
  ),
  urlTestGroup(
    "🇺🇲 美国节点",
    "^(?=.*(?i)(?:美|🇺🇸|US|USA|States|American|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|New York|Miami|Boston|United States|San Francisco))(?!.*(?i)(?:港|🇭🇰|HK|台|🇹🇼|TW|日|🇯🇵|JP|新|🇸🇬|SG|韩|🇰🇷|KR|专线|到期|过期|剩余|流量|时间|官网|产品|倍率\\s*(?:[6-9]|[1-9]\\d)(?:\\.\\d+)?|(?:[6-9]|[1-9]\\d)(?:\\.\\d+)?\\s*(?:x|×|倍))).*$"
  ),
  urlTestGroup(
    "🇯🇵 日本节点",
    "^(?=.*(?i)(?:日本|🇯🇵|JP|NRT|KIX|FUK|Japan|川日|东京|大阪|泉日|埼玉|名古屋|Nagoya|Kyoto|Okinawa))(?!.*(?i)(?:美|🇺🇸|US|港|🇭🇰|HK|台|🇹🇼|TW|新|🇸🇬|SG|韩|🇰🇷|KR|专线|到期|过期|剩余|流量|时间|官网|产品|倍率\\s*(?:[6-9]|[1-9]\\d)(?:\\.\\d+)?|(?:[6-9]|[1-9]\\d)(?:\\.\\d+)?\\s*(?:x|×|倍))).*$"
  ),
  urlTestGroup(
    "🇹🇼 台湾节点",
    "^(?=.*(?i)(?:台湾|台|🇹🇼|TW|TPE|KHH|Taiwan|新北|彰化|台北|Taipei|高雄|Kaohsiung|Taichung|台中))(?!.*(?i)(?:美|🇺🇸|US|港|🇭🇰|HK|日|🇯🇵|JP|新|🇸🇬|SG|韩|🇰🇷|KR|专线|到期|过期|剩余|流量|时间|官网|产品|倍率\\s*(?:[6-9]|[1-9]\\d)(?:\\.\\d+)?|(?:[6-9]|[1-9]\\d)(?:\\.\\d+)?\\s*(?:x|×|倍))).*$"
  ),
  urlTestGroup(
    "🇸🇬 新加坡节点",
    "^(?=.*(?i)(?:新加坡|坡|狮城|🇸🇬|SG|SIN|Singapore|Changi|Marina Bay))(?!.*(?i)(?:美|🇺🇸|US|港|🇭🇰|HK|台|🇹🇼|TW|日|🇯🇵|JP|韩|🇰🇷|KR|专线|到期|过期|剩余|流量|时间|官网|产品|倍率\\s*(?:[6-9]|[1-9]\\d)(?:\\.\\d+)?|(?:[6-9]|[1-9]\\d)(?:\\.\\d+)?\\s*(?:x|×|倍))).*$"
  ),
  urlTestGroup(
    "🌍 其他节点",
    "^(?!.*(?i)(?:美|🇺🇸|US|日本|🇯🇵|JP|台湾|🇹🇼|TW|新加坡|🇸🇬|SG|香港|🇭🇰|HK|韩|🇰🇷|KR|专线|到期|过期|剩余|流量|时间|官网|产品|倍率\\s*(?:[6-9]|[1-9]\\d)(?:\\.\\d+)?|(?:[6-9]|[1-9]\\d)(?:\\.\\d+)?\\s*(?:x|×|倍))).*$"
  ),
  urlTestGroup(
    "🏚️ 家宽节点",
    "^(?=.*(?i)(?:家宽))(?=.*(?i)(?:美国|🇺🇸|(?:^|[^A-Za-z])(?:US|USA)(?:[^A-Za-z]|$)|United States|American|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|New York|Miami|Boston|San Francisco))(?!.*(?i)(?:亚洲|专线|到期|过期|剩余|流量|时间|官网|产品|倍率\\s*(?:[6-9]|[1-9]\\d)(?:\\.\\d+)?|(?:[6-9]|[1-9]\\d)(?:\\.\\d+)?\\s*(?:x|×|倍))).*$"
  ),
  {
    name: "♻️ 自动选择",
    type: "url-test",
    proxies: [
      "🇭🇰 香港节点",
      "🇺🇲 美国节点",
      "🇯🇵 日本节点",
      "🇹🇼 台湾节点",
      "🇸🇬 新加坡节点",
      "🌍 其他节点",
    ],
    url: "https://www.gstatic.com/generate_204",
    interval: 900,
    tolerance: 100,
    lazy: true,
    "max-failed-times": 3,
  },
];

var rules = [
  "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
  "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
  "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
  "IP-CIDR,100.64.0.0/10,DIRECT,no-resolve",
  "PROCESS-NAME,Speedtest.exe,✈️ Speedtest",
  "DOMAIN-SUFFIX,linux.do,♻️ 自动选择",
  "RULE-SET,private_domain,DIRECT",
  "RULE-SET,my_direct,DIRECT",
  "RULE-SET,apple_domain,🍎 Apple",
  "RULE-SET,my_proxylite,🚀 节点选择",
  "RULE-SET,my_ai_exe,🏹 ChatGPT",
  "RULE-SET,my_ai,🏹 ChatGPT",
  "RULE-SET,my_wm,🐬 外贸",
  "RULE-SET,openai_domain,🏹 ChatGPT",
  "RULE-SET,ai_domain,🏹 ChatGPT",
  "RULE-SET,github_domain,💻 GitHub",
  "RULE-SET,youtube_domain,📹 YouTube",
  "RULE-SET,facebook_domain,🐬 外贸",
  "RULE-SET,whatsapp_domain,🐬 外贸",
  "RULE-SET,instagram_domain,🐬 外贸",
  "RULE-SET,linkedin_domain,🐬 外贸",
  "RULE-SET,x_domain,🐬 外贸",
  "RULE-SET,google_domain,🍀 Google",
  "RULE-SET,google_gemini_domain,🍀 Google",
  "RULE-SET,onedrive_domain,🍒 microsoft",
  "RULE-SET,microsoft_download,📦 微软大流量",
  "RULE-SET,microsoft_direct,DIRECT",
  "RULE-SET,microsoft_proxy,🍒 microsoft",
  "RULE-SET,microsoft_domain,🍒 microsoft",
  "RULE-SET,cloudflare_domain,☁️ cloudflare",
  "RULE-SET,tiktok_domain,🎵 TikTok",
  "RULE-SET,speedtest_domain,✈️ Speedtest",
  "RULE-SET,telegram_domain,📲 Telegram",
  "RULE-SET,netflix_domain,🎥 NETFLIX",
  "RULE-SET,paypal_domain,💶 PayPal",
  "IP-CIDR,8.8.8.8/32,🍀 Google,no-resolve",
  "IP-CIDR,8.8.4.4/32,🍀 Google,no-resolve",
  "IP-CIDR,1.1.1.1/32,☁️ cloudflare,no-resolve",
  "IP-CIDR,1.0.0.1/32,☁️ cloudflare,no-resolve",
  "RULE-SET,cn_domain,🎯 全球直连",
  "RULE-SET,geolocation-!cn,🚀 节点选择",
  "RULE-SET,google_ip,🍀 Google,no-resolve",
  "RULE-SET,facebook_ip,🐬 外贸,no-resolve",
  "RULE-SET,netflix_ip,🎥 NETFLIX,no-resolve",
  "RULE-SET,telegram_ip,📲 Telegram,no-resolve",
  "RULE-SET,cloudflare_ip,☁️ cloudflare,no-resolve",
  "RULE-SET,cn_ip,🎯 全球直连",
  "MATCH,🐟 漏网之鱼",
];

var ruleProviders = {
  youtube_domain: domainProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/youtube.mrs"),
  private_domain: domainProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/private.mrs"),
  my_proxylite: classProvider("https://raw.githubusercontent.com/hiven425/hiven/refs/heads/master/config/ProxyLite.list"),
  my_ai: classProvider("https://raw.githubusercontent.com/hiven425/hiven/refs/heads/master/config/AI.list"),
  my_ai_exe: classProvider("https://raw.githubusercontent.com/hiven425/hiven/refs/heads/master/config/ai-exe.list"),
  my_direct: classProvider("https://raw.githubusercontent.com/hiven425/hiven/refs/heads/master/config/Direct.list"),
  my_wm: classProvider("https://raw.githubusercontent.com/hiven425/hiven/refs/heads/master/config/wm.list"),
  microsoft_download: classProvider("https://raw.githubusercontent.com/hiven425/hiven/refs/heads/master/config/MicrosoftDownload.list"),
  microsoft_direct: classProvider("https://raw.githubusercontent.com/hiven425/hiven/refs/heads/master/config/MicrosoftDirect.list"),
  microsoft_proxy: classProvider("https://raw.githubusercontent.com/hiven425/hiven/refs/heads/master/config/MicrosoftProxy.list"),
  ai_domain: domainProvider("https://github.com/DustinWin/ruleset_geodata/releases/download/mihomo-ruleset/ai.mrs"),
  openai_domain: domainProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/openai.mrs"),
  google_domain: domainProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/google.mrs"),
  google_gemini_domain: domainProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/google-gemini.mrs"),
  github_domain: domainProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/github.mrs"),
  telegram_domain: domainProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/telegram.mrs"),
  netflix_domain: domainProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/netflix.mrs"),
  paypal_domain: domainProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/paypal.mrs"),
  onedrive_domain: domainProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/onedrive.mrs"),
  microsoft_domain: domainProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/microsoft.mrs"),
  apple_domain: domainProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/apple-cn.mrs"),
  speedtest_domain: domainProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/ookla-speedtest.mrs"),
  tiktok_domain: domainProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/tiktok.mrs"),
  gfw_domain: domainProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/gfw.mrs"),
  "geolocation-!cn": domainProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/geolocation-!cn.mrs"),
  cn_domain: domainProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cn.mrs"),
  facebook_domain: domainProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/facebook.mrs"),
  whatsapp_domain: domainProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/whatsapp.mrs"),
  instagram_domain: domainProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/instagram.mrs"),
  linkedin_domain: domainProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/linkedin.mrs"),
  x_domain: domainProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/x.mrs"),
  cloudflare_domain: domainProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geosite/cloudflare.mrs"),
  cn_ip: ipProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cn.mrs"),
  google_ip: ipProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/google.mrs"),
  telegram_ip: ipProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/telegram.mrs"),
  netflix_ip: ipProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/netflix.mrs"),
  facebook_ip: ipProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/facebook.mrs"),
  cloudflare_ip: ipProvider("https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/meta/geo/geoip/cloudflare.mrs"),
};

var overrides = {
  ipv6: true,
  "allow-lan": false,
  "bind-address": "127.0.0.1",
  "unified-delay": true,
  "tcp-concurrent": true,
  "geo-auto-update": true,
  "geo-update-interval": 48,
  "geox-url": {
    geoip: "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat",
    geosite: "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat",
    mmdb: "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/country.mmdb",
    asn: "https://github.com/xishang0128/geoip/releases/download/latest/GeoLite2-ASN.mmdb",
  },
  "find-process-mode": "always",
  "keep-alive-idle": 600,
  "keep-alive-interval": 30,
  profile: { "store-selected": true, "store-fake-ip": true },
  sniffer: {
    enable: true,
    sniff: {
      HTTP: { ports: [80, "8080-8880"], "override-destination": true },
      TLS: { ports: [443, 8443], "override-destination": true },
      QUIC: { ports: [443, 8443], "override-destination": true },
    },
    "force-domain": ["+.v2ex.com"],
    "skip-domain": ["Mijia Cloud", "dlg.io.mi.com", "+.push.apple.com", "+.apple.com"],
  },
  tun: {
    enable: true,
    stack: "mixed",
    mtu: 1500,
    "inet6-address": ["fdfe:dcba:9877::1/126"],
    "dns-hijack": ["any:53", "tcp://any:53"],
    "auto-route": true,
    "auto-detect-interface": true,
    "strict-route": true,
  },
  dns: {
    enable: true,
    listen: "127.0.0.1:1053",
    ipv6: true,
    "respect-rules": true,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.0/15",
    "fake-ip-range6": "fdfe:dcba:9876::1/64",
    "fake-ip-filter-mode": "blacklist",
    "fake-ip-filter": ["+.lan", "+.local", "geosite:private", "geosite:cn"],
    "default-nameserver": ["223.5.5.5", "119.29.29.29"],
    "proxy-server-nameserver": ["https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"],
    nameserver: ["https://1.1.1.1/dns-query", "https://dns.google/dns-query"],
    "direct-nameserver": ["https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"],
    "nameserver-policy": {
      "rule-set:private_domain,cn_domain": ["https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"],
      "geosite:geolocation-!cn": ["https://dns.cloudflare.com/dns-query", "https://dns.google/dns-query"],
    },
  },
  "proxy-groups": proxyGroups,
  rules: rules,
  "rule-providers": ruleProviders,
};

function main(config) {
  if (!config || typeof config !== "object") return config;

  // Verge supplies these from the selected subscription. Do not replace them.
  if (!config.proxies) config.proxies = [];
  for (var key in overrides) {
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
      config[key] = overrides[key];
    }
  }
  return config;
}
