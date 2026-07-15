# research-swarm DURABILITY + DOCUMENTATION layer. Dot-source AFTER swarm-lib.ps1:
#   . ./tools/swarm-lib.ps1 ; . ./tools/harvest-lib.ps1
# Adds: drop detection, .part salvage/merge, provenance extraction, unreported-fetch diff, STATE.md deriver.
# Principle: clean-key findings stay PRIMARY; this adds durability/detection/anchor AROUND them.

# ---------- #3 drop detection: journal started-vs-result (zero-token, hard guarantee) ----------
# Returns rows for agents that STARTED but produced no result (silently dropped by truncation etc.).
function Read-DropReport {
  param([Parameter(Mandatory)][string]$Journal,[string]$TranscriptDir)
  if (-not (Test-Path $Journal)) { return @() }
  $started = @{}; $done = New-Object System.Collections.Generic.HashSet[string]
  foreach ($row in (Read-Jsonl $Journal)) {
    switch ($row.type) {
      'started' { if ($row.agentId) { $started[$row.agentId] = $row.key } }
      'result'  { if ($row.agentId) { [void]$done.Add($row.agentId) } }
    }
  }
  $drops = @()
  foreach ($aid in $started.Keys) {
    if ($done.Contains($aid)) { continue }
    $label = $null
    if ($TranscriptDir) {
      $tp = Join-Path $TranscriptDir "agent-$aid.jsonl"
      if (Test-Path $tp) { $label = Get-AgentLabel -TranscriptPath $tp }
    }
    $drops += [pscustomobject]@{ agentId=$aid; key=$started[$aid]; label=$label }
  }
  return $drops
}

# ---------- transcript walk: map agentId->key from the journal 'started' events ----------
# NB: journal 'key' is an internal content-hash, not the readable target key. The readable
# machine key is carried by the going-forward <key>.part filename; the human label is in the
# transcript prompt (Get-AgentLabel). Use those for readability; the hash is the hard join.
function Get-AgentKeyMap {
  param([Parameter(Mandatory)][string]$Journal)
  $map = @{}
  if (Test-Path $Journal) {
    foreach ($row in (Read-Jsonl $Journal)) {
      if ($row.type -eq 'started' -and $row.agentId) { $map[$row.agentId] = $row.key }
    }
  }
  return $map
}

# best-effort human label from a transcript's prompt (first user message)
function Get-AgentLabel {
  param([Parameter(Mandatory)][string]$TranscriptPath)
  $first = Get-Content -LiteralPath $TranscriptPath -Encoding utf8 -TotalCount 1
  if (-not $first) { return $null }
  try { $d = $first | ConvertFrom-Json } catch { return $null }
  $c = $d.message.content
  $txt = if ($c -is [string]) { $c } else { ($c | ForEach-Object { $_.text }) -join "" }
  if ($txt -match '(?m)^##\s*Your assigned source area\s*\r?\n(.+)$') { return $Matches[1].Trim() }
  return $null
}

# infer a coarse status token from a tool_result's text content
function Get-FetchStatus {
  param([string]$Text,[bool]$IsError)
  $t = "$Text"
  if ($t -match '40[0-9].*Forbidden|HTTP[_: ]?403|"?403"?')      { return 'blocked' }
  if ($t -match 'HTTP[_: ]?404|40[0-9].*Not Found|"?404"?')      { return 'dead' }
  if ($t -match 'HTTP[_: ]?429|Too Many Requests|rate.?limit')   { return 'ratelimited' }
  if ($t -match 'Connection closed mid-response|API Error')      { return 'error' }
  if ($t -match 'Access denied')                                 { return 'blocked' }
  if ($IsError)                                                  { return 'error' }
  return 'ok'
}

