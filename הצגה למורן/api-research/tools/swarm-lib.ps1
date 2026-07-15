# research-swarm ledger helpers. Dot-source it:  . ./tools/swarm-lib.ps1
# All ledgers are append-only UTF-8 (no BOM) JSONL. Findings stay FORMAT-NEUTRAL — see writers/.

# ---------- canonicalization (must match the agent prompt's rules) ----------
$script:TrackParams = @('utm_source','utm_medium','utm_campaign','utm_term','utm_content','mc_cid','mc_eid','fbclid','gclid','gbraid','wbraid','_ga','ref','ref_src')

function Get-CanonUrl {
  param([Parameter(Mandatory)][string]$Url)
  $u = $Url.Trim()
  $u = $u -replace '^\s*https?://',''      # drop scheme
  $u = $u -replace '^www\.',''             # drop leading www.
  $u = $u -replace '#.*$',''               # drop fragment
  $hostPart = ($u -split '/',2)[0]         # NB: $host is reserved in PowerShell
  $rest = if ($u -match '/') { '/' + ($u -split '/',2)[1] } else { '' }
  $hostPart = $hostPart.ToLowerInvariant() # lowercase host, keep path case
  # split path?query
  $path = $rest; $query = ''
  if ($rest -match '\?') { $path,$query = $rest -split '\?',2 }
  if ($query) {
    $kept = @()
    foreach ($pair in ($query -split '&')) {
      if (-not $pair) { continue }
      $k = ($pair -split '=',2)[0]
      if ($script:TrackParams -notcontains $k.ToLowerInvariant()) { $kept += $pair }
    }
    $query = ($kept -join '&')
  }
  $path = $path -replace '/+$',''          # drop trailing slash(es)
  $out = $hostPart + $path
  if ($query) { $out += '?' + $query }
  return $out
}

function Get-CanonQuery {
  param([Parameter(Mandatory)][string]$Text,[string]$Engine='web')
  $t = ($Text -replace '\s+',' ').Trim().ToLowerInvariant()
  return "$($Engine.ToLowerInvariant()):$t"
}

# ---------- read ledgers ----------
function Read-Jsonl {
  param([Parameter(Mandatory)][string]$Path)
  if (-not (Test-Path $Path)) { return @() }
  Get-Content -LiteralPath $Path -Encoding utf8 | Where-Object { $_.Trim() } | ForEach-Object { $_ | ConvertFrom-Json }
}

# strongest status wins; mined|dead|blocked = off-limits, partial|pending = revisit
$script:StatusRank = @{ pending=0; partial=1; blocked=2; dead=3; mined=4 }
function Read-DoNotSearch {
  param([Parameter(Mandatory)][string]$Coverage,[switch]$ByArea)
  # Dedup is CASE-SENSITIVE to match Get-CanonUrl (host lowercased, path case preserved). A plain
  # @{} hashtable is case-INsensitive and would collapse path-case-variant keys into one bucket
  # (silently marking a not-yet-mined variant off-limits). Use ordinal dictionaries so $best/$revisit
  # agree with the ordinal $off HashSet and with the canonical keys themselves.
  $best = [System.Collections.Generic.Dictionary[string,object]]::new([System.StringComparer]::Ordinal)
  foreach ($row in (Read-Jsonl $Coverage)) {
    $k = if ($ByArea -and $row.area) { "$($row.key)|$($row.area)" } else { [string]$row.key }
    $rank = $script:StatusRank[$row.status]; if ($null -eq $rank) { $rank = 0 }
    if (-not $best.ContainsKey($k) -or $rank -gt $best[$k].rank) { $best[$k] = @{ rank=$rank; status=$row.status; remaining=$row.remaining } }
  }
  $off = New-Object System.Collections.Generic.HashSet[string]   # default comparer = ordinal (case-sensitive), matches $best
  $revisit = [System.Collections.Generic.Dictionary[string,object]]::new([System.StringComparer]::Ordinal)
  foreach ($k in $best.Keys) {
    if (@('mined','dead','blocked') -contains $best[$k].status) { [void]$off.Add($k) }
    else { $revisit[$k] = $best[$k].remaining }
  }
  return [pscustomobject]@{ OffLimits=$off; Revisit=$revisit }
}

# per-target do-not-search map -> { "<target.key>" = @(off-limits keys...) } for wf-gather args.dns
function Build-DnsMap {
  param([Parameter(Mandatory)][string]$Coverage,[Parameter(Mandatory)]$Targets)
  $dns = Read-DoNotSearch -Coverage $Coverage
  $offArr = @($dns.OffLimits)
  $map = @{}
  foreach ($t in $Targets) { $map[$t.key] = $offArr }   # default: every target avoids all covered keys
  return $map
}

# ---------- write ledgers ----------
function Add-Jsonl {
  param([Parameter(Mandatory)][string]$Path,[Parameter(Mandatory)]$Rows)
  $sw = New-Object System.IO.StreamWriter($Path, $true, (New-Object System.Text.UTF8Encoding($false)))
  try { foreach ($r in $Rows) { $sw.WriteLine( ($r | ConvertTo-Json -Compress -Depth 20) ) } } finally { $sw.Dispose() }
}

# ---------- idempotent merge (resume-safe): drop prior rows for this run, re-add ----------
function Remove-Run {
  param([Parameter(Mandatory)][string]$Path,[Parameter(Mandatory)][string]$Run)
  if (-not (Test-Path $Path)) { return }
  $kept = Read-Jsonl $Path | Where-Object { $_.run -ne $Run }
  $sw = New-Object System.IO.StreamWriter($Path, $false, (New-Object System.Text.UTF8Encoding($false)))
  try { foreach ($r in $kept) { $sw.WriteLine( ($r | ConvertTo-Json -Compress -Depth 20) ) } } finally { $sw.Dispose() }
}

function Import-Run {
  param([Parameter(Mandatory)]$Result,[Parameter(Mandatory)][string]$Coverage,[Parameter(Mandatory)][string]$Findings)
  $run = $Result.run
  Remove-Run -Path $Coverage -Run $run
  Remove-Run -Path $Findings -Run $run
  if ($Result.coverage) { Add-Jsonl -Path $Coverage -Rows $Result.coverage }
  if ($Result.findings) { Add-Jsonl -Path $Findings -Rows $Result.findings }
  Write-Host "Imported run $run : $(@($Result.coverage).Count) coverage, $(@($Result.findings).Count) findings"
}

# ---------- rate-limit stop-signal ----------
function Get-BlockSignal {
  param([Parameter(Mandatory)][string]$Coverage,[string]$Run)
  $rows = Read-Jsonl $Coverage
  if ($Run) { $rows = $rows | Where-Object { $_.run -eq $Run } }
  $rx = '429|rate.?limit|cooldown|throttl|blocked|503'
  $hits = @($rows | Where-Object { "$($_.status) $($_.yield) $($_.remaining)" -match $rx })
  return [pscustomobject]@{ Tripped = ($hits.Count -ge 2); Count = $hits.Count }
}
