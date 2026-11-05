$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendPath = Join-Path $projectRoot 'frontend'
$emulatorPath = Join-Path $env:LOCALAPPDATA 'Android\Sdk\emulator\emulator.exe'
$avdName = 'Todo_Phone_12GB_API_36'
$port = 8081

Set-Location $projectRoot

Write-Host 'Starting ADB server...'
adb start-server | Out-Null

Write-Host 'Checking connected Android device...'
$devices = adb devices | Select-String 'device$'

if (-not $devices) {
  if (Test-Path $emulatorPath) {
    Write-Host "Starting emulator $avdName..."
    Start-Process -FilePath $emulatorPath -ArgumentList @('-avd', $avdName, '-no-snapshot-load', '-no-snapshot-save')
    Write-Host 'Waiting for emulator...'
    adb wait-for-device | Out-Null

    $bootTimeout = [DateTime]::UtcNow.AddMinutes(3)
    while ([DateTime]::UtcNow -lt $bootTimeout) {
      $bootCompleted = adb shell getprop sys.boot_completed
      if ($bootCompleted -match '1') { break }
      Start-Sleep -Seconds 2
    }

    if ($bootCompleted -notmatch '1') {
      throw "Emulator $avdName did not finish booting within 3 minutes."
    }
  }
}

Write-Host 'Preparing Android port reverse...'
adb reverse "tcp:$port" "tcp:$port" | Out-Null

Write-Host 'Building and installing the Android development app...'
Set-Location $frontendPath
npx expo run:android --no-bundler --no-build-cache
if ($LASTEXITCODE -ne 0) {
  throw 'Failed to build or install the Android development app.'
}

Write-Host 'Starting Metro with a clean cache...'
npx expo start --dev-client --clear --port $port