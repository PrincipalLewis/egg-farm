# Public-readiness secret scan — PrincipalLewis/egg-farm

- Scanned: 2026-10-24 14:45 (Budapest, UTC+2). Read-only; nothing changed on GitHub.
- Scope: fresh `--mirror` clone + `refs/pull/*/head` → 211 refs (102 branches, 96 PR refs incl. `/merge`, 13 tags), 909 commits (778 non-merge + 131 merge; merges carry no new content).
- Tools: gitleaks v8.30.1 (`detect --log-opts=--all --redact`), plus a regex pass over added lines in `git log --all -p`.

## Verdict: SAFE to publish (no credentials). One privacy note — see below.

## Secret hits
| Check | Hits | Real | Notes |
|---|---|---|---|
| gitleaks (all rules) | 0 | 0 | "no leaks found" |
| ghp_ / github_pat_ / gho_ / ghs_ | 0 | 0 | |
| xox[bpa]- | 0 | 0 | |
| sk- | 26 | 0 | False positives: `desk-manage-all` (22, test/script/CSS identifier), `m4-risk-list` (2), `mask-image` / `-webkit-mask-image` (2, CSS) |
| AKIA | 0 | 0 | |
| BEGIN … PRIVATE KEY | 0 | 0 | |
| GITHUB_TOKEN= | 0 | 0 | |
| password= | 0 | 0 | |
| api[_-]?key | 0 | 0 | |
| Bearer / Authorization: / client_secret / aws_secret | 0 | 0 | extra check |

No credential revocation needed. No history rewrite needed for secrets.

## Privacy / hygiene findings
1. **Personal email in commit metadata — `dflz****@gmail.com` ("Korshunov Vadim")**: author of 56 GitHub web-UI merge commits (2026-10-16 → 2026-10-24, committer `GitHub <noreply@github.com>`), reachable from `main`, many branches, 3 tags, and PR refs. Becomes publicly visible on publish. Not a secret. Removing it would need a history rewrite of `main` (not recommended); alternative is to accept it, and for the future enable GitHub "Keep my email addresses private" + "Block command line pushes that expose my email" so web merges use the `@users.noreply.github.com` address.
2. Real names: only "Vadim" in 3 code comments ("P1 Vadim playtest") and the commit author above. Other authors are bot role names with fake `*.local` / `eggfarm.studio` / `egg-farm.studio` emails.
3. No email addresses in file contents.
4. No `.env`, key, token, `.npmrc`, `.netrc`, cert or cookie files ever committed.
5. Box paths appear (`/workspace/egg-farm-studio/...`, `/workspace/wt-ui-shots/...`, `/tmp/...`) in docs/scripts — none contain tokens or `/cursor/stores` paths. Cosmetic only.
6. IPs: `127.0.0.1` (localhost), `192.168.1.20` (example LAN address in a README), `141.0.0.0` (Chrome UA string). Harmless.

## Cleanup
Mirror clone `/tmp/ef-scan` and full-log temp file deleted after the scan. Redacted gitleaks JSON (empty) kept at `/tmp/ef-scan-gitleaks.json`.
