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
  # split query off FIRST -- a query can appear with no path (host?a=1), so splitting host/path
  # before the query would leave the whole query stuck on the host (utm never stripped).
  $beforeQ = $u; $query = ''
  if ($u -match '\?') { $beforeQ,$query = $u -split '\?',2 }
  $hostPart = ($beforeQ -split '/',2)[0]   # NB: $host is reserved in PowerShell
  $path = if ($beforeQ -match '/') { '/' + ($beforeQ -split '/',2)[1] } else { '' }
  $hostPart = $hostPart.ToLowerInvariant() # lowercase host, keep path case
  if ($query) {
    $kept = @()
    foreach ($pair in ($query -split '&')) {
      if (-not $pair) { continue }
      $k = ($pair -split '=',2)[0]
      if ($script:TrackParams -notcontains $k.ToLowerInvariant()) { $kept += $pair }
    }
    $query = (@($kept | Sort-Object -CaseSensitive) -join '&')   # sort -> ?a=2&b=1 and ?b=1&a=2 are one key
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

# ---------- read ledgers (the ONE shared reader: single path | glob | array = read-global union) ----------
# A literal existing path is read as-is (identical to before). Anything else is treated as a wildcard
# and expanded. Passing an array/glob unions every matching node ledger — this is how a machine sees
# read-global (coverage.*.jsonl) while each machine only ever WRITES its own file (write-local).
function Read-Jsonl {
  param([Parameter(Mandatory)][string[]]$Path)
  $files = @()
  foreach ($p in $Path) {
    if (-not $p) { continue }
    if (Test-Path -LiteralPath $p -PathType Leaf) { $files += (Resolve-Path -LiteralPath $p).Path }  # exact file: fast, order-preserving
    else { $files += @(Get-ChildItem -Path $p -File -ErrorAction SilentlyContinue | ForEach-Object FullName) }  # glob expand
  }
  $files = @($files | Select-Object -Unique)   # de-dup file list (a path can match twice via glob+literal)
  $out = @()
  foreach ($f in $files) {
    $bad = 0
    foreach ($line in (Get-Content -LiteralPath $f -Encoding utf8)) {
      if (-not $line.Trim()) { continue }
      # -EA Stop makes a torn line catchable regardless of ambient EAP; never silently vanish
      try { $out += ($line | ConvertFrom-Json -ErrorAction Stop) } catch { $bad++ }
    }
    if ($bad) { Write-Warning "Read-Jsonl: skipped $bad malformed line(s) in $f (a torn append?) -- not dropped from disk" }
  }
  return $out
}

# strongest status wins; mined|dead|blocked = off-limits, partial|pending = revisit
$script:StatusRank = @{ pending=0; partial=1; blocked=2; dead=3; mined=4 }
function Read-DoNotSearch {
  param([Parameter(Mandatory)][string[]]$Coverage,[switch]$ByArea)   # glob/array -> read-global across nodes
  $best = @{}
  foreach ($row in (Read-Jsonl $Coverage)) {
    $k = if ($ByArea -and $row.area) { "$($row.key)|$($row.area)" } else { $row.key }
    $rank = $script:StatusRank[$row.status]; if ($null -eq $rank) { $rank = 0 }
    if (-not $best.ContainsKey($k) -or $rank -gt $best[$k].rank) { $best[$k] = @{ rank=$rank; status=$row.status; remaining=$row.remaining } }
  }
  $off = New-Object System.Collections.Generic.HashSet[string]
  $revisit = @{}
  foreach ($k in $best.Keys) {
    if (@('mined','dead','blocked') -contains $best[$k].status) { [void]$off.Add($k) }
    else { $revisit[$k] = $best[$k].remaining }
  }
  return [pscustomobject]@{ OffLimits=$off; Revisit=$revisit }
}

# per-target do-not-search map -> { "<target.key>" = @(off-limits keys...) } for wf-gather args.dns
function Build-DnsMap {
  param([Parameter(Mandatory)][string[]]$Coverage,[Parameter(Mandatory)]$Targets)   # glob/array -> read-global
  $dns = Read-DoNotSearch -Coverage $Coverage
  $offArr = @($dns.OffLimits)
  $map = @{}
  foreach ($t in $Targets) { $map[$t.key] = $offArr }   # default: every target avoids all covered keys
  return $map
}

# ---------- idempotent init: create ledgers only if ABSENT, never clobber ----------
# CreateNew mode throws if the file already exists -> an existing ledger is physically
# impossible to truncate here. Safe to re-run every activation. Returns $true if it
# created the file, $false if it preserved an existing one.
function Initialize-Ledger {
  param([Parameter(Mandatory)][string]$Path)
  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  try {
    $fs = [System.IO.File]::Open($Path, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write)
    $fs.Dispose()
    Write-Host "created: $Path"
    return $true
  } catch [System.IO.IOException] {
    Write-Host "preserved (exists, $(@(Read-Jsonl $Path).Count) rows): $Path"
    return $false
  }
}

# One-shot project init. Creates the FOUR core ledgers (+ any extras) without ever
# overwriting existing data. Idempotent — running it on an initialized project is a no-op.
# reasons + suggestions are first-class (not -Extra): a missing reasons.jsonl otherwise reads
# as silently empty in Resolve-Findings, so authored overrides would vanish with no error.
# Reasons/Suggestions default to siblings of Coverage so one -Coverage path pins the whole set.
function Initialize-Swarm {
  param(
    [string]$Coverage = 'coverage.jsonl',
    [string]$Findings = 'findings.jsonl',
    [string]$Reasons,
    [string]$Suggestions,
    [string]$Decisions,             # sub-agent-mid-run-decisions: in-run reasoning (why ground closed off)
    [string]$Fetches,               # sub-agent-web-fetches: one row per fetch (raw provenance trail)
    [string[]]$Extra  = @()          # further project-specific ledgers
  )
  $dir = Split-Path -Parent $Coverage
  function Sib([string]$name,[string]$given) { if ($given) { $given } elseif ($dir) { Join-Path $dir $name } else { $name } }
  $Reasons     = Sib 'reasons.jsonl'                     $Reasons
  $Suggestions = Sib 'suggestions.jsonl'                 $Suggestions
  $Decisions   = Sib 'sub-agent-mid-run-decisions.jsonl' $Decisions
  $Fetches     = Sib 'sub-agent-web-fetches.jsonl'       $Fetches
  $created = @()
  foreach ($p in (@($Coverage, $Findings, $Reasons, $Suggestions, $Decisions, $Fetches) + $Extra)) {
    if (Initialize-Ledger -Path $p) { $created += $p }
  }
  return $created
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
  if ($Path -match '[*?\[\]]') { throw "Remove-Run: refuses a wildcard/glob path ($Path) -- it rewrites ONE owned file (write-local invariant)." }
  if (-not (Test-Path -LiteralPath $Path)) { return }
  # Parse raw so a torn line can't silently vanish and then be permanently deleted by the rewrite.
  $kept = @(); $bad = 0
  foreach ($line in (Get-Content -LiteralPath $Path -Encoding utf8)) {
    if (-not $line.Trim()) { continue }
    try { $obj = $line | ConvertFrom-Json -ErrorAction Stop } catch { $bad++; continue }
    if ($obj.run -ne $Run) { $kept += $obj }
  }
  if ($bad) { throw "Remove-Run: $bad malformed line(s) in $Path -- refusing to rewrite (that would permanently drop them). Quarantine/repair the file first." }
  # atomic: build the new file then swap, so a crash mid-write can't truncate the ledger (bug 1.2)
  $tmp = "$Path.tmp"
  $sw = New-Object System.IO.StreamWriter($tmp, $false, (New-Object System.Text.UTF8Encoding($false)))
  try { foreach ($r in $kept) { $sw.WriteLine( ($r | ConvertTo-Json -Compress -Depth 20) ) } } finally { $sw.Dispose() }
  Move-Item -LiteralPath $tmp -Destination $Path -Force
}

# Import-Run is the SOLE owner of node-stamping (Read-WorkflowResult stays pure).
# It derives ONE run id and stamps it onto the dedup key AND every row's own `run`,
# so Remove-Run's per-row match can never drift from the key (the resume guarantee).
function Import-Run {
  param([Parameter(Mandatory)]$Result,[Parameter(Mandatory)][string]$Coverage,[Parameter(Mandatory)][string]$Findings,
        [string]$Suggestions,[string]$Node)
  $run = "$($Result.run)".Trim()
  if (-not $run) { throw "Import-Run: result has no 'run' -- did you pass the raw .output wrapper instead of Read-WorkflowResult?" }
  if (-not $Node) {
    $Node = if ($env:SWARM_NODE) { $env:SWARM_NODE } elseif ($env:COMPUTERNAME) { $env:COMPUTERNAME } else { [System.Net.Dns]::GetHostName() }
  }
  if ($run -notmatch '@') { $run = "$run@$Node" }   # idempotent: already-stamped run is left as-is
  foreach ($r in (@($Result.coverage) + @($Result.findings) + @($Result.suggest))) {
    if ($null -eq $r) { continue }
    $r | Add-Member -NotePropertyName run  -NotePropertyValue $run  -Force
    $r | Add-Member -NotePropertyName node -NotePropertyValue $Node -Force
  }
  # Commit order matters (bug 1.1): findings (+ suggestions) FIRST, coverage LAST. If a write fails
  # mid-import, ground is left re-searchable (recoverable) rather than marked mined-without-the-harvest
  # (which, via the DNS off-limits projection, would be a permanent, invisible loss).
  Remove-Run -Path $Findings -Run $run
  if ($Result.findings) { Add-Jsonl -Path $Findings -Rows $Result.findings }
  if ($Suggestions -and $Result.suggest) { Remove-Run -Path $Suggestions -Run $run; Add-Jsonl -Path $Suggestions -Rows $Result.suggest }
  Remove-Run -Path $Coverage -Run $run
  if ($Result.coverage) { Add-Jsonl -Path $Coverage -Rows $Result.coverage }
  Write-Host "Imported run $run : $(@($Result.coverage).Count) coverage, $(@($Result.findings).Count) findings"
}

# ---------- harness handoff: unwrap the Workflow tool's .output wrapper (PURE: no stamping) ----------
# The Workflow tool persists {summary,result,totalTokens,...}; the real payload is under .result.
# Accepts an object, a raw JSON string, or a path. Validates run is non-empty. Does NOT node-stamp.
function Read-WorkflowResult {
  param($Object,[string]$Path,[string]$Json)
  $obj = $Object
  if ($null -eq $obj -and $Path) { $obj = Get-Content -LiteralPath $Path -Raw -Encoding utf8 | ConvertFrom-Json }
  if ($null -eq $obj -and $Json) { $obj = $Json | ConvertFrom-Json }
  if ($null -eq $obj) { throw "Read-WorkflowResult: provide -Object, -Json, or -Path" }
  if (($obj.PSObject.Properties.Name -contains 'result') -and $obj.result) { $obj = $obj.result }
  if (-not "$($obj.run)".Trim()) { throw "Read-WorkflowResult: result has no 'run' -- wrong object, or the run died?" }
  return [pscustomobject]@{ run=$obj.run; coverage=@($obj.coverage); findings=@($obj.findings); suggest=@($obj.suggest) }
}

# ---------- safe script write: LF-only, control-char-stripped, UTF-8-no-BOM, atomic (temp->move) ----------
# Keeps TAB/LF; drops CR, other C0, C1, DEL, and the format chars that silently break JS string literals.
function Write-CleanScript {
  param([Parameter(Mandatory)][string]$Content,[Parameter(Mandatory)][string]$Path)
  $sb = New-Object System.Text.StringBuilder
  foreach ($ch in $Content.ToCharArray()) {
    $c = [int]$ch
    if ($c -eq 9 -or $c -eq 10) { [void]$sb.Append($ch); continue }               # keep TAB, LF
    if ($c -lt 0x20 -or $c -eq 0x7F) { continue }                                 # drop CR + other C0 + DEL
    if ($c -ge 0x80 -and $c -le 0x9F) { continue }                               # C1 controls
    if ($c -in 0x2028,0x2029,0xFEFF,0x200B,0x0085) { continue }                  # JS-string / format breakers
    [void]$sb.Append($ch)
  }
  $dir = Split-Path -Parent $Path
  if ($dir -and -not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  $tmp = "$Path.tmp"
  [System.IO.File]::WriteAllText($tmp, $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))
  Move-Item -LiteralPath $tmp -Destination $Path -Force
}

# ---------- dispatcher generator: bake TARGETS into the template marker, write cleanly ----------
function Build-Dispatcher {
  param([Parameter(Mandatory)][string]$Template,[Parameter(Mandatory)]$Targets,[Parameter(Mandatory)][string]$OutPath)
  $marker = '/*__TARGETS__*/'
  $tpl = Get-Content -LiteralPath $Template -Raw -Encoding utf8
  if (-not $tpl.Contains($marker)) { throw "Build-Dispatcher: template missing '$marker' injection marker: $Template" }
  $json = ConvertTo-Json -InputObject @($Targets) -Depth 20 -Compress -AsArray
  $baked = $tpl.Replace($marker, "$json ||")     # baked array wins; original expr stays as fallback
  Write-CleanScript -Content $baked -Path $OutPath
}

# ---------- rate-limit stop-signal ----------
function Get-BlockSignal {
  param([Parameter(Mandatory)][string]$Coverage,[string]$Run)
  $rows = Read-Jsonl $Coverage
  if ($Run) { $rows = $rows | Where-Object { $_.run -eq $Run } }
  $rx = '\b429\b|rate.?limit|cooldown|throttl|blocked|\b503\b'   # anchor codes: "1503 pages" is not HTTP 503
  $hits = @($rows | Where-Object { "$($_.status) $($_.yield) $($_.remaining)" -match $rx })
  return [pscustomobject]@{ Tripped = ($hits.Count -ge 2); Count = $hits.Count }
}