# ---------- #2 provenance: extract the machine-observed tool-call trail from transcripts ----------
# Writes provenance.jsonl rows: {run, agent(key), agentId, seq, tool, target, status}
function Export-Provenance {
  param(
    [Parameter(Mandatory)][string]$TranscriptDir,
    [Parameter(Mandatory)][string]$Run,
    [Parameter(Mandatory)][string]$Out,
    [string]$Journal
  )
  if (-not $Journal) { $Journal = Join-Path $TranscriptDir 'journal.jsonl' }
  $keyMap = Get-AgentKeyMap -Journal $Journal
  $rows = @()
  foreach ($f in (Get-ChildItem -LiteralPath $TranscriptDir -Filter 'agent-*.jsonl' -File)) {
    if ($f.Name -like '*.meta.json') { continue }
    $agentId = ($f.BaseName -replace '^agent-','')
    $label = Get-AgentLabel -TranscriptPath $f.FullName
    $key = if ($label) { $label } elseif ($keyMap.ContainsKey($agentId)) { $keyMap[$agentId] } else { $agentId }
    # first pass: collect tool_use (id->{tool,target}); second: tool_result (id->status)
    $uses = @{}; $order = @(); $results = @{}
    foreach ($line in (Get-Content -LiteralPath $f.FullName -Encoding utf8)) {
      if (-not $line.Trim()) { continue }
      try { $d = $line | ConvertFrom-Json } catch { continue }
      $content = $d.message.content
      if ($null -eq $content) { continue }
      foreach ($b in @($content)) {
        if ($b.type -eq 'tool_use' -and ($b.name -in @('WebSearch','WebFetch'))) {
          $target = if ($b.name -eq 'WebSearch') { Get-CanonQuery -Text ([string]$b.input.query) } else { Get-CanonUrl -Url ([string]$b.input.url) }
          $uses[$b.id] = [pscustomobject]@{ tool=$b.name; target=$target }
          $order += $b.id
        }
        elseif ($b.type -eq 'tool_result' -and $b.tool_use_id) {
          $txt = if ($b.content -is [string]) { $b.content } else { ($b.content | ForEach-Object { $_.text }) -join ' ' }
          $results[$b.tool_use_id] = Get-FetchStatus -Text $txt -IsError ([bool]$b.is_error)
        }
      }
    }
    $seq = 0
    foreach ($id in $order) {
      $u = $uses[$id]; $seq++
      $status = if ($results.ContainsKey($id)) { $results[$id] } else { 'nores' }
      $rows += [pscustomobject]@{ run=$Run; agent=$key; agentId=$agentId; seq=$seq; tool=$u.tool; target=$u.target; status=$status }
    }
  }
  Remove-Run -Path $Out -Run $Run
  if ($rows.Count) { Add-Jsonl -Path $Out -Rows $rows }
  Write-Host "Provenance run ${Run}: $($rows.Count) tool-call rows from $($keyMap.Count) agents -> $Out"
  return $rows
}

# ---------- #3 salvage: read an agent's incremental .part file ----------
# .part = JSONL, each line typed via "_t" in coverage|finding|note; other fields are the row payload.
# .part is AGENT-hand-written via Bash -> tolerate malformed lines (skip + count), never throw.
function Read-PartFile {
  param([Parameter(Mandatory)][string]$Path)
  $cov=@(); $fnd=@(); $notes=@(); $bad=0
  if (-not (Test-Path $Path)) { return [pscustomobject]@{ coverage=$cov; findings=$fnd; notes=$notes; bad=0 } }
  foreach ($line in (Get-Content -LiteralPath $Path -Encoding utf8)) {
    if (-not $line.Trim()) { continue }
    try { $row = $line | ConvertFrom-Json } catch { $bad++; continue }
    switch ($row._t) {
      'coverage' { $cov  += ($row | Select-Object -ExcludeProperty _t) }
      'finding'  { $fnd  += ($row | Select-Object -ExcludeProperty _t) }
      'note'     { $notes += ($row | Select-Object -ExcludeProperty _t) }
      default    { $bad++ }
    }
  }
  return [pscustomobject]@{ coverage=$cov; findings=$fnd; notes=$notes; bad=$bad }
}

