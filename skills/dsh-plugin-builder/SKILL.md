---
name: dsh-plugin-builder
description: Build, package, install, upgrade, verify and publish DeepSeek Harness (DSH) plugins. Use whenever the task touches a DSH bundle (package.json with dsh.bundle / dsh.client), a cordis.patch.yml, Host plugin code (ctx.tools / ctx.skills / systemPrompt / webServer / pluginManager), the Client half (slots, detail-page sections, locale, primitives), an MCP row through @deepseek-ai/dsh-mcp-client, or shipping a plugin to npm/GitHub/the plugin market — including diagnosing activation failures such as "declares no dsh.bundle", "saved but overridden by a higher-priority configuration", rows that show a bare module name, or a plugin that installs but does nothing.
version: 1.0.0
---

# DSH plugin builder

This skill is the practical companion to the official `dsh-doc` skill: load `dsh-doc` for exact APIs and current package lists, use this skill for the build → install → verify → publish loop and for the failure modes that cost real debugging time.

**Never guess a DSH API.** Confirm with `cordis_inspect_query` (Host Service/Config/Tool, Client Slots), the installed package README/source, or `skill` → `dsh-doc`. Before publishing, re-read the installed version's docs: bundle contracts change between DSH releases.

## Hard rules (learned by shipping `dsh-copilotkit`)

1. A bundle needs `dsh.bundle.patch`; `dsh.client` alone is **not installable** (`declares no dsh.bundle`).
2. The package name is the install name. Never assume a display title is the spec: `copilotkit` on npm is CopilotKit's CLI, not a DSH plugin. Install specs are package names (`dsh-x`), `github:owner/repo`, or tarball URLs.
3. Namespace patch row ids (`dsh-<plugin>`, `dsh-<plugin>-docs`). Generic ids (`copilotkit-docs`) collide with other bundles' rows and stale profile overrides; the symptom is a vague "overridden" notice.
4. Never statically pin a **shipped** DSH package (`@deepseek-ai/dsh-mcp-client`) as a dependency. A profile-level pin shadows the app's built-in copy; rows then load the wrong version and fail. Detect mismatches instead (see integration-and-repair).
5. `exports`, `files`, and the patch/locale/icon paths must agree. Add `cordis.patch.yml` to `files`, or a published tarball is uninstallable while a linked checkout still works.
6. Verify the installed capability, not the install result: `application: applied` alone proves nothing about tools, skills, slots or routes.
7. Publish flow is part of the work: CI matrix (macOS/Windows/Linux), release workflow with `NPM_TOKEN`, `.gitattributes` LF pin for any file whose hash is checked, and npm's 2FA/staged-publish behavior.
8. Do not edit another plugin's DOM, internals or pinned dependencies without explicit user confirmation; if a repair mutates profile state, require an explicit click/flag.

## Workflow

1. **Choose the surface.** Read `references/bundle-contract.md`, then load `dsh-doc` → `references/plugin-development.md` and `references/packages.md` (in parts). Pick Host-only, configuration-only (MCP), or Host + Client.
2. **Skeleton.** Copy `examples/minimal-bundle/` and rename; add `locale/en.json` + `locale/zh.json`, a 36×36 icon with no tile, README (it is the plugin detail page). See `references/bundle-contract.md`.
3. **Implement.** Host: `references/host-and-client.md`. Client slot/detail section: same file. Integration (MCP row, skills, self-check/repair, HTTP route): `references/integration-and-repair.md`.
4. **Install and verify.** `plugin_manager` `install_bundle` (absolute dir or npm/tarball spec). Then follow `references/publish-and-verify.md` § Verify: inspect slots/tools/config, call the capability, and compare UI-visible state.
5. **Debug.** When activation looks wrong, use `references/pitfalls.md` symptom table first; it maps the exact messages users report to causes and fixes.
6. **Publish.** Bump version + CHANGELOG, tag, release workflow, npm publish (2FA specifics in `references/publish-and-verify.md`), market PR.

## Reference map

| File | Use for |
|---|---|
| `references/bundle-contract.md` | package.json fields, patch semantics, row ids, files/exports, install/upgrade lifecycle, cross-platform packaging |
| `references/host-and-client.md` | Host `apply`/`inject`/`Config`, tool contracts (`output.schema/render`), skills, prompt sections, web routes, pluginManager calls; Client ModuleLoader, slots, detail-page sections, locale, primitives, artwork |
| `references/integration-and-repair.md` | MCP rows, serverName/row-id namespacing, shadow detection, guarded auto-align, self-check + repair pattern, same-origin route security, Toast error surfaces |
| `references/publish-and-verify.md` | npm staged publishing, 2FA web-auth via pseudo-TTY, minimumReleaseAge, GitHub Actions CI/release, market catalog PR, verification playbook incl. remote diagnosis |
| `references/pitfalls.md` | Symptom → cause → fix table: no dsh.bundle, overridden, bare module name, already-installed, store mismatch, version shadow, CRLF hashes, route/auth, HMR restart |

## Done checklist

- [ ] `node --test` green; `npm pack --dry-run` contains patch, client, locales, icon, skills if any
- [ ] Installed from the **packed artifact or registry spec**, not only a linked checkout
- [ ] Capability exercised: tool call / skill load / slot occupant / route response
- [ ] Plugin row shows the intended localized title, not a bare module name
- [ ] Disabling rows leaves a documented degraded mode; failures surface through official error channels
- [ ] Version bumped, CHANGELOG updated, tag pushed, release + CI green
- [ ] `dsh.engines.dsh` matches the actually supported DSH range; Windows path/CRLF risks reviewed
