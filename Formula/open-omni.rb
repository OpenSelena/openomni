require "language/node"

class OpenOmni < Formula
  desc "Fast terminal media downloader and TUI for 1,800+ sites"
  homepage "https://github.com/OpenSelena/open-omni"
  url "https://github.com/OpenSelena/open-omni/releases/download/v1.5.2/open-omni-1.5.2.tgz"
  sha256 "a8060cf20b85e7b1fae11a53f2ec7af10cde7e72d13cc2e5e5793b7af96a0feb"
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
