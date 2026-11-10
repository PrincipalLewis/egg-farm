# Repo Plan — 2026-10-15
Local git repo only at `/workspace/egg-farm-studio/game/` (no remote, no external accounts/spend until CEO sign-off).
```
game/
  package.json  vite.config.ts  tsconfig.json
  src/
    main.ts            # bootstrap, loop
    sim/               # tick, actions, offline.ts (pure)
    config/balance.json + schema.ts
    save/              # storage, migrations
    ui/                # panels, formatters, styles
    debug/             # dev-only tools
  tests/               # vitest: sim, offline, save migration
  docs/                # links to ../engineering docs
```
- Branches: `main` (always runs), short-lived `feat/*`; merge after tests pass.
- Commits: small, imperative messages; tag `m1-rc1` for QA handoff.
- Scripts: `dev`, `build`, `test`, `lint`.
