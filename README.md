# hiven

自用代理 / 路由配置。仓库公开，所有文件可通过 `raw.githubusercontent.com` 直接订阅。

## 目录结构

| 路径 | 用途 |
| --- | --- |
| `Shadowrocket/Shadowrocket.conf` | iPhone / iPad 主配置（主要维护对象） |
| `clash/` | Clash、Mihomo、Clash Verge 等桌面端/路由器模板 |
| `config/` | 共享规则集 `*.list`、Shadowrocket 包装模块 `*.sgmodule`、辅助脚本 |
| `qx/` | QuantumultX 模板 |

## Shadowrocket 配置要点

- **国家自动测速组**（🇭🇰 / 🇹🇼 / 🇸🇬 / 🇯🇵 / 🇺🇲）已包含家宽节点；如需独占家宽线路请使用 `🏠 家宽节点` 手选组。
- **Telegram / Meta 系 IP 兜底**：在 `GEOIP,CN` 之前通过 `geoip/telegram.list` 与 `geoip/facebook.list` 截取硬编码 IP 流量，避免 Telegram / WhatsApp / Instagram 等客户端绕过 DNS 直连 IP 而落到 FINAL 直连。
- **FINAL 策略**：默认指向 `🚀 节点选择`，搭配 `GEOIP,CN,DIRECT` 在前，未匹配的境外流量始终走代理，避免「漏网之鱼=直连」时的沉默失败。
- **UDP 策略**：`udp-policy-not-supported-behaviour = REJECT`——节点不支持 UDP 时拒绝回退，防 DNS/语音泄露。需要 UDP 的应用（Telegram 语音、WhatsApp 通话）请确保选用 UDP 友好的节点。
- **DNS 防泄露**：DoH (`#no-h3`) + `hijack-dns` 拦截常见硬编码 DNS 端口；`block-quic = all-proxy` 阻断代理通道的 QUIC，若节点 UDP 稳定可改为 `off` 以提升 Google / Cloudflare 速度。

## 订阅 URL

```
https://raw.githubusercontent.com/hiven425/hiven/refs/heads/master/Shadowrocket/Shadowrocket.conf
```

## 维护规则

- 详细编辑约束见 [`AGENTS.md`](./AGENTS.md)。
- 修改公开 raw 资源后需 commit + push，否则订阅端拉到 404。
- Shadowrocket `[Module]` 顺序与 `[MITM]` hostname 合并方式注意保留 `%APPEND%`，避免互相覆盖。
