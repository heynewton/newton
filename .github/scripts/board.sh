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
      kanban: field(name: "Kanban") { ... on ProjectV2SingleSelectField { id options { id name } } }
    } }
  }' --jq '.data.organization.projectV2')
PROJECT_ID=$(jq -r .id <<<"$project")
FIELD_ID=$(jq -r .field.id <<<"$project")

option_id() { jq -r --arg n "$1" '.field.options[] | select(.name == $n) | .id' <<<"$project"; }

# The Kanban view hides PR cards whose issue already shows the work: a PR that closes an issue
# gets Kanban = Hidden; any other PR stays visible. Skipped if the project has no Kanban field.
KANBAN_FIELD=$(jq -r '.kanban.id // empty' <<<"$project")
KANBAN_HIDDEN=$(jq -r '.kanban.options[]? | select(.name == "Hidden") | .id' <<<"$project")

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

# How many issues the pull request closes, open or closed.
closing_count() {
  gql -f owner="${REPO%/*}" -f name="${REPO#*/}" -F n="$NUMBER" -f query='
    query($owner: String!, $name: String!, $n: Int!) { repository(owner: $owner, name: $name) {
      pullRequest(number: $n) { closingIssuesReferences { totalCount } } } }' \
    --jq '.data.repository.pullRequest.closingIssuesReferences.totalCount'
}

# kanban_for_pr <PR node id>: hide the PR's card on the Kanban view when it closes an issue.
kanban_for_pr() {
  [ -n "$KANBAN_FIELD" ] && [ -n "$KANBAN_HIDDEN" ] || return 0
  local node=$1 item
  item=$(gql -f id="$node" -f query='
    query($id: ID!) { node(id: $id) { ... on PullRequest {
      projectItems(first: 20) { nodes { id project { id } } } } } }' \
    --jq ".data.node.projectItems.nodes[] | select(.project.id == \"$PROJECT_ID\") | .id" | head -1)
  [ -n "$item" ] || return 0
  if [ "$(closing_count)" -gt 0 ]; then
    gql -f p="$PROJECT_ID" -f i="$item" -f f="$KANBAN_FIELD" -f o="$KANBAN_HIDDEN" -f query='
      mutation($p: ID!, $i: ID!, $f: ID!, $o: String!) {
        updateProjectV2ItemFieldValue(input: {projectId: $p, itemId: $i, fieldId: $f,
          value: {singleSelectOptionId: $o}}) { projectV2Item { id } } }' > /dev/null
    echo "#$NUMBER: hidden on Kanban (shown through its issue)"
  else
    gql -f p="$PROJECT_ID" -f i="$item" -f f="$KANBAN_FIELD" -f query='
      mutation($p: ID!, $i: ID!, $f: ID!) {
        clearProjectV2ItemFieldValue(input: {projectId: $p, itemId: $i, fieldId: $f}) {
          projectV2Item { id } } }' > /dev/null
    echo "#$NUMBER: shown on Kanban (closes no issue)"
  fi
}

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
      pr=$(pr_node); move "$pr" Done; kanban_for_pr "$pr"
      for i in $(closing_issues); do move "$i" Done; done
    else
      pr=$(pr_node); move "$pr" Done; kanban_for_pr "$pr"
      for i in $(closing_issues); do move "$i" Ready "In progress" "In review"; done
    fi ;;
  pull_request/*)
    # An edited description on a PR that is already merged or closed mustn't move its card back.
    if [ "$(gh api "repos/$REPO/pulls/$NUMBER" --jq .state)" != open ]; then
      echo "#$NUMBER is closed: card stays where it is"
    elif [ "$DRAFT" = true ]; then
      pr=$(pr_node); move "$pr" "In progress"; kanban_for_pr "$pr"
      for i in $(closing_issues); do move "$i" "In progress" "" Inbox Ready "In review"; done
    else
      pr=$(pr_node); move "$pr" "In review"; kanban_for_pr "$pr"
      for i in $(closing_issues); do move "$i" "In review" "" Inbox Ready "In progress"; done
    fi ;;

  *) echo "Nothing to do for $EVENT/$ACTION" ;;
esac
