#!/bin/bash
# BG4 read-only search for analyze.py sha1 e67f184b… and compare.py sha1 8a31fe7b… (authority gives only 8-hex prefixes).
# Each candidate is checked as BOTH plain sha1(content) and git blob id. Reads only; writes only into this directory.
set -u
O=/workspace/egg-farm-studio/scratch/post-l10/gate-build/repair-bg5-bg4/bg4/search
P='^(e67f184b|8a31fe7b)'
echo "start $(TZ=Europe/Belgrade date -Iseconds)" > $O/run-meta.txt
# 1) filesystem: *.py with analy*/compar* in the name under /workspace /home/box /tmp
find /workspace /home/box /tmp -xdev \( -name node_modules -o -name .git \) -prune -o -type f -iname '*.py' \( -iname '*analy*' -o -iname '*compar*' \) -print 2>/dev/null | sort > $O/fs-candidates.txt
: > $O/fs-hashes.tsv
while IFS= read -r f; do
  printf '%s\t%s\t%s\t%s\n' "$(sha1sum "$f" | cut -d' ' -f1)" "$(git hash-object "$f" 2>/dev/null)" "$(sha256sum "$f" | cut -d' ' -f1)" "$f" >> $O/fs-hashes.tsv
done < $O/fs-candidates.txt
awk -F'\t' -v p="$P" '$1 ~ p || $2 ~ p' $O/fs-hashes.tsv > $O/fs-MATCHES.tsv
# 1b) any *.py (any name) referencing noAffByF / verdicts.json / metrics.json
rg -l --no-messages -g '*.py' -g '!node_modules' 'noAffByF|verdicts\.json|metrics\.json' /workspace /home/box /tmp 2>/dev/null | sort > $O/fs-content-candidates.txt
: > $O/fs-content-hashes.tsv
while IFS= read -r f; do printf '%s\t%s\t%s\n' "$(sha1sum "$f" | cut -d' ' -f1)" "$(git hash-object "$f" 2>/dev/null)" "$f" >> $O/fs-content-hashes.tsv; done < $O/fs-content-candidates.txt
awk -F'\t' -v p="$P" '$1 ~ p || $2 ~ p' $O/fs-content-hashes.tsv > $O/fs-content-MATCHES.tsv
# 2) git object stores (deduped common dirs, incl. bare *.git): abbreviated object lookup + every historical analy*/compar* .py blob
find /workspace /home/box -xdev -name node_modules -prune -o -name .git -print 2>/dev/null | sort > $O/git-dotgit.txt
{ while IFS= read -r g; do d=$(dirname "$g"); c=$(git -C "$d" rev-parse --git-common-dir 2>/dev/null) || continue; (cd "$d" && realpath "$c"); done < $O/git-dotgit.txt
  find /workspace /home/box -xdev -name node_modules -prune -o -type d -name '*.git' -print 2>/dev/null | while read -r g; do git --git-dir="$g" rev-parse --git-dir >/dev/null 2>&1 && realpath "$g"; done
} | sort -u > $O/git-commondirs.txt
: > $O/git-abbrev.tsv; : > $O/git-history.tsv
while IFS= read -r c; do
  for pre in e67f184b 8a31fe7b; do printf '%s\t%s\t%s\n' "$c" "$pre" "$(git --git-dir="$c" cat-file -t "$pre" 2>&1 | head -1)" >> $O/git-abbrev.tsv; done
  git --git-dir="$c" log --all --format='%H' -- '*analy*.py' '*compar*.py' 2>/dev/null | sort -u | while read -r h; do
    git --git-dir="$c" ls-tree -r "$h" 2>/dev/null | awk -F'\t' '{split($1,a," "); if ($2 ~ /(analy|compar)[^\/]*\.py$/) print a[3]"\t"$2}' | while IFS=$'\t' read -r blob path; do
      printf '%s\t%s\t%s\t%s\t%s\n' "$c" "$h" "$blob" "$(git --git-dir="$c" cat-file blob "$blob" | sha1sum | cut -d' ' -f1)" "$path" >> $O/git-history.tsv; done
  done
done < $O/git-commondirs.txt
sort -u -o $O/git-history.tsv $O/git-history.tsv
awk -F'\t' -v p="$P" '$3 ~ p || $4 ~ p' $O/git-history.tsv > $O/git-history-MATCHES.tsv
grep -v -e 'fatal' -e 'error' -e 'Not a valid' $O/git-abbrev.tsv > $O/git-abbrev-MATCHES.tsv || true
# 3) text mentions of the pin prefixes
rg -n --no-messages -g '!node_modules' 'e67f184b|8a31fe7b' /workspace /home/box 2>/dev/null | cut -c1-240 > $O/text-mentions.txt
echo "end $(TZ=Europe/Belgrade date -Iseconds)" >> $O/run-meta.txt
wc -l $O/*.txt $O/*.tsv >> $O/run-meta.txt
