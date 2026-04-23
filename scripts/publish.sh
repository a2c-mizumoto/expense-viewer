#!/usr/bin/env bash
set -euo pipefail

# expense-viewer/ 配下だけを公開リポ (a2c-mizumoto/expense-viewer) の main に反映する
# 親リポ (ai-management) の配下で実行する

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
cd "$REPO_ROOT"

PREFIX="expense-viewer"
TMP_BRANCH="expense-viewer-publish"
REMOTE_URL="git@github.com:a2c-mizumoto/expense-viewer.git"

if [ -n "$(git status --porcelain)" ]; then
  echo "✖ 作業ツリーに未コミットの変更があります。コミットしてから再実行してください。" >&2
  exit 1
fi

git branch -D "$TMP_BRANCH" 2>/dev/null || true

echo "→ subtree split: $PREFIX → $TMP_BRANCH"
git subtree split --prefix="$PREFIX" -b "$TMP_BRANCH"

echo "→ push: $TMP_BRANCH → $REMOTE_URL main"
git push "$REMOTE_URL" "$TMP_BRANCH":main --force-with-lease

git branch -D "$TMP_BRANCH"

echo "✔ Published. Cloudflare Pages が自動デプロイを開始します。"
