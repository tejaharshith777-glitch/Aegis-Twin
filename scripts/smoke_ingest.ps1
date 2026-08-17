$body = Get-Content 'scripts\smoke_payload.json' -Raw
$response = Invoke-RestMethod -Method POST -Uri 'http://localhost:3001/api/telemetry/ingest' -ContentType 'application/json' -Body $body
$response | ConvertTo-Json -Depth 5
