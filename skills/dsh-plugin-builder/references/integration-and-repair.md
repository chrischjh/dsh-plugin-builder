# Integration, self-check and repair

## MCP rows

- One row per server: `name: '@deepseek-ai/dsh-mcp-client'`, `config.serverName` unique in the registration scope, `transport: streamable-http` (or `stdio` + `command`/`args`/`env`).
- Tools appear as `mcp__<serverName>__<toolName>`; skills/prompt text must use those exact public names.
- `failOnStartupError: false` keeps the bundle loadable while the server is down (tools absent, calls fail); `true` makes a failed initial sync reject the row visibly. Pick one and document the degraded mode.
- The client reconnects with backoff, keeps last-known tools during an outage, and drops tools after 10 failed attempts. A row that synced once and then went stale only recovers on a fresh mount.
- **Never pin a shipped package as a dependency.** A profile-level `@deepseek-ai/dsh-mcp-client` at another version shadows the app copy; rows then load it without official metadata (raw module name in the UI) and fail. Detect, do not pin.

## Version-shadow detection

```js
import { createRequire } from 'node:module'
const shipped = createRequire(join(process.env.DSH_INSTALL_DIR, 'package.json'))
  .resolve('@deepseek-ai/dsh-mcp-client/package.json')
const profilePkg = join(process.env.DSH_PROFILE_DIR, 'node_modules/@deepseek-ai/dsh-mcp-client/package.json')
// compare JSON versions; report { profileVersion, shippedVersion, profilePath } when they differ
```

- Include the shadow in the health report; tell the user which versions and the exact fix.
- Keep the agent-facing tool read-only. Aligning is a **profile mutation**, so gate it behind an explicit UI action (a second button or a confirm flag) and use DSH's own runtime to avoid store clashes:

```bash
N=~/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node
P=~/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/pnpm/bin/pnpm.cjs
"$N" "$P" add @deepseek-ai/dsh-mcp-client@<shippedVersion> --save-exact --dir ~/.dsh/profiles/<profile>
```

- After a successful align, the on-disk copy is fixed but the running DSH still holds the old module: return a structured `restart-required` result, do not claim health.

## Self-check + repair pattern

Report facts, not adjectives:

1. **Skills**: present? discovery `complete`? (a provider failure must not read as healthy).
2. **Registration**: count the expected tools on `ctx.tools` (registered ≠ callable).
3. **Reachability**: one-shot MCP `initialize` → `tools/list` → close, bounded timeout, 2–3 retries with backoff; report latency and error.
4. **Shadow**: optional version mismatch vs the DSH-shipped copy.

Repair ladder (each step re-check before continuing):

- incomplete skills → retry discovery a couple of times;
- row disabled → enable it via `pluginManager.setPluginEnabled(entryId, true)`;
- row enabled but tools missing → restart the row (disable, then enable) and poll until tools re-register;
- **network failure never restarts the row** — retry the probe and report `unreachable` with the fallback path;
- shadow → only with explicit consent, align then demand restart.

Failure reporting: reuse the plugin manager's `ManagementError` codes (`management-required`, `unaddressable`, `operation-error`) where the failure came from it; define your own codes otherwise (`skills-incomplete`, `mcp-unreachable`, `restart-required`). Log on the Host, return `{ ok, failure: { code, message } }` in JSON, and show the same code inline + through `Toast`. Never swallow a repair failure.

Keep the row lookup tolerant: find by `moduleName` + current patch id, then fall back to the pre-namespacing id, so upgrades still repair old installs.

## Same-origin route behind a detail-page button

- `plugins.detail.section` registration receives `{ subject }`; render only for your bundle's `pkg.name`.
- The component POSTs JSON; the Host handler checks method, content-type, `Origin === Host`, body size, and runs the repair under an `AbortController` deadline.
- Return 200 with a structured report for "repair ran but still unhealthy"; reserve 4xx/5xx for protocol or internal failures. Add `align: true` only from an explicit second action.
- Show progress (`running` disables both buttons) and a timestamp; after `restart-required` tell the user to quit and reopen DSH.
