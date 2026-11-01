export const SUPPORTED_SHELLS = ['bash', 'zsh', 'fish', 'powershell'] as const

export type CompletionTarget = (typeof SUPPORTED_SHELLS)[number]
export type SupportedShell = CompletionTarget

export function normalizeShell(shell: string): CompletionTarget | undefined {
  const normalized = shell.toLowerCase().trim()
  if (normalized === 'pwsh') return 'powershell'
  if ((SUPPORTED_SHELLS as readonly string[]).includes(normalized)) {
    return normalized as CompletionTarget
  }
  return undefined
}

export function isSupportedShell(shell: string): shell is CompletionTarget | 'pwsh' {
  return normalizeShell(shell) !== undefined
}

export function generateBashCompletion(): string {
  return `# bash completion for open-omni
# To load completions in the current shell session:
#   eval "$(open-omni --completion bash)"
# Or install persistently:
#   open-omni --completion bash > ~/.local/share/bash-completion/completions/open-omni

_open_omni_completions() {
    local cur prev
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"

    local options="--help -h --version -v --best --mp3 --output -o --watch -w --theme --update --update-ytdlp --update-gallerydl -U --force --subs --embed-subs --thumb --embed-thumb --metadata --add-metadata --embed-chapters --audio-format --video-format --photos-only --videos-only --skip-existing --time --section --cookies --cookies-from-browser --proxy --geo-bypass --geo-country --limit-rate --sponsorblock --sponsorblock-remove --output-template --template --concurrency -c --completion"

    case "$prev" in
        --theme)
            COMPREPLY=($(compgen -W "auto light dark" -- "$cur"))
            return 0
            ;;
        --audio-format)
            COMPREPLY=($(compgen -W "best aac flac mp3 m4a opus vorbis wav alac" -- "$cur"))
            return 0
            ;;
        --video-format)
            COMPREPLY=($(compgen -W "mp4 mkv webm" -- "$cur"))
            return 0
            ;;
        --completion)
            COMPREPLY=($(compgen -W "bash zsh fish powershell" -- "$cur"))
            return 0
            ;;
        --cookies-from-browser)
            COMPREPLY=($(compgen -W "chrome firefox brave edge opera vivaldi safari chromium" -- "$cur"))
            return 0
            ;;
        -o|--output)
            COMPREPLY=($(compgen -d -- "$cur"))
            return 0
            ;;
        --cookies)
            COMPREPLY=($(compgen -f -- "$cur"))
            return 0
            ;;
    esac

    if [[ "$cur" == -* ]]; then
        COMPREPLY=($(compgen -W "$options" -- "$cur"))
        return 0
    fi
}

complete -F _open_omni_completions open-omni
complete -F _open_omni_completions openomni
complete -F _open_omni_completions omni
complete -F _open_omni_completions oo
`
}

export function generateZshCompletion(): string {
  return `#compdef open-omni
# zsh completion for open-omni
# To load completions in the current shell session:
#   eval "$(open-omni --completion zsh)"
# Or save to your fpath directory:
#   open-omni --completion zsh > "\${fpath[1]}/_open-omni"

_open_omni() {
    _arguments -s -S \\
        '(-h --help)'{-h,--help}'[Show help message and exit]' \\
        '(-v --version)'{-v,--version}'[Show version information and exit]' \\
        '--best[Download highest quality video stream with audio]' \\
        '--mp3[Extract and transcode audio to MP3]' \\
        '--audio-format[Extract audio with specified format]:format:(best aac flac mp3 m4a opus vorbis wav alac)' \\
        '--video-format[Merge video into specified container format]:format:(mp4 mkv webm)' \\
        '--metadata[Embed metadata into media container tags]' \\
        '--add-metadata[Embed metadata into media container tags]' \\
        '--embed-chapters[Embed chapter markers into media container]' \\
        '(-o --output)'{-o,--output}'[Specify download destination directory]:output directory:_files -/' \\
        '(-w --watch)'{-w,--watch}'[Watch clipboard and automatically download copied links]' \\
        '--theme[Set color theme]:theme:(auto light dark)' \\
        '(-U --update)'{-U,--update}'[Update bundled download engines (yt-dlp and gallery-dl)]' \\
        '--update-ytdlp[Update bundled yt-dlp binary to latest release]' \\
        '--update-gallerydl[Update bundled gallery-dl binary to latest release]' \\
        '--force[Force overwrite during binary update]' \\
        '--subs[Download subtitles/captions, optionally specifying language tags]:languages:' \\
        '--embed-subs[Embed subtitles directly into media container via ffmpeg]' \\
        '--thumb[Save thumbnail image as adjacent JPEG file]' \\
        '--embed-thumb[Embed thumbnail cover art directly into media tags]' \\
        '--photos-only[Download only photos from post or carousel]' \\
        '--videos-only[Download only videos from post or carousel]' \\
        '--skip-existing[Skip media if already recorded in download ledger]' \\
        '--time[Extract a specific time section]:time range:' \\
        '--section[Extract a specific time section]:time range:' \\
        '--cookies[Path to Netscape formatted cookie file]:cookie file:_files' \\
        '--cookies-from-browser[Extract cookies from browser]:browser:(chrome firefox brave edge opera vivaldi safari chromium)' \\
        '--proxy[Use specified HTTP/HTTPS/SOCKS proxy]:proxy URL:' \\
        '--geo-bypass[Bypass geographic restriction via fake X-Forwarded-For]' \\
        '--geo-country[Simulate client IP from 2-letter ISO country code]:country code:' \\
        '--limit-rate[Maximum download rate limit]:rate limit:' \\
        '--sponsorblock[Mark and handle sponsor segments via SponsorBlock API]' \\
        '--sponsorblock-remove[Remove sponsor segments with specified categories]:categories:(all default sponsor intro outro preview interaction selfpromo music_offtopic)' \\
        '(--output-template --template)'{--output-template,--template}'[Custom output filename template string]:template string:' \\
        '(-c --concurrency)'{-c,--concurrency}'[Maximum concurrent downloads for playlists]:number:' \\
        '--completion[Generate shell autocompletion script]:shell:(bash zsh fish powershell)'
}

if [[ -n "$ZSH_VERSION" ]]; then
    compdef _open_omni open-omni
    compdef _open_omni openomni
    compdef _open_omni omni
    compdef _open_omni oo
fi
`
}

