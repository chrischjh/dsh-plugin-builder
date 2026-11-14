# Publish and verify

## Before release

- `node --test` green; `npm pack --dry-run` lists patch, client, locales, icon, README, LICENSE/NOTICE.
- Version bumped + CHANGELOG entry; `engines.dsh` / `engines.node` match reality.
- Namespaced patch ids; no dependency on shipped DSH packages; `.gitattributes` pins LF for hashed files.
- Repo metadata (`repository`/`homepage`/`bugs`) uses the real GitHub owner; badges point there too.

## npm

- Check the name first: `npm view <name> version` → 404 means free.
- **2FA accounts:** `npm publish` in a pipe exits with `EOTP`; run it under a pseudo-TTY so it waits for browser auth:

```bash
script -q /tmp/npm-publish.log npm publish --access public    # start in background
grep -o 'https://www.npmjs.com/auth/cli/[a-z0-9-]*' /tmp/npm-publish.log | head -1
```

Open that URL in the user's browser, authorize with the security key (a browser session already logged into npmjs can complete it), then wait for `+ <pkg>@<version>`. The auth session expires after a couple of minutes; if the CLI reports `404 ... /-/v1/done?authId`, start again for a fresh URL (the `***` redaction is normal — read the URL from the TTY log, not from the masked stderr).

- New packages first appear as `0.0.0-stage` ("Temporary package placeholder for staged publishing"); the real version shows up after a few minutes. Not a failure — poll `npm view <name> version`.
- `pnpm`/DSH enforce **minimumReleaseAge**: a just-published version may be refused or silently resolve to the previous one. Install with an exact spec (`pkg@0.2.4`); `plugin_manager` adds the version to `minimumReleaseAgeExclude`.

## GitHub

- Public repo with the bundle at the root (or a subpackage with `dsh.bundle`), plus tags `v<version>`.
- CI matrix: `ubuntu-latest`, `macos-latest`, `windows-latest` × Node 20/22 → `node --test`, `npm pack --dry-run`, manifest sanity.
- Release workflow on `v*`: test, `npm publish` guarded by the secret, then a GitHub release:

```yaml
env: { NPM_TOKEN: ${{ secrets.NPM_TOKEN }} }
- name: Publish to npm
  if: env.NPM_TOKEN != ''
  run: npm publish
  env: { NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }} }
```

- Without the secret, keep the release green (skip publish) instead of leaving red runs.

## Plugin market

- [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin): one PR file `data/plugins/<owner>__<repo>.yml` (url, name, category, description en/zh, optional raster icon). Requirements: `dsh.bundle` declared, real code, public repo ≥ 1 day old.
- Until the catalog merges, users add the index source `https://cdn.jsdelivr.net/npm/dsh-plugin-catalog/index.json` under **Plugins → Discover → Index sources**.
- Install specs users see: npm `pkg`, `github:owner/repo`, release tarball, or a cloned directory.

## Verification playbook

Install result `application: applied` proves only that the bundle mounted. Then:

1. **Host tools** — `cordis_inspect_query` → Host `Tool.listTools`: your tool and the MCP tools exist with the expected public names.
2. **Client slots** — Client `Slots.listSubTree` with your slot root; your registration must be an *active occupant* (proves the client module loaded, ModuleLoader id correct, primitives resolved).
3. **Rows** — `plugin_manager` `list_plugins`: entry ids, `fiberPhase`; the row title should be localized, not a bare module name.
4. **Capability** — call the tool / load the skill / POST the route. Compare state changes and error shapes with the tool path.
5. **Upgrade** — install from the **packed artifact/registry spec**, not a linked checkout, and repeat 1–4.

### Other machines, no SSH

- Ask for `dsh --version`, the profile's `package.json` bundles list, and `grep -rn <row-id> ~/.dsh --include='*.yml'`.
- A difference like a localized row title on one machine and a bare module name on another means a shadowed package version — see `integration-and-repair.md`.
- Remote diagnosis via a browser/remote-desktop tool: keep input scoped to the remote window, prefer a terminal on the remote machine, and never type into unrelated foreground apps.
- SSH when available: enable Remote Login, add a dedicated key, verify `nc -z <ip> 22`; blocked inbound is usually VPN/pf rules (`pfctl -s rules`) or router NAT.
- Windows-specific: CI is the honest test; local checks can only cover path/CRLF logic.
