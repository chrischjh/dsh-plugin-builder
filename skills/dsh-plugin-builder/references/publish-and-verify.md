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

## Plugin market (awesome-dsh-plugin catalog)

The market inside DSH (`dsh-market`) is **the app, not the catalog**. Its README says plainly: do not PR plugin entries against that repo. Listings come from the curated catalog repo [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin); the site and the in-DSH market pick entries up automatically (usually within a day of merge).

One entry = one new file. Never edit the generated READMEs.

### Requirements (all checked; CI or maintainer)

- Root or subpackage `package.json` declares `dsh.bundle` **with** `cordis.patch.yml` beside it. `dsh.client` alone is not installable and is the most common rejection.
- Real, working code — placeholders, name-squats and README-only repos are rejected. A pure aggregation bundle (only a dependency list, no behaviour of its own) is not listed; list the individual plugins instead.
- Repo public and **at least 1 day old** (`MIN_AGE_DAYS = 1`, measured from the repository's `created_at`). The gate re-runs itself: the failure message says it should clear within the shown hours and that resubmitting or reopening the PR is unnecessary — leave the PR open.
- Repo carries the [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic.
- Description states what the plugin does, no superlatives, and must be true — reviewers count tools, check command/API names against the source. Overstating is the main reason a good plugin gets sent back.
- PR touches only your own entry file(s).

### Entry file

Path: `data/plugins/<owner>__<repo>.yml` (monorepo subpackage: `owner__repo--packages-name.yml`, `name: owner/repo#subname`, `url` pointing at the subdirectory).

```yaml
url: https://github.com/owner/repo
name: owner/repo
category: skill            # agi ui usage theme model identity session memory tools wsl browser vision voice docs skill workflow git notify dev security remote market fun
description:
  en: 'One sentence. Quote it when it contains ": " (YAML would parse a nested key otherwise).'
  zh: '中文一句话，以句号结尾。可选——不写由维护者补，不算打回理由。'
# optional, GitHub-hosted RASTER image used as the card tile; falls back to the owner avatar
# icon: https://raw.githubusercontent.com/owner/repo/main/assets/icon-180.png
# optional, when source install needs build approval — prebuilt release tarball
# tarball: https://github.com/owner/repo/releases/download/v1.0.0/pkg-1.0.0.tgz
```

Only `description.en` is required. `category` is judgement-light: a near miss is re-filed by a maintainer, not bounced.

### Open the PR (fork + one file via API)

```bash
# 1. fork and branch from the fork's main
gh repo fork awesome-dsh-plugin/awesome-dsh-plugin --clone=false
BASE=$(gh api repos/<you>/awesome-dsh-plugin/git/ref/heads/main --jq .object.sha)
gh api -X POST repos/<you>/awesome-dsh-plugin/git/refs \
  -f ref=refs/heads/submit/<name> -f sha=$BASE

# 2. add exactly one entry file (contents API keeps the fork clean)
gh api -X PUT "repos/<you>/awesome-dsh-plugin/contents/data/plugins/<owner>__<repo>.yml" \
  -f message="Add <owner>/<repo>" -f content="$(base64 -i entry.yml)" -f branch=submit/<name>

# 3. open the PR against the catalog
gh pr create -R awesome-dsh-plugin/awesome-dsh-plugin \
  --head <you>:submit/<name> \
  --title "Add <owner>/<repo> (<category>)" --body-file pr-body.md
```

Prefer one PR per plugin. In the PR body: what it is, the `dsh.bundle` proof (a one-line `package.json` check is enough), description-accuracy evidence (number of tools/rows, the IDs it registers), and the npm/`tarball` install path. If CI is red only on repo age, say so and leave it — the gate re-runs.

### Duplicates, timing and after merge

- Two plugins doing the same thing: whoever was listed first keeps the slot, unless the newer one is better kept or genuinely adds something. A fork can be listed; a second near-copy usually is not. Differentiate on real behaviour in the description.
- The age gate resolves ~24h after the repository's `created_at`; a PR opened earlier simply waits with a red check, and reviewers see the gate's own explanation.
- After merge: site + market index rebuild automatically; no extra submission. The generated README updates on `main`; do not hand-edit it.
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
