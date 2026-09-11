require "language/node"

class OpenOmni < Formula
  desc "Fast terminal media downloader and TUI for 1,800+ sites"
  homepage "https://github.com/OpenSelena/openomni"
  url "https://registry.npmjs.org/open-omni/-/open-omni-1.1.0.tgz"
  sha256 "d40fc8da73d394fad399ad951ee2673ba0e6055c3bc4fde25ecbe2650edcad1d"
  license "MIT"

  livecheck do
    url :stable
  end

  depends_on "node"

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    assert_match "Open Omni", shell_output("#{bin}/open-omni --help")
  end
end