export function generateFishCompletion(): string {
  return `# fish completion for open-omni
# To load completions in the current session:
#   open-omni --completion fish | source
# Or install persistently:
#   open-omni --completion fish > ~/.config/fish/completions/open-omni.fish

complete -c open-omni -f

complete -c open-omni -s h -l help -d "Show help message"
complete -c open-omni -s v -l version -d "Show version information"
complete -c open-omni -l best -d "Download highest quality video stream"
complete -c open-omni -l mp3 -d "Extract audio to MP3"
complete -c open-omni -s o -l output -r -a "(__fish_complete_directories)" -d "Download destination directory"
complete -c open-omni -s w -l watch -d "Watch clipboard and automatically download copied links"
complete -c open-omni -l theme -x -a "auto light dark" -d "Set color theme"
complete -c open-omni -s U -l update -d "Update bundled download engines"
complete -c open-omni -l update-ytdlp -d "Update bundled yt-dlp binary"
complete -c open-omni -l update-gallerydl -d "Update bundled gallery-dl binary"
complete -c open-omni -l force -d "Force overwrite during binary update"
complete -c open-omni -l subs -d "Download subtitles/captions"
complete -c open-omni -l embed-subs -d "Embed subtitles into media container"
complete -c open-omni -l thumb -d "Save thumbnail image as adjacent JPEG"
complete -c open-omni -l embed-thumb -d "Embed thumbnail cover art into media container"
complete -c open-omni -l photos-only -d "Download only photos from post or carousel"
complete -c open-omni -l videos-only -d "Download only videos from post or carousel"
complete -c open-omni -l audio-format -x -a "best aac flac mp3 m4a opus vorbis wav alac" -d "Extract audio with format"
complete -c open-omni -l video-format -x -a "mp4 mkv webm" -d "Merge video into container format"
complete -c open-omni -l metadata -d "Embed metadata into media container"
complete -c open-omni -l add-metadata -d "Embed metadata into media container"
complete -c open-omni -l embed-chapters -d "Embed chapter markers into media container"
complete -c open-omni -l skip-existing -d "Skip media if already in download ledger"
complete -c open-omni -l time -d "Extract specific time range"
complete -c open-omni -l section -d "Extract specific time range"
complete -c open-omni -l cookies -r -a "(__fish_complete_files)" -d "Path to cookie file"
complete -c open-omni -l cookies-from-browser -x -a "chrome firefox brave edge opera vivaldi safari chromium" -d "Extract cookies from browser"
complete -c open-omni -l proxy -d "HTTP/SOCKS proxy URL"
complete -c open-omni -l geo-bypass -d "Bypass geographic restriction"
complete -c open-omni -l geo-country -d "2-letter ISO country code"
complete -c open-omni -l limit-rate -d "Maximum download rate limit"
complete -c open-omni -l sponsorblock -d "Handle sponsor segments via SponsorBlock"
complete -c open-omni -l sponsorblock-remove -d "Categories of sponsor segments to remove"
complete -c open-omni -l output-template -d "Output filename template string"
complete -c open-omni -l template -d "Output filename template string"
complete -c open-omni -s c -l concurrency -d "Maximum concurrent playlist downloads"
complete -c open-omni -l completion -x -a "bash zsh fish powershell" -d "Generate shell autocompletion script"

for cmd in openomni omni oo
    complete -c $cmd -w open-omni
end
`
}

