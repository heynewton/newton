#!/usr/bin/env bash
# Prints the checked-in migrations the target database hasn't applied, one file name per line,
# for the Production workflow (#120, #163). Extra arguments go to `supabase migration list`
# (`--linked` in the workflow, `--db-url` to try it against another database).
#
# Fails closed: a migration file counts as pending unless the database lists its version as
# applied, so a file the listing leaves out is listed rather than slipping through. Exits non-zero
# if the listing fails or can't be read, or if the database has applied a version that isn't
# checked in here (`supabase db push` would refuse to run anyway). Except with NEWER_FILE set: then
# those versions, which a rollback to an older release leaves behind, are written to that file,
# one per line, and the script carries on.
set -euo pipefail

dir=supabase/migrations
listing=$(npx supabase migration list --output-format json "$@") || {
  echo "::error::supabase migration list failed: $listing" >&2
  exit 1
}
if ! remote=$(jq -er '.migrations | map(.remote | select(. != "")) | .[]' <<<"$listing"); then
  # No applied version at all also lands here; then every file is pending.
  jq -e '.migrations | type == "array"' <<<"$listing" > /dev/null || {
    echo "::error::Unexpected output from supabase migration list: $listing" >&2
    exit 1
  }
  remote=""
fi

unknown=()
for version in $remote; do
  compgen -G "$dir/${version}_*.sql" > /dev/null || unknown+=("$version")
done
if [ -n "${NEWER_FILE:-}" ]; then
  printf '%s\n' "${unknown[@]}" | grep . > "$NEWER_FILE" || true
elif [ ${#unknown[@]} -gt 0 ]; then
  echo "::error::The database has applied migrations that aren't in $dir at this commit: ${unknown[*]}." >&2
  exit 1
fi

for file in "$dir"/*.sql; do
  name=$(basename "$file")
  grep -qxF "${name%%_*}" <<<"$remote" || echo "$name"
done
