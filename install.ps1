$ErrorActionPreference = "Stop"

$Repository = if ($env:HARVEST_TIME_COMPANION_REPOSITORY) {
  $env:HARVEST_TIME_COMPANION_REPOSITORY
} else {
  "https://github.com/lcherone/harvest-time-companion.git"
}
$InstallDir = if ($env:HARVEST_TIME_COMPANION_HOME) {
  $env:HARVEST_TIME_COMPANION_HOME
} else {
  Join-Path $HOME ".harvest-time\companion"
}

foreach ($Command in @("git", "node", "npm")) {
  if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
    throw "HarvestTime requires $Command. Install Node.js 22+ and Git, then run this installer again."
  }
}

$NodeMajor = [int](& node -p 'process.versions.node.split(".")[0]')
if ($NodeMajor -lt 22) {
  throw "HarvestTime requires Node.js 22 or newer (found $(& node --version))."
}

if (Test-Path (Join-Path $InstallDir ".git")) {
  Write-Host "Updating existing HarvestTime Companion checkout..."
  & git -C $InstallDir pull --ff-only
} elseif (Test-Path $InstallDir) {
  throw "Install path exists but is not a Git checkout: $InstallDir"
} else {
  Write-Host "Installing HarvestTime Companion in $InstallDir..."
  New-Item -ItemType Directory -Force -Path (Split-Path $InstallDir) | Out-Null
  & git clone --depth 1 $Repository $InstallDir
}

& npm.cmd ci --prefix $InstallDir --ignore-scripts --no-audit --no-fund
& npm.cmd run service:install --prefix $InstallDir

Write-Host "HarvestTime Companion is installed and will start automatically."
Write-Host "Check it with: npm run health --prefix `"$InstallDir`""
