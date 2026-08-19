# research-swarm reconciliation. Dot-source AFTER swarm-lib.ps1 -- it REUSES swarm-lib's Read-Jsonl
# (the one shared glob/array-capable reader), so load order is required.
#   . ./tools/reconcile-lib.ps1
# Model: mechanical RULES (first-decisive, each abstains unless it can decide) resolve the clean cases;
# authored REASONS (reasons.jsonl) override the rules and MUST carry reason_type + text.
# NOTHING is deleted: the resolved view keeps every losing value flagged with what rejected it.

# Thin alias onto the ONE shared reader (swarm-lib Read-Jsonl): single path | glob | array -> union.
function Read-Jl { param([string[]]$Path) Read-Jsonl -Path $Path }

function Append-Jl { param([string]$Path,$Rows)
  $sw = New-Object System.IO.StreamWriter($Path,$true,(New-Object System.Text.UTF8Encoding($false)))
  try { foreach ($r in $Rows) { $sw.WriteLine(($r | ConvertTo-Json -Compress -Depth 20)) } } finally { $sw.Dispose() } }

# ---------- source tiers ----------
function Get-Tiers { param([string]$Path='config/source-tiers.json') Get-Content -LiteralPath $Path -Encoding utf8 -Raw | ConvertFrom-Json }
function Get-SourceRank {
  param([Parameter(Mandatory)][string]$SourceKey,[Parameter(Mandatory)]$Tiers)
  $k = $SourceKey.ToLowerInvariant()
  foreach ($sub in $Tiers.map.PSObject.Properties.Name) { if ($k.Contains($sub.ToLowerInvariant())) { return [int]$Tiers.ranks.($Tiers.map.$sub) } }
  return [int]$Tiers.ranks.unknown
}

# normalize a value for equality: strip currency/commas/space, keep letters+digits+dot, lowercase
function Get-NVal { param([string]$V) if ($null -eq $V) { return '' } ($V -replace '[^\p{L}\p{Nd}\.]','').ToLowerInvariant() }
function Get-HostSeg { param([string]$Key) ($Key -split '/',2)[0] }

# ---------- reasons ledger (also the agents' place to "complain") ----------
function Add-Reason {
  param(
    [Parameter(Mandatory)][string]$Reasons,
    [Parameter(Mandatory)][string]$Entity,[Parameter(Mandatory)][string]$Field,
    [Parameter(Mandatory)][ValidateSet('override','keep-both','note')][string]$Mode,
    [Parameter(Mandatory)][string]$ReasonType,[Parameter(Mandatory)][string]$Text,
    $Accepted=@(),[string]$OverridesRule='',[string]$By='agent',[string]$Date=''
  )
  if (-not $Text.Trim()) { throw "Add-Reason: text is required (unexplained exception is not allowed)" }
  if ($Mode -ne 'note' -and -not @($Accepted).Count) { throw "Add-Reason: $Mode requires accepted[] value(s)" }
  Append-Jl -Path $Reasons -Rows @([pscustomobject]@{
    entity=$Entity; field=$Field; mode=$Mode; reason_type=$ReasonType; text=$Text
    accepted=@($Accepted); overrides_rule=$OverridesRule; by=$By; date=$Date })
}

