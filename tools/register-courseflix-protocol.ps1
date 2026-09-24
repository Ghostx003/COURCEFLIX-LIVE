<#
.SYNOPSIS
    Registers the courseflix:// Windows URL Protocol for the current user (No Admin required).
#>

$scriptPath = Join-Path $PSScriptRoot "courseflix-protocol-handler.ps1"
if (-not (Test-Path $scriptPath)) {
    Write-Error "Could not find $scriptPath"
    exit 1
}

$regKey = "HKCU:\Software\Classes\courseflix"
New-Item -Path $regKey -Force | Out-Null
Set-ItemProperty -Path $regKey -Name "(Default)" -Value "URL:CourseFlix Protocol"
Set-ItemProperty -Path $regKey -Name "URL Protocol" -Value ""

$cmdKey = "$regKey\shell\open\command"
New-Item -Path $cmdKey -Force | Out-Null

$commandValue = 'powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File "' + $scriptPath + '" "%1"'
Set-ItemProperty -Path $cmdKey -Name "(Default)" -Value $commandValue

Write-Host "Successfully registered courseflix:// protocol in Windows!" -ForegroundColor Green
Write-Host "Command: $commandValue"
