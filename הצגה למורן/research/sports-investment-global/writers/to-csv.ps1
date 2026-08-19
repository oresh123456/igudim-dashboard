# to-csv.ps1 <findings.jsonl> <out.csv> [-Columns entity,field,value,source_key] [-Encoding utf8BOM]
# Long/tidy projection: one CSV row per finding. utf8BOM so Hebrew opens correctly in Excel.
param(
  [Parameter(Mandatory,Position=0)][string]$In,
  [Parameter(Mandatory,Position=1)][string]$Out,
  [string[]]$Columns = @('entity','field','value','source_key','run','date'),
  [string]$Encoding = 'utf8BOM'
)
if (-not (Test-Path $In)) { throw "not found: $In" }
$rows = Get-Content -LiteralPath $In -Encoding utf8 | Where-Object { $_.Trim() } | ForEach-Object {
  $o = $_ | ConvertFrom-Json
  $h = [ordered]@{}
  foreach ($c in $Columns) { $h[$c] = $o.$c }
  [pscustomobject]$h
}
$rows | Export-Csv -LiteralPath $Out -NoTypeInformation -Encoding $Encoding
Write-Host "wrote $(@($rows).Count) rows -> $Out"
