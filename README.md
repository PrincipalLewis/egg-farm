# artifacts branch (standing rule 19, D-CEO-20261028-04)

Orphan branch holding durable gate outputs. Never merged into main. No secrets, tokens or personal data (public repo).
CI: no workflow runs on pushes here. `ci.yml` push triggers are `branches: [main]` only; the other workflows run on
pull_request / release / workflow_dispatch only. Never open a PR from this branch.

Canonical copies on the studio box: `/workspace/egg-farm-studio/artifacts/<gate-id>/`.

- `m51-o1a/`: Workers o1a re-run, Economy. Check: `cd m51-o1a && sha256sum -c MANIFEST.sha256`
  (MANIFEST sha256 a840b84dd4cc0b72ed1e4d08a33a316586880b8d615e7008235e5b802160795a).
- `m52-o1a/`: M5.2 o1a press runs, Economy. Each `pr.*.jsonl` is ~6.8 MB (> 5 MB), so it is stored gzip'd (`gzip -9n`).
  Check the .gz files: `sha256sum -c MANIFEST.gz.sha256`. Check originals: `gunzip -k *.gz && sha256sum -c MANIFEST.sha256`
  (MANIFEST sha256 94e19f2d361a57b928d1953fee3277ccc9f6f09f5b37f30ddc9912ec21056e73).
