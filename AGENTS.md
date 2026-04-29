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
- Apple traffic is intentionally routed through the `🍎 Apple` policy group, which defaults to `DIRECT`.
- Google traffic is intentionally routed through the `🍀 Google` group, with home broadband available first.
- Video-heavy services such as YouTube, X, and TikTok should not default to home broadband first unless there is a specific reason.
- Optional compatibility modules, such as WeChat direct routing, should default to `enabled=false` unless broadly safe.

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
