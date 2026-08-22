/**
 * SublinkPro 生产节点加工器
 *
 * 执行顺序：手动禁用 → 信息/协议过滤 → 精确凭据去重 → 等价端点优选
 *          → 分级健康过滤 → 国家限量 → 排序 → 统一重命名
 *
 * 注意：该脚本只处理已经进入 Subscription 的 Node[]，无法读取 Airport 流量。
 * bkm 套餐会按月重置，不在脚本里按流量状态排除；流量状态应由外部 Eligibility
 * Controller 根据 Subscription-Userinfo 管理，确保耗尽后排除、重置后自动恢复。
 */

const POLICY = {
  // 仅用于明确的人工停用；不要把会按月重置的 bkm SourceID 写在这里。
  disabledSourceIDs: new Set(),

  // 数值越小，等价端点选择和最终排序的优先级越高。
  sourcePriority: {
    3: 10,  // hiven-duck-bkm-60
    2: 20,  // cr-linux-bkm-60
    1: 30,  // conor-bkm-100
    4: 40,  // hiven-linux-bkm-60
    8: 100, // helen（自建/私有）
    6: 200, // linux-share-8
    7: 210, // linux-share-6
    9: 220, // linux-share-5
    10: 230, // linux-share-4
    11: 240, // linux-share-9
    12: 250, // linux-share-3
    13: 260, // linux-share-2
    14: 270  // linux-share-1
  },

  sourceTier: {
    1: "paid",
    2: "paid",
    3: "paid",
    4: "paid",
    8: "self",
    6: "shared",
    7: "shared",
    9: "shared",
    10: "shared",
    11: "shared",
    12: "shared",
    13: "shared",
    14: "shared"
  },

  sourceLabel: {
    1: "conor",
    2: "cr-linux",
    3: "hiven-duck",
    4: "hiven-linux",
    8: "helen",
    6: "linux-share-8",
    7: "linux-share-6",
    9: "linux-share-5",
    10: "linux-share-4",
    11: "linux-share-9",
    12: "linux-share-3",
    13: "linux-share-2",
    14: "linux-share-1"
  },

  // 未登记的新 Source 按分享池严格处理，避免未知公共来源直接进入成品订阅。
  defaultTier: "shared",
  defaultPriority: 1000,

  allowedProtocols: new Set([
    "vless", "vmess", "trojan", "hysteria2", "hy2", "ss",
    "anytls", "tuic", "mieru", "socks5", "http", "https"
  ]),

  blockedCountries: new Set(["RU", "IN"]),
  preferredCountries: ["HK", "JP", "SG", "US", "TW"],
  maxPerCountry: 10,
  maxUnknownCountry: 20,

  // 分享池必须有成功延迟，并且有正数测速；Speed 缺失时尝试从名称解析 MB/s。
  sharedMinSpeedMBps: 0,

  // 欺诈评分仅约束分享池。未完成质量检测时暂时放行，避免检测服务异常导致订阅清空。
  sharedMaxFraudScore: 70,
  sharedRequireQualityResult: false
};

const INFO_NODE_PATTERN = /(剩余流量|流量剩余|套餐到期|距离下次|下次重置|官网|官址|建议|公告|客服|工单|订阅地址|更新时间|过期时间|traffic|expire|reset|official\s*site)/i;

