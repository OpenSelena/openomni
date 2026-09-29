require "language/node"

class OpenOmni < Formula
  desc "Fast terminal media downloader and TUI for 1,800+ sites"
  homepage "https://github.com/OpenSelena/openomni"
  url "https://registry.npmjs.org/open-omni/-/open-omni-1.4.1.tgz"
  sha256 "4bfb48e912ae2dfb843a18d8327fc0171288834f465f6bde0ce484d1b3e2520d"
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
