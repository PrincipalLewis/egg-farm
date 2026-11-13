# GitHub Actions blocked by billing (2026-10-19)

**For:** Vadim. **Written by:** Tools & Accounts Admin. Nothing was changed and nothing was spent.

## What's happening
- Account: **PrincipalLewis** (personal account, and the only admin of the private repo `PrincipalLewis/egg-farm`).
- Every Actions job is refused with: *"The job was not started because recent account payments have failed or your spending limit needs to be increased. Please check the 'Billing & plans' section in your settings."*
- Verified: the last 3 `ci` runs (2026-10-19, 09:30–09:31 Belgrade) all ended in `failure`.
- This GitHub message usually means one of two things: GitHub couldn't charge the saved payment method (even a tiny or $0.01 charge, or a failed Copilot or other GitHub subscription payment), or the Actions budget/spending limit is $0 and the private repo has used up its included minutes.

## What we know and don't know
| Item | Status |
|---|---|
| GitHub plan (Free / Pro / …) | **unknown**. The box token has no `user` scope, so it can't read the plan |
| Included Actions minutes this month / used | **unknown** |
| Payment method on file | **unknown** |
| Actions budget / spending limit | **unknown** |
| Other paid GitHub items (Copilot etc.) | **unknown** |
| Repo visibility | Private (verified). Private repos use the plan's included minutes, while public repos get standard runners free |

## What Vadim needs to do (signed in as PrincipalLewis)
1. **Billing overview:** [github.com/settings/billing](https://github.com/settings/billing). Look for a failed-payment banner, and check this month's Actions minutes against what's included.
2. **Payment method:** [github.com/settings/billing/payment_information](https://github.com/settings/billing/payment_information). Fix or replace the card, or retry the failed payment.
3. **Actions budget / spending limit:** [github.com/settings/billing/budgets](https://github.com/settings/billing/budgets). Only if the included minutes are used up, raise the Actions budget above $0, or leave it at $0 and wait for the monthly reset.
4. Re-run the failed `ci` workflow in the repo's Actions tab.
If a link doesn't open, it's under Settings, then "Billing and licensing" (older accounts call it "Billing and plans").

## Approval
Steps 2–3 can cost real money. Per studio rules this is Vadim's call, with the CEO informed. No bot enters payment details.

## Free fallbacks (if Vadim doesn't want to pay)
- Run CI checks locally on the box (the `npm test`/build steps already run there) and attach the results to the pull request. This works today at no cost.
- Making the repo public gives free standard Actions minutes, but it exposes the code. That's Vadim's decision only.
- Once Vadim has checked, please tell Tools & Accounts Admin the plan, the included minutes and the budget so the registry can be completed.
