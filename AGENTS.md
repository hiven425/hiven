# AGENTS.md

## Purpose

This repository stores personal proxy and routing configurations for:

- Shadowrocket on iPhone/iPad
- Clash / Mihomo variants on desktop and routers
- Shared rule lists, helper scripts, and wrapper modules published through GitHub raw URLs

The repo is public. Changes should assume end users may subscribe to files directly from `raw.githubusercontent.com`.

## Repository Layout

- `Shadowrocket/`
  - Main Shadowrocket config entrypoint.
  - Current primary file: `Shadowrocket/Shadowrocket.conf`
- `clash/`
  - Clash, Mihomo, Clash Verge, and ini/yaml templates.
- `config/`
  - Shared rule lists (`*.list`, `*.yaml`)
  - Helper scripts (`*.js`)
  - Shadowrocket wrapper modules (`shadowrocket-*.sgmodule`)
- `README.md`
  - Minimal project overview.

## Source Of Truth

- Shadowrocket users should treat `Shadowrocket/Shadowrocket.conf` as the main maintained config.
- Shared routing assets should live in `config/` and be referenced by raw GitHub URLs where needed.
- When the same routing intent exists in both Shadowrocket and Clash/Mihomo files, keep behavior aligned unless platform differences require otherwise.

## Editing Rules

- Preserve existing Chinese comments and naming unless there is a strong reason to normalize.
- Prefer small, targeted edits. This repo is configuration-heavy, so ordering matters.
- Do not replace local wrapper modules with upstream modules when the local copy exists to patch behavior.
- For Shadowrocket MITM modules, prefer `%APPEND%` in `[MITM] hostname` entries to avoid overwrite conflicts between modules.
- Keep public raw URLs stable. If you rename or remove a file under `config/`, update every referencing config in the repo.
- Avoid embedding private secrets, certificates, tokens, or personal endpoints.

## Shadowrocket-Specific Notes

- `[Module]` ordering matters. Ad-block and wrapper modules can override each other.
- Local wrapper modules under `config/shadowrocket-*.sgmodule` exist to preserve upstream behavior while fixing Shadowrocket compatibility issues.
- Apple traffic is routed through the `🍎 Apple` policy group; the group includes `DIRECT` as one of its options so traffic can fall back to direct when needed.
- Google traffic is intentionally routed through the `🍀 Google` group, with home broadband available first.
- Video-heavy services such as YouTube, X, and TikTok should not default to home broadband first unless there is a specific reason.
- Optional compatibility modules, such as WeChat direct routing, should default to `enabled=false` unless broadly safe.

### Routing Architecture

- **Country auto-test groups** (`🇭🇰 / 🇹🇼 / 🇸🇬 / 🇯🇵 / 🇺🇲`) include home-broadband nodes whose names contain the matching country keyword. To reach a region without consuming home BB quota, manually select from `🏠 家宽节点` or build a separate exclusion-based group.
- **Telegram / Meta IP fallback**: Telegram clients hardcode MTProto DC IPs; WhatsApp / Instagram media also bypass DNS via Meta CDN IPs. The `[Rule]` block places `geoip/telegram.list` and `geoip/facebook.list` (covers all Meta AS32934 ranges) immediately before `GEOIP,CN`. Do not move these below `GEOIP,CN` or `FINAL` — they exist specifically to catch traffic that DOMAIN-SET cannot see.
- **FINAL behavior**: `FINAL,🐟 漏网之鱼` and the catch-all group defaults to `🚀 节点选择`. With `GEOIP,CN,DIRECT` listed before it, unmatched traffic is treated as foreign and proxied by default to avoid silent failures from hardcoded-IP clients.
- **UDP policy**: `udp-policy-not-supported-behaviour = REJECT` deliberately fails closed when the active node lacks UDP support. Voice/video calls (Telegram, WhatsApp) require a UDP-capable node.
- **QUIC**: `block-quic = all-proxy` blocks QUIC on the proxy path to avoid UDP leaking past TCP rules. If the chosen node has reliable UDP and the user prefers HTTP/3 performance for Google / Cloudflare, this can be set to `off`.

## Publishing Rules

- Many files reference this repository through URLs like:
  - `https://raw.githubusercontent.com/hiven425/hiven/refs/heads/master/...`
- If you add a new file and reference it from a config, the reference will not work until the file is committed and pushed.
- After adding or renaming a published asset, verify the raw URL returns `HTTP 200`.

## Validation Checklist

Before finishing a change:

- Run `git diff --check`
- Inspect the final diff for config ordering regressions
- If a new raw-published file was added, verify it with `curl -I`
- If changing Shadowrocket module behavior, re-check `[Module]`, `[MITM]`, and related `[Rule]` ordering together

## Git Rules

- The default branch is `master`.
- Use non-interactive Git commands only.
- Keep commits focused and stable.
- If the user explicitly requests public history cleanup, it is acceptable to rewrite the branch into a single root commit and force-push `origin/master`.
- Do not rewrite public history unless the user clearly asks for it.

## Recommended Workflow For Codex

1. Inspect `Shadowrocket/Shadowrocket.conf` and any referenced files under `config/`.
2. Check whether the same logic also exists in `clash/` templates and decide whether parity is needed.
3. Make the smallest safe edit.
4. Validate with `git diff --check` and raw URL checks when applicable.
5. Commit only when the repo is in a stable state.
