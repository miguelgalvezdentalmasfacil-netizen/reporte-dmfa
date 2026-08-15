Set sc = CreateObject("MSScriptControl.ScriptControl")
sc.Language = "JScript"
Set fs = CreateObject("Scripting.FileSystemObject")
script = fs.OpenTextFile("test_syntax.js", 1).ReadAll()
sc.AddCode script
WScript.Echo "Syntax OK!"
