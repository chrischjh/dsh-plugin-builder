# dsh-plugin-builder

A practical Agent Skill for building, packaging, installing, verifying and publishing DeepSeek Harness (DSH) plugins — distilled from shipping a real plugin (host + client + MCP + skills + self-check/repair) and from the failures that actually cost time.

It is the companion to the official `dsh-doc` skill: `dsh-doc` owns exact APIs; this skill owns the build → install → verify → publish loop and the symptom→cause→fix table.

## Contents

```
skills/dsh-plugin-builder/
├── SKILL.md                    # hard rules, workflow, done checklist
├── references/
│   ├── bundle-contract.md      # package.json, patch semantics, row ids, files/exports, install lifecycle
│   ├── host-and-client.md      # Host apply/tools/skills/prompt/web route; Client slots/detail sections/locale
│   ├── integration-and-repair.md  # MCP rows, shadow detection, guarded auto-align, self-check/repair pattern
│   ├── publish-and-verify.md   # npm 2FA/staged publishing, minimumReleaseAge, CI/release, market PR, verification
│   └── pitfalls.md             # symptom → cause → fix
└── examples/minimal-bundle/    # copyable Host-only bundle
```

## Install

**In DeepSeek Harness (recommended)** — it is a DSH bundle; the plugin manager registers the skill for every session:

```sh
dsh plugin --profile <profile> add @chrischjh/dsh-plugin-builder
```

(or **Plugins → Add plugin**, same spec; restart `dsh web` / the desktop app afterwards). Verify: the `dsh-plugin-builder` skill appears in the session skill catalog.

**Outside DSH** (Claude Code, Codex, any agent-skills CLI):

```bash
npx skills add chrischjh/dsh-plugin-builder -g -y
```

or copy the folder: `mkdir -p ~/.agents/skills && cp -R skills/dsh-plugin-builder ~/.agents/skills/`.

## Why another plugin-dev skill?

Official docs (`dsh-doc`) are reference material. Community skills cover the general workflow. This one adds the production failure modes: shadowed shipped packages, `overridden` row toggles, pnpm store mismatches, npm 2FA/staged publishing, minimum release age, Windows CRLF hash drift, client-slot verification, and remote-machine diagnosis.

## License

MIT.
