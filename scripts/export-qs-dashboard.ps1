<#
.SYNOPSIS
  Export an Amazon QuickSight dashboard as JSON.

.DESCRIPTION
  Resolves a dashboard by NAME (Hebrew-safe), then exports:
    Definition -> describe-dashboard-definition  (single JSON, the viz/sheet/calc-field spec)
    Bundle     -> start-asset-bundle-export-job  (async; zip w/ dashboard + datasets + datasources)
  Needs: aws cli v2, credentials w/ quicksight:ListDashboards,
         quicksight:DescribeDashboardDefinition (+ *AssetBundleExportJob for Bundle).

.EXAMPLE
  ./export-qs-dashboard.ps1 -Name 'QA_ספורט נשים'
  ./export-qs-dashboard.ps1 -Name 'QA_ספורט נשים' -Mode Both -Region il-central-1
#>
param(
  [string]$Name       = 'QA_ספורט נשים',
  [string]$DashboardId,                                   # skip name lookup if you know the id
  [ValidateSet('Definition','Bundle','Both')]
  [string]$Mode       = 'Definition',
  [string]$Region     = $(aws configure get region),
  [string]$Profile,
  [string]$AccountId,
  [string]$OutDir     = (Join-Path $PSScriptRoot '..\qs-export')
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8      # Hebrew in aws output
$OutputEncoding           = [Text.Encoding]::UTF8

$awsArgs = @()
if ($Region)  { $awsArgs += @('--region',  $Region) }
if ($Profile) { $awsArgs += @('--profile', $Profile) }

function Invoke-Aws {
  $raw = & aws @args @awsArgs --output json 2>&1
  if ($LASTEXITCODE -ne 0) { throw "aws $($args -join ' ') failed:`n$raw" }
  if ([string]::IsNullOrWhiteSpace($raw)) { return $null }
  ($raw -join "`n") | ConvertFrom-Json
}

function Save-Json($obj, $path) {
  $json = $obj | ConvertTo-Json -Depth 100
  [IO.File]::WriteAllText($path, $json, (New-Object Text.UTF8Encoding $false))
  Write-Host "  -> $path  ($([math]::Round((Get-Item $path).Length/1KB,1)) KB)"
}

# --- account -----------------------------------------------------------------
if (-not $AccountId) { $AccountId = (Invoke-Aws sts get-caller-identity).Account }
Write-Host "Account $AccountId | Region $Region"

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$OutDir = (Resolve-Path $OutDir).Path

# --- resolve dashboard id by name -------------------------------------------
if (-not $DashboardId) {
  Write-Host "Looking up dashboard: $Name"
  $all = @()
  $token = $null
  do {
    $p = if ($token) { Invoke-Aws quicksight list-dashboards --aws-account-id $AccountId --next-token $token }
         else        { Invoke-Aws quicksight list-dashboards --aws-account-id $AccountId }
    $all  += $p.DashboardSummaryList
    $token = $p.NextToken
  } while ($token)

  $hit = $all | Where-Object { $_.Name -eq $Name }
  if (-not $hit) { $hit = $all | Where-Object { $_.Name -like "*$Name*" } }
  if (-not $hit) {
    Write-Host "Not found. Available dashboards:" -ForegroundColor Yellow
    $all | Sort-Object Name | Format-Table Name, DashboardId -AutoSize
    throw "No dashboard matching '$Name'."
  }
  if ($hit.Count -gt 1) {
    $hit | Format-Table Name, DashboardId -AutoSize
    throw "Ambiguous name '$Name' — rerun with -DashboardId."
  }
  $DashboardId = $hit.DashboardId
  Write-Host "Matched '$($hit.Name)' -> $DashboardId"
}

$slug  = ($Name -replace '[\/:*?"<>|]', '_')
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'

# --- 1. definition JSON ------------------------------------------------------
if ($Mode -in 'Definition','Both') {
  Write-Host "`nExporting definition..."
  $def = Invoke-Aws quicksight describe-dashboard-definition `
           --aws-account-id $AccountId --dashboard-id $DashboardId
  Save-Json $def              (Join-Path $OutDir "$slug.full.json")        # + Name/Status/Errors
  Save-Json $def.Definition   (Join-Path $OutDir "$slug.definition.json")  # the spec itself
}

# --- 2. asset bundle (zip, reimportable) ------------------------------------
if ($Mode -in 'Bundle','Both') {
  Write-Host "`nStarting asset-bundle export job..."
  $jobId = "export-$slug-$stamp" -replace '[^A-Za-z0-9\-_]', '-'
  $arn   = "arn:aws:quicksight:${Region}:${AccountId}:dashboard/$DashboardId"

  Invoke-Aws quicksight start-asset-bundle-export-job `
    --aws-account-id $AccountId --asset-bundle-export-job-id $jobId `
    --resource-arns $arn --include-all-dependencies `
    --export-format QUICKSIGHT_JSON --include-permissions --include-tags | Out-Null

  do {
    Start-Sleep -Seconds 5
    $job = Invoke-Aws quicksight describe-asset-bundle-export-job `
             --aws-account-id $AccountId --asset-bundle-export-job-id $jobId
    Write-Host "  status: $($job.JobStatus)"
  } while ($job.JobStatus -in 'QUEUED_FOR_IMMEDIATE_EXECUTION','IN_PROGRESS')

  if ($job.JobStatus -ne 'SUCCESSFUL') { throw "Bundle job failed: $($job.Errors | ConvertTo-Json -Depth 5)" }

  $zip = Join-Path $OutDir "$slug.bundle.qs.zip"
  Invoke-WebRequest -Uri $job.DownloadUrl -OutFile $zip     # url expires in 5 min
  Write-Host "  -> $zip"
  Expand-Archive -Path $zip -DestinationPath (Join-Path $OutDir "$slug.bundle") -Force
  Write-Host "  unzipped -> $(Join-Path $OutDir "$slug.bundle")"
}

Write-Host "`nDone. $OutDir"
