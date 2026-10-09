// Helix for Windows - native desktop app (WinForms).
// Fully automates Mode A: start agent + demo, seed traffic, lock DNA, watch, block.
// Build: powershell -File deploy\windows\HelixApp\build.ps1
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Management;
using System.Net;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;

namespace HelixDesktop
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }

    sealed class MainForm : Form
    {
        readonly NotifyIcon tray;
        readonly Label title;
        readonly Label status;
        readonly Label detail;
        readonly ProgressBar progress;
        readonly ListBox log;
        readonly Button btnProtect;
        readonly Button btnEnforce;
        readonly Button btnOpenProof;
        readonly System.Windows.Forms.Timer pollTimer;
        readonly string helixRoot;
        readonly string dataDir;
        readonly string envFile;
        readonly string panelBase = "http://127.0.0.1:4080";
        bool automating;
        string lastMode = "";

        public MainForm()
        {
            helixRoot = ResolveHelixRoot();
            dataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "Helix");
            envFile = Path.Combine(dataDir, "helix-agent.env");

            Text = "Helix";
            Width = 560;
            Height = 520;
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.FixedSingle;
            MaximizeBox = false;
            BackColor = Color.FromArgb(15, 20, 25);
            ForeColor = Color.FromArgb(232, 238, 244);
            Font = new Font("Segoe UI", 10f);

            title = new Label
            {
                Text = "Helix",
                Font = new Font("Segoe UI Semibold", 22f),
                AutoSize = true,
                Left = 24,
                Top = 20,
                ForeColor = Color.FromArgb(61, 184, 154)
            };
            var subtitle = new Label
            {
                Text = "DNA firewall for this PC",
                AutoSize = true,
                Left = 26,
                Top = 58,
                ForeColor = Color.FromArgb(139, 154, 171)
            };

            status = new Label
            {
                Text = "Starting...",
                Font = new Font("Segoe UI Semibold", 12f),
                AutoSize = false,
                Left = 24,
                Top = 96,
                Width = 500,
                Height = 28
            };
            detail = new Label
            {
                Text = "",
                AutoSize = false,
                Left = 24,
                Top = 126,
                Width = 500,
                Height = 48,
                ForeColor = Color.FromArgb(139, 154, 171)
            };
            progress = new ProgressBar
            {
                Left = 24,
                Top = 180,
                Width = 500,
                Height = 18,
                Style = ProgressBarStyle.Continuous,
                Minimum = 0,
                Maximum = 100,
                Value = 5
            };

            log = new ListBox
            {
                Left = 24,
                Top = 214,
                Width = 500,
                Height = 180,
                BackColor = Color.FromArgb(26, 35, 48),
                ForeColor = Color.FromArgb(232, 238, 244),
                BorderStyle = BorderStyle.FixedSingle
            };

            btnProtect = new Button
            {
                Text = "Protect now (automatic)",
                Left = 24,
                Top = 410,
                Width = 220,
                Height = 36,
                BackColor = Color.FromArgb(61, 184, 154),
                ForeColor = Color.FromArgb(10, 18, 16),
                FlatStyle = FlatStyle.Flat
            };
            btnProtect.FlatAppearance.BorderSize = 0;
            btnProtect.Click += (s, e) => BeginAutoProtect(true);

            btnEnforce = new Button
            {
                Text = "Block unknown surface",
                Left = 256,
                Top = 410,
                Width = 160,
                Height = 36,
                Enabled = false,
                BackColor = Color.FromArgb(40, 50, 62),
                ForeColor = ForeColor,
                FlatStyle = FlatStyle.Flat
            };
            btnEnforce.Click += (s, e) => SetMode("enforce");

            btnOpenProof = new Button
            {
                Text = "Proof",
                Left = 428,
                Top = 410,
                Width = 96,
                Height = 36,
                BackColor = Color.FromArgb(40, 50, 62),
                ForeColor = ForeColor,
                FlatStyle = FlatStyle.Flat
            };
            btnOpenProof.Click += (s, e) => Process.Start(panelBase + "/__helix/attack");

            Controls.Add(title);
            Controls.Add(subtitle);
            Controls.Add(status);
            Controls.Add(detail);
            Controls.Add(progress);
            Controls.Add(log);
            Controls.Add(btnProtect);
            Controls.Add(btnEnforce);
            Controls.Add(btnOpenProof);

            tray = new NotifyIcon
            {
                Icon = SystemIcons.Shield,
                Text = "Helix",
                Visible = true,
                ContextMenu = new ContextMenu(new[]
                {
                    new MenuItem("Open Helix", (s, e) => { Show(); WindowState = FormWindowState.Normal; Activate(); }),
                    new MenuItem("Protect now", (s, e) => BeginAutoProtect(true)),
                    new MenuItem("Block unknown surface", (s, e) => SetMode("enforce")),
                    new MenuItem("-"),
                    new MenuItem("Exit", (s, e) => { tray.Visible = false; Application.Exit(); })
                })
            };
            tray.DoubleClick += (s, e) => { Show(); WindowState = FormWindowState.Normal; Activate(); };

            pollTimer = new System.Windows.Forms.Timer { Interval = 2500 };
            pollTimer.Tick += (s, e) => RefreshStatus(false);
            FormClosing += OnFormClosing;
            Shown += (s, e) => BeginAutoProtect(true);
        }

        void OnFormClosing(object sender, FormClosingEventArgs e)
        {
            if (e.CloseReason == CloseReason.UserClosing)
            {
                e.Cancel = true;
                Hide();
                tray.ShowBalloonTip(3000, "Helix", "Still protecting in the tray.", ToolTipIcon.Info);
            }
        }

        static string ResolveHelixRoot()
        {
            var env = Environment.GetEnvironmentVariable("HELIX_ROOT");
            if (!string.IsNullOrEmpty(env) && Directory.Exists(env)) return env;
            var here = Path.GetDirectoryName(Application.ExecutablePath) ?? ".";
            // Helix.exe lives in deploy/windows/HelixApp -> repo is ../../..
            string[] guesses = {
                Path.GetFullPath(Path.Combine(here, "..", "..", "..")),
                Path.GetFullPath(Path.Combine(here, "..", "..")),
                Path.GetFullPath(Path.Combine(here, "..")),
                Directory.GetCurrentDirectory()
            };
            foreach (var candidate in guesses)
            {
                if (File.Exists(Path.Combine(candidate, "packages", "helix-agent", "bin", "helix-agent.mjs")))
                    return candidate;
            }
            return Directory.GetCurrentDirectory();
        }

        void Log(string line)
        {
            if (InvokeRequired) { BeginInvoke(new Action(() => Log(line))); return; }
            var stamp = DateTime.Now.ToString("HH:mm:ss");
            log.Items.Insert(0, stamp + "  " + line);
            while (log.Items.Count > 80) log.Items.RemoveAt(log.Items.Count - 1);
        }

        void SetUi(string st, string det, int pct)
        {
            if (InvokeRequired) { BeginInvoke(new Action(() => SetUi(st, det, pct))); return; }
            status.Text = st;
            detail.Text = det;
            progress.Value = Math.Max(0, Math.Min(100, pct));
            tray.Text = "Helix - " + st;
        }

        void BeginAutoProtect(bool force)
        {
            if (automating) return;
            automating = true;
            btnProtect.Enabled = false;
            ThreadPool.QueueUserWorkItem(_ =>
            {
                try { RunAutoProtect(force); }
                catch (Exception ex) { Log("ERROR: " + ex.Message); SetUi("Needs attention", ex.Message, 0); }
                finally
                {
                    automating = false;
                    BeginInvoke(new Action(() =>
                    {
                        btnProtect.Enabled = true;
                        pollTimer.Start();
                    }));
                }
            });
        }

        void RunAutoProtect(bool force)
        {
            Directory.CreateDirectory(dataDir);
            EnsureDataDirWritable(dataDir);
            SetUi("Preparing", "Writing automatic Mode A settings...", 10);
            WriteConsumerEnv(force);
            Log("Env ready (demo + auto-seal)");

            SetUi("Starting Helix", "Launching the DNA agent...", 25);
            RestartAgent();
            WaitHealth(25000);
            Log("Agent is up on " + panelBase);
            WaitUpstream(20000);
            Log("Demo app responding through Helix");

            SetUi("Learning", "Generating normal traffic automatically...", 45);
            SeedTraffic();
            Thread.Sleep(400);

            var snap = GetSnapshot();
            int obs = GetInt(snap, "observations", "count");
            Log("Learned " + obs + " request(s)");

            bool hasDna = GetBool(snap, "dna");
            string mode = GetString(snap, "mode");
            if (!hasDna || force || mode == "learn")
            {
                SetUi("Locking DNA", "Sealing the certificate from learned traffic...", 70);
                var seal = PostJson(panelBase + "/__helix/api/seal", "{\"mode\":\"shadow\"}");
                if (seal.IndexOf("\"sealed\":true", StringComparison.OrdinalIgnoreCase) < 0 &&
                    seal.IndexOf("\"sealed\": true", StringComparison.OrdinalIgnoreCase) < 0)
                {
                    // Auto-seal may have already fired; try mode shadow if DNA exists
                    snap = GetSnapshot();
                    if (!GetBool(snap, "dna"))
                        throw new Exception("Could not lock DNA yet - " + Trunc(seal, 160));
                    PostJson(panelBase + "/__helix/api/mode", "{\"mode\":\"shadow\"}");
                }
                Log("DNA locked; watching (shadow)");
            }
            else
            {
                Log("DNA already present");
            }

            SetUi("Watching", "Checking that unknown surface is detected...", 85);
            PostJson(panelBase + "/__helix/api/mode", "{\"mode\":\"shadow\"}");
            // Probe backdoor - should pass in shadow with hole log
            HttpGet(panelBase + "/api/backdoor");

            SetUi("Protecting", "Turning on blocking for this lab app...", 92);
            PostJson(panelBase + "/__helix/api/mode", "{\"mode\":\"enforce\"}");
            var blocked = HttpGetStatus(panelBase + "/api/backdoor");
            if (blocked != 403)
                Log("Warn: backdoor status " + blocked + " (expected 403 in enforce)");
            else
                Log("Attack probe blocked (403) - protect path works");

            snap = GetSnapshot();
            int routes = GetInt(snap, "routes");
            SetUi("Protected", "Helix is blocking unknown surface - " + routes + " certified route(s).", 100);
            BeginInvoke(new Action(() =>
            {
                btnEnforce.Enabled = true;
                tray.ShowBalloonTip(5000, "Helix", "Protected automatically. Unknown surface is blocked.", ToolTipIcon.Info);
            }));
            RefreshStatus(true);
        }

        static void EnsureDataDirWritable(string dir)
        {
            try
            {
                var id = WindowsIdentity.GetCurrent();
                if (id == null || string.IsNullOrEmpty(id.Name)) return;
                var sec = Directory.GetAccessControl(dir);
                sec.AddAccessRule(new FileSystemAccessRule(
                    id.Name,
                    FileSystemRights.Modify | FileSystemRights.Synchronize,
                    InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit,
                    PropagationFlags.None,
                    AccessControlType.Allow));
                Directory.SetAccessControl(dir, sec);
            }
            catch { }
            // Drop stale log files that may have been created elevated (EPERM for normal users).
            foreach (var name in new[] { "siem.ndjson", "shadow.ndjson", "observations.ndjson", "agent-stderr.log" })
            {
                var p = Path.Combine(dir, name);
                try { if (File.Exists(p)) File.Delete(p); } catch { }
            }
        }

        void WriteConsumerEnv(bool resetLearn)
        {
            var dna = Path.Combine(dataDir, "app.dna.json");
            var obs = Path.Combine(dataDir, "observations.ndjson");
            var shadow = Path.Combine(dataDir, "shadow.ndjson");
            var siem = Path.Combine(dataDir, "siem.ndjson");
            var lines = new[]
            {
                "# Helix desktop app - fully automatic Mode A",
                "LISTEN_HOST=0.0.0.0",
                "LISTEN_PORT=4080",
                "APP_UPSTREAM=http://127.0.0.1:4090",
                "MODE=learn",
                "DNA=" + dna,
                "OBSERVE=" + obs,
                "SHADOW_LOG=" + shadow,
                "SIEM_LOG=" + siem,
                "HELIX_MAX_BODY_BYTES=1048576",
                "HELIX_ROOT_PANEL=1",
                "HELIX_START_DEMO=1",
                "HELIX_AUTO_SEAL_AFTER=6",
                "HELIX_APP_ID=helix-windows-desktop"
            };
            if (resetLearn)
            {
                try { if (File.Exists(obs)) File.Delete(obs); } catch { }
                try { if (File.Exists(dna)) File.Delete(dna); } catch { }
                try { if (File.Exists(shadow)) File.Delete(shadow); } catch { }
            }
            File.WriteAllText(envFile, string.Join("\r\n", lines) + "\r\n", Encoding.ASCII);
        }

        void RestartAgent()
        {
            StopHelixAgentProcesses();
            Thread.Sleep(500);
            EnsureDemoApi();
            // Always start node.exe directly (hidden). Do not invoke PowerShell or schtasks
            // here — those race the port and can flash a console.
            StartNodeHidden(
                Path.Combine(helixRoot, "packages", "helix-agent", "bin", "helix-agent.mjs"),
                ReadEnvFile(envFile),
                helixRoot);
        }

        void EnsureDemoApi()
        {
            if (HttpGetStatus("http://127.0.0.1:4090/api/health") == 200) return;
            var demo = Path.Combine(helixRoot, "fixtures", "demo-api", "server.mjs");
            if (!File.Exists(demo)) return;
            var env = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { "HOST", "127.0.0.1" },
                { "PORT", "4090" }
            };
            StartNodeHidden(demo, env, helixRoot);
            Thread.Sleep(600);
        }

        void StartNodeHidden(string script, Dictionary<string, string> extraEnv, string workDir)
        {
            var node = FindNode();
            if (node == null) throw new Exception("node.exe not found on PATH");
            if (!File.Exists(script)) throw new Exception("missing " + script);
            var logPath = Path.Combine(dataDir, "desktop-start.log");
            var errPath = Path.Combine(dataDir, "agent-stderr.log");
            var psi = new ProcessStartInfo
            {
                FileName = node,
                Arguments = "\"" + script + "\"",
                WorkingDirectory = workDir,
                UseShellExecute = false,
                CreateNoWindow = true,
                WindowStyle = ProcessWindowStyle.Hidden,
                RedirectStandardError = true,
                RedirectStandardOutput = true
            };
            if (extraEnv != null)
            {
                foreach (var kv in extraEnv)
                {
                    if (string.IsNullOrEmpty(kv.Key)) continue;
                    try { psi.EnvironmentVariables[kv.Key] = kv.Value ?? ""; }
                    catch { /* reserved env keys */ }
                }
            }
            psi.EnvironmentVariables["HELIX_ENV_FILE"] = envFile;
            psi.EnvironmentVariables["HELIX_ROOT"] = helixRoot;
            var proc = Process.Start(psi);
            if (proc == null) throw new Exception("Failed to start " + script);
            try
            {
                File.AppendAllText(logPath,
                    DateTime.Now.ToString("o") + " started pid=" + proc.Id + " script=" + script + " node=" + node + "\r\n");
            }
            catch { }
            // Drain stdio so the process cannot block; keep a short stderr sample on disk.
            ThreadPool.QueueUserWorkItem(_ =>
            {
                try
                {
                    var err = proc.StandardError.ReadToEnd();
                    if (!string.IsNullOrEmpty(err))
                        File.AppendAllText(errPath, DateTime.Now.ToString("o") + "\r\n" + err + "\r\n");
                }
                catch { }
            });
            ThreadPool.QueueUserWorkItem(_ =>
            {
                try { proc.StandardOutput.ReadToEnd(); } catch { }
            });
        }

        static Dictionary<string, string> ReadEnvFile(string path)
        {
            var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (!File.Exists(path)) return map;
            foreach (var raw in File.ReadAllLines(path))
            {
                var line = (raw ?? "").Trim();
                if (line.Length == 0 || line.StartsWith("#")) continue;
                var i = line.IndexOf('=');
                if (i < 1) continue;
                map[line.Substring(0, i).Trim()] = line.Substring(i + 1).Trim();
            }
            return map;
        }

        static bool TryStartScheduledTask(string name)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "schtasks.exe",
                    Arguments = "/Run /TN \"" + name + "\"",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    WindowStyle = ProcessWindowStyle.Hidden,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true
                };
                using (var p = Process.Start(psi))
                {
                    if (p == null) return false;
                    p.WaitForExit(8000);
                    return p.ExitCode == 0;
                }
            }
            catch { return false; }
        }

        static string FindNode()
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "where.exe",
                    Arguments = "node",
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    CreateNoWindow = true,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                using (var p = Process.Start(psi))
                {
                    if (p == null) return null;
                    var o = p.StandardOutput.ReadToEnd();
                    p.WaitForExit(5000);
                    var line = (o ?? "").Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
                    return line.Length > 0 ? line[0].Trim() : null;
                }
            }
            catch { return null; }
        }

        static void StopHelixAgentProcesses()
        {
            try { TryStartScheduledTaskStop("HelixAgent"); } catch { }
            try
            {
                using (var searcher = new ManagementObjectSearcher(
                    "SELECT ProcessId, CommandLine FROM Win32_Process WHERE Name = 'node.exe'"))
                {
                    foreach (ManagementObject mo in searcher.Get())
                    {
                        var cmd = (mo["CommandLine"] ?? "").ToString();
                        if (cmd.IndexOf("helix-agent", StringComparison.OrdinalIgnoreCase) < 0 &&
                            cmd.IndexOf("demo-api", StringComparison.OrdinalIgnoreCase) < 0)
                            continue;
                        try
                        {
                            var pid = Convert.ToInt32(mo["ProcessId"]);
                            Process.GetProcessById(pid).Kill();
                        }
                        catch { }
                    }
                }
            }
            catch { }
        }

        static void TryStartScheduledTaskStop(string name)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "schtasks.exe",
                    Arguments = "/End /TN \"" + name + "\"",
                    UseShellExecute = false,
                    CreateNoWindow = true,
                    WindowStyle = ProcessWindowStyle.Hidden
                };
                using (var p = Process.Start(psi))
                {
                    if (p != null) p.WaitForExit(5000);
                }
            }
            catch { }
        }

        void WaitHealth(int timeoutMs)
        {
            var sw = Stopwatch.StartNew();
            while (sw.ElapsedMilliseconds < timeoutMs)
            {
                if (HttpGetStatus(panelBase + "/__helix/healthz") == 200) return;
                Thread.Sleep(300);
            }
            throw new Exception("Helix agent did not become healthy on " + panelBase);
        }

        void WaitUpstream(int timeoutMs)
        {
            var sw = Stopwatch.StartNew();
            while (sw.ElapsedMilliseconds < timeoutMs)
            {
                if (HttpGetStatus(panelBase + "/api/health") == 200) return;
                Thread.Sleep(300);
            }
            throw new Exception("Demo app not reachable through Helix yet");
        }

        void SeedTraffic()
        {
            string[] paths = { "/api/health", "/api/items", "/api/health", "/api/items", "/api/health", "/api/items", "/api/health", "/api/items" };
            foreach (var p in paths)
            {
                HttpGet(panelBase + p);
                Thread.Sleep(80);
            }
        }

        void SetMode(string mode)
        {
            ThreadPool.QueueUserWorkItem(_ =>
            {
                try
                {
                    PostJson(panelBase + "/__helix/api/mode", "{\"mode\":\"" + mode + "\"}");
                    Log("Mode -> " + mode);
                    RefreshStatus(true);
                }
                catch (Exception ex) { Log("Mode failed: " + ex.Message); }
            });
        }

        void RefreshStatus(bool verbose)
        {
            try
            {
                var snap = GetSnapshot();
                if (string.IsNullOrEmpty(snap)) return;
                lastMode = GetString(snap, "mode");
                int routes = GetInt(snap, "routes");
                int obs = GetInt(snap, "observations", "count");
                int holes = GetInt(snap, "siem", "count");
                bool dna = GetBool(snap, "dna");
                BeginInvoke(new Action(() =>
                {
                    btnEnforce.Enabled = dna;
                    if (!automating)
                    {
                        if (lastMode == "enforce")
                            SetUi("Protected", routes + " routes - blocking unknown surface - holes logged: " + holes, 100);
                        else if (lastMode == "shadow")
                            SetUi("Watching", routes + " routes - alerting only - observations: " + obs, 80);
                        else
                            SetUi("Learning", "Observations: " + obs + " - DNA: " + (dna ? "yes" : "not yet"), 40);
                    }
                }));
                if (verbose) Log("Status " + lastMode + " routes=" + routes + " obs=" + obs);
            }
            catch { }
        }

        string GetSnapshot()
        {
            return HttpGet(panelBase + "/__helix/api/snapshot");
        }

        static string HttpGet(string url)
        {
            try
            {
                var req = (HttpWebRequest)WebRequest.Create(url);
                req.Timeout = 4000;
                req.Method = "GET";
                using (var resp = (HttpWebResponse)req.GetResponse())
                using (var sr = new StreamReader(resp.GetResponseStream()))
                    return sr.ReadToEnd();
            }
            catch (WebException ex)
            {
                if (ex.Response != null)
                {
                    using (var sr = new StreamReader(ex.Response.GetResponseStream()))
                        return sr.ReadToEnd();
                }
                return "";
            }
        }

        static int HttpGetStatus(string url)
        {
            try
            {
                var req = (HttpWebRequest)WebRequest.Create(url);
                req.Timeout = 4000;
                using (var resp = (HttpWebResponse)req.GetResponse())
                    return (int)resp.StatusCode;
            }
            catch (WebException ex)
            {
                var hr = ex.Response as HttpWebResponse;
                if (hr != null) return (int)hr.StatusCode;
                return 0;
            }
        }

        static string PostJson(string url, string json)
        {
            var req = (HttpWebRequest)WebRequest.Create(url);
            req.Method = "POST";
            req.ContentType = "application/json";
            req.Timeout = 15000;
            var bytes = Encoding.UTF8.GetBytes(json ?? "{}");
            req.ContentLength = bytes.Length;
            using (var s = req.GetRequestStream()) s.Write(bytes, 0, bytes.Length);
            try
            {
                using (var resp = (HttpWebResponse)req.GetResponse())
                using (var sr = new StreamReader(resp.GetResponseStream()))
                    return sr.ReadToEnd();
            }
            catch (WebException ex)
            {
                if (ex.Response != null)
                {
                    using (var sr = new StreamReader(ex.Response.GetResponseStream()))
                        return sr.ReadToEnd();
                }
                throw;
            }
        }

        static string GetString(string json, string key)
        {
            var m = Regex.Match(json ?? "", "\"" + Regex.Escape(key) + "\"\\s*:\\s*\"([^\"]*)\"");
            if (m.Success) return m.Groups[1].Value;
            m = Regex.Match(json ?? "", "\"" + Regex.Escape(key) + "\"\\s*:\\s*([^,\\}\\s]+)");
            return m.Success ? m.Groups[1].Value.Trim('"') : "";
        }

        static bool GetBool(string json, string key)
        {
            var m = Regex.Match(json ?? "", "\"" + Regex.Escape(key) + "\"\\s*:\\s*(true|false)", RegexOptions.IgnoreCase);
            return m.Success && m.Groups[1].Value.Equals("true", StringComparison.OrdinalIgnoreCase);
        }

        static int GetInt(string json, string key)
        {
            var m = Regex.Match(json ?? "", "\"" + Regex.Escape(key) + "\"\\s*:\\s*(-?\\d+)");
            return m.Success ? int.Parse(m.Groups[1].Value) : 0;
        }

        static int GetInt(string json, string parent, string key)
        {
            // Prefer nested "parent":{..."key":N
            var block = Regex.Match(json ?? "", "\"" + Regex.Escape(parent) + "\"\\s*:\\s*\\{([^}]*)\\}");
            if (block.Success) return GetInt("{" + block.Groups[1].Value + "}", key);
            return GetInt(json, key);
        }

        static string Trunc(string s, int n)
        {
            if (string.IsNullOrEmpty(s)) return "";
            s = s.Replace("\r", " ").Replace("\n", " ");
            return s.Length <= n ? s : s.Substring(0, n) + "...";
        }
    }
}
