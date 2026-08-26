#!/usr/bin/env bash
# release.sh — Automate version bump, changelog generation, and annotated tag creation
# Requires: git, bash 4+
# Usage: ./release.sh [--bump major|minor|patch|auto] [--dry-run] [--changelog stdout|FILE] [--from REF]

set -euo pipefail

# --- Defaults ---
BUMP="auto"
DRY_RUN=false
CHANGELOG_TARGET="stdout"
FROM_REF=""

# --- Colors (disabled if not a terminal) ---
if [[ -t 1 ]]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  BLUE='\033[0;34m'
  NC='\033[0m'
else
  RED='' GREEN='' YELLOW='' BLUE='' NC=''
fi

# --- Helpers ---
info()  { echo -e "${BLUE}ℹ${NC}  $*"; }
ok()    { echo -e "${GREEN}✓${NC}  $*"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $*" >&2; }
err()   { echo -e "${RED}✗${NC}  $*" >&2; }

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Automate SemVer version bump, changelog generation, and annotated tag creation
from conventional commit history.

Options:
  --bump TYPE       Override automatic bump detection: major, minor, patch, auto (default: auto)
  --dry-run         Show what would happen without creating the tag
  --changelog TARGET  Output changelog to stdout or a file path (default: stdout)
  --from REF        Starting reference for commit range (default: last v* tag)
  -h, --help        Show this help

Exit codes:
  0  Success
  1  Error (invalid args, git failure, tag creation failed)
  2  No releasable changes found

Examples:
  $(basename "$0") --dry-run                          # Preview next release
  $(basename "$0") --bump minor                       # Force MINOR bump
  $(basename "$0") --changelog CHANGELOG.md           # Write changelog to file
  $(basename "$0") --from v1.0.0 --dry-run            # Commits since specific tag
EOF
}

# --- Parse arguments ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    --bump)
      BUMP="${2:-auto}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --changelog)
      CHANGELOG_TARGET="${2:-stdout}"
      shift 2
      ;;
    --from)
      FROM_REF="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      err "Unknown argument: $1"
      usage >&2
      exit 1
      ;;
  esac
done

# --- Validate bump flag ---
if [[ "$BUMP" != "auto" && "$BUMP" != "major" && "$BUMP" != "minor" && "$BUMP" != "patch" ]]; then
  err "--bump must be one of: major, minor, patch, auto"
  exit 1
fi

# --- Validate we're in a git repo ---
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  err "Not inside a git repository"
  exit 1
fi