const COUNTRY_PATTERNS = [
  ["HK", /(香港|hong\s*kong|\bHK\b)/i],
  ["MO", /(澳门|macao|macau|\bMO\b)/i],
  ["TW", /(台湾|台北|taiwan|taipei|\bTW\b)/i],
  ["JP", /(日本|东京|大阪|japan|tokyo|osaka|\bJP\b)/i],
  ["KR", /(韩国|首尔|korea|seoul|\bKR\b)/i],
  ["SG", /(新加坡|狮城|singapore|\bSG\b)/i],
  ["US", /(美国|洛杉矶|纽约|西雅图|圣何塞|united\s*states|los\s*angeles|new\s*york|seattle|san\s*jose|\bUSA?\b)/i],
  ["GB", /(英国|伦敦|united\s*kingdom|london|\bUK\b|\bGB\b)/i],
  ["FR", /(法国|巴黎|france|paris|\bFR\b)/i],
  ["DE", /(德国|法兰克福|germany|frankfurt|\bDE\b)/i],
  ["AU", /(澳大利亚|澳洲|悉尼|墨尔本|australia|sydney|melbourne|\bAU\b)/i],
  ["CA", /(加拿大|多伦多|温哥华|canada|toronto|vancouver|\bCA\b)/i],
  ["NL", /(荷兰|阿姆斯特丹|netherlands|amsterdam|\bNL\b)/i],
  ["CH", /(瑞士|苏黎世|switzerland|zurich|\bCH\b)/i],
  ["RO", /(罗马尼亚|romania|bucharest|\bRO\b)/i],
  ["RU", /(俄罗斯|莫斯科|russia|moscow|\bRU\b)/i],
  ["IN", /(印度|孟买|india|mumbai|\bIN\b)/i],
  ["TR", /(土耳其|伊斯坦布尔|turkey|istanbul|\bTR\b)/i],
  ["TH", /(泰国|曼谷|thailand|bangkok|\bTH\b)/i],
  ["VN", /(越南|河内|胡志明|vietnam|hanoi|\bVN\b)/i],
  ["MY", /(马来西亚|吉隆坡|malaysia|kuala\s*lumpur|\bMY\b)/i],
  ["ID", /(印度尼西亚|印尼|雅加达|indonesia|jakarta|\bID\b)/i],
  ["PH", /(菲律宾|马尼拉|philippines|manila|\bPH\b)/i],
  ["BR", /(巴西|圣保罗|brazil|sao\s*paulo|\bBR\b)/i],
  ["AE", /(阿联酋|迪拜|united\s*arab\s*emirates|dubai|\bAE\b)/i],
  ["ZA", /(南非|约翰内斯堡|south\s*africa|johannesburg|\bZA\b)/i],
  ["UA", /(乌克兰|基辅|ukraine|kyiv|kiev|\bUA\b)/i],
  ["EE", /(爱沙尼亚|塔林|estonia|tallinn|\bEE\b)/i]
];

function numberValue(value, fallback) {
  const parsed = Number(value);
  return isFinite(parsed) ? parsed : fallback;
}

function sourceID(node) {
  const value = numberValue(node && node.SourceID, 0);
  return value < 0 ? Math.ceil(value) : Math.floor(value);
}

function sourceTier(node) {
  return POLICY.sourceTier[sourceID(node)] || POLICY.defaultTier;
}

function sourcePriority(node) {
  const value = POLICY.sourcePriority[sourceID(node)];
  return typeof value === "number" ? value : POLICY.defaultPriority;
}

function nodeName(node) {
  return String((node && (node.Name || node.LinkName)) || "");
}

function isInformationNode(node) {
  return INFO_NODE_PATTERN.test(nodeName(node));
}

function normalizedProtocol(node) {
  return String((node && node.Protocol) || "").trim().toLowerCase();
}

function codePointAtCompat(text, index) {
  const first = text.charCodeAt(index);
  if (first >= 0xd800 && first <= 0xdbff && index + 1 < text.length) {
    const second = text.charCodeAt(index + 1);
    if (second >= 0xdc00 && second <= 0xdfff) {
      return ((first - 0xd800) * 0x400) + second - 0xdc00 + 0x10000;
    }
  }
  return first;
}

function countryFromFlag(text) {
  for (let i = 0; i < text.length - 1; i += 1) {
    const first = codePointAtCompat(text, i);
    const firstWidth = first > 0xffff ? 2 : 1;
    const second = codePointAtCompat(text, i + firstWidth);
    if (first >= 0x1f1e6 && first <= 0x1f1ff && second >= 0x1f1e6 && second <= 0x1f1ff) {
      return String.fromCharCode(first - 0x1f1e6 + 65, second - 0x1f1e6 + 65);
    }
  }
  return "";
}

