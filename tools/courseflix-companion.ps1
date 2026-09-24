<#
.SYNOPSIS
    CourseFlix Standalone Windows Companion Daemon
.DESCRIPTION
    A lightweight, zero-dependency local bridge for CourseFlix.
    Enables native Windows OS actions (revealing files in Windows File Explorer
    and safely moving files to the Windows Recycle Bin) without requiring any
    modifications to your CourseFlix web application codebase.
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\courseflix-companion.ps1
#>

Add-Type -AssemblyName Microsoft.VisualBasic
Add-Type -AssemblyName System.Web

$port = 59123
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$port/")

try {
    $listener.Start()
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "   CourseFlix Windows Companion Bridge is ACTIVE" -ForegroundColor Cyan
    Write-Host "   Listening on: http://127.0.0.1:$port/" -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "Capabilities:"
    Write-Host "  [+] Reveal file in Windows File Explorer (explorer.exe /select)"
    Write-Host "  [+] Safely delete files into Windows Recycle Bin"
    Write-Host "Press Ctrl+C to stop.`n"
} catch {
    Write-Error "Failed to start listener on port $port: $_"
    exit 1
}

function Send-Response($context, $statusCode, $body, $contentType = "application/json") {
    $response = $context.Response
    $response.StatusCode = $statusCode
    $response.ContentType = $contentType
    $response.Headers.Add("Access-Control-Allow-Origin", "*")
    $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    $response.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

    $buffer = [System.Text.Encoding]::UTF8.GetBytes($body)
    $response.ContentLength64 = $buffer.Length
    $response.OutputStream.Write($buffer, 0, $buffer.Length)
    $response.OutputStream.Close()
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request

        if ($request.HttpMethod -eq "OPTIONS") {
            Send-Response $context 200 "" "text/plain"
            continue
        }

        $rawUrl = $request.RawUrl
        $uri = [System.Uri]("http://127.0.0.1:$port$rawUrl")
        $query = [System.Web.HttpUtility]::ParseQueryString($uri.Query)
        $action = $uri.AbsolutePath.TrimStart("/").ToLower()

        if ($action -eq "status" -or $action -eq "") {
            $json = '{"status":"active","companion":"CourseFlix Windows Bridge","version":"1.0"}'
            Send-Response $context 200 $json
            continue
        }

        $fileName = $query["file"]
        $folder = $query["folder"]
        $path = $query["path"]

        # 1. Open File Location in File Explorer
        if ($action -eq "reveal" -or $action -eq "open-location") {
            $targetPath = $null

            if ($path -and (Test-Path $path)) {
                $targetPath = $path
            } elseif ($fileName) {
                # Search common course drives for the file
                $searchRoots = @("E:\", "D:\", "C:\Courses", "$env:USERPROFILE\Videos")
                foreach ($root in $searchRoots) {
                    if (Test-Path $root) {
                        $found = Get-ChildItem -Path $root -Filter $fileName -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
                        if ($found) {
                            $targetPath = $found.FullName
                            break
                        }
                    }
                }
            }

            if ($targetPath -and (Test-Path $targetPath)) {
                Start-Process "explorer.exe" -ArgumentList "/select,`"$targetPath`""
                Write-Host "[+] Revealed in Explorer: $targetPath" -ForegroundColor Green
                Send-Response $context 200 ('{"success":true,"message":"Opened in File Explorer","path":"' + ($targetPath -replace '\\', '\\') + '"}')
            } else {
                Write-Warning "[-] File not found on disk: $fileName"
                Send-Response $context 404 '{"success":false,"error":"File not found on local disk"}'
            }
            continue
        }

        # 2. Delete to Windows Recycle Bin
        if ($action -eq "recycle" -or $action -eq "delete") {
            $targetPath = $null
            if ($path -and (Test-Path $path)) {
                $targetPath = $path
            } elseif ($fileName) {
                $searchRoots = @("E:\", "D:\", "C:\Courses", "$env:USERPROFILE\Videos")
                foreach ($root in $searchRoots) {
                    if (Test-Path $root) {
                        $found = Get-ChildItem -Path $root -Filter $fileName -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
                        if ($found) {
                            $targetPath = $found.FullName
                            break
                        }
                    }
                }
            }

            if ($targetPath -and (Test-Path $targetPath)) {
                [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile(
                    $targetPath,
                    [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,
                    [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin
                )
                Write-Host "[+] Moved to Recycle Bin: $targetPath" -ForegroundColor Yellow
                Send-Response $context 200 ('{"success":true,"message":"Moved to Windows Recycle Bin","path":"' + ($targetPath -replace '\\', '\\') + '"}')
            } else {
                Write-Warning "[-] File to recycle not found: $fileName"
                Send-Response $context 404 '{"success":false,"error":"File not found"}'
            }
            continue
        }

        Send-Response $context 400 '{"error":"Unknown action"}'
    } catch {
        Write-Host "Error handling request: $_" -ForegroundColor Red
    }
}
