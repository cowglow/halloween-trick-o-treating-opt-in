# Clear Architecture, as applied in this repo (TypeScript companion)

This repo's architectural style is Joschi Kuphal's **Clear Architecture** —
<https://github.com/jkphl/clear-architecture/blob/master/README.md>. Read that
original for the underlying *concepts*: the three tiers, the Dependency Rule, the
Dependency Inversion Principle. This document is the concrete mapping of those
concepts onto this codebase, kept separate (rather than copied and edited inline)
to avoid drifting out of sync with the upstream write-up. It exists because the
upstream doc's own conventions — `UpperCamelCase` directories, an
`Interface`/`Trait` suffix convention, a separate `Tests` tier — were never adopted
here and would be actively misleading if followed literally. This document takes
precedence over the upstream one wherever they disagree about *this* codebase.

Scope: this covers both `frontend/` and `backend/`. See "How the backend applies
this" below for where the backend's shape differs from the frontend's (Express
routes standing in for React pages, repository interfaces standing in for the
frontend's API client and caches) while still following the same tiers and
Dependency Rule.

## Directory mapping

| Upstream tier | Upstream convention | This repo (frontend) | This repo (backend) | Example |
|---|---|---|---|---|
| ① Domain | `<Module>/Domain/` | `frontend/domain/` | `backend/src/domain/` | `domain/space/point-in-polygon.ts` |
| ② Application | `<Module>/Application/` | `frontend/application/` (empty for now) | `backend/src/application/` | `application/space/space.use-cases.ts` |
| ③ Ports | `<Module>/Ports/` | `frontend/ports/` | `backend/src/ports/` | `ports/pages/space/MapHomePage.tsx` |
| ③ Infrastructure | `<Module>/Infrastructure/` | `frontend/infrastructure/` | `backend/src/infrastructure/` | `infrastructure/space-cache/location-cache.ts` |
| ③ Tests | `<Module>/Tests/` | **no separate tier**: colocated `*.test.ts` | same | `domain/space/fit-view.test.ts` |

The Dependency Rule itself is unchanged: domain has zero imports from application,
infrastructure, or ports; application may import domain but not infrastructure/ports;
infrastructure and ports may import inward (domain, application) but not each other
sideways except through each side's composition root (frontend:
`spaces-main.tsx`; backend: `composition-root.ts`, `index.ts`).

**This is convention only; nothing lints or type-checks it.** There's no ESLint
import-boundary rule enforcing the Dependency Rule. Worth adding if a violation
actually happens, not speculatively.

## Naming conventions that differ from the upstream doc

- **Directories and files are lowercase, kebab/dot-separated**, not `UpperCamelCase`:
  `domain/space/`, `space.types.ts`, `point-in-polygon.ts`. React component files
  are the one exception, in ordinary React style: `PascalCase.tsx`
  (`MapHomePage.tsx`, `SpaceDialog.tsx`).
- **No `Interface`/`Trait` suffix convention.** TypeScript's structural typing makes
  the suffix redundant: an interface is named for what it models (`Mailer`, not
  `MailerInterface`), on both sides of the stack.
- **Factories keep the upstream's `create*` prefix convention**, e.g. the backend's
  `createInviteParticipantUseCase(deps)`.
- **Frontend: absolute imports from `frontend/`, always with an explicit extension**:
  `"domain/space/space.types.ts"`, never a relative `../../domain/...` and never
  extension-less. This is `"paths": {"*": ["./frontend/*"]}` in the root `tsconfig.json`
  (it was `baseUrl` until TypeScript 6 deprecated it) plus the `vite-tsconfig-paths` plugin, not a bundler alias to reproduce in a different build
  tool. The backend has no equivalent under plain `tsc`/`tsx`, so it keeps ordinary
  relative, extension-ful imports (NodeNext's convention, e.g.
  `"../domain/space/space.types.js"`). That divergence is intentional.

## Frontend state

There is no global store. Pages hold their own state with React hooks and talk to
the backend through `infrastructure/api/space-api-client.ts` (`spaceApiFetch`, the
per-space session in `localStorage`). Location data is cached in IndexedDB by
`infrastructure/space-cache/location-cache.ts` and revalidated with ETags; the
service worker (`public/sw.js`, registered by
`infrastructure/service-worker/register-space-service-worker.ts`) caches the app
shell, tiles, glyphs and sprites.

## `ports/`: grouped by feature

`ports/pages/space/` holds the app's pages and dialogs. `ports/context/i18n/` is the
language provider, `ports/i18n/` the translations (en, de, es), and `ports/hooks/`
shared hooks.

## Testing

No separate `Tests` tier directory. Unit tests are colocated as `<name>.test.ts`
beside the file they test. `vitest.config.ts` only collects `*.test.ts`, not
`*.test.tsx`: component behavior is covered by the Playwright suite in
`e2e/spaces/` instead (real frontend + real backend + real Postgres,
single-worker).

## How the backend applies this

`backend/src/` follows the same four tiers, shaped around Express + Prisma:

- **`domain/`**: `space/` (types, the Meckenhausen boundary and point-in-polygon
  check, text sanitizing for labels and notes) and `auth/magic-link.ts`
  (`TOKEN_TTL_MS`, `hashToken`, the `isTokenUsable` predicate). Generating a random
  token is infrastructure (it needs a source of randomness); hashing one
  deterministically is a domain rule. Domain types are deliberately *not* imported
  from `@prisma/client`, since a generated ORM type is an infrastructure concern.
- **`application/`**: `space/space.repository.ts` holds one interface per aggregate
  (`SpaceRepository`, `SpaceParticipantRepository`, `SpaceLocationRepository`,
  `SpaceMagicLinkTokenRepository`, `SpaceInviteRepository`) that
  `infrastructure/prisma/` implements. This is the Dependency Inversion Principle
  in practice: ports need persistence, so they depend on an interface application
  owns, not on Prisma. `mailer.ts`, `space-token-signer.ts` and `token-generator.ts`
  are the same pattern for email, JWTs and randomness. `space/space.use-cases.ts`
  holds the orchestration (magic-link sign-in, invites, accepting an invite, pin
  writes, "Remove me"), each as a `create*UseCase(deps)` factory.
- **`infrastructure/`**: `prisma/` has one repository implementation per interface,
  each owning the Prisma-columns ↔ domain-shape mapping. `mail/` (`consoleMailer`,
  `resendMailer`, `getMailer()`) and `auth/` (`spaceJwtTokenSigner`,
  `randomTokenGenerator`) implement the other interfaces.
- **`ports/http/`**: Express is the delivery mechanism. `routes/space.routes.ts` is
  a factory (`createSpaceRouter(deps)`) that validates the request (zod schemas in
  `validation/`), calls the injected use case or repository, and shapes the
  response. Middleware is built the same way (`createRequireSpaceAuth(...)`,
  `requireSpaceRole`, `requireEventActive`, rate limits), so nothing in `ports/`
  imports a concrete infrastructure implementation. `app.ts` takes a fully-built
  `AppDeps` object rather than constructing anything itself.
- **Composition root**: `composition-root.ts`'s `buildAppDeps()` is the one place
  concrete infrastructure gets instantiated and wired into the interfaces
  `application`/`ports` depend on; `index.ts` just calls it and starts listening.

The payoff of the repository interfaces: `application/` can be unit-tested without
a running Postgres (`space.test-support.ts` has in-memory fakes), and swapping
Prisma would only touch `infrastructure/prisma/`. Foreign keys and cascades are
the one thing fakes can't check, so those are covered by `e2e/spaces/`.