function normalizeCountry(value) {
  const text = String(value || "").trim();
  if (/^[A-Za-z]{2}$/.test(text)) {
    return text.toUpperCase();
  }

  const flagCountry = countryFromFlag(text);
  if (flagCountry) {
    return flagCountry;
  }

  for (let i = 0; i < COUNTRY_PATTERNS.length; i += 1) {
    if (COUNTRY_PATTERNS[i][1].test(text)) {
      return COUNTRY_PATTERNS[i][0];
    }
  }
  return "OT";
}

function countryOf(node) {
  const explicit = normalizeCountry(node && node.LinkCountry);
  return explicit !== "OT" ? explicit : normalizeCountry(nodeName(node));
}

function exactCredentialKey(node) {
  const contentHash = String((node && node.ContentHash) || "").trim();
  if (contentHash) {
    return "hash:" + contentHash;
  }

  const link = String((node && node.Link) || "").trim();
  if (link) {
    return "link:" + link;
  }
  return "id:" + String((node && node.ID) || "unknown");
}

function endpointHost(node) {
  let host = String((node && (node.LinkAddress || node.LinkHost)) || "").trim().toLowerCase();
  const port = String((node && node.LinkPort) || "").trim();

  if (host.startsWith("[") && host.includes("]")) {
    host = host.slice(1, host.indexOf("]"));
  } else if (port && host.endsWith(":" + port)) {
    host = host.slice(0, -(port.length + 1));
  }
  return host;
}

function equivalentEndpointKey(node) {
  const host = endpointHost(node);
  const port = String((node && node.LinkPort) || "").trim();
  if (!host || !port) {
    return "unique:" + exactCredentialKey(node);
  }
  return normalizedProtocol(node) + "|" + host + "|" + port;
}

function delayValue(node) {
  return numberValue(node && node.DelayTime, -1);
}

function measuredSpeed(node) {
  const speed = numberValue(node && node.Speed, -1);
  if (speed > 0) {
    return speed;
  }

  const match = nodeName(node).match(/(?:^|[^\d])(\d+(?:\.\d+)?)\s*MB\/s/i);
  return match ? numberValue(match[1], -1) : -1;
}

function fraudScore(node) {
  const score = numberValue(node && node.FraudScore, -1);
  return score >= 0 && score <= 100 ? score : -1;
}

function hasCompleteQualityResult(node) {
  const status = String((node && node.QualityStatus) || "").trim().toLowerCase();
  return status === "success" && fraudScore(node) >= 0;
}

function passesFraudPolicy(node) {
  if (sourceTier(node) !== "shared") {
    return true;
  }
  if (!hasCompleteQualityResult(node)) {
    return !POLICY.sharedRequireQualityResult;
  }
  return fraudScore(node) <= POLICY.sharedMaxFraudScore;
}

function endpointEligibilityRank(node) {
  if (sourceTier(node) !== "shared") {
    return 0;
  }
  return passesHealthPolicy(node) && passesFraudPolicy(node) ? 0 : 1;
}

function sharedQualityRank(node) {
  if (sourceTier(node) !== "shared" || !hasCompleteQualityResult(node)) {
    return 101;
  }
  return fraudScore(node);
}

function comparePreferred(a, b) {
  const eligibilityDiff = endpointEligibilityRank(a) - endpointEligibilityRank(b);
  if (eligibilityDiff !== 0) {
    return eligibilityDiff;
  }

  if (sourceTier(a) === "shared" && sourceTier(b) === "shared") {
    const qualityDiff = sharedQualityRank(a) - sharedQualityRank(b);
    if (qualityDiff !== 0) {
      return qualityDiff;
    }
  }

  const priorityDiff = sourcePriority(a) - sourcePriority(b);
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  const aDelay = delayValue(a) > 0 ? delayValue(a) : 9007199254740991;
  const bDelay = delayValue(b) > 0 ? delayValue(b) : 9007199254740991;
  if (aDelay !== bDelay) {
    return aDelay - bDelay;
  }

  const speedDiff = measuredSpeed(b) - measuredSpeed(a);
  if (speedDiff !== 0) {
    return speedDiff;
  }
  return numberValue(a && a.ID, 0) - numberValue(b && b.ID, 0);
}

