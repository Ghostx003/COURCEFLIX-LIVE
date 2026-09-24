<#
.SYNOPSIS
    CourseFlix Windows Protocol Handler
.DESCRIPTION
    Invoked silently in the background by Windows when a courseflix:// link is triggered from
    CourseFlix web app (https://courceflix-live.vercel.app or localhost).
    Performs the requested action (File Explorer reveal or Recycle Bin delete) and exits immediately.
    Consumes zero persistent RAM/CPU resources.
#>

param(
    [string]$UriString
)

if (-not $UriString) {
    if ($args.Count -gt 0) {
        $UriString = $args[0]
    } else {
        exit 0
    }
}

try {
    Add-Type -AssemblyName Microsoft.VisualBasic
    Add-Type -AssemblyName System.Web

    # Clean URI string (Windows may pass it enclosed in quotes or with trailing slash)
    $cleanUri = $UriString.Trim('"').Trim("'").TrimEnd('/')
    $uri = [System.Uri]$cleanUri

    # Action is the host or first segment (e.g. courseflix://reveal?... -> host is 'reveal')
    $action = $uri.Host.ToLower()
    if (-not $action) {
        $action = $uri.AbsolutePath.Trim('/').ToLower()
    }

    $query = [System.Web.HttpUtility]::ParseQueryString($uri.Query)
    $fileName = $query["file"]
    $relPath = $query["path"]

    if (-not $fileName -and -not $relPath) {
        exit 0
    }

    # Search locations (prioritizing GATE LECTURES and root drives for lightning-fast matching)
    $searchLocations = @(
        "F:\GATE LECTURES",
        "F:\",
        "E:\projects",
        "E:\",
        "D:\",
        "C:\Users\$env:USERNAME\Videos",
        "C:\Users\$env:USERNAME\Downloads"
    )

    $targetFile = $null

    # 1. Try matching with relative path first if provided
    if ($relPath) {
        $normalizedRel = $relPath.Replace('/', '\')
        foreach ($loc in $searchLocations) {
            if (Test-Path $loc) {
                $candidate = Join-Path $loc $normalizedRel
                if (Test-Path $candidate) {
                    $targetFile = (Get-Item $candidate).FullName
                    break
                }
            }
        }
    }

    # 2. Fast search by filename if not found yet
    if (-not $targetFile -and $fileName) {
        foreach ($loc in $searchLocations) {
            if (Test-Path $loc) {
                # Fast search up to depth 4
                $found = Get-ChildItem -Path $loc -Filter "*$fileName*" -File -Recurse -Depth 4 -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($found) {
                    $targetFile = $found.FullName
                    break
                }
            }
        }
    }

    if (-not $targetFile -or -not (Test-Path $targetFile)) {
        exit 1
    }

    # Execute Action
    if ($action -eq "reveal" -or $action -eq "open-location") {
        # Reveal and select in Windows File Explorer
        Start-Process "explorer.exe" -ArgumentList "/select,`"$targetFile`""
    }
    elseif ($action -eq "recycle" -or $action -eq "delete") {
        # Send safely to Windows Recycle Bin
        [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile(
            $targetFile,
            [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,
            [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin
        )
    }
    elseif ($action -eq "share" -or $action -eq "quickshare") {
        # Trigger native Windows Send with Quick Share
        $shared = $false
        try {
            $parentDir = Split-Path -Path $targetFile -Parent
            $leaf = Split-Path -Path $targetFile -Leaf
            $shell = New-Object -ComObject Shell.Application
            $folderObj = $shell.Namespace($parentDir)
            if ($folderObj) {
                $itemObj = $folderObj.ParseName($leaf)
                if ($itemObj) {
                    $verb = $itemObj.Verbs() | Where-Object { ($_.Name -replace '&','') -match 'Quick Share' }
                    if ($verb) {
                        $verb.DoIt()
                        $shared = $true
                    }
                }
            }
        } catch {}

        # Fallback: Launch Google NearbyShare executable with target file directly
        if (-not $shared) {
            $quickShareExes = @(
                "C:\Program Files\Google\NearbyShare\nearby_share.exe",
                "C:\Program Files\Google\NearbyShare\nearby_share_launcher.exe"
            )
            foreach ($exe in $quickShareExes) {
                if (Test-Path $exe) {
                    Start-Process $exe -ArgumentList "`"$targetFile`""
                    $shared = $true
                    break
                }
            }
        }
    }
}
catch {
    # Fail silently to avoid popups
}
exit 0
