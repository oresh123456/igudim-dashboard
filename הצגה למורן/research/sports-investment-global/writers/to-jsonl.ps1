# to-jsonl.ps1 <findings.jsonl> <out.jsonl> [-Columns c1,c2,...] [-Where '$_.field -eq "revenue"']
# Filter/select/reshape passthrough. No -Columns = copy through; -Columns = project a subset.
param(
  [Parameter(Mandatory,Position=0)][string]$In,
  [Parameter(Mandatory,Position=1)][string]$Out,
  [string[]]$Columns,
  [string]$Where
)
if (-not (Test-Path $In)) { throw "not found: $In" }
$filter = if ($Where) { [scriptblock]::Create($Where) } else { { $true } }
$objs = Get-Content -LiteralPath $In -Encoding utf8 | Where-Object { $_.Trim() } | ForEach-Object { $_ | ConvertFrom-Json }
$objs = @($objs | Where-Object $filter)   # Where-Object binds $_ correctly for the user's -Where expr
$sw = New-Object System.IO.StreamWriter($Out, $false, (New-Object System.Text.UTF8Encoding($false)))
$n = 0
try {
  foreach ($o in $objs) {
    if ($Columns) { $h = [ordered]@{}; foreach ($c in $Columns) { $h[$c] = $o.$c }; $o = [pscustomobject]$h }
    $sw.WriteLine( ($o | ConvertTo-Json -Compress -Depth 20) ); $n++
  }
} finally { $sw.Dispose() }
Write-Host "wrote $n rows -> $Out"
