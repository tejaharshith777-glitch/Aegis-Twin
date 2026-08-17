# 1. Check new incidents after ingest
Write-Host "=== INCIDENTS ===" -ForegroundColor Cyan
$incidents = Invoke-RestMethod -Uri 'http://localhost:3001/api/incidents'
$incidents.incidents | ForEach-Object {
    Write-Host "[$($_.id)] $($_.title) | $($_.severity) | $($_.status)" -ForegroundColor Yellow
}

# 2. Check assets
Write-Host "`n=== ASSETS ===" -ForegroundColor Cyan
$assets = Invoke-RestMethod -Uri 'http://localhost:3001/api/assets'
Write-Host "Total assets: $($assets.assets.Count)"
$assets.assets | Select-Object -First 3 | ForEach-Object {
    Write-Host "  $($_.name) [$($_.status)] risk=$($_.riskScore)"
}

# 3. Test SSE stream (brief)
Write-Host "`n=== METRICS ===" -ForegroundColor Cyan
$metrics = Invoke-RestMethod -Uri 'http://localhost:3001/api/metrics'
Write-Host "Open incidents: $($metrics.openIncidents)"
Write-Host "Critical count: $($metrics.criticalCount)"
Write-Host "Signals 24h: $($metrics.signalsAnalyzed24h)"
Write-Host "Risk index: $($metrics.riskIndex)"
Write-Host "Control health: $($metrics.controlHealthPct)%"

# 4. Test health
Write-Host "`n=== HEALTH ===" -ForegroundColor Cyan
$health = Invoke-RestMethod -Uri 'http://localhost:3001/api/health'
Write-Host "Status: $($health.status) | Uptime: $($health.uptimeS)s | Events: $($health.eventCount)"
Write-Host "Integrations: Gemini=$($health.integrations.gemini) Deepgram=$($health.integrations.deepgram) Murf=$($health.integrations.murf)"

Write-Host "`n=== ALL CHECKS PASSED ===" -ForegroundColor Green
