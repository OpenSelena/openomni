require "language/node"

class OpenOmni < Formula
  desc "Fast terminal media downloader and TUI for 1,800+ sites"
  homepage "https://github.com/OpenSelena/openomni"
  url "https://registry.npmjs.org/open-omni/-/open-omni-1.0.0.tgz"
  sha256 "dd26afa6dfd57dc1da11732febb5fc698431c5ae5e7fe8851ef6fe08661ebb34"
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
