# Egg Farm

An idle egg-farm management game for the web (TypeScript + Vite). Collect eggs from the coop, sell them to customers at the market, buy farm and collection upgrades, and hire workers who keep the farm running while you're away.

This branch is the **M2 "Workers"** build (`m2-rc1` + post-rc1 polish).

## Requirements

- [Node.js](https://nodejs.org/) **20 or newer** (includes npm)
- git

## Play locally

```bash
git clone https://github.com/PrincipalLewis/egg-farm.git
cd egg-farm
npm ci
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173).

## Production build

```bash
npm run build      # checks balance.json vs data/economy.csv, type-checks, builds to dist/
npx serve dist     # serve the built game (http://localhost:3000)
```

## Play on your phone (same Wi-Fi)

```bash
npm run dev -- --host
```

Vite prints a `Network:` address such as `http://192.168.1.20:5173`; open it in your phone's browser. Your computer's firewall must allow the port.

## Single-file version (no install)

The [`m2-rc1-play` release](https://github.com/PrincipalLewis/egg-farm/releases/tag/m2-rc1-play) has `egg-farm-dd15dbf.html`, the whole game in one file. Download it and open it in a browser (on iPhone, open it in Safari rather than the Files preview). Progress is saved in that browser's local storage.

## Notes

- Game balance lives in `data/economy.csv`; `src/config/balance.json` is generated from it with `npm run sync-economy`.
- Add `?debug=1` to the URL for the debug panel.
- `npm test` runs the unit and pacing tests.
