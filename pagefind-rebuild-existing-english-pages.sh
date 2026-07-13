#!/usr/bin/env bash
#
# pagefind-rebuild-existing-english-pages.sh
#
# Rebuild the Pagefind search index after the CONTENT of existing English
# Lapide commentary pages has changed (typo fixes, revised commentary, etc.).
#
# The Pagefind index is a static snapshot committed to the repo: search shows
# STALE text until this runs. After it finishes, commit BOTH the changed
# content pages and the regenerated pagefind/ directory.
#
# It is also safe to run after adding or removing English Lapide pages — it
# re-normalizes the search markers first, so new pages get indexed and removed
# ones drop out (watch the "--fix" count below: 0 = pure content edits).
# It does NOT touch hreflang/sitemap; run `bun update-site.ts` separately when
# you add whole new pages.
#
# Usage:  ./pagefind-rebuild-existing-english-pages.sh

set -euo pipefail
cd "$(dirname "$0")"   # run from the repo root, wherever this script is invoked from

echo "==> Normalizing search markers (data-pagefind-body + highlight script)…"
bun pagefind-pages.ts --fix

echo
echo "==> Purging stale index and rebuilding (this is why: bunx pagefind does not clear old output)…"
rm -rf pagefind
bunx pagefind --site . --glob "*.html"

echo
echo "==> Verifying the marker set is consistent…"
if bun pagefind-pages.ts --check; then
  echo
  echo "✅ Search index rebuilt. Commit the content changes AND the index, e.g.:"
  echo "     git add -A && git commit -m 'content: update pages + rebuild search index'"
else
  echo
  echo "⚠️  Marker drift remains after --fix — investigate the output above before committing." >&2
  exit 1
fi
