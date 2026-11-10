#!/bin/bash
# BG4 supplemental (read-only): non-.py names (backups like analyze.py.bak/.orig, *.txt copies), archives, reflog/unreachable git objects.
set -u
O=/workspace/egg-farm-studio/scratch/post-l10/gate-build/repair-bg5-bg4/bg4/search; P='^(e67f184b|8a31fe7b)'
find /workspace /home/box /tmp /cursor/stores -xdev \( -name node_modules -o -name .git \) -prune -o -type f \( -iname '*analyze*' -o -iname '*compare*' \) ! -iname '*.py' -size -2M -print 2>/dev/null | sort > $O/s2-nonpy-candidates.txt
while IFS= read -r f; do printf '%s\t%s\t%s\n' "$(sha1sum "$f" | cut -d' ' -f1)" "$(git hash-object "$f")" "$f"; done < $O/s2-nonpy-candidates.txt > $O/s2-nonpy-hashes.tsv
awk -F'\t' -v p="$P" '$1 ~ p || $2 ~ p' $O/s2-nonpy-hashes.tsv > $O/s2-nonpy-MATCHES.tsv
# archives: list members named analyze/compare
find /workspace /home/box /tmp -xdev -name node_modules -prune -o -type f \( -name '*.tar' -o -name '*.tar.gz' -o -name '*.tgz' -o -name '*.zip' \) -size -500M -print 2>/dev/null | sort > $O/s2-archives.txt
: > $O/s2-archive-members.tsv
while IFS= read -r a; do
  case "$a" in *.zip) unzip -Z1 "$a" 2>/dev/null ;; *) tar -tf "$a" 2>/dev/null ;; esac | grep -Ei '(analy|compar)[^/]*\.py$' | while read -r m; do
    case "$a" in *.zip) h=$(unzip -p "$a" "$m" | sha1sum | cut -d' ' -f1) ;; *) h=$(tar -xOf "$a" "$m" | sha1sum | cut -d' ' -f1) ;; esac
    printf '%s\t%s\t%s\n' "$h" "$a" "$m" >> $O/s2-archive-members.tsv; done
done < $O/s2-archives.txt
awk -F'\t' -v p="$P" '$1 ~ p' $O/s2-archive-members.tsv > $O/s2-archive-MATCHES.tsv
# git: unreachable / reflog blobs — plain sha1 of every loose+packed blob is too costly; check every blob id in all object stores by prefix (batch)
: > $O/s2-git-allobjects-MATCHES.tsv
while IFS= read -r c; do git --git-dir="$c" cat-file --batch-all-objects --batch-check='%(objectname) %(objecttype)' 2>/dev/null | grep -E "$P" | sed "s|^|$c |" >> $O/s2-git-allobjects-MATCHES.tsv; done < $O/git-commondirs.txt
echo "s2 done $(TZ=Europe/Belgrade date -Iseconds)"; wc -l $O/s2-*