# --- Find starting point ---
LAST_TAG=""
if [[ -n "$FROM_REF" ]]; then
  # Validate the provided ref exists
  if ! git rev-parse --verify "$FROM_REF" &>/dev/null; then
    err "Reference '$FROM_REF' does not exist"
    exit 1
  fi
  LAST_TAG="$FROM_REF"
  # Extract version: if it's a v* tag use it, otherwise default to 1.0.0
  if [[ "$LAST_TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+ ]]; then
    CURRENT_VERSION="${LAST_TAG#v}"
  else
    CURRENT_VERSION="1.0.0"
  fi
elif git describe --tags --abbrev=0 --match "v*" >/dev/null 2>&1; then
  LAST_TAG=$(git describe --tags --abbrev=0 --match "v*")
  CURRENT_VERSION="${LAST_TAG#v}"
else
  CURRENT_VERSION="1.0.0"
fi

# --- Collect commits (subject only — reliable line-by-line reading) ---
# BREAKING CHANGE detection uses the ! suffix convention.
# Footer-based detection requires per-commit git log calls (not batch-friendly).
if [[ -n "$LAST_TAG" ]]; then
  COMMIT_RANGE="${LAST_TAG}..HEAD"
  COMMITS=$(git log --format="%s" "$COMMIT_RANGE" 2>/dev/null || true)
  COMMIT_COUNT=$(git rev-list --count "$COMMIT_RANGE" 2>/dev/null || echo 0)
else
  COMMITS=$(git log --format="%s" 2>/dev/null || true)
  COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo 0)
fi

if [[ -z "$COMMITS" ]]; then
  err "No commits found"
  exit 1
fi

# --- Validate conventional commits ---
validate_commits() {
  local total=0
  local conventional=0
  local non_conventional=""

  while IFS= read -r entry; do
    [[ -z "$entry" ]] && continue
    total=$((total + 1))

    local subject="$entry"
    if echo "$subject" | grep -qE '^(feat|fix|perf|refactor|docs|style|test|chore|build|ci|revert)(\(.+\))?!?:'; then
      conventional=$((conventional + 1))
    else
      # Keep first 5 for display
      if [[ $(echo "$non_conventional" | wc -l) -lt 5 ]]; then
        non_conventional+="    $subject"$'\n'
      fi
    fi
  done <<< "$COMMITS"

  if [[ $total -gt 0 && $conventional -eq 0 ]]; then
    warn "No conventional commits found ($total commits scanned)"
    warn "Expected format: type(scope): description"
    warn "Types: feat, fix, perf, refactor, docs, style, test, chore, build, ci, revert"
    if [[ -n "$non_conventional" ]]; then
      warn "Sample commits:"
      echo -e "$non_conventional" >&2
    fi
    return 1
  elif [[ $total -gt 0 && $conventional -lt $total ]]; then
    local pct=$((conventional * 100 / total))
    warn "$conventional/$total commits are conventional ($pct%) — non-conventional commits will be ignored"
  fi

  return 0
}

# Ignore validation errors — we still proceed, just warn
validate_commits || true

# --- Parse version ---
parse_version() {
  local ver="$1"
  MAJOR=$(echo "$ver" | cut -d. -f1)
  MINOR=$(echo "$ver" | cut -d. -f2)
  PATCH=$(echo "$ver" | cut -d. -f3)
  MAJOR=${MAJOR:-0}
  MINOR=${MINOR:-0}
  PATCH=${PATCH:-0}
}

# --- Extract scope from commit subject ---
extract_scope() {
  local subject="$1"
  local scope=""
  if echo "$subject" | grep -qE '^\w+\([^)]+\)'; then
    scope=$(echo "$subject" | sed -E 's/^\w+\(([^)]+)\).*/\1/')
  fi
  echo "$scope"
}

# --- Determine bump from commits ---
determine_bump() {
  local has_breaking=false
  local has_feat=false
  local has_fix=false
  local has_perf=false

  while IFS= read -r subject; do
    [[ -z "$subject" ]] && continue

    # Check for feat!/fix!/etc! (angular-style bang = BREAKING)
    if echo "$subject" | grep -qE '^feat!(\(.+\))?:'; then
      has_breaking=true
    elif echo "$subject" | grep -qE '^fix!(\(.+\))?:'; then
      has_breaking=true
    elif echo "$subject" | grep -qE '^perf!(\(.+\))?:'; then
      has_breaking=true
    elif echo "$subject" | grep -qE '^feat(\(.+\))?:'; then
      has_feat=true
    elif echo "$subject" | grep -qE '^fix(\(.+\))?:'; then
      has_fix=true
    elif echo "$subject" | grep -qE '^perf(\(.+\))?:'; then
      has_perf=true
    fi
  done <<< "$COMMITS"

  # Priority: BREAKING > feat > fix > perf
  if $has_breaking; then
    echo "major"
  elif $has_feat; then
    echo "minor"
  elif $has_fix; then
    echo "patch"
  elif $has_perf; then
    echo "patch"
  else
    echo "none"
  fi
}

# --- Apply bump ---
apply_bump() {
  local bump_type="$1"
  case "$bump_type" in
    major)
      MAJOR=$((MAJOR + 1))
      MINOR=0
      PATCH=0
      ;;
    minor)
      MINOR=$((MINOR + 1))
      PATCH=0
      ;;
    patch)
      PATCH=$((PATCH + 1))
      ;;
    none)
      err "No releasable changes found since last tag"
      err "Only docs/style/test/chore/build/ci/refactor commits detected"
      exit 2
      ;;
  esac
}

# --- Generate changelog ---
generate_changelog() {
  local breaking_section=""
  local added_section=""
  local changed_section=""
  local fixed_section=""
  local removed_section=""

  while IFS= read -r subject; do
    [[ -z "$subject" ]] && continue

    local desc=""
    local scope=""
    local entry_text=""

    # Extract scope if present
    scope=$(extract_scope "$subject")

    # BREAKING: feat! in subject
    if echo "$subject" | grep -qE '^feat!(\([^)]*\))?:'; then
      desc=$(echo "$subject" | sed -E 's/^feat!(\([^)]*\))?:\s*//')
      if [[ -n "$scope" ]]; then
        entry_text="- **${scope}**: ${desc}"
      else
        entry_text="- ${desc}"
      fi
      [[ -n "$entry_text" ]] && breaking_section+="${entry_text}"$'\n'
      continue
    fi

    # feat → Added
    if echo "$subject" | grep -qE '^feat(\(.+\))?:'; then
      desc=$(echo "$subject" | sed -E 's/^feat(\([^)]*\))?:\s*//')
      if [[ -n "$scope" ]]; then
        entry_text="- **${scope}**: ${desc}"
      else
        entry_text="- ${desc}"
      fi
      [[ -n "$entry_text" ]] && added_section+="${entry_text}"$'\n'
      continue
    fi

    # fix → Fixed
    if echo "$subject" | grep -qE '^fix(\(.+\))?:'; then
      desc=$(echo "$subject" | sed -E 's/^fix(\([^)]*\))?:\s*//')
      if [[ -n "$scope" ]]; then
        entry_text="- **${scope}**: ${desc}"
      else
        entry_text="- ${desc}"
      fi
      [[ -n "$entry_text" ]] && fixed_section+="${entry_text}"$'\n'
      continue
    fi

    # perf or refactor → Changed
    if echo "$subject" | grep -qE '^(perf|refactor)(\(.+\))?:'; then
      desc=$(echo "$subject" | sed -E 's/^(perf|refactor)(\([^)]*\))?:\s*//')
      if [[ -n "$scope" ]]; then
        entry_text="- **${scope}**: ${desc}"
      else
        entry_text="- ${desc}"
      fi
      [[ -n "$entry_text" ]] && changed_section+="${entry_text}"$'\n'
      continue
    fi

    # revert → Removed
    if echo "$subject" | grep -qE '^revert(\(.+\))?:'; then
      desc=$(echo "$subject" | sed -E 's/^revert(\([^)]*\))?:\s*//')
      if [[ -n "$scope" ]]; then
        entry_text="- **${scope}**: ${desc}"
      else
        entry_text="- ${desc}"
      fi
      [[ -n "$entry_text" ]] && removed_section+="${entry_text}"$'\n'
      continue
    fi

    # docs, style, test, chore, build, ci → omit
  done <<< "$COMMITS"

  # Build output — only include non-empty sections
  local output=""
  if [[ -n "$breaking_section" ]]; then
    output+="### Breaking Changes"$'\n'
    output+="${breaking_section}"$'\n'
  fi
  if [[ -n "$added_section" ]]; then
    output+="### Added"$'\n'
    output+="${added_section}"$'\n'
  fi
  if [[ -n "$changed_section" ]]; then
    output+="### Changed"$'\n'
    output+="${changed_section}"$'\n'
  fi
  if [[ -n "$fixed_section" ]]; then
    output+="### Fixed"$'\n'
    output+="${fixed_section}"$'\n'
  fi
  if [[ -n "$removed_section" ]]; then
    output+="### Removed"$'\n'
    output+="${removed_section}"$'\n'
  fi

  echo "$output"
}

