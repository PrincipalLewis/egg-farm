# #110 merge-forward onto rc/v5 f8036e8 (#105)
- PR: https://github.com/PrincipalLewis/egg-farm/pull/110 (open, Ready, base rc/v5)
- Old head: 35b187cdd56c5428c22069675cd32f9306415602
- New head: 16d91de7345dd0ab6b92bdb2740a50037e86aadc (merge commit; parents 35b187c + f8036e8)
- rc/v5 tip: f8036e8f0826ca76fcc0ee13092d575533d4969b
- Clean merge, no conflicts. Plain push (no force).
- Two-dot diff vs rc: same 5 harness files as v5-f5-restack-35b187c, no deletions/reverts (307+/4-).
- No overlap with #105's 8 income-ref files -> heavy local gates skipped; cheap tsc --noEmit PASS (exit 0).
- Next: hosted gate + pacing shards at 16d91de; Architect delta; UI QA append f5-harness-35b187c.md.
