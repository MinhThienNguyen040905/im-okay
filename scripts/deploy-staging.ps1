param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-z0-9]{20}$')]
  [string]$ProjectRef,

  [switch]$Apply
)

$ErrorActionPreference = 'Stop'
$repoRoot = (git rev-parse --show-toplevel).Trim()
if (-not $repoRoot) { throw 'Could not resolve repository root.' }
Set-Location -LiteralPath $repoRoot

$supabaseCli = Join-Path $repoRoot 'node_modules\.bin\supabase.cmd'
if (-not (Test-Path -LiteralPath $supabaseCli)) {
  throw 'Supabase CLI dependency is missing from node_modules.'
}

& $supabaseCli projects list --output json | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw 'Supabase CLI is not logged in or the session expired. Run npx supabase login.'
}

& $supabaseCli link --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) { throw 'Could not link the Supabase staging project.' }

& $supabaseCli migration list --linked
if ($LASTEXITCODE -ne 0) { throw 'Could not read staging migration history.' }

& $supabaseCli db push --linked --dry-run
if ($LASTEXITCODE -ne 0) { throw 'Migration dry-run failed; nothing was deployed.' }

if (-not $Apply) {
  Write-Output 'Dry-run completed. Review migrations and the backup checkpoint before using -Apply.'
  exit 0
}

if ($env:S4_DEPLOY_CONFIRMATION -ne 'staging') {
  throw 'Set S4_DEPLOY_CONFIRMATION=staging to confirm the target before apply.'
}

& $supabaseCli db push --linked
if ($LASTEXITCODE -ne 0) { throw 'Migration deployment failed.' }

$functions = @('api', 'public-api', 'notification-consumer', 'provider-receipts', 'ops')
foreach ($functionName in $functions) {
  & $supabaseCli functions deploy $functionName --project-ref $ProjectRef
  if ($LASTEXITCODE -ne 0) { throw "Edge Function deployment failed: $functionName." }
}

Write-Output 'Staging backend deployed. Configure Vault, Auth redirects and contact web, then run staging:preflight.'
