Write-Host "Starting API..."
$proc = Start-Process -FilePath "dotnet" -ArgumentList "run" -NoNewWindow -PassThru -RedirectStandardOutput "logs_out.txt" -RedirectStandardError "logs_err.txt"
Write-Host "Waiting for API to start..."
Start-Sleep -Seconds 30
Write-Host "Fetching Swagger..."
Invoke-WebRequest -Uri "http://localhost:5274/swagger/v1/swagger.json" -OutFile "..\docs\swagger.json"
Write-Host "Stopping API..."
Stop-Process -Id $proc.Id -Force
Write-Host "Done!"
