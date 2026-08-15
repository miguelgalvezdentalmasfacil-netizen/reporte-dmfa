Set sc = CreateObject("MSScriptControl.ScriptControl")
sc.Language = "JScript"
Set fs = CreateObject("Scripting.FileSystemObject")
script = fs.OpenTextFile("test_syntax.js", 1).ReadAll()
On Error Resume Next
sc.AddCode script
If Err.Number <> 0 Then
    WScript.Echo "Error: " & Err.Description & " on line " & Err.Line
Else
    WScript.Echo "Syntax OK!"
End If
