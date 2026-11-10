# WebKit host-library fix — 2026-10-30 (HoO)

## Symptom
After the 23:2x Oct 29 /workspace snapshot restore, Playwright WebKit (webkit-2370, playwright-core 1.64.1) would not launch.
Missing: libevent-2.1.so.7, libgstgl-1.0.so.0, libgstcodecparsers-1.0.so.0, libavif.so.16, libmanette-0.2.so.0, libenchant-2.so.2
(packages libevent-2.1-7t64, libgstreamer-gl1.0-0, libgstreamer-plugins-bad1.0-0, libavif16, libmanette-0.2-0, libenchant-2-2).
Chromium and Firefox were fine. Box: Debian 13 (trixie).

## Root cause of the apt failure
`apt-get update` against http://deb.debian.org returns HTTP 500 from the box egress proxy (198.18.0.1) for apt only
(curl to the same URL gets 200; https:// via apt fails with SSL EOF). Retrying did not help (still 500 at 07:35 CET).
http://cdn-fastly.deb.debian.org (official Debian CDN) works through apt.

## What fixed it
1. At 07:32 CET another agent installed the 6 libs plus deps with dpkg from .debs it fetched itself
   (/workspace/qa-v5-runtime/debs/, fetch-webkit-libs.py) — see /var/log/dpkg.log.
2. At 07:36 CET HoO ran apt through the cdn-fastly mirror WITHOUT editing /etc/apt (temporary SourceParts override);
   that upgraded libevent-2.1-7t64 -> 2.1.13-stable-1~deb13u1 and libgstreamer-gl1.0-0 -> 1.26.2-1+deb13u2 (security),
   the other 4 were already current. /etc/apt/sources.list.d is unchanged.

Verified 07:37 CET: webkit.launch({headless:true}) -> about:blank -> close, OK (WebKit 27.2) from both
/workspace/wt-v5-botm5/node_modules/playwright-core and qa/v5-saves/tools/node_modules/playwright-core (1.64.1).

## Redo after a future restore
```sh
mkdir -p /tmp/apt-https/parts
sed 's#http://deb.debian.org#http://cdn-fastly.deb.debian.org#' /etc/apt/sources.list.d/debian.sources > /tmp/apt-https/parts/debian.sources
cp /etc/apt/sources.list.d/google-chrome.sources /tmp/apt-https/parts/
O="-o Dir::Etc::SourceParts=/tmp/apt-https/parts"
sudo apt-get $O update
sudo apt-get $O install -y --no-install-recommends --reinstall \
  libevent-2.1-7t64 libgstreamer-gl1.0-0 libgstreamer-plugins-bad1.0-0 libavif16 libmanette-0.2-0 libenchant-2-2
# browser cache too, if ~/.cache/ms-playwright is gone: npx playwright-core install webkit (from a dir with the repo's node_modules)
```
(--reinstall matters: a restore can leave dpkg saying "installed" while the .so files are gone.)
To run Playwright's own installer through the mirror, put a wrapper first on PATH:
`printf '#!/bin/sh\nexec /usr/bin/apt-get -o Dir::Etc::SourceParts=/tmp/apt-https/parts "$@"\n' > /tmp/apt-wrap/apt-get` (chmod +x).
Fallback: fetch .debs with curl from http://cdn-fastly.deb.debian.org/debian/pool/... and `sudo apt-get install ./*.deb`.

## Not installed (decision for HoQA)
`install-deps --dry-run webkit` still lists 68 optional packages (gstreamer1.0-plugins-{base,good,bad}, gstreamer1.0-libav,
fonts-freefont-ttf/ipafont/wqy/tlwg/unifont, codecs...). They were not on the box before (WebKit S-webkit passed 21:17 Oct 29
without them) and are not needed to launch. Installing the fonts could change WebKit rendering vs. signed screenshots, so left alone.

**Decision QA-D-1030-WKDEPS (HoQA, Oct 30):** leave out the 68 optional install-deps packages (GStreamer plugins, fonts). The box must match the environment of the signed shots and the 21:17 Oct 29 dry run. Any change to that set goes to HoQA first.
