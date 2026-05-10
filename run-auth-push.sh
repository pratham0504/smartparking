#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${1:-$(pwd)}"
BRANCH="${2:-main}"

echo "Repo dir: $REPO_DIR"
cd "$REPO_DIR"

# Check there's at least one commit to push
if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo "No commits found in repo (no HEAD). Make a commit first."
  exit 1
fi

CUR_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $CUR_BRANCH"
echo "Will push branch: $BRANCH (press Ctrl+C to abort)"

# Check gh
if command -v gh >/dev/null 2>&1; then
  echo "gh CLI found."
else
  echo "gh CLI not found."
  read -p "Install GitHub CLI using Homebrew? (requires brew) [y/N]: " install_gh
  if [[ "$install_gh" =~ ^[Yy]$ ]]; then
    if command -v brew >/dev/null 2>&1; then
      brew install gh
    else
      echo "Homebrew not found. Please install gh manually: https://cli.github.com/"
      exit 1
    fi
  else
    echo "Skipping gh install. Falling back to SSH key generation option below."
  fi
fi

if command -v gh >/dev/null 2>&1; then
  echo
  echo "Choose authentication method:"
  echo "  1) Authenticate via PAT (recommended)."
  echo "  2) Use SSH (generate key and print public key)."
  read -p "Select 1 or 2 [1]: " auth_choice
  auth_choice="${auth_choice:-1}"

  if [[ "$auth_choice" == "1" ]]; then
    echo
    echo "Create a Personal Access Token (PAT) in GitHub with repo permissions if you don't have one."
    echo "Open: https://github.com/settings/tokens"
    echo
    # Prompt for PAT (read silently)
    printf "Paste your GitHub Personal Access Token (input hidden): "
    IFS= read -r -s GITHUB_PAT
    echo
    if [[ -z "${GITHUB_PAT}" ]]; then
      echo "No token entered. Aborting."
      exit 1
    fi

    # Log in non-interactively using gh --with-token
    echo "Logging in with gh..."
    printf "%s" "$GITHUB_PAT" | gh auth login --with-token

    echo "gh auth login completed. Verifying..."
    gh auth status || { echo "gh auth failed"; exit 1; }

    echo "Now pushing to origin/$BRANCH..."
    git push origin "$BRANCH"
    echo "Push completed."

    # unset sensitive var
    unset GITHUB_PAT

    exit 0
  fi

fi

# Fallback: generate SSH key
read -p "Generate a new SSH keypair and print public key (you must add it to GitHub)? [y/N]: " gen_ssh
if [[ "$gen_ssh" =~ ^[Yy]$ ]]; then
  KEY="$HOME/.ssh/id_ed25519_parkini"
  if [[ -f "$KEY" ]]; then
    echo "Key $KEY already exists. Using existing file."
  else
    echo "Generating SSH key at $KEY..."
    ssh-keygen -t ed25519 -f "$KEY" -N "" -C "$(git config user.email || echo 'parkini@example.com')"
  fi
  echo
  echo "Public key (copy and paste to GitHub -> Settings -> SSH and GPG keys -> New SSH key):"
  echo "------------------------------------------------------------------"
  cat "${KEY}.pub"
  echo "------------------------------------------------------------------"
  echo
  echo "After adding the key to GitHub, run these commands:"
  echo "  git remote set-url origin git@github.com:pratham0504/ParkEz.git"
  echo "  ssh-add $KEY"
  echo "  git push origin $BRANCH"
  echo
  echo "I'll attempt to set the remote to SSH and push now (you may need to run ssh-add if agent isn't loaded)."
  git remote set-url origin "git@github.com:pratham0504/ParkEz.git"
  # try to add key if ssh-agent available
  if command -v ssh-add >/dev/null 2>&1; then
    ssh-add "$KEY" || true
  fi
  # try pushing
  git push origin "$BRANCH" || {
    echo "Push via SSH failed. Make sure you added the public key to GitHub and ssh-agent has the key loaded."
    exit 1
  }
  echo "Push completed via SSH."
  exit 0
fi

echo "No authentication method selected. Exiting."
exit 1
