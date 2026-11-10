# rc2 Order card: Sell preview segment (PM Market MK-34) · Art & UX (UI/Visual Designer) · v1.0 · 2026-10-16 22:50 · **SIGNED OFF by Head of Art & UX 2026-10-16 23:55**
Sources: product/market/feature-spec.md MK-34–39 (k = min(floor(basket), N − filled), same frame as the basket pill), m3-customer-queue-spec.md v1.2 §2 (card, bar 8px, tokens), juice-spec.md v1 (easing tokens, ≤400 ms), number-pop-spec.md, build game-rc1-ui/src/ui/order-list.ts `fill()` + styles.css:341–385.
Mocks: mocks/rc2-order-sell-preview-360.png / -1280.png (+ @2x), source mocks/rc2-order-sell-preview-{360,1280}.html (build woff2 fonts + tokens).

## 1. What changes
- Row copy unchanged: `4/17 eggs · $93.84`; at ≤375 drop ` eggs` → `4/17 · $93.84` (existing 360 rule).
- Bar = track + **solid fill** (eggs filled, `have/want`) + **preview segment** (what Sell adds now: `k = min(floor(basket), want − have)`, exactly the Sell button's number, same frame, MK-34/37).
- Preview hidden when k = 0 (0 eggs → `No eggs` state per MK-35) and on `.leaving` cards (MK-36: leaving/removed never enabled).

## 2. Preview styling (non-colour cue + ≥3:1)
Markup: `<div class="bar" role="progressbar"><i class="fill"></i><b class="prev"></b></div>` (bar becomes `display:flex`; `<b>` right after the fill).
```css
.order .bar{display:flex}                       /* track #FFFFFF, 1px #6B5D52 outline (unchanged) */
.order .bar>i{flex:none}                        /* solid fill --c-meadow-strong #3D7F33 (unchanged) */
.order .bar>b{flex:none;height:100%;min-width:4px;box-sizing:border-box;
  border-left:1px solid #FFFFFF;                /* divider vs solid fill */
  background:repeating-linear-gradient(135deg,var(--c-meadow-text) 0 1.5px,transparent 1.5px 4px),
             rgb(61 127 51 / .4);}              /* 40% of the fill hue = #B1CCAD on white */
.order .bar>b[hidden], .order.wait .bar>b, .order.leaving .bar>b{display:none}
```
| Element | Token / colour | Against | Ratio | Role |
|---|---|---|---|---|
| Solid fill | `--c-meadow-strong` #3D7F33 | track #FFFFFF | **4.90:1** ✔ | existing |
| Preview tint | #3D7F33 @ 40% → #B1CCAD | track #FFFFFF | 1.73:1 | decorative only |
| Preview tint | #B1CCAD | solid fill #3D7F33 | 2.83:1 | decorative only |
| **Hatch stripes** | `--c-meadow-text` #2F6B27 | track #FFFFFF | **6.46:1** ✔ | carries preview vs track |
| Hatch stripes | #2F6B27 | tint #B1CCAD | **3.72:1** ✔ | pattern visible inside segment |
| **Divider** 1px | #FFFFFF | solid fill #3D7F33 | **4.90:1** ✔ | carries fill vs preview boundary |
| Track outline | `--c-slot-outline` #6B5D52 | card #FFFFFF | 6.34:1 ✔ | existing |
The 40% tint alone fails 3:1 against both neighbours, so the meaning is carried by the **diagonal hatch (vs track)** and the **1px white divider (vs fill)**; both ≥3:1 (WCAG 1.4.11) and both work in greyscale.

## 3. Width rules
- `fillW = have/want`, `prevW = k/want` of the track's inner width.
- **Minimum visible preview: 4px** (`min-width:4px`; one full hatch period + divider) whenever k > 0, e.g. 1.8M demand with 2,400 in basket = 0.13% = 0.4px → shown at 4px.
- If the min width would push past the track end, the preview steals from the fill's right side (fill `max-width: calc(100% − 4px)`), never overflows; fill and preview never both round to 100% unless k = remaining.
- Solid fill keeps its own existing behaviour (can be 0px).

## 4. States
| State | Fill | Preview | Button | Card |
|---|---|---|---|---|
| Normal (0 < k < remaining) | have/want | k/want, hatch | `Sell {k}` primary | outline 2px #6B5D52 |
| **Basket ≥ remaining** (k = remaining) | have/want | **completes the bar** to 100% | `Sell {k}` | **existing `.order.ready` outline** (3px-look meadow #3D7F33, 4.9:1 vs card) |
| Big demand (1.8M) | e.g. 6.7% | ≥ 4px | `Sell 2.4K` (short numbers) | normal |
| 0 eggs / Need | have/want | **none** | `No eggs` (MK-35) disabled/greyed, `aria-disabled` | outline |
| Leaving | frozen | none | disabled | existing leave anim |
**Full-order hint (proposal):** no new copy; reuse the existing `.order.ready` meadow outline when k = remaining. Justification: (1) the bar already reaches its end, so the hint only has to confirm "this sell finishes the order"; (2) the ready outline is an existing, tested state with ≥3:1 and no layout change (card stays 60px, 360 row has no spare width for a word); (3) it doesn't fight the single primary CTA. Aria adds the words (§6). Alternative if Head of Art & UX wants text: swap the value span to `✓ Fills order` on ≥960 only.

## 5. Motion
- On Sell: preview width animates into the solid fill: fill `width` 200 ms `--ease-out` (cubic-bezier(.22,1,.36,1), juice-spec), preview shrinks to 0 at the same time and is removed at 200 ms; starts in the same frame as the Sell number pop (number-pop-spec 0–120 ms scale-up), so the bar is settled before the pop's hold ends. Replaces the current `transition:width .24s` on `.bar>i` (styles.css:347).
- Basket change (Collect, Coop Hand): preview width updates in one frame (MK-37), 120 ms `--ease-out` grow; no pop.
- **Reduced motion** (`.reduced-motion` / `.rm`, styles.css:354): no width tween; instant swap of fill/preview widths (preview opacity 1→0 over 120 ms permitted as a fade).

## 6. Aria
- Progressbar `aria-label` (replaces `Order {have} of {want} eggs`, order-list.ts `fill()`): `4 of 17 eggs delivered. Selling adds 13. Order worth $93.84.`
- k = remaining: `4 of 17 eggs delivered. Selling adds 13 and completes the order. Order worth $93.84.`
- k = 0: `4 of 17 eggs delivered. No eggs to sell. Order worth $93.84.` Big numbers spoken in full words via existing formatter (`1.8 million`).
- `aria-valuenow` stays = have (the preview is not a value). Updates coalesced with the existing live-region throttle.

## 7. Open questions
1. RESOLVED at sign-off (MK-42): previews follow Sell all fill order and never exceed the basket. Original question: should the preview show on the expanded (1280 docked) list for orders beyond the basket's reach once earlier orders are allocated? This spec assumes each card previews its own `k` (per MK-34 count), not a basket split across cards; if Sell all allocates FIFO, previews could over-promise in total.
2. RESOLVED at sign-off: outline only at all widths, no text. Original question: text full-order hint on ≥960 (`✓ Fills order`) yes/no.
3. Engineering: the card is `contain:layout paint` and `height:60px` (styles.css:358); no layout change needed.

## 8. Mock check (Chrome, build fonts, flock'd render 2026-10-16 ~23:55)
| State | 360 track / fill / preview px | 1280 docked track / fill / preview px |
|---|---|---|
| Normal 4/17, basket 8 | 170 / 40 / 80 | 178 / 41.9 / 83.8 |
| Basket ≥ remaining | 170 / 40 / 130 (= 100%) | 178 / 41.9 / 136.1 (= 100%) |
| 1.8M, basket 2,400 | 170 / 11.3 / **4 (min)** | 178 / 11.9 / **4 (min)** |
| 0 eggs / Need | 170 / 40 / 0 | 178 / 41.9 / 0 |
Seen in the 1280 mock: `120K/1.8M eggs · $9.9…` ellipsises the value span (existing build rule, styles.css:345), not caused by the preview. Open question 4: at ≥960 drop ` eggs` too when the value would ellipsise.

## Sign-off rulings (2026-10-16 23:55, Head of Art & UX)
- **Sell all:** previews are allocated in the same order Sell all fills cards. Each card previews min(basket left after the earlier cards, its remaining), so the previews never add up to more than the basket. CONFIRMED by PM Market; MK-40+ being written against v1.0.
- **Full order:** outline-only (`.order.ready`) at every width, with no text hint.
- **Row copy:** drop " eggs" whenever the order value would otherwise be cut, at every width (generalises the 360 rule; overrides styles.css:345 behaviour).


> v1.0 note (2026-10-17): the 0-eggs button reads `No eggs` per MK-35, which replaces `Need N` for that case. The mocks still show `Need {n}` in the 0-eggs state; MK-35 governs.

## Amendment v1.1 (2026-10-17 02:46, signed off by Head of Art & UX): order line overflow at huge counts
- (a) Complete order reads `✓ Ready · $X` instead of `n/n` (matches `.order.ready` outline; avoids clash with the "Full" queue tag).
- (b) Counts ≥ 1,000 use 3 significant figures (`181B/181B`, `1.80M`→`1.8M` per abbreviation rules); below 1,000 exact.
- (c) The order value is never cut. Drop order: " eggs" first, then shorten the count per (a)/(b).

## 9. Zero-delivered line "Wants N" (Head of Art & UX 08:13; "4/17" kept and "Got 4 of 17" rejected)
- When 0 eggs have been delivered, line 1 reads `Wants {N} eggs · ${X}`. At ≤375 it drops " eggs" to give `Wants {N} · ${X}`, the same rule as `4/17`. After the first egg it switches to `{have}/{N}`. Aria: "Customer wants {N} eggs".
- N and X use the money/count format: 3 significant figures at 1,000 and up, exact below that. The value is never cut.
- Measured with fontTools on the build font nunito-latin-700 (.l1 is 800 16px, but only the 700 face ships, so that's what renders), tabular figures, 16px, against the 170px order bar at 360:
| String | Width | Fits 170? |
|---|---|---|
| Wants 13 eggs · $15.34 | 178.2 | NO, so the ≤375 drop is required |
| Wants 13 · $15.34 | 138.0 | yes (32px spare) |
| Wants 181B · $1.78T (worst case) | 159.0 | yes (11px spare) |
| Wants 181B eggs · $1.78T | 199.1 | NO (desktop only) |
| 4/17 · $93.84 (ref) | 98.4 | yes |
- Shot check: at 360, line 1 must be on one line with no ellipsis for both the `Wants 13 · $15.34` and `Wants 181B · $1.78T` fixtures. If the DOM width is over 170, it's a FAIL.
- §9.1 Overflow fallback (Head of Art & UX 09:26, N2 = Minor): the $ value is never cut. If line 1 is still wider than the bar after dropping " eggs", drop "/{want}" first (`1.23M · $20.8M`), then drop the count entirely (`$20.8M`). The full string stays in the aria. Fixture: `1.23M/9.99M · $20.8M` at 360 must show no clip.
