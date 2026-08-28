#!/usr/bin/env sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
project_root=$(CDPATH= cd -- "$script_dir/.." && pwd)
cd "$project_root"

if ! command -v node >/dev/null 2>&1; then
  echo "找不到 Node.js；請安裝專案指定版本（Node >= 22.13.0）。" >&2
  exit 1
fi
if [ -z "${PANDOC:-}" ] && ! command -v pandoc >/dev/null 2>&1; then
  echo "找不到 Pandoc；請參考 https://pandoc.org/installing.html 安裝，或以 PANDOC 指定可攜版執行檔。" >&2
  exit 1
fi

npm run guide:build

