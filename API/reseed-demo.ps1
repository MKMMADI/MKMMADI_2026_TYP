[CmdletBinding()]
param(
  [string]$Region = "af-south-1",
  [string]$Cluster = "conference-bookings-cluster",
  [string]$Service = "conference-bookings-api-service-msyuyg8d",
  [string]$TaskDefinitionFamily = "conference-bookings-api",
  [string]$SeedImageTag = "demo-seed-20261011",
  [int]$PollIntervalSeconds = 10,
  [int]$TimeoutMinutes = 15
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$expectedAccount = "764678966746"
$containerName = "api"
$seedCommand = "node dist-seed/prisma/seed.js"

function Invoke-AwsJson {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)

  $output = & aws @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "AWS CLI command failed: aws $($Arguments -join ' ')"
  }

  $json = $output -join [Environment]::NewLine
  if ([string]::IsNullOrWhiteSpace($json)) {
    throw "AWS CLI returned no JSON for: aws $($Arguments -join ' ')"
  }

  return ($json | ConvertFrom-Json)
}

function Invoke-AwsText {
  param([Parameter(Mandatory = $true)][string[]]$Arguments)

  $output = & aws @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "AWS CLI command failed: aws $($Arguments -join ' ')"
  }
  return ($output -join [Environment]::NewLine).Trim()
}

if ($PollIntervalSeconds -lt 1 -or $TimeoutMinutes -lt 1) {
  throw "PollIntervalSeconds and TimeoutMinutes must be positive."
}

$identity = Invoke-AwsJson @(
  "sts", "get-caller-identity",
  "--query", "{Account:Account,Arn:Arn}",
  "--output", "json"
)
if ($identity.Account -ne $expectedAccount) {
  throw "Wrong AWS account. Expected $expectedAccount, got $($identity.Account). No seed task was started."
}

$serviceDetails = Invoke-AwsJson @(
  "ecs", "describe-services",
  "--cluster", $Cluster,
  "--services", $Service,
  "--region", $Region,
  "--query", "services[0]",
  "--output", "json"
)
if (-not $serviceDetails -or $serviceDetails.status -ne "ACTIVE") {
  throw "ECS service '$Service' was not found or is not ACTIVE. No seed task was started."
}

$network = $serviceDetails.networkConfiguration.awsvpcConfiguration
if (-not $network -or $network.subnets.Count -lt 1 -or $network.securityGroups.Count -lt 1) {
  throw "The ECS service has no usable awsvpc networking configuration. No seed task was started."
}

$taskDefinitionArns = Invoke-AwsJson @(
  "ecs", "list-task-definitions",
  "--family-prefix", $TaskDefinitionFamily,
  "--status", "ACTIVE",
  "--sort", "DESC",
  "--region", $Region,
  "--output", "json"
)

$seedTaskDefinition = $null
$expectedImageSuffix = "/mkmmadi-api:$SeedImageTag"
foreach ($taskDefinitionArn in $taskDefinitionArns) {
  $candidate = Invoke-AwsJson @(
    "ecs", "describe-task-definition",
    "--task-definition", $taskDefinitionArn,
    "--region", $Region,
    "--query", "taskDefinition",
    "--output", "json"
  )

  $container = $candidate.containerDefinitions |
    Where-Object { $_.name -eq $containerName } |
    Select-Object -First 1
  if (-not $container) { continue }
  if (-not $container.image.EndsWith($expectedImageSuffix, [StringComparison]::Ordinal)) { continue }
  if (($container.command -join " ") -ne $seedCommand) { continue }

  $hasDatabaseSecret = @($container.secrets | Where-Object { $_.name -eq "DATABASE_URL" }).Count -gt 0
  if (-not $hasDatabaseSecret) { continue }
  if (-not $container.logConfiguration -or $container.logConfiguration.logDriver -ne "awslogs") { continue }

  $seedTaskDefinition = $candidate
  break
}

if (-not $seedTaskDefinition) {
  throw "No ACTIVE '$TaskDefinitionFamily' task definition was found with image '$expectedImageSuffix', command '$seedCommand', DATABASE_URL secret, and CloudWatch logging. No seed task was started."
}

$logOptions = $seedTaskDefinition.containerDefinitions |
  Where-Object { $_.name -eq $containerName } |
  Select-Object -ExpandProperty logConfiguration |
  Select-Object -ExpandProperty options
$logGroup = $logOptions."awslogs-group"
$logStreamPrefix = $logOptions."awslogs-stream-prefix"
if (-not $logGroup -or -not $logStreamPrefix) {
  throw "Seed task definition is missing its CloudWatch log group or stream prefix. No seed task was started."
}

