require "language/node"

class OpenOmni < Formula
  desc "Fast terminal media downloader and TUI for 1,800+ sites"
  homepage "https://github.com/OpenSelena/openomni"
  url "https://github.com/OpenSelena/openomni/releases/download/v1.5.1/open-omni-1.5.1.tgz"
  sha256 "db950576c3368eaf335e04aa9a572dfc22cc077c16d6a82506a62ef306a26226"
  license "MIT"

  livecheck do
    url :stable
  end

  depends_on "ffmpeg"
  depends_on "gallery-dl"
  depends_on "node"
  depends_on "yt-dlp"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    assert_match "Open Omni", shell_output("#{bin}/open-omni --help")
  end
end
