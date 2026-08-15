# Releasing

Only `apps/cli` is ever published — as the `ai-zoll` package on npm. Every
`@ai-zoll/*` package under `packages/` stays private and internal forever;
they're bundled into `apps/cli`'s single `dist/index.js` at build time (see
`apps/cli/tsup.config.ts`), never published separately. The root workspace
package.json is also private and never published.

The whole release pipeline is automated via
[Changesets](https://github.com/changesets/changesets) +
`.github/workflows/release.yml`. There is no manual `npm publish` step.

## As a contributor: what to do when you make a user-facing change

If your change affects what `ai-zoll` does for an end user (a new command, a
new flag, a bug fix, a behavior change — anything that belongs in a
changelog), add a changeset in the same PR:

```
pnpm changeset
```

This asks which package changed (always `ai-zoll` — the internal packages are
excluded) and what kind of bump it needs (`patch`/`minor`/`major`), then asks
for a short summary. It writes a small markdown file under `.changeset/` —
commit it alongside your change. If the change is purely internal (refactor,
test-only, docs-only) and shouldn't produce a release at all, you can skip
this, or run `pnpm changeset --empty` to explicitly record "no release
needed" for that PR.

## What happens after you merge to main

`.github/workflows/release.yml` runs on every push to `main`:

1. Full `build`/`typecheck`/`lint`/`test` gate — must pass before anything
   else happens.
2. If there are unreleased changesets sitting in `.changeset/`, the
   `changesets/action` step opens (or updates) a PR titled "Version Packages"
   that consumes them: bumps `apps/cli/package.json`'s version, writes
   `apps/cli/CHANGELOG.md`, and deletes the consumed changeset files. This PR
   is just a normal PR — review it like any other before merging.
3. When that "Version Packages" PR is merged, there are no pending
   changesets left, so this same workflow instead runs `pnpm run release`
   (`turbo run build --filter=ai-zoll && changeset publish`), which rebuilds
   the bundle fresh and publishes the new version to npm.

So publishing is still a deliberate, reviewable action (merging the version
PR) — everything downstream of that (bundling, tagging, npm publish, GitHub
release notes) is automatic.

## One-time setup (not automatable — do this yourself)

The release workflow needs an `NPM_TOKEN` repository secret (Settings →
Secrets and variables → Actions) with publish access to the `ai-zoll`
package on npm. Nothing else in this pipeline can run without it, and
generating that token is inherently something only you can do — it requires
your own npm account/org credentials.

## Local dry run

- `pnpm changeset status` — shows what would be bumped and to what version,
  without changing anything.
- `pnpm run version-packages` (`changeset version`) — applies the version
  bump and changelog locally, without publishing. Useful to preview the
  diff; don't run this against `main` directly, let CI do it via the PR flow
  above.