Write-Host ""
Write-Host "WARNING: This will run the production seed script against the RDS database."
Write-Host "The script deletes existing application data before inserting demo users, rooms, bookings, and reports."
Write-Host "AWS account: $($identity.Account)"
Write-Host "Region: $Region"
Write-Host "Cluster/service: $Cluster / $Service"
Write-Host "Seed task definition: $($seedTaskDefinition.taskDefinitionArn)"
Write-Host ""
$confirmation = Read-Host "Type RESEED DEMO DATABASE to continue"
if ($confirmation -cne "RESEED DEMO DATABASE") {
  Write-Host "Cancelled. No task was started and the database was not changed."
  exit 0
}

$networkConfiguration = @{
  awsvpcConfiguration = @{
    subnets = @($network.subnets)
    securityGroups = @($network.securityGroups)
    assignPublicIp = $network.assignPublicIp
  }
} | ConvertTo-Json -Depth 8

$networkFile = Join-Path $env:TEMP ("ecs-reseed-network-" + [guid]::NewGuid().ToString("N") + ".json")
try {
  [System.IO.File]::WriteAllText(
    $networkFile,
    $networkConfiguration,
    (New-Object System.Text.UTF8Encoding($false))
  )

  $runResult = Invoke-AwsJson @(
    "ecs", "run-task",
    "--cluster", $Cluster,
    "--task-definition", $seedTaskDefinition.taskDefinitionArn,
    "--launch-type", "FARGATE",
    "--network-configuration", "file://$networkFile",
    "--count", "1",
    "--started-by", "demo-reseed-script",
    "--region", $Region,
    "--output", "json"
  )
}
finally {
  if (Test-Path -LiteralPath $networkFile) {
    Remove-Item -LiteralPath $networkFile -Force
  }
}

if (-not $runResult.tasks -or $runResult.tasks.Count -ne 1) {
  $failureReasons = @($runResult.failures | ForEach-Object { $_.reason }) -join "; "
  throw "ECS did not start the seed task. $failureReasons"
}

$taskArn = $runResult.tasks[0].taskArn
$taskId = ($taskArn -split "/")[-1]
Write-Host "Started seed task $taskId. Waiting for it to finish..."

$deadline = (Get-Date).AddMinutes($TimeoutMinutes)
$taskStatus = $null
while ((Get-Date) -lt $deadline) {
  $taskStatus = Invoke-AwsJson @(
    "ecs", "describe-tasks",
    "--cluster", $Cluster,
    "--tasks", $taskArn,
    "--region", $Region,
    "--query", "tasks[0]",
    "--output", "json"
  )

  if (-not $taskStatus) {
    throw "Could not retrieve seed task status for $taskId."
  }
  if ($taskStatus.lastStatus -eq "STOPPED") { break }
  Start-Sleep -Seconds $PollIntervalSeconds
}

if (-not $taskStatus -or $taskStatus.lastStatus -ne "STOPPED") {
  throw "Seed task $taskId has not stopped after $TimeoutMinutes minutes. It was not stopped automatically; inspect it in ECS before taking further action."
}

$containerStatus = $taskStatus.containers |
  Where-Object { $_.name -eq $containerName } |
  Select-Object -First 1
if (-not $containerStatus -or $containerStatus.exitCode -ne 0) {
  $exitCode = if ($containerStatus) { $containerStatus.exitCode } else { "unknown" }
  throw "Seed task failed (exit code $exitCode). ECS stopped reason: $($taskStatus.stoppedReason). Check CloudWatch log group '$logGroup', stream '$logStreamPrefix/$containerName/$taskId'."
}

$logStream = "$logStreamPrefix/$containerName/$taskId"
$completionFound = $false
$logEvents = @()
for ($attempt = 0; $attempt -lt 6; $attempt++) {
  try {
    $logResult = Invoke-AwsJson @(
      "logs", "get-log-events",
      "--log-group-name", $logGroup,
      "--log-stream-name", $logStream,
      "--limit", "100",
      "--region", $Region,
      "--output", "json"
    )
    $logEvents = @($logResult.events | ForEach-Object { $_.message })
    if (($logEvents -join "`n") -match "Seed complete\.") {
      $completionFound = $true
      break
    }
  }
  catch {
    if ($attempt -eq 5) { throw }
  }
  Start-Sleep -Seconds 5
}

if (-not $completionFound) {
  throw "The task exited with code 0, but the 'Seed complete.' log marker was not found. Verify CloudWatch stream '$logStream' before assuming the database was seeded."
}

Write-Host ""
Write-Host "SUCCESS: the production demo database seed completed."
Write-Host "Task: $taskId (exit code 0; completion marker verified)"
$summary = $logEvents | Where-Object { $_ -match "Rooms:|Bookings:|Consumables:" }
if ($summary) {
  Write-Host ($summary -replace "Demo logins.*", "")
}
Write-Host "The seed's demo password is intentionally not printed by this script; see API/prisma/seed.ts."
