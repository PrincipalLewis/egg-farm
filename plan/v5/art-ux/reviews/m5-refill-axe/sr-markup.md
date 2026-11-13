# Required sheet-row Refill markup (Art, v1.0.1, 2026-10-30)
Names come from content, never `aria-label`. Exact strings, no space before the comma (QA-D-1030-NAME-FINAL).

```html
<!-- enabled / Unpaid (Unpaid adds aria-disabled="true" + describedby = rc1 Unpaid sentence) -->
<button class="btn" type="button"><span class="lbl">Refill<span class="sr-in">, {Role}</span></span></button>
<!-- 0 charges: fixed order text node, empty aria-hidden data-cd span, .sr-in -->
<button class="btn" type="button" aria-disabled="true"><span class="lbl">Next charge in<span aria-hidden="true" data-cd=" 2:30"></span><span class="sr-in"> progress, {Role}</span></span></button>
<!-- Rested -->
<button class="btn" type="button" aria-disabled="true"><span class="lbl">Rested, refill below 50%<span class="sr-in">, {Role}</span></span></button>
```

```css
.lbl{white-space:nowrap}
.sr-in{font-size:0;line-height:0;color:transparent} /* inline; NOT position:absolute */
[data-cd]::after{content:attr(data-cd);white-space:pre}
```

Why: the v0.3.19 absolute `.sr` as a direct flex child gives `Refill , {Role}` in Chromium AX / Playwright. Evidence: `results-v101.json` (13:24 CET) shows exact names via axe + ariaSnapshot in Chromium, Firefox and WebKit, and CDP in Chromium (CDP is Chromium-only), at 360/390/1280. axe 0 violations, 0 incomplete; 276×48, 0 overflow, `.sr-in` 0×0.
