# Host and Client surfaces

Confirm exact signatures with `cordis_inspect_query` before coding. This file records the shapes that worked in production.

## Host plugin

```js
export const name = 'my-plugin'
export const inject = ['tools']            // optional hard deps
export function apply(ctx, config = {}) {
  ctx.effect(() => ctx.tools.register({ ... }), 'tool')
}
```

- Prefer `ctx.get('service')` with a graceful log when the service is optional; `inject` makes activation fail instead.
- Wrap every registration in `ctx.effect` (or return the exact disposer) so HMR/reload does not leak duplicates.
- Do not read another plugin's private state; use services and events.

## Tool definition

`ctx.tools.register` requires an output contract:

```js
{
  name: 'my_tool',
  description: '...',
  parameters: { type: 'object', properties: {}, additionalProperties: false },
  output: {
    schema: { type: 'object', additionalProperties: false, properties: { ... } },
    render(args, value) { return [{ type: 'text', text: '...' }] },
  },
  timeoutMs: 45000,
  presentCall() { return { card: 'generic', title: '...', kind: 'read' } },
  async execute(args, exec) { return await run(exec.signal) },
}
```

- Schema is validated against the returned JSON: `additionalProperties: false` + undeclared fields = failed call.
- Declare a cooperative `timeoutMs` the execution can actually meet; forward `exec.signal`.
- Keep the tool result bounded; put long details behind a route or file.

## Skills

- Register a provider (`ctx.skills.registerProvider`) for directories you ship; register single skills with `ctx.skills.register({ name, description, content, resourceBase: { kind: 'directory', path } })`.
- The catalog entry is `name` + `description`; the body loads only through the `skill` tool. Make descriptions trigger-accurate, not marketing copy.
- Vendored upstream text should stay byte-identical; append harness-specific notes at registration time and pin the upstream commit + hashes in a lock file.

## Prompt and context

- `ctx.systemPrompt.section({ name, order, text })` for a standing rule; keep it short and self-scoped, and avoid `{{...}}` unless intentionally interpolating.
- Prefer `ctx.systemPrompt.context(...)` for per-turn dynamic text.

## HTTP surface

```js
ctx.webServer.register({
  kind: 'prefix', path: '/my-plugin',
  async handler(req, res) { /* same-origin checks, JSON only */ },
})
```

- The browser half can `fetch('/my-plugin/...')`; there is no need for generated Remote bindings for a plugin page.
- Enforce: POST-only for mutations, `application/json`, `Origin` equal to `Host`, bounded body, structured JSON errors + Host log. Do not expose credential-bearing responses.

## Client half

```js
window.__ModuleLoader__.load({
  id: 'dsh-my-plugin',                       // must equal package name
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const primitives = require('@deepseek-ai/dsh-client-ui-primitives')  // baseline
    return { inject: ['slots', 'locale'], apply(ctx) { ... } }
  },
})
```

- Slots: `ctx.slots.inject(name, () => ctx.slots.register({ name, id, order }, Component))`.
- Detail-page section: register into `plugins.detail.section`; the owner passes `{ subject }` (`kind: 'bundle' | 'row' | 'item'`). Render `null` for subjects you do not own; a bundle subject carries `pkg.name` (package name, not display title).
- Localized UI: `ctx.locale.register(ns, { zh, en })` + `ctx.locale.bind(ns)`; subscribe to `locale/change` so the component re-renders.
- Use primitives (`Button`, `Toast`, icons) and theme tokens (`--dsw-alias-*`); no hardcoded light/dark colors.
- Errors users must notice: inline text + `Toast`; never a silent `console.error` only.
- Factories must be side-effect free; register listeners/styles inside `apply` with disposers.
