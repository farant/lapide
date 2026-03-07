#!/bin/bash
# Usage: ./find-quotes.sh <filename>
# Given a filename (with or without language suffix), finds all English and Latin
# quote files that link to the English or Latin version of that document.
#
# Examples:
#   ./find-quotes.sh 01_genesis_01
#   ./find-quotes.sh 01_genesis_01_fr
#   ./find-quotes.sh 02_Clemens_Hieronymi_Du_Culte

if [ -z "$1" ]; then
  echo "Usage: $0 <filename>"
  echo "  e.g. $0 01_genesis_01"
  exit 1
fi

# Strip .html extension if provided
input="${1%.html}"

# Strip any language suffix to get the base name
base=$(echo "$input" | sed -E 's/_(ar|de|el|es|fr|hi|id|it|ja|ko|lt|nl|pl|pt|ro|ru|sv|tl|tr|vi|zh)$//')

en_file="${base}.html"
lt_file="${base}_lt.html"

echo "Base: $base"
echo "Looking for links to: $en_file, $lt_file"
echo ""

for dir in quotes quotes_lt; do
  if [ ! -d "$dir" ]; then
    continue
  fi
  matches=$(grep -l -E "href=\"(${en_file}|${lt_file})(#|\")" "$dir"/*.html 2>/dev/null | sort -t/ -k2 -n)
  if [ -n "$matches" ]; then
    count=$(echo "$matches" | wc -l | tr -d ' ')
    echo "$dir/ ($count files):"
    echo "$matches"
    echo ""
  else
    echo "$dir/: (none)"
    echo ""
  fi
done
