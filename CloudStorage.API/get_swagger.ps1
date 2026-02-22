Write-Host "Starting API..."
$proc = Start-Process -FilePath "dotnet" -ArgumentList "run" -NoNewWindow -PassThru -RedirectStandardOutput "logs.txt" -RedirectStandardError "logs.txt"
Write-Host "Waiting for API to start..."
Start-Sleep -Seconds 12
Write-Host "Fetching Swagger..."
Invoke-WebRequest -Uri "http://localhost:5000/swagger/v1/swagger.json" -OutFile "..\docs\swagger.json"
Write-Host "Stopping API..."
Stop-Process -Id $proc.Id -Force
Write-Host "Done!"
