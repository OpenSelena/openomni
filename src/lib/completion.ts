export const SUPPORTED_SHELLS = ['bash', 'zsh', 'fish', 'powershell'] as const

export type SupportedShell = (typeof SUPPORTED_SHELLS)[number]

export function isSupportedShell(shell: string): shell is SupportedShell | 'pwsh' {
  const normalized = shell.toLowerCase().trim()
  return (SUPPORTED_SHELLS as readonly string[]).includes(normalized) || normalized === 'pwsh'
}

export function normalizeShell(shell: string): SupportedShell | undefined {
  const normalized = shell.toLowerCase().trim()
  if (normalized === 'pwsh') return 'powershell'
  if ((SUPPORTED_SHELLS as readonly string[]).includes(normalized)) {
    return normalized as SupportedShell
  }
  return undefined
}

export function generateBashCompletion(): string {
  return `# bash completion for open-omni
# To load completions in the current shell session:
#   eval "$(open-omni --completion bash)"
# Or install persistently:
#   open-omni --completion bash > ~/.local/share/bash-completion/completions/open-omni

_open_omni_completions() {
    local cur prev words cword
    _init_completion || return

    local options="--help -h --version -v --best --mp3 --output -o --theme --update --update-ytdlp -U --force --subs --embed-subs --thumb --embed-thumb --completion"

    case "$prev" in
        --theme)
            COMPREPLY=($(compgen -W "auto light dark" -- "$cur"))
            return 0
            ;;
        --completion)
            COMPREPLY=($(compgen -W "bash zsh fish powershell" -- "$cur"))
            return 0
            ;;
        -o|--output)
            _filedir -d
            return 0
            ;;
    esac

    if [[ "$cur" == -* ]]; then
        COMPREPLY=($(compgen -W "$options" -- "$cur"))
        return 0
    fi
}

complete -F _open_omni_completions open-omni
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
    _arguments -s -S \
        '(-h --help)'{-h,--help}'[Show help message and exit]' \
        '(-v --version)'{-v,--version}'[Show version information and exit]' \
        '--best[Download highest quality video stream with audio]' \
        '--mp3[Extract and transcode audio to MP3]' \
        '(-o --output)'{-o,--output}'[Specify download destination directory]:output directory:_files -/' \
        '--theme[Set color theme]:theme:(auto light dark)' \
        '(-U --update --update-ytdlp)'{-U,--update,--update-ytdlp}'[Update bundled yt-dlp binary to latest release]' \
        '--force[Force overwrite during yt-dlp binary update]' \
        '--subs[Download subtitles/captions, optionally specifying language tags]:languages:' \
        '--embed-subs[Embed subtitles directly into media container via ffmpeg]' \
        '--thumb[Save thumbnail image as adjacent JPEG file]' \
        '--embed-thumb[Embed thumbnail cover art directly into media tags]' \
        '--completion[Generate shell autocompletion script]:shell:(bash zsh fish powershell)' \
        '*:url:_urls'
}

if [[ -n "$ZSH_VERSION" ]]; then
    compdef _open_omni open-omni
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
complete -c open-omni -s U -l update -l update-ytdlp -d "Update bundled yt-dlp binary"
complete -c open-omni -l force -d "Force overwrite during yt-dlp binary update"
complete -c open-omni -l subs -d "Download subtitles/captions"
complete -c open-omni -l embed-subs -d "Embed subtitles into media container"
complete -c open-omni -l thumb -d "Save thumbnail image as adjacent JPEG"
complete -c open-omni -l embed-thumb -d "Embed thumbnail cover art into media container"
complete -c open-omni -l completion -x -a "bash zsh fish powershell" -d "Generate shell autocompletion script"
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

Register-ArgumentCompleter -Native -CommandName 'open-omni' -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)

    $elements = $commandAst.CommandElements
    $prev = if ($elements.Count -gt 1) { $elements[$elements.Count - 2].Extent.Text } else { '' }

    if ($prev -eq '--theme') {
        $themes = @('auto', 'light', 'dark')
        $themes | Where-Object { $_ -like "$wordToComplete*" } | ForEach-Object {
            [System.Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', "Theme: $_")
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

    $completions = @(
        [System.Management.Automation.CompletionResult]::new('--help', '--help', 'ParameterName', 'Show help message and exit'),
        [System.Management.Automation.CompletionResult]::new('-h', '-h', 'ParameterName', 'Show help message and exit'),
        [System.Management.Automation.CompletionResult]::new('--version', '--version', 'ParameterName', 'Show version information and exit'),
        [System.Management.Automation.CompletionResult]::new('-v', '-v', 'ParameterName', 'Show version information and exit'),
        [System.Management.Automation.CompletionResult]::new('--best', '--best', 'ParameterName', 'Download highest quality video stream with audio'),
        [System.Management.Automation.CompletionResult]::new('--mp3', '--mp3', 'ParameterName', 'Extract and transcode audio to MP3'),
        [System.Management.Automation.CompletionResult]::new('--output', '--output', 'ParameterName', 'Specify download destination directory'),
        [System.Management.Automation.CompletionResult]::new('-o', '-o', 'ParameterName', 'Specify download destination directory'),
        [System.Management.Automation.CompletionResult]::new('--theme', '--theme', 'ParameterName', 'Set color theme (auto, light, dark)'),
        [System.Management.Automation.CompletionResult]::new('--update', '--update', 'ParameterName', 'Update bundled yt-dlp binary to latest release'),
        [System.Management.Automation.CompletionResult]::new('--update-ytdlp', '--update-ytdlp', 'ParameterName', 'Update bundled yt-dlp binary to latest release'),
        [System.Management.Automation.CompletionResult]::new('-U', '-U', 'ParameterName', 'Update bundled yt-dlp binary to latest release'),
        [System.Management.Automation.CompletionResult]::new('--force', '--force', 'ParameterName', 'Force overwrite during yt-dlp binary update'),
        [System.Management.Automation.CompletionResult]::new('--subs', '--subs', 'ParameterName', 'Download subtitles/captions'),
        [System.Management.Automation.CompletionResult]::new('--embed-subs', '--embed-subs', 'ParameterName', 'Embed subtitles directly into media container'),
        [System.Management.Automation.CompletionResult]::new('--thumb', '--thumb', 'ParameterName', 'Save thumbnail image as adjacent JPEG file'),
        [System.Management.Automation.CompletionResult]::new('--embed-thumb', '--embed-thumb', 'ParameterName', 'Embed thumbnail cover art directly into media tags'),
        [System.Management.Automation.CompletionResult]::new('--completion', '--completion', 'ParameterName', 'Generate shell autocompletion script')
    )

    $completions | Where-Object { $_.CompletionText -like "$wordToComplete*" }
}
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