# ---------- the rule framework (first-decisive; each returns winning nval or $null) ----------
$script:Rules = @{
  'source-tier' = {
    param($g)
    $best = ($g | Sort-Object rank | Select-Object -First 1).rank
    $top  = @($g | Where-Object rank -eq $best)
    $vals = @($top.nval | Select-Object -Unique)
    if ($vals.Count -eq 1) { return $vals[0] } else { return $null }   # top tier disagrees → abstain
  }
  'verification' = {
    param($g)
    $ver = @($g | Where-Object status -eq 'verified')
    if (-not $ver.Count) { return $null }
    $vals = @($ver.nval | Select-Object -Unique)
    if ($vals.Count -eq 1) { return $vals[0] } else { return $null }
  }
  'corroboration' = {
    param($g,$min)
    $byv = $g | Group-Object nval | ForEach-Object { [pscustomobject]@{ nval=$_.Name; hosts=@($_.Group.host | Select-Object -Unique).Count } }
    $ranked = @($byv | Sort-Object hosts -Descending)
    if ($ranked.Count -ge 1 -and $ranked[0].hosts -ge $min -and ($ranked.Count -eq 1 -or $ranked[0].hosts -gt $ranked[1].hosts)) { return $ranked[0].nval }
    return $null
  }
  'recency' = {
    param($g)
    # TryParse (invariant): free-text dates like 'FY2025' are SKIPPED, never abort the whole resolve;
    # invariant culture keeps multi-node reconcile from disagreeing by locale.
    $dated = @($g | ForEach-Object {
      $d = [datetime]::MinValue
      if ($_.asof -and [datetime]::TryParse([string]$_.asof, [System.Globalization.CultureInfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::None, [ref]$d)) {
        $_ | Add-Member -NotePropertyName _d -NotePropertyValue $d -PassThru -Force
      }
    })
    if ($dated.Count -lt 1) { return $null }
    $top = @($dated | Sort-Object _d -Descending)
    $maxd = $top[0]._d
    $atmax = @($top | Where-Object { $_._d -eq $maxd })
    $vals = @($atmax.nval | Select-Object -Unique)
    if ($vals.Count -eq 1) { return $vals[0] } else { return $null }
  }
}

# ---------- the derived resolved view (nothing deleted; losers flagged) ----------
function Resolve-Findings {
  param(
    [Parameter(Mandatory)][string[]]$Findings,[string[]]$Reasons='reasons.jsonl',   # glob/array -> read-global
    [string]$RulesPath='config/reconcile-rules.json',[string]$TiersPath='config/source-tiers.json'
  )
  $cfg=Get-Content $RulesPath -Raw -Encoding utf8|ConvertFrom-Json
  $tiers=Get-Tiers $TiersPath
  $reasonRows=Read-Jl $Reasons   # NOT $reasons: case-insensitive collision with param $Reasons corrupts the read
  $out=@()
  foreach ($grp in (Read-Jl $Findings | Group-Object { "$($_.entity)|$($_.field)" })) {
    $g=@($grp.Group | ForEach-Object {
      $_ | Add-Member rank (Get-SourceRank $_.source_key $tiers) -PassThru -Force |
           Add-Member nval (Get-NVal $_.value) -PassThru -Force |
           Add-Member host (Get-HostSeg $_.source_key) -PassThru -Force |
           Add-Member asof ($(if ($_.as_of) { $_.as_of } else { $_.date })) -PassThru -Force })
    $entity=$g[0].entity; $field=$g[0].field
    # authored override wins (latest matching reason)
    $ov=@($reasonRows | Where-Object { $_.entity -eq $entity -and $_.field -eq $field -and $_.mode -in @('override','keep-both') }) | Select-Object -Last 1
    if ($ov) {
      $accN=@($ov.accepted | ForEach-Object { Get-NVal $_.value })
      $acc=@($g | Where-Object { $accN -contains $_.nval })
      $rej=@($g | Where-Object { $accN -notcontains $_.nval } | ForEach-Object { $_ | Add-Member rejected_by "reason:$($ov.reason_type)" -PassThru -Force })
      $out += [pscustomobject]@{ entity=$entity; field=$field; mode=$ov.mode; deciding="reason:$($ov.reason_type)"; reason_text=$ov.text
        accepted=@($acc|Select entity,field,value,source_key,rank,status); rejected=@($rej|Select value,source_key,rank,status,rejected_by)
        contention=@($g.nval|Select -Unique).Count; sources=@($g.host|Select -Unique).Count }
      continue
    }
    # else run mechanical rules first-decisive
    $winner=$null; $decided=$null
    foreach ($rid in $cfg.order) {
      $rb=$script:Rules[$rid]; if (-not $rb) { continue }
      $w = if ($rid -eq 'corroboration') { & $rb $g $cfg.corroboration_min } else { & $rb $g }
      if ($w) { $winner=$w; $decided=$rid; break }
    }
    if ($winner) {
      $acc=@($g | Where-Object nval -eq $winner)
      $rej=@($g | Where-Object nval -ne $winner | ForEach-Object { $_ | Add-Member rejected_by "rule:$decided" -PassThru -Force })
      $out += [pscustomobject]@{ entity=$entity; field=$field; mode='rule'; deciding="rule:$decided"; reason_text=$null
        accepted=@($acc|Select entity,field,value,source_key,rank,status); rejected=@($rej|Select value,source_key,rank,status,rejected_by)
        contention=@($g.nval|Select -Unique).Count; sources=@($g.host|Select -Unique).Count }
    } else {
      $out += [pscustomobject]@{ entity=$entity; field=$field; mode='unresolved'; deciding=$null; reason_text=$null
        accepted=@(); rejected=@($g|Select value,source_key,rank,status); contention=@($g.nval|Select -Unique).Count; sources=@($g.host|Select -Unique).Count }
    }
  }
  return $out
}

# ---------- contention / distrust signal (rejected values are information) ----------
function Get-Contention {
  param([Parameter(Mandatory)]$Resolved)
  $contested=@($Resolved | Where-Object { $_.contention -gt 1 })
  $unresolved=@($Resolved | Where-Object mode -eq 'unresolved')
  # per-source: how often a source's value was the REJECTED one (distrust signal)
  $rej=@(); foreach ($r in $Resolved) { foreach ($x in $r.rejected) { $rej += $x.source_key } }
  $srcDistrust=@($rej | Group-Object | Sort-Object Count -Descending | Select-Object @{n='source';e={$_.Name}},Count)
  [pscustomobject]@{ contested=$contested.Count; unresolved=$unresolved.Count
    keep_both=@($Resolved|? mode -eq 'keep-both').Count; overrides=@($Resolved|? mode -eq 'override').Count
    most_rejected_sources=@($srcDistrust | Select-Object -First 5) }
}

# ---------- lint ----------
function Test-Reconcile {
  param([string]$Reasons='reasons.jsonl',$Resolved)
  $errs=@(); $warn=@()
  foreach ($r in (Read-Jl $Reasons)) {
    if (-not "$($r.reason_type)".Trim()) { $errs += "reason missing reason_type: $($r.entity)/$($r.field)" }
    if (-not "$($r.text)".Trim())        { $errs += "reason missing text (unexplained exception): $($r.entity)/$($r.field)" }
    if ($r.mode -in @('override','keep-both') -and -not @($r.accepted).Count) { $errs += "override with no accepted[]: $($r.entity)/$($r.field)" }
  }
  $notes=@(Read-Jl $Reasons | Where-Object reason_type -in @('other','note'))
  if ($Resolved) { $warn += "unresolved (need human/agent): $(@($Resolved|? mode -eq 'unresolved').Count)" }
  $warn += "vocab-growth backlog (other/note reasons to mine): $($notes.Count)"
  [pscustomobject]@{ errors=$errs; warnings=$warn }
}
