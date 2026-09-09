#!/usr/bin/env sh
set -eu

# Open Omni Installer
# Usage: curl -fsSL https://mint.dev.cv | sh
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

printf "\n"
printf "${ORANGE}${BOLD}  ___                   ___             _ ${RESET}\n"
printf "${ORANGE}${BOLD} / _ \ _ __   ___ _ __ / _ \ _ __ ___  ua (_)${RESET}\n"
printf "${ORANGE}${BOLD}| | | | '_ \ / _ \ '_ \| | | | '_ \` _ \| '_ \| |${RESET}\n"
printf "${ORANGE}${BOLD}| |_| | |_) |  __/ | | | |_| | | | | | | | | | |${RESET}\n"
printf "${ORANGE}${BOLD} \___/| .__/ \___|_| |_|\___/|_| |_| |_|_| |_|_|${RESET}\n"
printf "${ORANGE}${BOLD}      |_|                                      ${RESET}\n"
printf "\n"
printf "${DIM}  Open Omni installer — grab any video from your terminal.${RESET}\n\n"

# Step 1: Check for Node.js
printf "  Checking Node.js... "
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node -v | sed 's/^v//')
  NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
  if [ "$NODE_MAJOR" -ge 18 ]; then
    printf "${GREEN}ok${RESET} ${DIM}(v%s)${RESET}\n" "$NODE_VER"
  else
    printf "${RED}failed${RESET}\n"
    printf "\n${RED}Error: Node.js 18 or higher is required (found v%s).${RESET}\n" "$NODE_VER"
    printf "Please update Node.js and try again: ${BOLD}https://nodejs.org${RESET}\n\n"
    exit 1
  fi
else
  printf "${RED}not found${RESET}\n"
  printf "\n${RED}Error: Node.js is not installed.${RESET}\n"
  printf "Please install Node.js 18+ and try again: ${BOLD}https://nodejs.org${RESET}\n\n"
  exit 1
fi

# Step 2: Check for npm
printf "  Checking npm... "
if command -v npm >/dev/null 2>&1; then
  NPM_VER=$(npm -v)
  printf "${GREEN}ok${RESET} ${DIM}(v%s)${RESET}\n" "$NPM_VER"
else
  printf "${RED}not found${RESET}\n"
  printf "\n${RED}Error: npm is not installed.${RESET}\n"
  printf "npm is required to install Open Omni globally.\n\n"
  exit 1
fi

# Step 3: Install Open Omni globally
printf "  Installing open-omni globally via npm... "
if npm install -g open-omni >/dev/null 2>&1; then
  printf "${GREEN}done${RESET}\n"
else
  # If global install without sudo fails, try with sudo if available
  printf "${RED}failed${RESET}\n"
  if command -v sudo >/dev/null 2>&1; then
    printf "  Retrying with sudo... "
    if sudo npm install -g open-omni >/dev/null 2>&1; then
      printf "${GREEN}done${RESET}\n"
    else
      printf "${RED}failed${RESET}\n"
      printf "\n${RED}Error: Failed to install open-omni globally.${RESET}\n"
      printf "Try running manually: ${BOLD}npm install -g open-omni${RESET}\n\n"
      exit 1
    fi
  else
    printf "\n${RED}Error: Failed to install open-omni globally.${RESET}\n"
    printf "Try running manually: ${BOLD}npm install -g open-omni${RESET}\n\n"
    exit 1
  fi
fi

# Step 4: Verify installation
printf "  Verifying binary... "
if command -v open-omni >/dev/null 2>&1; then
  printf "${GREEN}ok${RESET}\n"
else
  printf "${RED}warning${RESET}\n"
  printf "${DIM}  Installed, but 'open-omni' was not found on your current PATH.${RESET}\n"
  printf "${DIM}  Make sure your npm global bin directory is in PATH.${RESET}\n"
  printf "${DIM}  Usually: export PATH=\"\$(npm prefix -g)/bin:\$PATH\"${RESET}\n"
fi

# Step 5: Optional yt-dlp check (non-fatal, open-omni auto-downloads it)
printf "  Checking yt-dlp... "
if command -v yt-dlp >/dev/null 2>&1; then
  YTDLP_VER=$(yt-dlp --version 2>/dev/null || echo "detected")
  printf "${GREEN}found${RESET} ${DIM}(%s)${RESET}\n" "$YTDLP_VER"
else
  printf "${DIM}will auto-fetch on first run${RESET}\n"
fi

# Step 6: Optional ffmpeg check (non-fatal, ffmpeg-static bundled)
printf "  Checking ffmpeg... "
if command -v ffmpeg >/dev/null 2>&1; then
  printf "${GREEN}found${RESET}\n"
else
  printf "${DIM}bundled fallback included${RESET}\n"
fi

printf "\n"
printf "${GREEN}${BOLD}  Open Omni installed successfully!${RESET}\n\n"
printf "  Run it now:\n"
printf "    ${BOLD}open-omni <url>${RESET}    ${DIM}# straight to the format picker${RESET}\n"
printf "    ${BOLD}open-omni${RESET}          ${DIM}# interactive home screen${RESET}\n"
printf "\n"
