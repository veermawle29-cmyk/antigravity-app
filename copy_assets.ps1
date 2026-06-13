# copy_assets.ps1
# Automates synchronization of modified web files and rules into the Android YAARBUZZ packaging directory

$SourceDir = "c:\Users\ADMIN\Desktop\antigravity app code"
$DestAssetsDir = "C:\Users\ADMIN\Desktop\YAARBUZZ\app\src\main\assets"
$DestRootDir = "C:\Users\ADMIN\Desktop\YAARBUZZ"

Write-Host "Starting asset synchronization..." -ForegroundColor Cyan

# Ensure destination directories exist
if (-not (Test-Path $DestAssetsDir)) {
    New-Item -ItemType Directory -Force -Path $DestAssetsDir | Out-Null
}

# Copy web files
$FilesToCopy = @(
    "app.js",
    "auth.js",
    "index.html",
    "firebase-config.js",
    "style.css",
    "localization.json",
    "manifest.json",
    "sw.js"
)

foreach ($File in $FilesToCopy) {
    $SrcFile = Join-Path $SourceDir $File
    $DstFile = Join-Path $DestAssetsDir $File
    if (Test-Path $SrcFile) {
        Copy-Item -Path $SrcFile -Destination $DstFile -Force
        Write-Host "Synced: $File -> Android Assets" -ForegroundColor Green
    } else {
        Write-Warning "Source file not found: $File"
    }
}

# Copy rule files to Android project root
$RuleFiles = @(
    "firestore.rules",
    "storage.rules"
)

foreach ($Rule in $RuleFiles) {
    $SrcRule = Join-Path $SourceDir $Rule
    $DstRule = Join-Path $DestRootDir $Rule
    if (Test-Path $SrcRule) {
        Copy-Item -Path $SrcRule -Destination $DstRule -Force
        Write-Host "Synced: $Rule -> Android Project Root" -ForegroundColor Green
    } else {
        Write-Warning "Source rule not found: $Rule"
    }
}

Write-Host "Synchronization complete!" -ForegroundColor Cyan