export function generatePowerShellCompletion(): string {
  return `# PowerShell completion for open-omni
# To load completions in the current session:
#   open-omni --completion powershell | Out-String | Invoke-Expression
# Or add to your PowerShell profile ($PROFILE):
#   if (Get-Command open-omni -ErrorAction SilentlyContinue) {
#       open-omni --completion powershell | Out-String | Invoke-Expression
#   }

$completer = {
    param($wordToComplete, $commandAst, $cursorPosition)

    $elements = $commandAst.CommandElements
    $lastWord = if ($elements.Count -gt 0) { $elements[-1].Extent.Text } else { '' }
    $secondLastWord = if ($elements.Count -gt 1) { $elements[-2].Extent.Text } else { '' }
    $prev = if ([string]::IsNullOrEmpty($wordToComplete)) { $lastWord } else { $secondLastWord }

    if ($prev -eq '--theme') {
        $themes = @('auto', 'light', 'dark')
        $themes | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', "Theme: $_")
        }
        return
    }

    if ($prev -eq '--audio-format') {
        $formats = @('best', 'aac', 'flac', 'mp3', 'm4a', 'opus', 'vorbis', 'wav', 'alac')
        $formats | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', "Audio format: $_")
        }
        return
    }

    if ($prev -eq '--video-format') {
        $formats = @('mp4', 'mkv', 'webm')
        $formats | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', "Video format: $_")
        }
        return
    }

    if ($prev -eq '--completion') {
        $shells = @('bash', 'zsh', 'fish', 'powershell')
        $shells | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', "Shell: $_")
        }
        return
    }

    if ($prev -eq '--cookies-from-browser') {
        $browsers = @('chrome', 'firefox', 'brave', 'edge', 'opera', 'vivaldi', 'safari', 'chromium')
        $browsers | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', "Browser: $_")
        }
        return
    }

    if ($prev -in @('-o', '--output')) {
        Get-ChildItem -Directory -Filter "$wordToComplete*" -ErrorAction SilentlyContinue | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_.Name, $_.Name, 'ProviderItem', "Directory: $($_.FullName)")
        }
        return
    }

    $completions = @(
        [System.Management.Automation.CompletionResult]::new('--help', '--help', 'ParameterName', 'Show help message and exit'),
        [System.Management.Automation.CompletionResult]::new('-h', '-h', 'ParameterName', 'Show help message and exit'),
        [System.Management.Automation.CompletionResult]::new('--version', '--version', 'ParameterName', 'Show version information and exit'),
        [System.Management.Automation.CompletionResult]::new('-v', '-v', 'ParameterName', 'Show version information and exit'),
        [System.Management.Automation.CompletionResult]::new('--best', '--best', 'ParameterName', 'Download highest quality video stream with audio'),
        [System.Management.Automation.CompletionResult]::new('--mp3', '--mp3', 'ParameterName', 'Extract and transcode audio to MP3'),
        [System.Management.Automation.CompletionResult]::new('--audio-format', '--audio-format', 'ParameterName', 'Extract audio with format (best, flac, opus, etc.)'),
        [System.Management.Automation.CompletionResult]::new('--video-format', '--video-format', 'ParameterName', 'Merge video into container format (mp4, mkv, webm)'),
        [System.Management.Automation.CompletionResult]::new('--metadata', '--metadata', 'ParameterName', 'Embed metadata into container tags'),
        [System.Management.Automation.CompletionResult]::new('--add-metadata', '--add-metadata', 'ParameterName', 'Embed metadata into container tags'),
        [System.Management.Automation.CompletionResult]::new('--embed-chapters', '--embed-chapters', 'ParameterName', 'Embed chapter markers into container'),
        [System.Management.Automation.CompletionResult]::new('--output', '--output', 'ParameterName', 'Specify download destination directory'),
        [System.Management.Automation.CompletionResult]::new('-o', '-o', 'ParameterName', 'Specify download destination directory'),
        [System.Management.Automation.CompletionResult]::new('--watch', '--watch', 'ParameterName', 'Watch clipboard and automatically download copied links'),
        [System.Management.Automation.CompletionResult]::new('-w', '-w', 'ParameterName', 'Watch clipboard and automatically download copied links'),
        [System.Management.Automation.CompletionResult]::new('--theme', '--theme', 'ParameterName', 'Set color theme (auto, light, dark)'),
        [System.Management.Automation.CompletionResult]::new('--update', '--update', 'ParameterName', 'Update bundled download engines to latest release'),
        [System.Management.Automation.CompletionResult]::new('-U', '-U', 'ParameterName', 'Update bundled download engines to latest release'),
        [System.Management.Automation.CompletionResult]::new('--update-ytdlp', '--update-ytdlp', 'ParameterName', 'Update bundled yt-dlp binary to latest release'),
        [System.Management.Automation.CompletionResult]::new('--update-gallerydl', '--update-gallerydl', 'ParameterName', 'Update bundled gallery-dl binary to latest release'),
        [System.Management.Automation.CompletionResult]::new('--force', '--force', 'ParameterName', 'Force overwrite during binary update'),
        [System.Management.Automation.CompletionResult]::new('--subs', '--subs', 'ParameterName', 'Download subtitles/captions'),
        [System.Management.Automation.CompletionResult]::new('--embed-subs', '--embed-subs', 'ParameterName', 'Embed subtitles directly into media container'),
        [System.Management.Automation.CompletionResult]::new('--thumb', '--thumb', 'ParameterName', 'Save thumbnail image as adjacent JPEG file'),
        [System.Management.Automation.CompletionResult]::new('--embed-thumb', '--embed-thumb', 'ParameterName', 'Embed thumbnail cover art directly into media tags'),
        [System.Management.Automation.CompletionResult]::new('--photos-only', '--photos-only', 'ParameterName', 'Download only photos from post or carousel'),
        [System.Management.Automation.CompletionResult]::new('--videos-only', '--videos-only', 'ParameterName', 'Download only videos from post or carousel'),
        [System.Management.Automation.CompletionResult]::new('--skip-existing', '--skip-existing', 'ParameterName', 'Skip media if already recorded in download ledger'),
        [System.Management.Automation.CompletionResult]::new('--time', '--time', 'ParameterName', 'Extract specific time range (e.g. 01:30-03:45)'),
        [System.Management.Automation.CompletionResult]::new('--section', '--section', 'ParameterName', 'Extract specific time range'),
        [System.Management.Automation.CompletionResult]::new('--cookies', '--cookies', 'ParameterName', 'Path to Netscape formatted cookie file'),
        [System.Management.Automation.CompletionResult]::new('--cookies-from-browser', '--cookies-from-browser', 'ParameterName', 'Extract cookies from installed browser profile'),
        [System.Management.Automation.CompletionResult]::new('--proxy', '--proxy', 'ParameterName', 'HTTP or SOCKS proxy URL'),
        [System.Management.Automation.CompletionResult]::new('--geo-bypass', '--geo-bypass', 'ParameterName', 'Bypass geographic restriction via fake X-Forwarded-For'),
        [System.Management.Automation.CompletionResult]::new('--geo-country', '--geo-country', 'ParameterName', 'Simulate client IP from 2-letter ISO country code'),
        [System.Management.Automation.CompletionResult]::new('--limit-rate', '--limit-rate', 'ParameterName', 'Maximum download rate limit'),
        [System.Management.Automation.CompletionResult]::new('--sponsorblock', '--sponsorblock', 'ParameterName', 'Handle sponsor segments via SponsorBlock API'),
        [System.Management.Automation.CompletionResult]::new('--sponsorblock-remove', '--sponsorblock-remove', 'ParameterName', 'Categories of sponsor segments to remove'),
        [System.Management.Automation.CompletionResult]::new('--output-template', '--output-template', 'ParameterName', 'Output filename template string'),
        [System.Management.Automation.CompletionResult]::new('--template', '--template', 'ParameterName', 'Output filename template string'),
        [System.Management.Automation.CompletionResult]::new('--concurrency', '--concurrency', 'ParameterName', 'Maximum concurrent playlist downloads'),
        [System.Management.Automation.CompletionResult]::new('-c', '-c', 'ParameterName', 'Maximum concurrent playlist downloads'),
        [System.Management.Automation.CompletionResult]::new('--completion', '--completion', 'ParameterName', 'Generate shell autocompletion script')
    )

    $completions | Where-Object { $_.CompletionText -like "$wordToComplete*" }
}

Register-ArgumentCompleter -Native -CommandName 'open-omni' -ScriptBlock $completer
Register-ArgumentCompleter -Native -CommandName 'openomni' -ScriptBlock $completer
Register-ArgumentCompleter -Native -CommandName 'omni' -ScriptBlock $completer
Register-ArgumentCompleter -Native -CommandName 'oo' -ScriptBlock $completer
`
}

export function generateCompletion(shell: string): string {
  const normalized = normalizeShell(shell)
  if (!normalized) {
    throw new Error(
      `Unsupported shell: "${shell}". Supported shells are: ${SUPPORTED_SHELLS.join(', ')} (or pwsh)`
    )
  }

  switch (normalized) {
    case 'bash':
      return generateBashCompletion()
    case 'zsh':
      return generateZshCompletion()
    case 'fish':
      return generateFishCompletion()
    case 'powershell':
      return generatePowerShellCompletion()
  }
}
