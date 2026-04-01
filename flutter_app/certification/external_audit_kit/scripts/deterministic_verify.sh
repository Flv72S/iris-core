#!/bin/sh
# Deterministic verification of Public Verification Package. No network; no env.
# Usage: deterministic_verify.sh <kit_dir> <package_dir>
# Exit 0: match. Exit 1: mismatch or error.

KIT_DIR="$1"
PACKAGE_DIR="$2"
VERIFY_HASHES="$KIT_DIR/VERIFY_HASHES.txt"

if [ ! -f "$VERIFY_HASHES" ]; then
  echo "VERIFY_HASHES.txt not found"
  exit 1
fi
if [ ! -d "$PACKAGE_DIR" ]; then
  echo "Package directory not found"
  exit 1
fi

EXPECTED=$(grep '^PACKAGE_SHA256=' "$VERIFY_HASHES" | cut -d= -f2)
if [ -z "$EXPECTED" ]; then
  echo "PACKAGE_SHA256 not found in VERIFY_HASHES.txt"
  exit 1
fi

# Canonical order: sort filenames. For each: filename (LF), content (LF). Then SHA-256.
TEMP=$(mktemp)
cd "$PACKAGE_DIR" || exit 1
for f in $(ls -1 | sort); do
  [ -f "$f" ] || continue
  printf '%s\n' "$f"
  cat "$f"
  printf '\n'
done > "$TEMP"
COMPUTED=$(sha256sum < "$TEMP" | cut -d' ' -f1)
rm -f "$TEMP"

if [ "$COMPUTED" = "$EXPECTED" ]; then
  echo "PACKAGE_SHA256 match"
  exit 0
else
  echo "PACKAGE_SHA256 mismatch"
  exit 1
fi
