# 05 — Security & Privacy

> Condensed from `docs/PRODUCT_SPEC.md` §24, 25. Read the spec for full detail. This is
> one of the highest-priority non-functional requirements in the whole product —
> existing repositories the CLI analyzes may contain secrets.

## Never upload

```
.env
.env.local
private keys
certificates
credentials
API keys
tokens
SSH keys
```

Example exclusion patterns the CLI must apply before any transmission:

```
.env*
*.pem
*.key
id_rsa
credentials.json
```

The CLI must detect likely secrets before transmission, **display exactly what will be
sent**, and require explicit user approval before any sensitive source information
leaves the machine.

## Local vs. remote analysis

The platform must clearly distinguish, and communicate to the user, what happens where:

- **Local analysis** — deterministic analyzers (`packages/analyzer`) run entirely on
  the developer's machine. This should cover as much of the analysis as possible
  (§23 — minimize data transmission, protect privacy).
- **Remote AI analysis** — a compact, structured repository *profile* (never raw
  source, never a full repo dump) is sent to the AI provider for interpretation.

## Enterprise privacy (future, not MVP)

For company customers, eventually: data retention controls, deletion, audit logs,
configurable AI providers, self-hosted analysis, enterprise privacy controls. Not part
of the current roadmap phases — see `03-roadmap.md` Phase 10+.

## Implementation notes

- The exclusion system belongs in `packages/analyzer` (or a shared security utility in
  `packages/shared`) so both the CLI and any server-side analysis path use the same
  rules — don't duplicate the secret-detection logic per app.
- "Display exactly what will be sent" implies the CLI needs a preview/confirmation step
  before any network call that includes repository content — this is a hard
  requirement, not a nice-to-have, per spec §24.
