#!/bin/sh
set -eu

repository="${HARVEST_TIME_COMPANION_REPOSITORY:-https://github.com/lcherone/harvest-time-companion.git}"
install_dir="${HARVEST_TIME_COMPANION_HOME:-$HOME/.harvest-time/companion}"

for command in git node npm; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "HarvestTime requires $command. Install Node.js 22+ and Git, then run this installer again." >&2
    exit 1
  fi
done

node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$node_major" -lt 22 ]; then
  echo "HarvestTime requires Node.js 22 or newer (found $(node --version))." >&2
  exit 1
fi

if [ -d "$install_dir/.git" ]; then
  echo "Updating existing HarvestTime Companion checkout..."
  git -C "$install_dir" pull --ff-only
elif [ -e "$install_dir" ]; then
  echo "Install path exists but is not a Git checkout: $install_dir" >&2
  exit 1
else
  echo "Installing HarvestTime Companion in $install_dir..."
  mkdir -p "$(dirname "$install_dir")"
  git clone --depth 1 "$repository" "$install_dir"
fi

npm ci --prefix "$install_dir" --ignore-scripts --no-audit --no-fund
npm run service:install --prefix "$install_dir"

echo "HarvestTime Companion is installed and will start automatically."
echo "Check it with: npm run health --prefix \"$install_dir\""
