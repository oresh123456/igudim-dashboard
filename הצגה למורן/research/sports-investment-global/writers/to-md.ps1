# to-md.ps1 <findings.jsonl> <out.md> [-Title "Findings"]
# Human-readable markdown report, grouped by entity. Good for a handoff / non-analyst deliverable.
param(
  [Parameter(Mandatory,Position=0)][string]$In,
  [Parameter(Mandatory,Position=1)][string]$Out,
  [string]$Title = 'Findings'
)
if (-not (Test-Path $In)) { throw "not found: $In" }
$rows = Get-Content -LiteralPath $In -Encoding utf8 | Where-Object { $_.Trim() } | ForEach-Object { $_ | ConvertFrom-Json }
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("# $Title`n")
foreach ($g in ($rows | Group-Object entity | Sort-Object Name)) {
  [void]$sb.AppendLine("## $($g.Name)`n")
  [void]$sb.AppendLine("| field | value | source |")
  [void]$sb.AppendLine("|---|---|---|")
  foreach ($r in $g.Group) {
    $f = "$($r.field)" -replace '\|','\|'
    $v = "$($r.value)" -replace '\|','\|'
    $s = "$($r.source_key)" -replace '\|','\|'
    [void]$sb.AppendLine("| $f | $v | $s |")
  }
  [void]$sb.AppendLine('')
}
[System.IO.File]::WriteAllText($Out, $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))
Write-Host "wrote $(@($rows).Count) findings across $((($rows|Group-Object entity)|Measure-Object).Count) entities -> $Out"
