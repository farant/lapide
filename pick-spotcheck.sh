#!/bin/bash
# Pick a random translated HTML file that hasn't been spotchecked yet.
# Usage: ./pick-spotcheck.sh

SPOTCHECK="translation-quality-spotcheck.md"
DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ! -f "$DIR/$SPOTCHECK" ]; then
  echo "Error: $SPOTCHECK not found" >&2
  exit 1
fi

# Collect all translated HTML files (those with a language suffix before .html)
# Exclude: index files, quote files, tmp files, English-only files, Latin files
candidates=()
while IFS= read -r f; do
  rel="${f#$DIR/}"
  # Skip non-translated files
  [[ "$rel" == index* ]] && continue
  [[ "$rel" == quotes* ]] && continue
  [[ "$rel" == tmp_* ]] && continue
  # Must have a language suffix (e.g., _it.html, _zh.html, _ceb.html)
  basename=$(basename "$rel" .html)
  # Skip Latin source files
  [[ "$basename" == *_lt ]] && continue
  # Must end with _XX or _XXX (language code)
  if [[ ! "$basename" =~ _[a-z]{2,3}$ ]]; then
    continue
  fi
  # Check if already in spotcheck log
  if ! grep -qF "$rel" "$DIR/$SPOTCHECK" 2>/dev/null; then
    candidates+=("$rel")
  fi
done < <(find "$DIR" -name '*.html' -not -path '*/quotes_*/*' -not -path '*/tmp_*' | sort)

if [ ${#candidates[@]} -eq 0 ]; then
  echo "All translated files have been spotchecked!"
  exit 0
fi

# Pick a random one
idx=$((RANDOM % ${#candidates[@]}))
echo "${candidates[$idx]}"
