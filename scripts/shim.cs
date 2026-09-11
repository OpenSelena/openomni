using System;
using System.Diagnostics;
using System.IO;

class Program {
    static int Main(string[] args) {
        string baseDir = AppDomain.CurrentDomain.BaseDirectory;
        string nodeExe = Path.Combine(baseDir, "node.exe");
        string cliJs = Path.Combine(baseDir, "dist", "cli.js");

        if (!File.Exists(nodeExe)) {
            nodeExe = "node";
        }

        string formattedArgs = "\"" + cliJs + "\"";
        foreach (var arg in args) {
            formattedArgs += " \"" + arg.Replace("\"", "\\\"") + "\"";
        }

        var psi = new ProcessStartInfo {
            FileName = nodeExe,
            Arguments = formattedArgs,
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
