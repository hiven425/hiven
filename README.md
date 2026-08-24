# hiven

面向 Mihomo/Sparkle、Shadowrocket 和 Quantumult X 的 DNS、分流与防泄漏配置。仓库公开，只保存不含节点、Token 和证书的配置与规则。

## 一源多端

节点以 SublinkPro 中的一条订阅记录为唯一数据源，每个设备使用独立分享 Token：

- Sparkle 使用原生 `client=mihomo` 输出。生产 SublinkPro 的订阅 `clash` 模板字段直接使用下方 `mihomo.sublinkpro.yaml` raw URL，并保留同名本地模板作为回滚备份。
- Shadowrocket 导入本仓库公共配置，再在 App 中添加私有 `client=shadowrocket` 节点订阅。
- Quantumult X 导入本仓库公共配置，再在资源页面添加私有 `client=quanx` 节点订阅。

Sub-Store sidecar 只转换节点格式，不合并 DNS、策略组或规则。生产环境应把 Sub-Store 保持在与 SublinkPro 相同的私有容器网络中，不发布服务端口。

SublinkPro 模板管理页的“远程规则地址”是 ACL 规则源，不是整份模板 URL；不得将下方 YAML/CONF 地址填入该字段。

## 公共配置 URL

| 客户端 | URL |
| --- | --- |
| Sparkle 独立模板 | `https://raw.githubusercontent.com/hiven425/hiven/refs/heads/master/clash/mihomo.sparkle.yaml` |
| SublinkPro Mihomo 模板 | `https://raw.githubusercontent.com/hiven425/hiven/refs/heads/master/clash/mihomo.sublinkpro.yaml` |
| Shadowrocket | `https://raw.githubusercontent.com/hiven425/hiven/refs/heads/master/Shadowrocket/Shadowrocket.conf` |
| Quantumult X | `https://raw.githubusercontent.com/hiven425/hiven/refs/heads/master/qx/qx.conf` |

不要在公开配置的 `[server_remote]`、`proxies`、注释或示例中填写真实订阅地址。

## 安全基线

- Mihomo/Sparkle 保留双栈，使用严格 TUN 路由、DNS 劫持、Fake-IP 与 DoH；IPv4/IPv6 私网地址显式直连。
- 根据 [Mihomo TUN 说明](https://wiki.metacubex.one/config/inbound/tun/)，系统没有 IPv6 接口时会自动停用 TUN IPv6 地址，纯 IPv4 网络通常无需换模板。如果网络广播了 IPv6 但实际不可用，应在客户端覆写中同时设置顶层 `ipv6: false` 和 `dns.ipv6: false`，避免 AAAA 尝试带来延迟。
- Shadowrocket 与 Quantumult X 关闭 IPv6，并禁用系统 DNS 回退。
- Shadowrocket 和 QX 在节点不支持 UDP 时拒绝回退；两端默认阻断 UDP 443，避免 QUIC 绕过策略。
- FINAL 默认进入代理选择，只有中国、局域网和显式直连规则使用直连。
- Shadowrocket 如需访问 tailnet，需在 App 中手动启用内置 Tailscale 全局隧道；主配置已保留 `TAILSCALE` 规则，且不会将 `100.64.0.0/10` 排除出隧道。
- 主配置不自动启用广告、VIP、MITM、重写或远程脚本。`config/*.sgmodule` 仅作为手动可选模块保留。

## 目录结构

| 路径 | 用途 |
| --- | --- |
| `clash/mihomo.sparkle.yaml` | Sparkle/Mihomo 独立模板 |
| `clash/mihomo.sublinkpro.yaml` | SublinkPro 节点注入模板 |
| `Shadowrocket/Shadowrocket.conf` | Shadowrocket 公共主配置 |
| `qx/qx.conf` | Quantumult X 公共主配置 |
| `qx/rules/` | 由共享规则生成的原生 QX 规则 |
| `config/` | 共享规则、可选模块、节点加工器及校验脚本 |

## 维护与验证

- 详细编辑约束见 [`AGENTS.md`](./AGENTS.md)。
- 修改 `config/Direct.list`、`AI.list`、`Talkatone.list`、`Payment.list`、`wm.list` 或 `ProxyLite.list` 后，运行 `node config/qx-rules-sync.test.js --write`，再运行不带参数的校验命令。
- 运行 `node config/sublinkpro-node-processor.test.js` 验证统一节点加工器。
- 运行 `node config/profile-security.test.js` 验证三端 DNS、UDP 回退、FINAL 和策略/规则引用。
- 使用官方 Mihomo 镜像对两份 YAML 执行配置测试，并扫描所有公共文件确认没有凭据。
- 公开 raw 资源只有合并到 `master` 并推送后才会生效；发布失败应使用 revert 回滚，不重写 Git 历史。