# ---------- merge a round: returns (authoritative) + .part salvage (only for DROPPED agents) ----------
# Prevents double-count: a completed agent uses its clean return; a dropped agent falls back to its .part.
function Merge-Round {
  param(
    [Parameter(Mandatory)]$Result,                 # {run, coverage[], findings[]} from the workflow (may be $null)
    [Parameter(Mandatory)][string]$Coverage,
    [Parameter(Mandatory)][string]$Findings,
    [string]$PartsDir,                             # dir of <key>.part files
    [string]$Journal,                              # to detect dropped agents
    [string]$Run
  )
  if (-not $Run) { $Run = $Result.run }
  $cov = @(); if ($Result.coverage) { $cov += $Result.coverage }
  $fnd = @(); if ($Result.findings) { $fnd += $Result.findings }
  # which target keys already have a clean return?
  $returned = New-Object System.Collections.Generic.HashSet[string]
  foreach ($r in $cov) { if ($r.agent) { [void]$returned.Add($r.agent) } }
  foreach ($r in $fnd) { if ($r.agent) { [void]$returned.Add($r.agent) } }

  $salvaged = 0
  if ($PartsDir -and (Test-Path $PartsDir)) {
    # Salvage any <key>.part whose key produced NO clean return. The .part filename IS the readable
    # key, so this is exact — no need to reconcile against the journal's internal hash keys.
    foreach ($pf in (Get-ChildItem -LiteralPath $PartsDir -Filter '*.part' -File)) {
      $key = $pf.BaseName
      if ($returned.Contains($key)) { continue }                      # completed cleanly -> ignore partial
      $p = Read-PartFile -Path $pf.FullName
      foreach ($c in $p.coverage) { $cov += ($c | Add-Member -NotePropertyMembers @{ run=$Run; agent=$key; salvaged=$true } -PassThru -Force) }
      foreach ($x in $p.findings) { $fnd += ($x | Add-Member -NotePropertyMembers @{ run=$Run; agent=$key; salvaged=$true } -PassThru -Force) }
      if ($p.coverage.Count -or $p.findings.Count) { $salvaged++ }
    }
  }
  # stamp run on EVERY row (return rows may lack it) so Remove-Run stays idempotent on re-merge
  foreach ($r in $cov) { $r | Add-Member -NotePropertyName run -NotePropertyValue $Run -Force }
  foreach ($r in $fnd) { $r | Add-Member -NotePropertyName run -NotePropertyValue $Run -Force }
  Remove-Run -Path $Coverage -Run $Run
  Remove-Run -Path $Findings -Run $Run
  if ($cov.Count) { Add-Jsonl -Path $Coverage -Rows $cov }
  if ($fnd.Count) { Add-Jsonl -Path $Findings -Rows $fnd }
  Write-Host "Merge-Round ${Run}: $($cov.Count) coverage, $($fnd.Count) findings ($salvaged agents salvaged from .part)"
  return [pscustomobject]@{ coverage=$cov.Count; findings=$fnd.Count; salvaged=$salvaged }
}

# ---------- #2 detection backstop: fetched (provenance) but never reported (coverage) ----------
function Get-UnreportedFetches {
  param([Parameter(Mandatory)][string]$Provenance,[Parameter(Mandatory)][string]$Coverage,[string]$Run)
  $covKeys = New-Object System.Collections.Generic.HashSet[string]
  foreach ($c in (Read-Jsonl $Coverage)) { if ($c.key) { [void]$covKeys.Add($c.key) } }
  $seen = New-Object System.Collections.Generic.HashSet[string]
  $out = @()
  foreach ($p in (Read-Jsonl $Provenance)) {
    if ($Run -and $p.run -ne $Run) { continue }
    if ($p.tool -ne 'WebFetch') { continue }              # a "source touched" is a FETCH; searches are exploration, not sources
    if ($p.status -ne 'ok') { continue }                 # only successful fetches are candidate misses
    if ($covKeys.Contains($p.target)) { continue }        # was reported
    if ($seen.Contains($p.target)) { continue }
    [void]$seen.Add($p.target)
    $out += [pscustomobject]@{ target=$p.target; agent=$p.agent; tool=$p.tool }
  }
  return $out
}

