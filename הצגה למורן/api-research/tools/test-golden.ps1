# GOLDEN known-answer test for the research-swarm durability layer.
# Run:  pwsh -NoProfile -File tools/test-golden.ps1
#
# TIER 1 (this file) = DETERMINISTIC, no LLM, fast/free. Fixture = data_climate's REAL 43-run
# ledgers (a more-mature swarm deployment). Asserts harvest-lib/swarm-lib produce the KNOWN
# answers AND tolerate that project's schema variance (status:"live", no entity/why fields).
# TIER 2 (live known-answer Moran swarm) is separate — see HANDOFF, not automated here.
#
# ANCHORS, not laws: the counts below were computed 2026-07-15 against the current StatusRank
# ({pending=0;partial=1;blocked=2;dead=3;mined=4}, unknown->0). If StatusRank or the fixture
# changes, RECOMPUTE and update the anchors — a diff here means behavior moved, decide if intended.
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. "$here\swarm-lib.ps1" ; . "$here\harvest-lib.ps1"
$fail = 0
function Check($name,$cond){ if($cond){Write-Host "  PASS  $name" -f Green}else{Write-Host "  FAIL  $name" -f Red;$script:fail++} }

# ---- fixture (data_climate — the most-evolved research-swarm instance) ----
$DC   = 'C:\Users\or.bar\Desktop\data_climate'
$dcCov = Join-Path $DC 'coverage.jsonl'
$dcFnd = Join-Path $DC 'findings.jsonl'

# ---- known answers (anchors) ----
$A = @{
  covRows          = 5750     # total coverage rows
  distinctKeys     = 4597     # distinct keys, CASE-SENSITIVE (matches Get-CanonUrl: host lowercased, path case kept)
  offLimits        = 3605     # Read-DoNotSearch OffLimits (mined|dead|blocked win)
  revisit          =  992     # Read-DoNotSearch Revisit (pending|partial|unknown-status incl. "live")
  fndRows          = 3085
  distinctEntities =    0     # this project uses front+stakeholder, NOT entity -> Write-State must not crash
  status = @{ mined=3790; pending=773; partial=418; dead=393; blocked=318; live=58 }
}
# INVARIANT (post case-fix 2026-07-15): off+revisit == distinctKeys. The dedup is now case-SENSITIVE
# (ordinal), consistent with canonical keys. Before the fix a case-INsensitive hashtable collapsed 13
# path-case-variant keys -> 4584, silently marking a not-yet-mined variant off-limits. If this drops
# back below distinctKeys, the case bug regressed.
$A.dnsSum = $A.distinctKeys   # 4597 — every distinct key lands in exactly one of off/revisit

if (-not (Test-Path $dcCov)) {
  Write-Host "`n  SKIP  Tier 1 — data_climate fixture absent ($dcCov)" -f Yellow
  Write-Host "`n$([string]::new('=',40))`nSKIPPED (no fixture)"; exit 0
}

Write-Host "`n== TIER 1: DETERMINISTIC (data_climate real ledgers) ==" -f Cyan

# -- Read-DoNotSearch known answers --
$rows = Read-Jsonl $dcCov
Check "coverage row count = $($A.covRows)" (@($rows).Count -eq $A.covRows)

$distinct = (New-Object System.Collections.Generic.HashSet[string]([System.StringComparer]::Ordinal))
foreach ($r in $rows) { [void]$distinct.Add([string]$r.key) }
Check "distinct keys (case-sensitive) = $($A.distinctKeys)" ($distinct.Count -eq $A.distinctKeys)

$dns = Read-DoNotSearch -Coverage $dcCov
$off = @($dns.OffLimits).Count ; $rev = $dns.Revisit.Keys.Count
Check "Read-DoNotSearch OffLimits = $($A.offLimits)" ($off -eq $A.offLimits)
Check "Read-DoNotSearch Revisit   = $($A.revisit)"   ($rev -eq $A.revisit)
Check "off+revisit = $($A.dnsSum) = distinct keys (case-sensitive dedup invariant)" (($off+$rev) -eq $A.dnsSum)

# -- status distribution (schema tolerance: "live" is NOT in the enum) --
$byStatus = @{}; $rows | Group-Object status | ForEach-Object { $byStatus[$_.Name] = $_.Count }
foreach ($s in $A.status.Keys) { Check "status '$s' rows = $($A.status[$s])" ($byStatus[$s] -eq $A.status[$s]) }
Check "'live' status is unmodeled (ranks 0 -> revisit, not off-limits)" ($null -eq $script:StatusRank['live'])

# -- Write-State: must NOT crash on schema variance (no entity, no why, extra keys parent/date/targets) --
$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ('gt-' + [guid]::NewGuid().ToString('N').Substring(0,8) + '.md')
try {
  Write-State -Coverage $dcCov -Findings $dcFnd -Out $tmp
  $st = Get-Content $tmp -Raw
  Check "Write-State emitted a STATE file" (Test-Path $tmp)
  Check "STATE header present" ($st -match 'SWARM STATE')
  Check "STATE coverage rows = $($A.covRows)" ($st -match "coverage rows: $($A.covRows)")
  Check "STATE off-limits = $($A.offLimits)" ($st -match "off-limits keys: $($A.offLimits)")
  Check "STATE revisit = $($A.revisit)" ($st -match "revisit\(partial/pending\): $($A.revisit)")
  Check "STATE findings = $($A.fndRows)" ($st -match "findings: $($A.fndRows)")
  Check "no-entity project -> distinct entities = 0 (no crash)" ($st -match "distinct entities: $($A.distinctEntities)")
  Check "no-why project -> decisions digest degrades gracefully" ($st -match 'none recorded')
} finally { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }

Write-Host "`n$([string]::new('=',40))"
if ($fail -eq 0) { Write-Host "ALL PASS" -f Green } else { Write-Host "$fail FAILED" -f Red }
exit $fail
