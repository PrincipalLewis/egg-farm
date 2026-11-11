#!/bin/bash
# HoQA read-only search for any copy of s00-base metrics.json sha256 d6ac395c... (writes only into this review folder)
O=/workspace/egg-farm-studio/qa/reviews/bg5-bg4-cert-20261110/logs/d6ac-search
mkdir -p $O; T=d6ac395cbf96b5149af7a16fd9f45dc8a26988ec451862ec1876d81e9af19997
# 1. every regular file 1KB..5MB under the shared roots (no node_modules), sha256
find /workspace /home/box /tmp /cursor/stores -xdev \( -name node_modules -o -name .git \) -prune -o -type f -size +1k -size -5M -print0 2>/dev/null \
  | xargs -0 sha256sum 2>/dev/null > $O/fs-sha256.tsv
grep -c '' $O/fs-sha256.tsv > $O/fs-count.txt
grep "^$T" $O/fs-sha256.tsv > $O/fs-MATCHES.tsv
# 2. git objects: every blob in every object store, sha256 of content for blobs 15k..40k bytes
find /workspace /home/box /tmp /cursor/stores -xdev -name node_modules -prune -o \( -type d -name '*.git' -o -type d -name .git \) -print 2>/dev/null > $O/git-dirs.txt
: > $O/git-MATCHES.tsv; : > $O/git-scanned.txt
while read g; do
  gd=$(git --git-dir="$g" rev-parse --git-common-dir 2>/dev/null) || continue
  case "$gd" in /*) ;; *) gd="$g/$gd";; esac; gd=$(readlink -f "$gd")
  grep -qxF "$gd" $O/git-scanned.txt && continue; echo "$gd" >> $O/git-scanned.txt
  git --git-dir="$gd" cat-file --batch-all-objects --batch-check='%(objectname) %(objecttype) %(objectsize)' 2>/dev/null \
   | awk '$2=="blob" && $3>=15000 && $3<=40000 {print $1}' \
   | while read o; do h=$(git --git-dir="$gd" cat-file blob $o | sha256sum | cut -c1-64); [ "$h" = "$T" ] && echo -e "$gd\t$o" >> $O/git-MATCHES.tsv; done
done < $O/git-dirs.txt
# 3. archives: list members named *metrics*.json
find /workspace /home/box /tmp /cursor/stores -xdev -name node_modules -prune -o -type f \( -name '*.tar' -o -name '*.tgz' -o -name '*.tar.gz' -o -name '*.zip' \) -print 2>/dev/null > $O/archives.txt
while read a; do case "$a" in *.zip) unzip -l "$a" 2>/dev/null | grep -i 'metrics.*json' | sed "s|^|$a\t|";; *) tar tf "$a" 2>/dev/null | grep -i 'metrics.*json' | sed "s|^|$a\t|";; esac; done < $O/archives.txt > $O/archive-metrics-members.tsv
echo DONE
