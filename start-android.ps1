$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendPath = Join-Path $projectRoot 'frontend'
$emulatorPath = Join-Path $env:LOCALAPPDATA 'Android\Sdk\emulator\emulator.exe'
$avdName = 'Medium_Phone_API_36'
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
  }
}

Write-Host 'Preparing Android port reverse...'
adb reverse "tcp:$port" "tcp:$port" | Out-Null

Write-Host 'Starting Expo from frontend...'
Set-Location $frontendPath
npx expo start --clear --port $port