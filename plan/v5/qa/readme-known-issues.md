## Known issues (playtest build m3-pt1)

Thanks for playing! This is a test build, so a few things are still rough. Here's what we already know about, so you don't need to report these.

| ID | What you might notice | Status | Fix planned in |
|---|---|---|---|
| PT1-3 | **The game gets stuck on "Tap to start."** You tap the button, it greys out, and nothing else happens. No error message appears. It happens when the browser can't start sound, for example on a computer with no speakers or headphones. We've seen it in Firefox. | **Fixed** in m3-pt1 | — |
| PT1-2 | **"Reset save" in Settings also erases your play history.** A reset deletes your progress *and* the activity log we use to learn how the game plays. It also turns your sound and "reduce motion" settings back to the defaults. | **Fixed** in m3-pt1 | — |
| PT1-1 | **The build name inside your Export log is generic** ("m3-pt1" instead of the exact version). Nothing changes for you in the game. It just makes your log harder for us to match to a build. | **Fixed** in m3-pt1 | — |
| AC14b | **If your save file gets damaged, the game quietly starts over from the beginning.** There's no message and no backup yet. This is rare, but if your progress suddenly disappears, that's probably why. | Open, expected | rc0 (Thu Oct 22), which adds a backup save and a notice |
| PT1-4 | After a damaged save restarts the game (see above), the tutorial and the "New helper!" tip don't show again for the new game. | **Fixed**, QA re-checked on 50b4b18 | rc0 |
| PT1-5 | If you reload the page in the middle of the first tutorial, the tutorial doesn't come back. The game itself works fine. | **Fixed**, QA re-checked on 50b4b18 | rc0 |
| PT1-6 | Some screen-reader labels are missing or wrong (the customer queue, the farm scene, the tutorial bubble). It only matters if you use a screen reader. | **Fixed**, QA re-checked on 50b4b18 (full audit in rc1) | rc0 |
| PT1-8 | On a computer, the Collection / Farm / Workers tabs in Upgrades were small to click. | **Fixed**, QA re-checked on 50b4b18 | rc0 |
| B1 | The "New helper!" banner stayed after you hired. | **Fixed**, QA re-checked on 50b4b18 | rc0 |
| B2 | The "Coop upgraded" message got stuck half off the top of the screen. | **Fixed**, QA re-checked on 50b4b18 | rc0 |
| B3 | The screen reader read an old next-goal text, or said "1 minutes". | **Fixed**, QA re-checked on 50b4b18 | rc0 |
| B5 | "Manage all" counted helpers that were barely tired (81% or more). It now only counts helpers at 40% or below. | **Fixed**, QA re-checked on 50b4b18 | rc0 |
| B6 | On a computer, the Collect bar could slide under the side panel when many customers were waiting. | **Fixed**, QA re-checked on c5bc2cb | rc0 |
| PT1-13 | On iPhone/iPad (Safari), the right edge of the farm screen was cut off on narrow phones. | **Fixed**, QA re-checked on 3de7d11 | rc0 |
| PT1-14 | While "Manage all" was cooling down, its greyed-out label was hard to read. | **Fixed**, QA re-checked on 3de7d11 | rc0 |
| F3/B4 | The first tutorial asked you to Sell or Buy before you could. It now waits until you can, and shows a short hint meanwhile. The Collect button always shows how many eggs one tap collects. | **Fixed**, QA re-checked on 3de7d11 | rc0 |
| — | **Not yet tested on a real iPhone or a real Android phone.** We've only tried phone-sized screens on a computer. Real phones may behave differently, especially sound, rotating the phone, and switching apps. | Not started | needs devices, then rc0/rc1 |

**If you're stuck on "Tap to start" (PT1-3):**
1. **Open the game in a different browser.** This is the workaround we've confirmed: the same build starts fine in Chrome and in Safari's engine.
2. (Fixed in m3-pt1. If you still see it, please report it.) Make sure your computer has a working sound output (speakers or headphones plugged in and turned on), then reload the page. We think this helps, but we haven't been able to confirm it yet.
3. Reloading on its own usually doesn't help in the same browser, because it gets stuck at the same point again.

**Before you press "Reset save":** please use **Settings → Export log** first and send us the file. Otherwise your play history is lost (PT1-2).

## How to report a bug

Open a new issue in this repo's **Issues** tab. Give it one label:

| Label | Use it when |
|---|---|
| `bug` + `blocker` | You can't play at all, or you lost progress (for example, the game won't start or your save is gone). |
| `bug` + `major` | An important part is broken but you can keep playing (for example, a button does nothing or numbers look wrong). |
| `bug` + `minor` | Something looks odd or is a little annoying (for example, a typo, overlapping text or a small visual glitch). |

Not sure which one? Just use `bug` and we'll sort it.

Copy this into the issue:

```
**What happened:**
**What I expected:**
**Steps to make it happen again:**
1.
2.
3.
**Browser and version:** (e.g. Chrome 154, Safari 18)
**Device:** (e.g. MacBook Air, iPhone 15, Windows laptop)
**When:** date and time, with time zone
**Screenshot or screen recording:** (drag it in here)
**Export log:** (attach the file, see below)
```

**Attaching the Export log:** open **Settings** (the gear icon at the top right) and tap **Export log**.
- On a computer, a file named like `eggfarm-log-xxxxxxxx-date.json` is downloaded. Drag it into the issue.
- On iPhone, a share sheet may open. Save the file, or pick an app to send it with. If you see "Log copied to clipboard", paste it into the issue instead.

The log only holds game events (taps, sales, upgrades, timings) and a random ID for your copy of the game. It contains no name, email, location or device details.

## Supported browsers right now

| Browser | Status |
|---|---|
| **Google Chrome** (computer) | Supported. This is our main test browser. |
| **Microsoft Edge** (computer) | Should work. It's built on the same engine as Chrome, but we haven't run it yet. |
| **Safari** (Mac) | Expected to work. We test with Safari's engine (WebKit) on our test machine, but not yet on a real Mac. |
| **Firefox** (computer) | Supported. The "Tap to start" hang (PT1-3) is fixed in m3-pt1. |
| **iPhone / Android phones** | Not tested on real phones yet. Phone-sized screens work in testing on a computer. Please tell us how it goes! |

The game is designed for a phone held upright (about 390 px wide) and for desktop windows. Sideways (landscape) on a phone is not supported yet.
