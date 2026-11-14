# Pitfalls

Symptom → likely cause → fix. Check these before inventing a new theory.

| Symptom | Cause | Fix |
|---|---|---|
| `… declares no dsh.bundle` when installing | Wrong package (e.g. npm `copilotkit` is the CopilotKit CLI), or the manifest lacks `dsh.bundle` | Install the plugin's own package name / `github:` spec; add `dsh.bundle.patch` |
| Plugin row shows a bare module name (`@deepseek-ai/dsh-mcp-client`) instead of a localized title | A profile-installed copy of the shipped package shadows it at a different version; metadata cannot be read | Align the profile dependency to the DSH-shipped version (bundled node+pnpm, `--save-exact --dir`), restart DSH; do not add a static pin |
| `include:<row> 已保存，但被更高优先级的配置覆盖` (`overridden`) | Toggle did not reach the requested state: stale profile override, colliding row id from another bundle, shadow, or HMR not applying | Namespace row ids; check for shadow; quit/reopen DSH; remove stale profile-patch ids |
| `already-installed` on install | Same package/version already in the profile | UI update action, or remove bundle then install (exact version) |
| `ERR_PNPM_UNEXPECTED_STORE` editing the profile by hand | Global pnpm major ≠ the one that built the profile | Use DSH's runtime: `~/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/{node/bin/node,pnpm/bin/pnpm.cjs}` + `--dir` |
| npm publish exits `EOTP` immediately | No TTY: npm cannot run the browser OTP flow | Run under `script -q log npm publish`, read the auth URL from the log, authorize, poll |
| Registry shows `0.0.0-stage` / version still old | npm staged publishing + propagation | Wait a few minutes; re-check `npm view <pkg> version` |
| Installing the just-published version resolves the previous one | `minimumReleaseAge` | Install an exact version (`pkg@x.y.z`); plugin_manager auto-excludes it |
| Hash/lock test fails only on Windows | `core.autocrlf` rewrote files | `.gitattributes` with `* text=auto eol=lf` and `eol=lf` for hashed files |
| Detail-page button missing | Client module never loaded (wrong ModuleLoader id, missing `./client` export, missing locale files, primitives import) | Fix exports; verify with Client `Slots.listSubTree` that your registration is an active occupant |
| Route returns 403/415 | Client sent cross-origin or non-JSON | Same-origin fetch + `content-type: application/json`; validate both server-side |
| Tools registered but calls fail | Stale MCP connection (kept last-known tools) | Restart the row; do not treat it as "disabled" |
| Row enabled but no tools right after install | HMR did not mount the new generation | Quit and reopen DSH; never infer success from an unchanged slot/row |
| Two bundles declare the same row id | Later layer wins; the first looks inactive/overridden | Namespace ids per bundle (`dsh-<plugin>-<row>`) |
| Plugin installs but the capability is absent | `application: applied` ≠ functioning; a failed activation forgives nothing | Exercise the tool/skill/slot/route; read `fiberPhase` and row diagnostics |
| npm `404 /-/v1/done?authId` during publish | OTP auth session expired | Start a fresh publish for a new URL; `***` in stderr is redaction, use the TTY log |
| User's machine has an MCP row that never connects | Shipped package shadowed, network blocked, or row disabled | Compare versions across `DSH_INSTALL_DIR` vs profile `node_modules`; check row enablement; then network |
