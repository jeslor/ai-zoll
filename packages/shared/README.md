# @ai-zoll/shared

Cross-cutting types and utilities with no framework dependency (no Next.js/NestJS/
Prisma imports here). Used by any other package/app that needs common helpers without
pulling in framework-specific code.

**Status:** `GeneratedFile` (`{ path, content }`) implemented — the shared output shape
for both `packages/generators` (Phase 2) and `packages/agents` (Phase 3), which are
independent, parallel consumers of the Blueprint. Nothing else here yet; add to this
package only when a type/utility is genuinely needed by more than one framework-free
consumer.
