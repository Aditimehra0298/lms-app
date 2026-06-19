Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

appDir = "d:\Download\lms-app-main\lms-app-main"
tempDir = "D:\lms-temp"
If Not fso.FolderExists(tempDir) Then fso.CreateFolder tempDir

Set status = fso.CreateTextFile(tempDir & "\lms-started.txt", True)
status.WriteLine "LMS launcher ran at " & Now
status.Close

sh.Environment("Process")("TEMP") = tempDir
sh.Environment("Process")("TMP") = tempDir
sh.Environment("Process")("NPM_CONFIG_CACHE") = tempDir & "\npm-cache"

' Kill anything on port 3000
sh.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -ano ^| findstr "":3000.*LISTENING""') do taskkill /F /PID %a", 0, True

' Start server in visible window
cmd = "cmd /k cd /d """ & appDir & """ && set TEMP=" & tempDir & "&& set TMP=" & tempDir & "&& npm run dev"
sh.Run cmd, 1, False

' Wait and open browser
WScript.Sleep 25000
On Error Resume Next
sh.Run "http://localhost:3000", 1, False
