# Contributor Guidelines for Self Storage Mogul

## Scope
These instructions apply to the entire repository unless a nested `AGENTS.md` specifies otherwise.

## Getting Started
- Use Node.js **20.x LTS** (or newer that supports Vite 5) with npm.
- Install dependencies with `npm install` before running any scripts.
- Start the dev server via `npm run dev -- --open`. The app should be available at `http://localhost:5173/` by default.

## Development Practices
- The project is a Svelte + TypeScript single-page application bootstrapped with Vite.
- Organize source files under `src/` by feature (stores, components, simulation logic). Keep UI code in `.svelte` files and pure logic in `.ts` modules.
- Prefer Svelte stores for shared state. Use Immer helpers for immutable mutations when updating complex data structures.
- Keep Tailwind utility usage readable. Extract reusable patterns into components or apply `@apply` in a dedicated stylesheet when class lists grow unwieldy.
- Document complex simulation logic with inline comments or short markdown docs in `docs/` when appropriate.

## Testing & Quality
- Run `npm run lint` and `npm run test` before opening a pull request.
- New gameplay systems should include corresponding unit tests (Vitest) and, when applicable, component tests using `@testing-library/svelte`.
- Maintain deterministic simulations by avoiding reliance on global mutable state; prefer injecting randomness via seeded utilities.

## Git & PR Expectations
- Group related changes into focused commits with descriptive messages.
- Update relevant documentation (`README.md`, design notes, or in-app help) when modifying gameplay systems or user-facing features.
- Include playtest notes or reproduction steps in PR descriptions for balance or simulation changes.

## Accessibility & UX
- Follow accessibility best practices: ensure focus management, keyboard navigation, and adequate color contrast.
- When adding new UI components, consider responsive behavior and provide fallbacks for users with reduced motion preferences.

Happy building, and keep the storage empire thriving!