function selectPreferredByKey(nodes, keyFn) {
  const selected = new Map();
  nodes.forEach((node) => {
    const key = keyFn(node);
    const current = selected.get(key);
    if (!current || comparePreferred(node, current) < 0) {
      selected.set(key, node);
    }
  });
  return Array.from(selected.values());
}

function passesHealthPolicy(node) {
  if (sourceTier(node) !== "shared") {
    return true;
  }
  return delayValue(node) > 0 && measuredSpeed(node) > POLICY.sharedMinSpeedMBps;
}

function countryRank(country) {
  const index = POLICY.preferredCountries.indexOf(country);
  return index === -1 ? POLICY.preferredCountries.length : index;
}

function compareFinal(a, b) {
  const priorityDiff = sourcePriority(a) - sourcePriority(b);
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  const countryDiff = countryRank(countryOf(a)) - countryRank(countryOf(b));
  if (countryDiff !== 0) {
    return countryDiff;
  }

  const countryNameDiff = countryOf(a).localeCompare(countryOf(b));
  if (countryNameDiff !== 0) {
    return countryNameDiff;
  }
  return comparePreferred(a, b);
}

function limitByCountry(nodes) {
  const counts = new Map();
  return nodes.filter((node) => {
    const country = countryOf(node);
    const limit = country === "OT" ? POLICY.maxUnknownCountry : POLICY.maxPerCountry;
    const count = counts.get(country) || 0;
    if (count >= limit) {
      return false;
    }
    counts.set(country, count + 1);
    return true;
  });
}

function renameNodes(nodes) {
  const counters = new Map();
  nodes.forEach((node) => {
    const country = countryOf(node);
    const label = POLICY.sourceLabel[sourceID(node)] || ("source-" + sourceID(node));
    const counterKey = country + "|" + label;
    const sequence = (counters.get(counterKey) || 0) + 1;
    counters.set(counterKey, sequence);
    node.Name = country + " | " + label + " | " + String(sequence).padStart(2, "0");
  });
  return nodes;
}

function filterNode(nodes, clientType) {
  if (!Array.isArray(nodes)) {
    throw new TypeError("filterNode expects an array");
  }

  const stats = { input: nodes.length };

  let result = nodes.filter((node) => !POLICY.disabledSourceIDs.has(sourceID(node)));
  stats.enabled = result.length;

  result = result.filter((node) => {
    if (isInformationNode(node)) {
      return false;
    }
    const protocol = normalizedProtocol(node);
    if (!protocol || !POLICY.allowedProtocols.has(protocol)) {
      return false;
    }
    return !POLICY.blockedCountries.has(countryOf(node));
  });
  stats.base = result.length;

  result = selectPreferredByKey(result, exactCredentialKey);
  stats.exact = result.length;

  result = selectPreferredByKey(result, equivalentEndpointKey);
  stats.endpoint = result.length;

  result = result.filter(passesHealthPolicy);
  stats.healthy = result.length;

  stats.qualityComplete = result.filter((node) => (
    sourceTier(node) === "shared" && hasCompleteQualityResult(node)
  )).length;
  const beforeFraud = result.length;
  result = result.filter(passesFraudPolicy);
  stats.fraudRejected = beforeFraud - result.length;

  result.sort(compareFinal);
  result = limitByCountry(result);
  stats.limited = result.length;

  result = renameNodes(result);
  console.info(
    "[sublinkpro-node-processor] client=" + String(clientType || "unknown") +
    " input=" + stats.input +
    " enabled=" + stats.enabled +
    " base=" + stats.base +
    " exact=" + stats.exact +
    " endpoint=" + stats.endpoint +
    " healthy=" + stats.healthy +
    " qualityComplete=" + stats.qualityComplete +
    " fraudRejected=" + stats.fraudRejected +
    " output=" + result.length
  );
  return result;
}

// 保留最终文本原样，便于同一脚本同时绑定节点过滤和订阅后处理阶段。
function subMod(input, clientType) {
  return input;
}