# ---------- #1 resume: derive the compact STATE.md context anchor ----------
function Write-State {
  param(
    [Parameter(Mandatory)][string]$Coverage,
    [Parameter(Mandatory)][string]$Findings,
    [Parameter(Mandatory)][string]$Out,
    [string]$Provenance,
    [string[]]$WorkflowDirs      # dirs holding journal.jsonl per run (for drop reporting)
  )
  $cov = Read-Jsonl $Coverage
  $fnd = Read-Jsonl $Findings
  $dns = Read-DoNotSearch -Coverage $Coverage
  $offCount = @($dns.OffLimits).Count
  $revisit = $dns.Revisit

  # coverage by area + status tally
  $byArea = $cov | Group-Object area | Sort-Object Count -Descending
  $statusTally = $cov | Group-Object status | Sort-Object Count -Descending
  # distinct finding entities
  $entities = @($fnd | Select-Object -ExpandProperty entity -ErrorAction SilentlyContinue | Sort-Object -Unique)
  # decisions digest: dead/blocked coverage rows with a why
  $decisions = @($cov | Where-Object { $_.status -in @('dead','blocked') -and $_.why })

  # unrecovered failures across runs
  $drops = @()
  foreach ($d in @($WorkflowDirs)) {
    if (-not $d) { continue }
    $j = Join-Path $d 'journal.jsonl'
    foreach ($x in (Read-DropReport -Journal $j -TranscriptDir $d)) { $drops += $x }
  }
  # unreported fetches
  $unrep = @()
  if ($Provenance -and (Test-Path $Provenance)) { $unrep = @(Get-UnreportedFetches -Provenance $Provenance -Coverage $Coverage) }

  $sb = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine("# SWARM STATE (derived — do not hand-edit; regenerated each session/merge)")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("- coverage rows: $($cov.Count) | off-limits keys: $offCount | revisit(partial/pending): $($revisit.Keys.Count)")
  [void]$sb.AppendLine("- findings: $($fnd.Count) | distinct entities: $($entities.Count)")
  [void]$sb.AppendLine("- UNRECOVERED failures (started, no result): $($drops.Count)")
  [void]$sb.AppendLine("- UNREPORTED fetches (fetched ok, no coverage row): $($unrep.Count)")
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("## coverage status tally")
  foreach ($g in $statusTally) { [void]$sb.AppendLine("- $($g.Name): $($g.Count)") }
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("## frontier — revisit (partial/pending)")
  if ($revisit.Keys.Count -eq 0) { [void]$sb.AppendLine("- (none)") }
  foreach ($k in $revisit.Keys) { [void]$sb.AppendLine("- $k  $(if($revisit[$k]){"— remaining: $($revisit[$k])"})") }
  [void]$sb.AppendLine("")
  if ($drops.Count) {
    [void]$sb.AppendLine("## ⚠ UNRECOVERED failures — re-dispatch these")
    foreach ($x in $drops) { [void]$sb.AppendLine("- $(if($x.label){$x.label}else{$x.key})  (agentId $($x.agentId))") }
    [void]$sb.AppendLine("")
  }
  if ($unrep.Count) {
    [void]$sb.AppendLine("## ⚠ UNREPORTED fetches (#2 review queue — agent fetched, said nothing)")
    foreach ($x in ($unrep | Select-Object -First 40)) { [void]$sb.AppendLine("- $($x.target)  (agent $($x.agent))") }
    if ($unrep.Count -gt 40) { [void]$sb.AppendLine("- … and $($unrep.Count - 40) more (see provenance diff)") }
    [void]$sb.AppendLine("")
  }
  [void]$sb.AppendLine("## decisions digest (dead/blocked with why)")
  if ($decisions.Count -eq 0) { [void]$sb.AppendLine("- (none recorded — agents may predate the coverage 'why' field)") }
  foreach ($x in ($decisions | Select-Object -First 30)) { [void]$sb.AppendLine("- [$($x.status)] $($x.key) — $($x.why)") }
  [void]$sb.AppendLine("")
  [void]$sb.AppendLine("_Detail lives in the ledgers; drill in only per-item. Default context = this file + findings.jsonl._")

  [System.IO.File]::WriteAllText($Out, $sb.ToString(), (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "STATE -> $Out (drops=$($drops.Count), unreported=$($unrep.Count))"
}

# ---------- per-round wrapper: the whole post-dispatch sequence in one call ----------
# Merge (return-primary + .part salvage) -> extract provenance -> re-derive STATE. Idempotent per run.
function Complete-Round {
  param(
    [Parameter(Mandatory)]$Result,               # {run,coverage,findings} object OR a path to that JSON
    [Parameter(Mandatory)][string]$WorkflowDir,  # holds journal.jsonl + agent-*.jsonl transcripts
    [Parameter(Mandatory)][string]$Coverage,
    [Parameter(Mandatory)][string]$Findings,
    [Parameter(Mandatory)][string]$Provenance,
    [Parameter(Mandatory)][string]$StateOut,
    [string]$PartsDir,
    [string[]]$AllWorkflowDirs                    # all run dirs, for cumulative drop reporting in STATE
  )
  if ($Result -is [string]) { $Result = Get-Content -LiteralPath $Result -Raw -Encoding utf8 | ConvertFrom-Json }
  $run = $Result.run
  Merge-Round -Result $Result -Coverage $Coverage -Findings $Findings -PartsDir $PartsDir -Run $run | Out-Null
  Export-Provenance -TranscriptDir $WorkflowDir -Run $run -Out $Provenance | Out-Null
  $dirs = if ($AllWorkflowDirs) { $AllWorkflowDirs } else { @($WorkflowDir) }
  Write-State -Coverage $Coverage -Findings $Findings -Out $StateOut -Provenance $Provenance -WorkflowDirs $dirs
}
