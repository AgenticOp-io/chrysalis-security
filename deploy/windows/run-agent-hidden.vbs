' Launch Helix agent with no console window (for Scheduled Task HelixAgent).
' Reads %ProgramData%\Helix\helix-agent.env and starts node helix-agent.mjs hidden.
Option Explicit
Dim sh, fso, envFile, helixRoot, nodeCmd, agent, line, p, k, v, ts
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

helixRoot = sh.ExpandEnvironmentStrings("%HELIX_ROOT%")
If helixRoot = "%HELIX_ROOT%" Or helixRoot = "" Then
  helixRoot = fso.GetParentFolderName(fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName)))
End If

envFile = sh.ExpandEnvironmentStrings("%ProgramData%") & "\Helix\helix-agent.env"
If fso.FileExists(envFile) Then
  Set ts = fso.OpenTextFile(envFile, 1)
  Do Until ts.AtEndOfStream
    line = Trim(ts.ReadLine)
    If Len(line) > 0 And Left(line, 1) <> "#" Then
      p = InStr(line, "=")
      If p > 1 Then
        k = Trim(Left(line, p - 1))
        v = Trim(Mid(line, p + 1))
        sh.Environment("Process")(k) = v
      End If
    End If
  Loop
  ts.Close
End If

sh.Environment("Process")("HELIX_ENV_FILE") = envFile
sh.Environment("Process")("HELIX_ROOT") = helixRoot

nodeCmd = "node.exe"
On Error Resume Next
Dim installPath
installPath = sh.RegRead("HKLM\SOFTWARE\Node.js\InstallPath")
If Err.Number = 0 And fso.FileExists(installPath & "node.exe") Then
  nodeCmd = installPath & "node.exe"
Else
  Err.Clear
  If fso.FileExists("C:\Program Files\nodejs\node.exe") Then
    nodeCmd = "C:\Program Files\nodejs\node.exe"
  End If
End If
On Error GoTo 0

sh.CurrentDirectory = helixRoot

' Optional bundled demo API (HELIX_START_DEMO=1) — also hidden.
If LCase(sh.Environment("Process")("HELIX_START_DEMO")) = "1" Or LCase(sh.Environment("Process")("HELIX_START_DEMO")) = "true" Then
  Dim demo
  demo = helixRoot & "\fixtures\demo-api\server.mjs"
  If fso.FileExists(demo) Then
    sh.Environment("Process")("HOST") = "127.0.0.1"
    If sh.Environment("Process")("PORT") = "" Then sh.Environment("Process")("PORT") = "4090"
    sh.Run """" & nodeCmd & """ """ & demo & """", 0, False
    WScript.Sleep 400
  End If
End If

agent = helixRoot & "\packages\helix-agent\bin\helix-agent.mjs"
' 0 = hidden window, False = do not wait
sh.Run """" & nodeCmd & """ """ & agent & """", 0, False
