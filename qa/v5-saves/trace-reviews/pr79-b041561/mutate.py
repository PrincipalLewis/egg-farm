#!/usr/bin/env python3
"""Apply one named mutation to the #79 worktree (exactly one match required). Revert with git checkout -- src."""
import sys, pathlib
R = pathlib.Path('/workspace/egg-farm-studio/qa/scratch/wt-pr79-b041561')
M = {
 'Q1-every-tick-focus': ('src/sim/tick.ts', 'const nFocus = clock ? focusTicks(clock.focusMs, dtMs) : 0;', 'const nFocus = clock && clock.focusMs > 0 ? Infinity : 0;'),
 'Q2-drop-readOnly': ('src/game.ts', 'focusFrameMs(gap, !this.readOnly && anyM5FlagOn', 'focusFrameMs(gap, anyM5FlagOn'),
 'Q3-hidden-frame-focus': ('src/game.ts', 'advance(this.state, step, gap >= maxMs ? 0 : this.accMs, this.b, h.ev);', 'advance(this.state, step, gap >= maxMs ? 0 : this.accMs, this.b, h.ev, { focusMs: step });'),
 'Q4-settle-focus': ('src/game.ts', 'advance(this.state, uncover, this.accMs, this.b, h.ev);', 'advance(this.state, uncover, this.accMs, this.b, h.ev, { focusMs: uncover });'),
 'Q5-debugAdvance-focus': ('src/game.ts', 'advance(this.state, ms, this.accMs, this.b, ev);', 'advance(this.state, ms, this.accMs, this.b, ev, { focusMs: ms });'),
 'Q6-focusTicks-plus1': ('src/sim/clock.ts', 'Math.ceil(focusMs / tickMs - 1e-9) : 0', 'Math.ceil(focusMs / tickMs - 1e-9) + 1 : 0'),
 'M79-6-probe-flags-off': ('src/game.ts', '!this.readOnly && anyM5FlagOn(this.b) && this.attendedProbe()', '!this.readOnly && this.attendedProbe()'),
 'M79-7-wallReady-1s': ('src/sim/clock.ts', 'wallRemainingMs(atMs, nowMs, capMs) === 0;', 'wallRemainingMs(atMs, nowMs, capMs) <= 1000;'),
}
f, a, b = M[sys.argv[1]]; p = R / f; t = p.read_text(); n = t.count(a)
assert n == 1, f'{sys.argv[1]}: {n} matches'
p.write_text(t.replace(a, b)); print(f'applied {sys.argv[1]} to {f}')
