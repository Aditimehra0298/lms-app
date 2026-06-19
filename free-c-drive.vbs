Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
log = "D:\lms-temp\cleanup-log.txt"
If Not fso.FolderExists("D:\lms-temp") Then fso.CreateFolder "D:\lms-temp"

Sub Log(msg)
  Set f = fso.OpenTextFile(log, 8, True)
  f.WriteLine Now & " " & msg
  f.Close
End Sub

Log "Starting cleanup"

tempPath = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%\Temp")
On Error Resume Next
If fso.FolderExists(tempPath) Then
  For Each f In fso.GetFolder(tempPath).Files
    f.Delete True
  Next
  Log "Cleaned Local Temp"
End If

npmCache = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%\npm-cache")
If fso.FolderExists(npmCache) Then
  fso.DeleteFolder npmCache, True
  Log "Removed npm-cache"
End If

nextCache = "d:\Download\lms-app-main\lms-app-main\.next"
If fso.FolderExists(nextCache) Then
  fso.DeleteFolder nextCache, True
  Log "Removed .next"
End If

Log "Done - now run OPEN-LMS.bat"
