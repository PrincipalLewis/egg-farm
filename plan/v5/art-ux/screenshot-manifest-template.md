# Screenshot manifest (mandatory) · Art & UX · v1.0 · 2026-10-17
Required by CEO and Head of Art & UX. Art & UX rejects any screenshot set without a valid `manifest.json`. This includes QA, engineer and release (Latest) sets.

## Rules
1. Every shot folder has a `manifest.json` at its root, and every PNG in the folder has an entry in it. Engine subfolders (firefox/, webkit/) may share the root manifest or carry their own.
2. `sha` is the full 40-character commit SHA the build was made from. Short SHAs are rejected. `pushed` must be true for review. Unpushed sets may be shared for early feedback but can't be signed off.
3. **Before handoff, the engineer checks that the HUD build label in the shots matches `sha`** (the label shows the short form). Set `build_label_checked: true`. If the label is hidden, missing or different, don't hand the set off.
4. Re-shoots get a new folder, or a new manifest with a bumped `rev`. Never mix two SHAs in one manifest.
5. Reviewers reject the whole set, reply to the author with "NO MANIFEST" or "MANIFEST MISMATCH" plus the reason, and don't review it, when any of these happens:
   - the manifest is missing or invalid JSON
   - a PNG has no entry, or an entry points to a missing file
   - the SHA isn't 40 characters or isn't on the remote
   - the HUD label doesn't match the SHA

## manifest.json
```json
{
  "pr": 35,
  "branch": "fix/rc2-minors-2",
  "sha": "6961d10<full 40-char sha>",
  "pushed": true,
  "build_label_checked": true,
  "rev": 1,
  "author": "Senior Engineer, UI & rc1 Fixes",
  "created": "2026-10-17T09:10:00+02:00",
  "shots": [
    { "file": "tut-step1-360x740.png", "engine": "chromium", "size": "360x740", "docked": false,
      "save": "fixtures/fresh.json", "seed": 42, "state": "tutorial step 1: Tap Collect" },
    { "file": "firefox/sold-freeze-mid-110ms-1280x800.png", "engine": "firefox", "size": "1280x800", "docked": true,
      "save": "fixtures/order-ready.json", "seed": 42, "state": "sold freeze, t=110ms, animations paused" }
  ]
}
```
Field rules:
- `engine` is one of chromium, firefox or webkit.
- `size` is the viewport as W×H in CSS px.
- `docked` is true when the side panel is docked (≥960 landscape).
- `save` is a fixture path or "fresh", and `seed` is the RNG seed, or null.
- `state` is a short human name. For timed frames, include the time and how it was frozen, for example animations paused.
