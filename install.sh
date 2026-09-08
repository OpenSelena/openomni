#!/usr/bin/env sh
set -eu

# Open Omni Installer
# Usage: curl -fsSL https://sarada.mvp.bd | sh
#        or: sh install.sh

# Colors & Formatting (only when stdout is a terminal)
if [ -t 1 ]; then
  BOLD="\033[1m"
  DIM="\033[2m"
  RESET="\033[0m"
  ORANGE="\033[38;2;217;119;87m"
  GREEN="\033[32m"
  RED="\033[31m"
else
  BOLD=""
  DIM=""
  RESET=""
  ORANGE=""
  GREEN=""
  RED=""
fi

# Print OS-specific Node.js installation instructions
print_node_install_help() {
  OS="$(uname -s 2>/dev/null || echo "Unknown")"
  if [ "$OS" = "Darwin" ]; then
    printf ' On macOS, install or update Node.js via Homebrew:\n'
    printf '   %bbrew install node%b\n\n' "$BOLD" "$RESET"
  else
    printf ' On Linux, install or update Node.js via fnm or NodeSource:\n'
    printf '   %bcurl -fsSL https://fnm.vercel.app/install | bash%b\n' "$BOLD" "$RESET"
    printf '   %bfnm install --lts%b\n\n' "$BOLD" "$RESET"
  fi
}

# Brand ASCII Logo
printf '%b' "${ORANGE}${BOLD}"
cat << 'EOF'
  ██████╗ ██████╗ ███████╗████╗   ██╗     ██████╗ ████╗   ████╗████╗   ██╗██╗
 ██╔════╝ ██╔══██╗██╔════╝█████╗  ██║    ██╔═══██╗█████╗ ████║█████╗  ██║██║
 ██║   ██╗██████╔╝█████╗  ██╔██╗ ██║    ██║   ██║██╔████╔██║██╔██╗ ██║██║
 ██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║    ██║   ██║██║╚██╔╝██║██║╚██╗██║██║
 ╚██████╔╝██║     ███████╗██║ ╚████║    ╚██████╔╝██║ ╚═╝ ██║██║ ╚████║██║
  ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝     ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝
EOF
printf '%b\n' "$RESET"
printf '  %bgrab any video. paste. download. done.%b\n\n' "$DIM" "$RESET"

# Step 1: Check Node.js
printf ' %b[1/4]%b Checking Node.js runtime...\n' "$BOLD" "$RESET"
if ! command -v node >/dev/null 2>&1; then
  printf ' %b✗ Node.js is not installed.%b\n' "$RED" "$RESET"
  printf ' Open Omni requires Node.js (version 18 or newer).\n\n'
  print_node_install_help
  exit 1
fi

NODE_VER="$(node -v 2>/dev/null | tr -d 'v' | head -n 1 || echo "")"
NODE_MAJOR="$(echo "$NODE_VER" | cut -d. -f1)"

case "$NODE_MAJOR" in
  ''|*[!0-9]*)
    printf ' %b✗ Unable to verify Node.js version.%b\n' "$RED" "$RESET"
    print_node_install_help
    exit 1
    ;;
  *)
    if [ "$NODE_MAJOR" -lt 18 ]; then
      printf ' %b✗ Node.js v%s is too old.%b\n' "$RED" "$NODE_VER" "$RESET"
      printf ' Open Omni requires Node.js >= 18.\n\n'
      print_node_install_help
      exit 1
    fi
    ;;
esac

printf '       %b✓%b Found Node.js v%s\n' "$GREEN" "$RESET" "$NODE_VER"

if ! command -v npm >/dev/null 2>&1; then
  printf ' %b✗ npm is required to install Open Omni.%b\n' "$RED" "$RESET"
  exit 1
fi

# Step 2: Prepare Isolated Directory
INSTALL_DIR="$HOME/.open-omni"
BIN_DIR="$INSTALL_DIR/bin"
printf ' %b[2/4]%b Preparing %s...\n' "$BOLD" "$RESET" "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR" "$BIN_DIR"

