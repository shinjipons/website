#!/usr/bin/env bash
# sanitize_webp.sh
# Renames all .webp files in a directory, replacing URL-unsafe characters.
#
# Usage:
#   ./sanitize_webp.sh [directory]          # renames files (default: current dir)
#   ./sanitize_webp.sh [directory] --dry-run # preview changes without renaming
#
# URL-safe characters: A-Z a-z 0-9 - _ . ~
# Everything else gets replaced with a hyphen, and runs are collapsed.

set -euo pipefail

# ── Args ─────────────────────────────────────────────────────────────────────

TARGET_DIR="${1:-.}"
DRY_RUN=false

for arg in "$@"; do
  [[ "$arg" == "--dry-run" ]] && DRY_RUN=true
done

if [[ ! -d "$TARGET_DIR" ]]; then
  echo "Error: '$TARGET_DIR' is not a directory." >&2
  exit 1
fi

# ── Helpers ───────────────────────────────────────────────────────────────────

sanitize() {
  local name="$1"

  # 1. Decode common HTML/URL entities people sometimes end up with in filenames
  name="${name//%20/ }"
  name="${name//&amp;/and}"
  name="${name//&/and}"

  # 2. Lowercase everything
  name="${name,,}"

  # 3. Replace any character that is NOT alphanumeric, hyphen, underscore,
  #    dot, or tilde with a hyphen.
  #    (These are the RFC 3986 "unreserved" characters minus uppercase.)
  name="$(echo "$name" | LC_ALL=C sed 's/[^a-z0-9._~-]/-/g')"

  # 4. Collapse runs of hyphens into a single hyphen
  name="$(echo "$name" | sed 's/-\{2,\}/-/g')"

  # 5. Strip leading/trailing hyphens
  name="${name#-}"
  name="${name%-}"

  # 6. Guarantee we still have something left
  [[ -z "$name" ]] && name="unnamed"

  echo "$name"
}

# ── Main ──────────────────────────────────────────────────────────────────────

renamed=0
skipped=0
conflicts=0

$DRY_RUN && echo "▶ DRY RUN — no files will be renamed."
echo ""

while IFS= read -r -d '' filepath; do
  dir="$(dirname "$filepath")"
  filename="$(basename "$filepath")"
  stem="${filename%.webp}"

  clean_stem="$(sanitize "$stem")"
  new_filename="${clean_stem}.webp"
  new_filepath="${dir}/${new_filename}"

  if [[ "$filename" == "$new_filename" ]]; then
    echo "  ✓  unchanged  →  $filename"
    ((skipped++)) || true
    continue
  fi

  if [[ -e "$new_filepath" && "$new_filepath" != "$filepath" ]]; then
    echo "  ⚠  conflict   →  '$filename'  would become  '$new_filename'  (already exists, skipping)"
    ((conflicts++)) || true
    continue
  fi

  echo "  ✎  rename     →  '$filename'  →  '$new_filename'"

  if ! $DRY_RUN; then
    mv "$filepath" "$new_filepath"
  fi

  ((renamed++)) || true

done < <(find "$TARGET_DIR" -maxdepth 1 -iname "*.webp" -print0 | sort -z)

echo ""
echo "── Summary ──────────────────────────────────────"
$DRY_RUN && echo "   Mode       : DRY RUN"
echo "   Renamed    : $renamed"
echo "   Unchanged  : $skipped"
echo "   Conflicts  : $conflicts"
echo "   Directory  : $(realpath "$TARGET_DIR")"
echo "─────────────────────────────────────────────────"
