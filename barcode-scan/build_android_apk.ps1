$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$environmentFile = Join-Path $repositoryRoot '.env.local'
if (-not (Test-Path $environmentFile)) {
    throw "Firebase environment file not found: $environmentFile"
}

$environment = @{}
foreach ($line in Get-Content $environmentFile) {
    $entry = [regex]::Match($line, '^\s*(?<name>VITE_FIREBASE_[A-Z_]+)\s*=\s*(?<value>.*)\s*$')
    if ($entry.Success) {
        $value = $entry.Groups['value'].Value.Trim().Trim('"').Trim("'")
        $environment[$entry.Groups['name'].Value] = $value
    }
}

$mapping = @{
    FIREBASE_API_KEY = 'VITE_FIREBASE_API_KEY'
    FIREBASE_APP_ID = 'VITE_FIREBASE_APP_ID'
    FIREBASE_MESSAGING_SENDER_ID = 'VITE_FIREBASE_MESSAGING_SENDER_ID'
    FIREBASE_PROJECT_ID = 'VITE_FIREBASE_PROJECT_ID'
    FIREBASE_STORAGE_BUCKET = 'VITE_FIREBASE_STORAGE_BUCKET'
}

$dartDefines = @()
foreach ($defineName in $mapping.Keys) {
    $environmentName = $mapping[$defineName]
    $value = $environment[$environmentName]
    if ($defineName -ne 'FIREBASE_STORAGE_BUCKET' -and [string]::IsNullOrWhiteSpace($value)) {
        throw "Missing $environmentName in $environmentFile"
    }
    if ($null -ne $value) {
        $dartDefines += "--dart-define=$defineName=$value"
    }
}

Push-Location $PSScriptRoot
try {
    & flutter build apk --release @dartDefines --android-project-arg=kotlin.incremental=false
    if ($LASTEXITCODE -ne 0) {
        throw "Flutter APK build failed with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}

$apkPath = Join-Path $PSScriptRoot 'build\app\outputs\flutter-apk\app-release.apk'
if (-not (Test-Path $apkPath)) {
    throw "Flutter build succeeded but the APK was not found at $apkPath"
}

$downloadDirectory = Join-Path $repositoryRoot 'public\downloads'
New-Item -ItemType Directory -Path $downloadDirectory -Force | Out-Null
$downloadPath = Join-Path $downloadDirectory 'SriAmmanStoreScanner.apk'
Copy-Item -Path $apkPath -Destination $downloadPath -Force
Write-Output "Android APK ready: $downloadPath"
