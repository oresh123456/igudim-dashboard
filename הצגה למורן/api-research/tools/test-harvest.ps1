# Self-test for harvest-lib. Run:  pwsh -NoProfile -File tools/test-harvest.ps1
# Synthetic fixtures for merge/salvage/diff/part + REAL-data validation of drop/provenance/state.
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. "$here\swarm-lib.ps1" ; . "$here\harvest-lib.ps1"
$fail = 0
function Check($name,$cond){ if($cond){Write-Host "  PASS  $name" -f Green}else{Write-Host "  FAIL  $name" -f Red;$script:fail++} }

$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("harvest-test-" + [guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$parts = Join-Path $tmp 'agents'; New-Item -ItemType Directory -Force -Path $parts | Out-Null
$cov = Join-Path $tmp 'coverage.jsonl'; $fnd = Join-Path $tmp 'findings.jsonl'
$prov = Join-Path $tmp 'provenance.jsonl'
try {
  Write-Host "`n== SYNTHETIC ==" -f Cyan

  # .part fixtures: alpha COMPLETED (has return); beta DROPPED (only a .part)
  @(
    '{"_t":"coverage","key":"beta-src-1","status":"mined","area":"beta","why":""}'
    '{"_t":"finding","entity":"BetaAPI","field":"access","value":"https://beta/api","source_key":"beta-src-1"}'
    '{"_t":"note","text":"rejected beta-src-2: 404"}'
  ) | Set-Content -LiteralPath (Join-Path $parts 'beta.part') -Encoding utf8
  @(
    '{"_t":"coverage","key":"alpha-stale","status":"mined"}'   # should be IGNORED (alpha returned)
  ) | Set-Content -LiteralPath (Join-Path $parts 'alpha.part') -Encoding utf8

  # Read-PartFile
  $p = Read-PartFile -Path (Join-Path $parts 'beta.part')
  Check "Read-PartFile buckets" (($p.coverage.Count -eq 1) -and ($p.findings.Count -eq 1) -and ($p.notes.Count -eq 1))
  Check "Read-PartFile strips _t" (-not ($p.findings[0].PSObject.Properties.Name -contains '_t'))

  # Merge-Round: alpha via return, beta salvaged from .part, alpha.part ignored (no double-count)
  $result = [pscustomobject]@{ run='t1'
    coverage=@([pscustomobject]@{key='alpha-src';status='mined';agent='alpha'})
    findings=@([pscustomobject]@{entity='AlphaAPI';field='access';value='https://alpha/api';source_key='alpha-src';agent='alpha'}) }
  $m = Merge-Round -Result $result -Coverage $cov -Findings $fnd -PartsDir $parts -Run 't1'
  Check "Merge salvaged exactly 1 (beta)" ($m.salvaged -eq 1)
  $covRows = Read-Jsonl $cov
  Check "coverage has alpha return" (@($covRows | ? { $_.agent -eq 'alpha' }).Count -ge 1)
  Check "coverage has beta salvaged" (@($covRows | ? { $_.agent -eq 'beta' -and $_.salvaged }).Count -eq 1)
  Check "alpha.part NOT double-counted" (@($covRows | ? { $_.key -eq 'alpha-stale' }).Count -eq 0)
  $fndRows = Read-Jsonl $fnd
  Check "findings has both alpha+beta" (@($fndRows).Count -eq 2)

  # Merge-Round idempotency (re-run same run id -> same counts, no growth)
  $m2 = Merge-Round -Result $result -Coverage $cov -Findings $fnd -PartsDir $parts -Run 't1'
  Check "Merge idempotent (coverage)" ((Read-Jsonl $cov).Count -eq $covRows.Count)

  # Get-UnreportedFetches: provenance ok-fetch with no coverage key = flagged; reported/errored = not
  @(
    '{"run":"t1","agent":"beta","seq":1,"tool":"WebFetch","target":"beta-src-1","status":"ok"}'      # reported (in coverage)
    '{"run":"t1","agent":"beta","seq":2,"tool":"WebFetch","target":"ghost-src","status":"ok"}'        # NOT reported -> flag
    '{"run":"t1","agent":"beta","seq":3,"tool":"WebFetch","target":"dead-src","status":"dead"}'       # errored -> ignore
  ) | Set-Content -LiteralPath $prov -Encoding utf8
  # make beta-src-1 appear as a coverage key so it counts as reported
  Add-Jsonl -Path $cov -Rows @([pscustomobject]@{key='beta-src-1';status='mined';run='t1';agent='beta'})
  $unrep = Get-UnreportedFetches -Provenance $prov -Coverage $cov -Run 't1'
  Check "UnreportedFetches finds ghost only" ((@($unrep).Count -eq 1) -and ($unrep[0].target -eq 'ghost-src'))

  # Write-State smoke (no crash, file has key sections)
  Write-State -Coverage $cov -Findings $fnd -Out (Join-Path $tmp 'STATE.md') -Provenance $prov
  $state = Get-Content (Join-Path $tmp 'STATE.md') -Raw
  Check "STATE has header" ($state -match 'SWARM STATE')
  Check "STATE reports unreported queue" ($state -match 'UNREPORTED fetches')

  # == REAL DATA (if the run dir is present) ==
  Write-Host "`n== REAL DATA ==" -f Cyan
  $wf = "C:\Users\or.bar\.claude\projects\C--Users-or-bar-Desktop-igudim-DB-----------\7d812bac-c56b-4f6a-8aba-a64dbfa0b8c5\subagents\workflows\wf_b2fff1e9-f62"
  if (Test-Path (Join-Path $wf 'journal.jsonl')) {
    $drops = Read-DropReport -Journal (Join-Path $wf 'journal.jsonl') -TranscriptDir $wf
    Check "real drop report = 3" (@($drops).Count -eq 3)
    Check "real drops carry readable label" (@($drops | ? { $_.label }).Count -eq 3)
    $pv = Export-Provenance -TranscriptDir $wf -Run 'real' -Out (Join-Path $tmp 'prov.real.jsonl')
    Check "real provenance > 300 rows" (@($pv).Count -gt 300)
    Check "real provenance has ok+blocked+ratelimited" ((@($pv|? status -eq 'ok').Count -gt 0) -and (@($pv|? status -eq 'blocked').Count -gt 0) -and (@($pv|? status -eq 'ratelimited').Count -gt 0))
    Check "real provenance agent = readable label" (@($pv | ? { $_.agent -match 'data.gov.il|Google|GovMap|OpenStreetMap' }).Count -gt 0)
  } else { Write-Host "  SKIP  real-data (run dir absent)" -f Yellow }
}
finally { Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue }

Write-Host "`n$([string]::new('=',40))"
if ($fail -eq 0) { Write-Host "ALL PASS" -f Green } else { Write-Host "$fail FAILED" -f Red }
exit $fail
