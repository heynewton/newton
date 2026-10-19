#!/usr/bin/env bash
# Moves cards on the Newton project board when issues and pull requests change.
# Called by .github/workflows/board.yml; the rules are listed in docs/process.md.
#
# Needs GH_TOKEN (a token that can write to the org's projects), and EVENT, ACTION, NUMBER from
# the workflow. For pull requests also DRAFT and MERGED ("true"/"false").
set -euo pipefail

ORG=heynewton
PROJECT_NUMBER=1
REPO=${GITHUB_REPOSITORY:-heynewton/newton}

gql() { gh api graphql "$@"; }

project=$(gql -f org="$ORG" -F n="$PROJECT_NUMBER" -f query='
  query($org: String!, $n: Int!) {
    organization(login: $org) { projectV2(number: $n) {
      id
      field(name: "Status") { ... on ProjectV2SingleSelectField { id options { id name } } }
    } }
  }' --jq '.data.organization.projectV2')
PROJECT_ID=$(jq -r .id <<<"$project")
FIELD_ID=$(jq -r .field.id <<<"$project")

option_id() { jq -r --arg n "$1" '.field.options[] | select(.name == $n) | .id' <<<"$project"; }

# move <node id> <status> [only-from status...]
# Adds the issue or PR to the board if needed, then sets its status. With only-from statuses, the
# card moves only if it is currently in one of them ("" = no status yet).
move() {
  local node=$1 status=$2; shift 2
  local info item current
  info=$(gql -f id="$node" -f query='
    query($id: ID!) { node(id: $id) {
      ... on Issue { number projectItems(first: 20) { nodes { id project { id }
        fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } } } } }
      ... on PullRequest { number projectItems(first: 20) { nodes { id project { id }
        fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } } } } }
    } }' --jq '.data.node')
  item=$(jq -r --arg p "$PROJECT_ID" '[.projectItems.nodes[] | select(.project.id == $p)][0] // empty' <<<"$info")
  local number; number=$(jq -r .number <<<"$info")

  if [ -z "$item" ]; then
    item_id=$(gql -f p="$PROJECT_ID" -f c="$node" -f query='
      mutation($p: ID!, $c: ID!) { addProjectV2ItemById(input: {projectId: $p, contentId: $c}) { item { id } } }' \
      --jq '.data.addProjectV2ItemById.item.id')
    current=""
    echo "#$number added to the board"
  else
    item_id=$(jq -r .id <<<"$item")
    current=$(jq -r '.fieldValueByName.name // ""' <<<"$item")
  fi

  if [ $# -gt 0 ]; then
    local ok=false from
    for from in "$@"; do [ "$current" = "$from" ] && ok=true; done
    if ! $ok; then echo "#$number stays in ${current:-no status}"; return; fi
  fi
  if [ "$current" = "$status" ]; then echo "#$number already in $status"; return; fi

  gql -f p="$PROJECT_ID" -f i="$item_id" -f f="$FIELD_ID" -f o="$(option_id "$status")" -f query='
    mutation($p: ID!, $i: ID!, $f: ID!, $o: String!) {
      updateProjectV2ItemFieldValue(input: {projectId: $p, itemId: $i, fieldId: $f,
        value: {singleSelectOptionId: $o}}) { projectV2Item { id } } }' > /dev/null
  echo "#$number: ${current:-no status} -> $status"
}

issue_node() { gh api "repos/$REPO/issues/$1" --jq .node_id; }

# Open issues the pull request closes (from "Closes #N" in its description).
closing_issues() {
  gql -f owner="${REPO%/*}" -f name="${REPO#*/}" -F n="$NUMBER" -f query='
    query($owner: String!, $name: String!, $n: Int!) { repository(owner: $owner, name: $name) {
      pullRequest(number: $n) { closingIssuesReferences(first: 20) { nodes { id state } } } } }' \
    --jq '.data.repository.pullRequest.closingIssuesReferences.nodes[] | select(.state == "OPEN") | .id'
}

pr_node() { gh api "repos/$REPO/pulls/$NUMBER" --jq .node_id; }

case "$EVENT/$ACTION" in
  issues/opened)
    move "$(issue_node "$NUMBER")" Inbox "" ;;
  issues/assigned)
    move "$(issue_node "$NUMBER")" "In progress" "" Inbox Ready ;;
  issues/closed)
    move "$(issue_node "$NUMBER")" Done ;;
  issues/reopened)
    move "$(issue_node "$NUMBER")" Ready ;;

  pull_request/closed)
    if [ "$MERGED" = true ]; then
      move "$(pr_node)" Done
      for i in $(closing_issues); do move "$i" Done; done
    else
      move "$(pr_node)" Done
      for i in $(closing_issues); do move "$i" Ready "In progress" "In review"; done
    fi ;;
  pull_request/*)
    if [ "$DRAFT" = true ]; then
      move "$(pr_node)" "In progress"
      for i in $(closing_issues); do move "$i" "In progress" "" Inbox Ready "In review"; done
    else
      move "$(pr_node)" "In review"
      for i in $(closing_issues); do move "$i" "In review" "" Inbox Ready "In progress"; done
    fi ;;

  *) echo "Nothing to do for $EVENT/$ACTION" ;;
esac
