# GOLDEN TIER 2 — LIVE known-answer assertion for the durability layer.
# Runs AFTER a live wf-discover swarm over known-answer targets. Proves the whole loop end-to-end:
# right findings surfaced (#accept), right rejections documented in coverage 'why' (#2), and
# durability captured (#3 .part valid + #1 STATE derived). Not free — consumes a live run's output.
#
# Usage (after the swarm completes):
#   pwsh -NoProfile -File tools/test-golden-t2.ps1 `
#       -ResultPath <result.json> -WorkflowDir <wf_...dir> -PartsDir <agents dir> -Work <work dir>
# ResultPath = the workflow's {run,coverage,findings,suggest} JSON (saved from the task output).
param(
  [Parameter(Mandatory)][string]$ResultPath,
  [Parameter(Mandatory)][string]$WorkflowDir,
  [Parameter(Mandatory)][string]$PartsDir,
  [Parameter(Mandatory)][string]$Work,
  [string[]]$Targets = @('datagovil-geo-sport','govmap-israel-gis','osm-overpass-sport')
)
$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. "$here\swarm-lib.ps1" ; . "$here\harvest-lib.ps1"
$fail = 0
function Check($name,$cond){ if($cond){Write-Host "  PASS  $name" -f Green}else{Write-Host "  FAIL  $name" -f Red;$script:fail++} }
function Info($name,$val){ Write-Host "  INFO  $name : $val" -f Cyan }

$cov = Join-Path $Work 'coverage.jsonl'
$fnd = Join-Path $Work 'findings.jsonl'
$prov = Join-Path $Work 'provenance.jsonl'
$state = Join-Path $Work 'STATE.md'

Write-Host "`n== TIER 2: LIVE known-answer swarm ==" -f Cyan
$R = Get-Content -LiteralPath $ResultPath -Raw -Encoding utf8 | ConvertFrom-Json
$retCov = @($R.coverage).Count ; $retFnd = @($R.findings).Count
Info "workflow returned" "coverage=$retCov findings=$retFnd suggest=$(@($R.suggest).Count)"

# ---- #3 durability: each target wrote a valid, non-empty .part during the run (incremental capture) ----
foreach ($k in $Targets) {
  $pf = Join-Path $PartsDir "$k.part"
  if (Test-Path $pf) {
    $p = Read-PartFile -Path $pf
    Check ".part '$k' exists, 0 malformed lines" ($p.bad -eq 0)
    Check ".part '$k' captured >=1 coverage/finding row" (($p.coverage.Count + $p.findings.Count) -ge 1)
  } else {
    Check ".part '$k' exists" $false
  }
}

# ---- Complete-Round: merge (return-primary + salvage) -> provenance -> STATE (#1) ----
Complete-Round -Result $R -WorkflowDir $WorkflowDir -Coverage $cov -Findings $fnd `
  -Provenance $prov -StateOut $state -PartsDir $PartsDir -AllWorkflowDirs @($WorkflowDir)

$covRows = Read-Jsonl $cov ; $fndRows = Read-Jsonl $fnd
Check "coverage merged (>0 rows)" (@($covRows).Count -gt 0)
Check "findings merged (>0 rows)" (@($fndRows).Count -gt 0)
Check "STATE.md derived" (Test-Path $state)

# no-double-count: with no drops, merged coverage == returned coverage (return preferred, .part not re-added)
$drops = Read-DropReport -Journal (Join-Path $WorkflowDir 'journal.jsonl') -TranscriptDir $WorkflowDir
Info "journal drops (started, no result)" (@($drops).Count)
if (@($drops).Count -eq 0) {
  Check "no drops -> merged coverage == returned (no .part double-count)" (@($covRows).Count -eq $retCov)
}

# ---- #accept: the spatial lens actually surfaced a spatial source ----
$spatial = @($fndRows | Where-Object { $_.field -eq 'spatial' -and $_.value -and ($_.value -notmatch '^\s*none\s*$') })
Check "ACCEPT: >=1 finding with real spatial capability (field=spatial, value!=none)" ($spatial.Count -ge 1)

# data.gov.il sports-facility dataset is a KNOWN accept (official, coordinates, free)
$dgAgent = @($fndRows | Where-Object { $_.agent -eq 'datagovil-geo-sport' })
Check "ACCEPT: data.gov.il agent produced findings" ($dgAgent.Count -ge 1)
$dgSpatialOrData = @($dgAgent | Where-Object { "$($_.value) $($_.entity)" -match 'data\.gov\.il|CKAN|GeoJSON|ITM|קואורדינ|מתקני ספורט|coordinate' })
Info "data.gov.il findings mentioning dataset/geo" $dgSpatialOrData.Count

# ---- #2 documentation: rejections captured with a terse 'why' in coverage ----
$why = @($covRows | Where-Object { $_.why -and "$($_.why)".Trim() })
Check "#2: >=1 coverage row carries a 'why' (live decision documentation)" ($why.Count -ge 1)
$rejected = @($covRows | Where-Object { $_.status -in @('dead','blocked','partial') -and $_.why })
Info "documented rejections (dead/blocked/partial + why)" $rejected.Count
foreach ($r in ($rejected | Select-Object -First 8)) { Info "  reject" "[$($r.status)] $($r.key) -- $($r.why)" }

# Nominatim bulk-geocoding is a KNOWN reject (1 req/s, blocks datacenter IPs). Surfaced somewhere?
$nom = @(($covRows + $fndRows) | Where-Object { "$($_.key) $($_.why) $($_.value) $($_.entity) $($_.note)" -match '(?i)nominatim' })
if ($nom.Count -gt 0) {
  $nomLimited = @($nom | Where-Object { "$($_.why) $($_.value) $($_.note)" -match '(?i)rate|1 ?req|per second|bulk|limit|datacenter|block|throttl' })
  Check "REJECT known-answer: Nominatim surfaced WITH a rate-limit/bulk caveat" ($nomLimited.Count -ge 1)
} else {
  Info "Nominatim" "not surfaced by osm agent this run (soft — inspect if unexpected)"
}

Write-Host "`n$([string]::new('=',40))"
if ($fail -eq 0) { Write-Host "TIER 2 ALL PASS" -f Green } else { Write-Host "TIER 2: $fail FAILED" -f Red }
exit $fail
