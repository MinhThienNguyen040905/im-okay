param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-z0-9]{20}$')]
  [string]$ProjectRef,

  [switch]$Apply
)

$ErrorActionPreference = 'Stop'
$repoRoot = (git rev-parse --show-toplevel).Trim()
if (-not $repoRoot) { throw 'Không xác định được repository root.' }
Set-Location -LiteralPath $repoRoot

$supabaseCli = Join-Path $repoRoot 'node_modules\.bin\supabase.cmd'
if (-not (Test-Path -LiteralPath $supabaseCli)) {
  throw 'Chưa cài Supabase CLI dependency trong node_modules.'
}

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  throw 'Thiếu SUPABASE_ACCESS_TOKEN. Đăng nhập Supabase CLI trước khi deploy staging.'
}

& $supabaseCli link --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) { throw 'Không thể link Supabase staging project.' }

& $supabaseCli migration list --linked
if ($LASTEXITCODE -ne 0) { throw 'Không thể đọc migration history của staging.' }

& $supabaseCli db push --linked --dry-run
if ($LASTEXITCODE -ne 0) { throw 'Migration dry-run thất bại; chưa có thay đổi nào được deploy.' }

if (-not $Apply) {
  Write-Output 'Dry-run hoàn tất. Chạy lại với -Apply sau khi review migration và backup checkpoint.'
  exit 0
}

if ($env:S4_DEPLOY_CONFIRMATION -ne 'staging') {
  throw 'Đặt S4_DEPLOY_CONFIRMATION=staging để xác nhận đúng target trước khi apply.'
}

& $supabaseCli db push --linked
if ($LASTEXITCODE -ne 0) { throw 'Deploy migration thất bại.' }

$functions = @('api', 'public-api', 'notification-consumer', 'provider-receipts', 'ops')
foreach ($functionName in $functions) {
  & $supabaseCli functions deploy $functionName --project-ref $ProjectRef
  if ($LASTEXITCODE -ne 0) { throw "Deploy Edge Function $functionName thất bại." }
}

Write-Output 'Backend staging đã deploy. Tiếp tục cấu hình Vault, Auth redirects, contact web và chạy staging:preflight.'
