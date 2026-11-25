using System;
using System.Diagnostics;
using System.IO;
using System.Text;

class Program {
    // Follows MSVC CRT / CommandLineToArgvW quoting rules: backslashes are doubled
    // only when immediately preceding a double quote or the closing argument quote.
    static string QuoteArgument(string arg) {
        if (arg == null) return "\"\"";
        var sb = new StringBuilder();
        sb.Append('"');
        int backslashes = 0;
        for (int i = 0; i < arg.Length; i++) {
            char c = arg[i];
            if (c == '\\') {
                backslashes++;
            } else if (c == '"') {
                sb.Append('\\', backslashes * 2 + 1);
                sb.Append('"');
                backslashes = 0;
            } else {
                if (backslashes > 0) {
                    sb.Append('\\', backslashes);
                    backslashes = 0;
                }
                sb.Append(c);
            }
        }
        if (backslashes > 0) {
            sb.Append('\\', backslashes * 2);
        }
        sb.Append('"');
        return sb.ToString();
    }

    static int Main(string[] args) {
        string baseDir = AppDomain.CurrentDomain.BaseDirectory;
        string nodeExe = Path.Combine(baseDir, "node.exe");
        string cliJs = Path.Combine(baseDir, "dist", "cli.js");

        if (!File.Exists(nodeExe)) {
            nodeExe = "node";
        }

        var formattedArgs = new StringBuilder(QuoteArgument(cliJs));
        foreach (var arg in args) {
            formattedArgs.Append(' ').Append(QuoteArgument(arg));
        }

        var psi = new ProcessStartInfo {
            FileName = nodeExe,
            Arguments = formattedArgs.ToString(),
            UseShellExecute = false
        };

        try {
            var process = Process.Start(psi);
            process.WaitForExit();
            return process.ExitCode;
        } catch (Exception ex) {
            Console.Error.WriteLine("Error launching Open Omni: " + ex.Message);
            return 1;
        }
    }
}
