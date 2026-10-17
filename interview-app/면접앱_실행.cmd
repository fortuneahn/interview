@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -Command "$ErrorActionPreference='Stop'; try { $null=Invoke-WebRequest -Uri 'http://127.0.0.1:8765' -UseBasicParsing -TimeoutSec 2 } catch { Start-Process -FilePath 'python' -ArgumentList '-m','http.server','8765','--bind','127.0.0.1','--directory','dist' -WorkingDirectory (Get-Location).Path -WindowStyle Hidden; for($attempt=0;$attempt -lt 20;$attempt++){ Start-Sleep -Milliseconds 250; try { $null=Invoke-WebRequest -Uri 'http://127.0.0.1:8765' -UseBasicParsing -TimeoutSec 1; break } catch {} } }; Start-Process 'http://127.0.0.1:8765'"
if errorlevel 1 pause
