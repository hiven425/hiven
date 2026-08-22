const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "sublinkpro-node-processor.js"), "utf8");
const context = vm.createContext({
  console: { info() {}, log() {}, warn() {}, error() {} },
  Map,
  Set
});
vm.runInContext(source, context);

function node(overrides = {}) {
  return {
    ID: 1,
    Link: "vless://credential@example.com:443#node",
    Name: "🇯🇵 日本 01",
    LinkName: "🇯🇵 日本 01",
    LinkAddress: "example.com",
    LinkHost: "example.com",
    LinkPort: "443",
    LinkCountry: "",
    Protocol: "vless",
    SourceID: 1,
    DelayTime: -1,
    Speed: -1,
    FraudScore: -1,
    QualityStatus: "untested",
    ContentHash: "hash-1",
    ...overrides
  };
}

{
  const output = context.filterNode([
    node({ ID: 1, SourceID: 3, ContentHash: "same" }),
    node({ ID: 2, SourceID: 1, ContentHash: "same" })
  ], "clash");
  assert.equal(output.length, 1);
  assert.equal(output[0].SourceID, 3, "精确重复应保留高优先级来源");
}

{
  const output = context.filterNode([
    node({ ID: 1, SourceID: 8, ContentHash: "self", LinkAddress: "same.example" }),
    node({ ID: 2, SourceID: 2, ContentHash: "paid", LinkAddress: "same.example" })
  ], "clash");
  assert.equal(output.length, 1);
  assert.equal(output[0].SourceID, 2, "等价端点应保留高优先级来源");
}

{
  const output = context.filterNode([
    node({ SourceID: 4, ContentHash: "monthly-reset", LinkAddress: "monthly-reset.example" }),
    node({ ID: 2, SourceID: 1, ContentHash: "active", LinkAddress: "active.example" })
  ], "clash");
  assert.equal(output.length, 2, "会按月重置的 bkm 来源不得被脚本排除");
}

{
  const output = context.filterNode([
    node({ ID: 1, SourceID: 6, ContentHash: "shared-good", Name: "0.52MB/s | 🇷🇴 RO1", DelayTime: 800 }),
    node({ ID: 2, SourceID: 7, ContentHash: "shared-no-speed", Name: "🇫🇷 France", LinkAddress: "fr.example", DelayTime: 100 }),
    node({ ID: 3, SourceID: 7, ContentHash: "shared-no-delay", Name: "1.2MB/s | 🇫🇷 France", LinkAddress: "fr2.example", DelayTime: -1 })
  ], "clash");
  assert.equal(output.length, 1);
  assert.equal(output[0].ContentHash, "shared-good", "分享池必须同时有延迟和测速");
}

{
  const output = context.filterNode([
    node({
      ID: 1, SourceID: 6, ContentHash: "fraud-70", LinkAddress: "fraud-70.example",
      DelayTime: 100, Speed: 1, FraudScore: 70, QualityStatus: "success"
    }),
    node({
      ID: 2, SourceID: 7, ContentHash: "fraud-71", LinkAddress: "fraud-71.example",
      DelayTime: 100, Speed: 1, FraudScore: 71, QualityStatus: "success"
    }),
    node({
      ID: 3, SourceID: 9, ContentHash: "quality-pending", LinkAddress: "quality-pending.example",
      DelayTime: 100, Speed: 1, FraudScore: -1, QualityStatus: "untested"
    }),
    node({
      ID: 4, SourceID: 1, ContentHash: "paid-high-fraud", LinkAddress: "paid-high.example",
      FraudScore: 100, QualityStatus: "success"
    })
  ], "clash");
  assert.deepEqual(
    Array.from(output, (item) => item.ContentHash).sort(),
    ["fraud-70", "paid-high-fraud", "quality-pending"].sort(),
    "分享池应排除完整结果中评分大于 70 的节点，同时对未检测节点 fail-open"
  );
}

{
  const output = context.filterNode([
    node({
      ID: 1, SourceID: 6, ContentHash: "same-endpoint-dirty", LinkAddress: "same-quality.example",
      DelayTime: 50, Speed: 2, FraudScore: 95, QualityStatus: "success"
    }),
    node({
      ID: 2, SourceID: 7, ContentHash: "same-endpoint-clean", LinkAddress: "same-quality.example",
      DelayTime: 100, Speed: 1, FraudScore: 20, QualityStatus: "success"
    })
  ], "clash");
  assert.equal(output.length, 1);
  assert.equal(
    output[0].ContentHash,
    "same-endpoint-clean",
    "等价端点必须优先保留可用且低欺诈的分享节点，不能先选高风险节点再过滤为空"
  );
}

{
  const output = context.filterNode([
    node({ SourceID: 1, ContentHash: "paid-untested", DelayTime: -1, Speed: -1 }),
    node({ ID: 2, SourceID: 8, ContentHash: "self-untested", LinkAddress: "self.example", DelayTime: -1, Speed: -1 })
  ], "clash");
  assert.equal(output.length, 2, "正式和自建来源不应因尚未测速被激进排除");
}

{
  const fixtures = [];
  for (let i = 0; i < 12; i += 1) {
    fixtures.push(node({
      ID: i + 1,
      SourceID: 1,
      ContentHash: "jp-" + i,
      LinkAddress: "jp-" + i + ".example",
      Name: "🇯🇵 日本 " + i,
      DelayTime: i + 1
    }));
  }
  const output = context.filterNode(fixtures, "clash");
  assert.equal(output.length, 10, "每个已知国家最多保留 10 个节点");
  assert.equal(output[0].Name, "JP | conor | 01");
  assert.equal(output[9].Name, "JP | conor | 10");
}

{
  const output = context.filterNode([
    node({ ID: 1, ContentHash: "ru", Name: "🇷🇺 Russia", LinkAddress: "ru.example" }),
    node({ ID: 2, ContentHash: "in", Name: "🇮🇳 India", LinkAddress: "in.example" }),
    node({ ID: 3, ContentHash: "sg", Name: "🇸🇬 Singapore", LinkAddress: "sg.example" })
  ], "clash");
  assert.equal(output.length, 1);
  assert.equal(output[0].Name, "SG | conor | 01", "RU/IN 应被排除并统一重命名");
}

assert.equal(context.subMod("payload", "clash"), "payload");
console.log("sublinkpro-node-processor: all tests passed");
