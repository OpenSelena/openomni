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

    local options="--help -h --version -v --best --mp3 --output -o --theme --update --update-ytdlp --update-gallerydl -U --force --subs --embed-subs --thumb --embed-thumb --metadata --add-metadata --embed-chapters --audio-format --video-format --photos-only --videos-only --completion"

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
        -o|--output)
            COMPREPLY=($(compgen -d -- "$cur"))
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
