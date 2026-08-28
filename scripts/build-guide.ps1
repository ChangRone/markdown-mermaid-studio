$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $ProjectRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "找不到 Node.js；請安裝專案指定版本（Node >= 22.13.0）。"
}

$PortablePandoc = Join-Path $ProjectRoot "tools\pandoc\pandoc.exe"
if (-not $env:PANDOC -and (Test-Path $PortablePandoc)) {
    $env:PANDOC = $PortablePandoc
}
if (-not $env:PANDOC -and -not (Get-Command pandoc -ErrorAction SilentlyContinue)) {
    throw "找不到 Pandoc。可執行：winget install --source winget --exact --id JohnMacFarlane.Pandoc；或將可攜版放到 tools\pandoc\pandoc.exe。"
}

npm run guide:build

