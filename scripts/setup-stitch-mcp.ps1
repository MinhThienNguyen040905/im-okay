$ErrorActionPreference = "Stop"

Write-Host "I'm Okay - Stitch MCP credential setup" -ForegroundColor Cyan
Write-Host "Create a key at: https://stitch.withgoogle.com/settings"
Write-Host "The key will be stored as a user-level environment variable."
Write-Host "It will not be printed or written into this repository."
Write-Host ""

$secureKey = Read-Host "Paste STITCH_API_KEY (input is hidden)" -AsSecureString
$keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)

try {
    $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)

    if ([string]::IsNullOrWhiteSpace($plainKey)) {
        throw "STITCH_API_KEY cannot be empty."
    }

    [Environment]::SetEnvironmentVariable("STITCH_API_KEY", $plainKey, "User")
    Write-Host ""
    Write-Host "STITCH_API_KEY was saved successfully." -ForegroundColor Green
    Write-Host "Restart Codex, return to this project, and ask Codex to continue the Stitch MCP setup."
}
finally {
    if ($keyPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer)
    }

    $plainKey = $null
    $secureKey = $null
}
