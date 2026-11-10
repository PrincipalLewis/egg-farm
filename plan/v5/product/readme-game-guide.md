# Egg Farm: Player Guide

## What the game is
Egg Farm is an idle farm game you play in the browser. Your hens lay eggs on their own. You collect the eggs, sell them to customers who queue up at your farm, and spend the coins on upgrades so you earn more each round. Later you hire helpers who do some of the work for you, as long as you keep them rested and paid. Your progress saves in the browser, and when you come back after an hour or two away, there are eggs waiting for you.

## How to run it locally
You need Node.js. From the repo root:
```bash
cd game
npm ci
npm run dev        # opens the Vite dev server; open the URL it prints
```
For a production build, run `npm run build && npx vite preview`. Run `npm test` to run the tests.

## The core loop: collect → sell → upgrade
- **Collect:** hens fill the Coop automatically. Tap **Collect** to move eggs into your Basket. When the Coop reaches its limit it shows **Full!** and stops filling, so come back and tap.
- **Sell:** customers arrive and each one wants a set number of eggs. Tap a customer to open the Market, then tap **Sell** for that customer or **Sell all** for the whole queue. Customers who wait too long (30 s) walk off.
- **Upgrade Collection:** each level gives +5 eggs per tap and +12% egg price.
- **Upgrade Farm:** each level gives +5 hens, a bigger Coop (+50), a higher base egg price (+$0.05), and customers who come more often and buy more. The coop changes look at Farm L5, L10 and L20.
- **Away time:** if you're gone 60 s or longer, a welcome-back screen gives you eggs equal to 25% of your production, counting up to 2 h away.

## What to try first (about the first 10 minutes)
1. Tap **Collect** a few times. Hens lay about 1 egg per second at the start.
2. Your first customer shows up at about 10 s. Tap them and **Sell**.
3. Buy your first **Collection** upgrade ($10). You should get it within about 30 s.
4. Save up $100 for **Farm L1**. Farm levels are the main way to grow.
5. Keep collecting, use **Sell all** every so often, and buy Farm whenever you can afford it. Buy Collection when it's cheap compared to the next Farm level.
6. At **Farm L3**, open the **Workers** tab and hire a **Market Hand** ($40).
7. If you keep a steady pace, you'll reach about Farm L10 at the 10-minute mark.

## What's in M2: Workers
- **Hiring:** helpers unlock as your Farm grows. The **Market Hand** (Farm L3) serves customers for you. The **Coop Hand** (Farm L7) collects eggs for you. The **Hawker** (Farm L8) makes customers buy more. The **Egg Grader** (Farm L18 and up, sold in grades) makes eggs sell for more. A hire is permanent: you can't fire a helper and you don't get a refund.
- **Energy and Tired:** helpers slowly lose energy, going from full to empty in about 15 minutes. At 40% they start to yawn. Below 30% they're **Tired** and work slower. At 0% they're **Asleep** and stop working.
- **Manage and Manage all:** tap **Manage** to refill a helper to 100%. It's free. Once you have 3 or more helpers, **Manage all** refills everyone at once. Both share a 30 s cooldown.
- **Wages and Unpaid:** the Market Hand and Coop Hand earn a small wage per minute that goes up with your Farm level. If you can't pay, the helper goes **Unpaid** and stops working. It starts again on its own once you have enough coins. You never go into debt, and a helper never leaves you worse off than having no helper at all. Sleeping helpers aren't paid.

## Planned for M3 (not available yet)
- **Onboarding:** a short guided intro (collect → sell → upgrade) that you can skip, plus a quick intro to Workers.
- **Next-goal hint:** a strip above Collect that shows the next thing worth buying.
- **Settings > Export log:** saves your play log as a file, and also works on iPhone Safari.
- **Save recovery:** if a save gets damaged, the game restores a backup when it can and always tells you what happened.
- **Mobile portrait and desktop:** both layouts get polished and work properly, with touch targets of at least 44 px.
- **Accessibility:** better contrast, keyboard focus, and reduced-motion support.
- **Closed playtest:** testers play and send back their exported logs, which we compare against our balance model.
- **Listing prep:** copy, screenshots, icon and a short GIF, all kept in the repo. Nothing gets published.

## Known issues and tips
- **The current build has no save recovery yet.** If a save is corrupted, the game silently starts over. Save recovery is planned for M3.
- **Settings > Export log arrives in M3.** You can't export your log in the current build.
- Your progress is stored in this browser only. Clearing site data or using a private window means a fresh farm.
- If the Coop says **Full!**, your eggs are going to waste. Collect, or hire a Coop Hand.

**Tip: play in Chrome for now.** In Firefox, "Tap to start" can hang if audio never starts. This is a known issue, and the fix is on its way (QA's `qa/readme-known-issues.md` lists it as PT1-3).
