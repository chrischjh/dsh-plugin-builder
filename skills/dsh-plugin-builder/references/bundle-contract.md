# Bundle contract

## Manifest

```json
{
  "name": "dsh-my-plugin",
  "version": "0.1.0",
  "type": "module",
  "license": "MIT",
  "exports": {
    ".": "./index.js",
    "./client": "./client.js",
    "./locale/*.json": "./locale/*.json",
    "./icon": "./icon.svg"
  },
  "files": ["index.js", "client.js", "cordis.patch.yml", "locale/*.json", "icon.svg", "README.md", "LICENSE"],
  "dsh": {
    "engines": { "dsh": ">=0.2.0-rc.2 <0.3.0" },
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web", "inject": ["@deepseek-ai/dsh-client-ui-plugin-manager"] }
  }
}
```

- `dsh.bundle.patch` is what makes the package installable; `dsh.client` only ships browser code.
- Host-only bundles need no `dependencies` for shipped packages: they resolve from the DSH installation.
- The Client half is a single file loaded by `window.__ModuleLoader__`; only add `dsh.client.external` for genuinely non-baseline imports.
- For linked local development `files` is advisory; for npm it decides the tarball. Check with `npm pack --dry-run`.

## Patch

```yaml
- insert:
    - id: dsh-my-plugin
      name: 'dsh-my-plugin'
      config: {}
    - id: dsh-my-plugin-docs
      name: '@deepseek-ai/dsh-mcp-client'
      config: { serverName: '<unique>', transport: streamable-http, url: '<url>' }
```

- Row `id` is a stable composition identity; namespace it with the package name. `name` is a resolvable package spec.
- A later layer overriding the same `id` **replaces `config` wholesale**, not deep-merges. If you override a row, restate every key.
- Layer order: profile bundles → profile `cordis.patch.yml` → `$DSH_HOME/cordis.patch.yml` → `--patch` overlays; later wins. `plugin_manager` `overridden` means a higher layer kept the row from reaching the requested state.
- Toggling a row writes `{ id, disabled }` into the profile patch. That override survives uninstalling the bundle: stale ids can shadow a future row with the same id — another reason to namespace.
- Requested `disabled` is a literal/`!!js`; a failed activation is NOT the same as disabled, but the UI may report the toggle as `overridden` anyway.

## Naming and metadata

- Display title comes from `locale/en.json` → `meta.title` (fall back to zh), **not** from the package name and not from the product it wraps. Use the plugin's own name (`dsh-my-plugin`).
- README is the plugin detail page (unless `meta.detail` points to a one-image document). Keep install + usage near the top; no raw HTML.
- Icon: 36×36 viewBox, transparent background, no tile/glow; Plugin Manager draws the surrounding tile. See `dsh-doc` → artwork.md.
- `locale/*.json` also drives the detail-page description; UI strings inside the client half go through `ctx.locale`.

## Install / upgrade lifecycle

- `plugin_manager` `install_bundle` accepts an absolute directory (links the checkout), an npm spec (`pkg@version`), a `github:` spec, or a tarball path.
- Reinstalling the same package is refused (`already-installed`): remove the bundle first, or use the UI's update action (it removes + installs).
- A replaced package needs a fresh module generation. When behavior must change, quit and reopen DSH — do not trust an unchanged slot id or an old row state.
- Minimum release age: DSH/pnpm may refuse or silently pick an older version for a just-published release. Install with an **exact version**; plugin_manager adds the version to `minimumReleaseAgeExclude` automatically.

## Cross-platform

- Use `node:path` / `fileURLToPath`; no POSIX shell, chmod, hardcoded `/Users/` or `process.platform` branches in runtime code.
- Any file whose hash you check (vendored skills, lock files) needs `.gitattributes` with `eol=lf`, otherwise Windows `autocrlf` rewrites CRLF and the hash test fails on someone else's machine.
- CI matrix `ubuntu-latest / macos-latest / windows-latest` × Node 20/22 catches path and shell assumptions; run `npm pack --dry-run` there too.
