#!/usr/bin/env bash
# migrate-archives.sh — Migrate legacy openspec archives to canonical structure
# Legacy: openspec/changes/<type>/<change>/archive/
# Canonical: openspec/changes/archive/<YYYY-MM-DD>-<change>/
#
# One-time migration for COU-119. Safe to re-run (idempotent).
set -euo pipefail

CHANGES_ROOT="openspec/changes"
ARCHIVE_ROOT="$CHANGES_ROOT/archive"

# Ensure archive root exists
mkdir -p "$ARCHIVE_ROOT"

migrated=0
skipped=0
errors=0

# Find all legacy archive directories (mindepth 3: changes/<type>/<change>/archive)
for legacy_archive in $(find "$CHANGES_ROOT" -mindepth 3 -maxdepth 3 -type d -name archive 2>/dev/null | sort); do
  change_dir=$(dirname "$legacy_archive")
  change_name=$(basename "$change_dir")
  type_dir=$(basename "$(dirname "$change_dir")")

  echo "--- Migrating: $type_dir/$change_name ---"

  # Derive date prefix
  date_prefix=""

  # 1. Try completed.md for date
  if [[ -f "$legacy_archive/completed.md" ]]; then
    # Try to extract date from completed.md content (look for YYYY-MM-DD patterns)
    date_from_file=$(grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' "$legacy_archive/completed.md" 2>/dev/null | head -1 || true)
    if [[ -n "$date_from_file" ]]; then
      date_prefix="$date_from_file"
      echo "  Date from completed.md: $date_prefix"
    fi
  fi

  # 2. Fallback to git log date
  if [[ -z "$date_prefix" ]]; then
    git_date=$(git log --format=%ci -1 -- "$legacy_archive" 2>/dev/null | cut -d' ' -f1 || true)
    if [[ -n "$git_date" ]]; then
      date_prefix="$git_date"
      echo "  Date from git log: $date_prefix"
    fi
  fi

  # 3. Fallback to current date
  if [[ -z "$date_prefix" ]]; then
    date_prefix=$(date +%Y-%m-%d)
    echo "  Date fallback (today): $date_prefix"
  fi

  # Check if name already starts with a date — don't double-prefix
  if echo "$change_name" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}-'; then
    target_name="$change_name"
    echo "  Name already has date prefix, using as-is: $target_name"
  else
    target_name="${date_prefix}-${change_name}"
  fi

  target_dir="$ARCHIVE_ROOT/$target_name"

  # Check for collision: if target already exists, check if it has content
  if [[ -d "$target_dir" ]]; then
    existing_files=$(find "$target_dir" -type f | wc -l)
    legacy_files=$(find "$legacy_archive" -type f | wc -l)
    echo "  COLLISION: $target_dir already exists ($existing_files files)"
    echo "  Legacy archive has $legacy_files files"

    if [[ "$existing_files" -ge "$legacy_files" ]]; then
      echo "  SKIP: Target already has equal or more files. Removing legacy archive dir only."
      rm -rf "$legacy_archive"
      skipped=$((skipped + 1))

      # Clean up empty parent dirs (type/change if empty)
      if [[ -d "$change_dir" ]] && [ -z "$(ls -A "$change_dir" 2>/dev/null)" ]; then
        rmdir "$change_dir" 2>/dev/null || true
        echo "  Removed empty parent: $change_dir"
      fi
      continue
    else
      echo "  MERGE: Moving legacy files into existing target."
      # Move files from legacy archive to target (don't overwrite existing)
      for f in "$legacy_archive"/*; do
        fname=$(basename "$f")
        if [[ ! -e "$target_dir/$fname" ]]; then
          git mv "$f" "$target_dir/$fname" 2>/dev/null || mv "$f" "$target_dir/$fname"
          echo "  Moved: $fname"
        else
          echo "  Already exists in target: $fname (skipping)"
        fi
      done
      rm -rf "$legacy_archive"
    fi
  else
    # No collision — move the whole archive directory
    echo "  Moving to: $target_dir"
    git mv "$legacy_archive" "$target_dir" 2>/dev/null || mv "$legacy_archive" "$target_dir"
  fi

  # Clean up empty parent dirs
  if [[ -d "$change_dir" ]] && [ -z "$(ls -A "$change_dir" 2>/dev/null)" ]; then
    rmdir "$change_dir" 2>/dev/null || true
    echo "  Removed empty parent: $change_dir"
  fi

  # Clean up empty type dir
  type_path="$CHANGES_ROOT/$type_dir"
  if [[ -d "$type_path" ]] && [ -z "$(ls -A "$type_path" 2>/dev/null)" ]; then
    rmdir "$type_path" 2>/dev/null || true
    echo "  Removed empty type dir: $type_path"
  fi

  migrated=$((migrated + 1))
  echo "  DONE"
  echo
done

echo "=============================="
echo "Migration complete: $migrated migrated, $skipped skipped (already existed), $errors errors"
