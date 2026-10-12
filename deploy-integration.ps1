$ErrorActionPreference = 'Stop'
$destinationRoot = 'C:\Users\david\Documents\projects\Trading\CasaTrade'
$sourceRoot = Join-Path $PSScriptRoot '.integration-final'
$manifest = Get-Content -LiteralPath (Join-Path $sourceRoot 'deploy-manifest.json') -Raw | ConvertFrom-Json
# Refuse to overwrite any edit made after the reviewed snapshot.
foreach ($entry in $manifest) {
    $targetPath = Join-Path $destinationRoot $entry.file
    $currentHash = if (Test-Path -LiteralPath $targetPath) { (Get-FileHash -LiteralPath $targetPath -Algorithm SHA256).Hash } else { $null }
    if ($currentHash -ne $entry.hash) { throw "Changed since review: $($entry.file)" }
}
$backupRoot = Join-Path $PSScriptRoot ('integration-backups\final-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
foreach ($entry in $manifest) {
    $targetPath = Join-Path $destinationRoot $entry.file
    if (Test-Path -LiteralPath $targetPath) {
        $backupFile = Join-Path $backupRoot $entry.file
        New-Item -ItemType Directory -Path (Split-Path $backupFile -Parent) -Force | Out-Null
        Copy-Item -LiteralPath $targetPath -Destination $backupFile
    }
}
Copy-Item -LiteralPath (Join-Path $sourceRoot 'deploy-manifest.json') -Destination (Join-Path $backupRoot 'manifest.json')
foreach ($entry in $manifest) {
    $sourceFile = Join-Path $sourceRoot $entry.file
    $targetPath = Join-Path $destinationRoot $entry.file
    Copy-Item -LiteralPath $sourceFile -Destination $targetPath -Force
    if ((Get-FileHash -LiteralPath $sourceFile).Hash -ne (Get-FileHash -LiteralPath $targetPath).Hash) { throw "Verification failed: $($entry.file)" }
}
Write-Output "Integrated $($manifest.Count) files. Backup: $backupRoot"