# Step 3: Install Package
printf ' %b[3/4]%b Installing open-omni package...\n' "$BOLD" "$RESET"

# Initialize a package.json if not present
if [ ! -f "$INSTALL_DIR/package.json" ]; then
  cat << 'EOF' > "$INSTALL_DIR/package.json"
{
  "name": "open-omni-runtime",
  "private": true
}
EOF
fi

# Install latest open-omni locally in prefix
if ! npm install --prefix "$INSTALL_DIR" open-omni@latest --no-fund --no-audit --silent >/dev/null 2>&1; then
  printf ' %b✗ Failed to install open-omni via npm.%b\n' "$RED" "$RESET"
  printf ' Please verify your network connection or try: npm install -g open-omni\n'
  exit 1
fi

# Create the bin launcher script
LAUNCHER="$BIN_DIR/open-omni"
cat << 'EOF' > "$LAUNCHER"
#!/usr/bin/env sh
exec node "$HOME/.open-omni/node_modules/open-omni/dist/cli.js" "$@"
EOF

chmod +x "$LAUNCHER"
printf '       %b✓%b Launcher created at %s\n' "$GREEN" "$RESET" "$LAUNCHER"

# Step 4: Shell PATH Setup
printf ' %b[4/4]%b Configuring shell PATH...\n' "$BOLD" "$RESET"

UPDATED_RC=""
case "${SHELL:-}" in
  */zsh)
    RC_FILE="$HOME/.zshrc"
    PATH_LINE="export PATH=\"\$HOME/.open-omni/bin:\$PATH\""
    ;;
  */bash)
    if [ -f "$HOME/.bashrc" ]; then
      RC_FILE="$HOME/.bashrc"
    elif [ -f "$HOME/.bash_profile" ]; then
      RC_FILE="$HOME/.bash_profile"
    else
      RC_FILE="$HOME/.profile"
    fi
    PATH_LINE="export PATH=\"\$HOME/.open-omni/bin:\$PATH\""
    ;;
  */fish)
    RC_FILE="$HOME/.config/fish/config.fish"
    PATH_LINE="fish_add_path \"\$HOME/.open-omni/bin\""
    ;;
  *)
    RC_FILE="$HOME/.profile"
    PATH_LINE="export PATH=\"\$HOME/.open-omni/bin:\$PATH\""
    ;;
esac

if [ -n "${RC_FILE:-}" ]; then
  mkdir -p "$(dirname "$RC_FILE")" 2>/dev/null || true
  touch "$RC_FILE" 2>/dev/null || true

  if grep -Eq '(\.open-omni/bin)' "$RC_FILE" 2>/dev/null; then
    printf '       %b✓%b PATH already configured in %s\n' "$GREEN" "$RESET" "$RC_FILE"
  else
    printf '\n# Open Omni\n%s\n' "$PATH_LINE" >> "$RC_FILE"
    UPDATED_RC="$RC_FILE"
    printf '       %b✓%b Added %s to %s\n' "$GREEN" "$RESET" "$BIN_DIR" "$RC_FILE"
  fi
else
  printf '       %bNote: Add %s to your PATH to run open-omni from anywhere.%b\n' "$DIM" "$BIN_DIR" "$RESET"
fi

printf '\n %b%b✓ Open Omni installed successfully!%b\n\n' "$GREEN" "$BOLD" "$RESET"

if [ -n "$UPDATED_RC" ]; then
  printf ' To start using Open Omni, reload your shell:\n'
  printf '   %bsource %s%b\n\n' "$BOLD" "$UPDATED_RC" "$RESET"
fi

printf ' Then run:\n'
printf '   %bopen-omni <url>%b\n\n' "$BOLD" "$RESET"
printf ' Shell autocompletion:\n'
printf '   %bopen-omni --completion <bash|zsh|fish|powershell>%b\n\n' "$BOLD" "$RESET"
printf ' %b(To uninstall: rm -rf ~/.open-omni and remove the PATH line from your shell rc)%b\n\n' "$DIM" "$RESET"
