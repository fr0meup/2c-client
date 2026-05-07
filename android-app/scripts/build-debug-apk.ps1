$ErrorActionPreference = 'Stop'

$appRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $appRoot 'android'
$sdkRoot = Join-Path $appRoot 'android-sdk'

$jdkCandidates = @()
if ($env:JAVA_HOME) {
  $jdkCandidates += $env:JAVA_HOME
}
$jdkCandidates += Get-ChildItem 'C:\Program Files\Eclipse Adoptium' -Directory -Filter 'jdk-*' -ErrorAction SilentlyContinue |
  Sort-Object Name -Descending |
  ForEach-Object { $_.FullName }

$jdkRoot = $jdkCandidates | Where-Object { Test-Path (Join-Path $_ 'bin\javac.exe') } | Select-Object -First 1
if (-not $jdkRoot) {
  throw 'A full JDK with javac is required. Install Temurin 21 JDK, then rerun npm run apk:debug.'
}

if (-not (Test-Path (Join-Path $sdkRoot 'platforms\android-36'))) {
  throw "Android SDK platform 36 was not found at $sdkRoot. Install the SDK packages before building."
}

$env:JAVA_HOME = $jdkRoot
$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:Path = "$jdkRoot\bin;$sdkRoot\platform-tools;$env:Path"

"sdk.dir=$($sdkRoot.Replace('\', '\\').Replace(':', '\:'))" | Set-Content -Path (Join-Path $androidRoot 'local.properties') -Encoding ascii

Push-Location $appRoot
try {
  npm run build
  npx cap sync android
}
finally {
  Pop-Location
}

Push-Location $androidRoot
try {
  .\gradlew.bat assembleDebug
}
finally {
  Pop-Location
}

Write-Host "APK built at: $(Join-Path $androidRoot 'app\build\outputs\apk\debug\app-debug.apk')"