# --- Create tag ---
create_tag() {
  local version="$1"
  local changelog="$2"
  local date_str
  date_str=$(date +%Y-%m-%d)

  local tag_msg="Release ${version} - ${date_str}

${changelog}"

  if $DRY_RUN; then
    echo ""
    info "DRY RUN — no changes will be made"
    echo ""
    echo "  Version:   ${version}"
    echo "  Tag:       v${version}"
    echo "  Date:      ${date_str}"
    echo "  Commits:   ${COMMIT_COUNT}"
    echo "  Previous:  ${LAST_TAG:-none (starting from ${CURRENT_VERSION})}"
    echo ""
    echo "  Changelog:"
    echo "  ─────────────────────────────────"
    if [[ -n "$changelog" ]]; then
      echo "$changelog" | sed 's/^/    /'
    else
      echo "    (empty)"
    fi
    echo "  ─────────────────────────────────"
    echo ""
    info "Tag message would be:"
    echo "  ─────────────────────────────────"
    echo "$tag_msg" | sed 's/^/    /'
    echo "  ─────────────────────────────────"
    return 0
  fi

  if git tag -a "v${version}" -m "$tag_msg" 2>/dev/null; then
    local sha
    sha=$(git rev-parse "v${version}")
    echo ""
    ok "Release ${version} created"
    echo ""
    echo "  Tag:     v${version}"
    echo "  SHA:     ${sha}"
    echo "  Date:    ${date_str}"
    echo "  Commits: ${COMMIT_COUNT}"
    echo ""
    echo "  Changelog:"
    echo "  ─────────────────────────────────"
    echo "$changelog" | sed 's/^/    /'
    echo "  ─────────────────────────────────"
    echo ""
    info "Push when ready: git push origin v${version}"
  else
    err "Failed to create tag v${version}"
    exit 1
  fi
}

# --- Main ---
parse_version "$CURRENT_VERSION"

DETECTED_BUMP=$(determine_bump)

if [[ "$BUMP" == "auto" ]]; then
  FINAL_BUMP="$DETECTED_BUMP"
else
  FINAL_BUMP="$BUMP"
fi

apply_bump "$FINAL_BUMP"

NEXT_VERSION="${MAJOR}.${MINOR}.${PATCH}"
CHANGELOG=$(generate_changelog)

# Check if changelog is empty despite having a bump
if [[ -z "$CHANGELOG" && "$FINAL_BUMP" != "none" ]]; then
  err "No releasable changes found since last tag"
  exit 2
fi

# Output or write changelog
if [[ "$CHANGELOG_TARGET" != "stdout" ]]; then
  if [[ -f "$CHANGELOG_TARGET" ]]; then
    # Prepend new section below header (first 4 lines: title + description + blank)
    tmp_file=$(mktemp)
    {
      head -n 4 "$CHANGELOG_TARGET"
      echo "## [${NEXT_VERSION}] - $(date +%Y-%m-%d)"
      echo ""
      echo "$CHANGELOG"
      tail -n +5 "$CHANGELOG_TARGET"
    } > "$tmp_file"
    mv "$tmp_file" "$CHANGELOG_TARGET"
    ok "Changelog updated: ${CHANGELOG_TARGET}"
  else
    # Create new file
    {
      echo "# Changelog"
      echo ""
      echo "All notable changes to this project will be documented in this file."
      echo ""
      echo "## [${NEXT_VERSION}] - $(date +%Y-%m-%d)"
      echo ""
      echo "$CHANGELOG"
    } > "$CHANGELOG_TARGET"
    ok "Changelog created: ${CHANGELOG_TARGET}"
  fi
fi

create_tag "$NEXT_VERSION" "$CHANGELOG"
