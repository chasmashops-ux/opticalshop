<#
    Tests the deployed opticalshop Worker API.
    Works on Windows PowerShell 5.1 and PowerShell 7+.

    Usage:
        powershell -ExecutionPolicy Bypass -File scripts/test-auth-api.ps1
        powershell -ExecutionPolicy Bypass -File scripts/test-auth-api.ps1 -Username admin -Password secret

    Passing -Username/-Password also runs the authenticated tests
    (search user / add user / year-wise stats). The password is only sent to
    the Worker over HTTPS; it is never printed or written to a file.
#>
param(
    [string]$Base = 'https://opticalshop.chasmashops.workers.dev',
    [string]$Username,
    [string]$Password
)

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$script:pass = 0
$script:fail = 0

function Invoke-Api {
    param([string]$Path, [string]$Method = 'GET', $Body, [string]$Token)

    $request = [System.Net.HttpWebRequest]::Create("$Base$Path")
    $request.Method = $Method
    $request.Accept = 'application/json'
    if ($Token) { $request.Headers.Add('Authorization', "Bearer $Token") }

    if ($Body) {
        $json = $Body | ConvertTo-Json -Compress
        $bytes = [Text.Encoding]::UTF8.GetBytes($json)
        $request.ContentType = 'application/json'
        $request.ContentLength = $bytes.Length
        $stream = $request.GetRequestStream()
        $stream.Write($bytes, 0, $bytes.Length)
        $stream.Close()
    }

    try {
        $response = $request.GetResponse()
    } catch [System.Net.WebException] {
        if (-not $_.Exception.Response) { throw }
        $response = $_.Exception.Response
    }

    $reader = New-Object IO.StreamReader($response.GetResponseStream())
    $content = $reader.ReadToEnd()
    $reader.Close()

    $headers = @{}
    foreach ($key in $response.Headers.AllKeys) { $headers[$key] = $response.Headers[$key] }
    $status = [int]$response.StatusCode
    $response.Close()

    return [PSCustomObject]@{
        StatusCode = $status
        Content    = $content
        Headers    = $headers
        Json       = $(try { $content | ConvertFrom-Json } catch { $null })
    }
}

function Test-Case {
    param([string]$Name, [scriptblock]$Body)
    Write-Host ""
    Write-Host "--- $Name" -ForegroundColor Cyan
    try {
        if (& $Body) {
            $script:pass++
            Write-Host "    PASS" -ForegroundColor Green
        } else {
            $script:fail++
            Write-Host "    FAIL" -ForegroundColor Red
        }
    } catch {
        $script:fail++
        Write-Host "    FAIL - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "Testing $Base" -ForegroundColor Yellow

Test-Case 'TEST 1 - GET / returns service info JSON' {
    $r = Invoke-Api -Path '/'
    Write-Host "    status=$($r.StatusCode) content-type=$($r.Headers['Content-Type'])"
    Write-Host "    body=$($r.Content)"
    $r.StatusCode -eq 200 -and $r.Headers['Content-Type'] -like 'application/json*'
}

Test-Case 'GET /api/health - D1 reachable' {
    $r = Invoke-Api -Path '/api/health'
    Write-Host "    status=$($r.StatusCode) body=$($r.Content)"
    $r.StatusCode -eq 200 -and $r.Json.success -eq $true
}

Test-Case 'TEST 17 - OPTIONS preflight returns CORS headers' {
    $r = Invoke-Api -Path '/api/login' -Method 'OPTIONS'
    Write-Host "    status=$($r.StatusCode) allow-origin=$($r.Headers['Access-Control-Allow-Origin']) allow-headers=$($r.Headers['Access-Control-Allow-Headers'])"
    $r.StatusCode -eq 204 -and $r.Headers['Access-Control-Allow-Origin'] -eq '*'
}

Test-Case 'TEST 3 - invalid credentials return 401 JSON' {
    $r = Invoke-Api -Path '/api/login' -Method POST -Body @{ username = 'no_such_user_xyz'; password = 'wrong_pw_xyz' }
    Write-Host "    status=$($r.StatusCode) body=$($r.Content)"
    $r.StatusCode -eq 401 -and $r.Json.success -eq $false
}

Test-Case 'Security - legacy action=insert is refused' {
    $r = Invoke-Api -Path '/api/login' -Method POST -Body @{ action = 'insert'; username = 'probe_user_xyz'; password = 'probe' }
    Write-Host "    status=$($r.StatusCode) body=$($r.Content)"
    $r.StatusCode -eq 403
}

Test-Case 'Security - protected endpoints reject anonymous callers' {
    $users = Invoke-Api -Path '/api/users'
    $stats = Invoke-Api -Path '/api/stats/yearly'
    Write-Host "    GET /api/users=$($users.StatusCode)  GET /api/stats/yearly=$($stats.StatusCode)"
    $users.StatusCode -eq 401 -and $stats.StatusCode -eq 401
}

Test-Case 'Missing fields return 400' {
    $r = Invoke-Api -Path '/api/login' -Method POST -Body @{ username = 'someone' }
    Write-Host "    status=$($r.StatusCode) body=$($r.Content)"
    $r.StatusCode -eq 400
}

if ($Username -and $Password) {
    $script:token = $null

    Test-Case 'TEST 4 - valid credentials return success + token' {
        $r = Invoke-Api -Path '/api/login' -Method POST -Body @{ username = $Username; password = $Password }
        Write-Host "    status=$($r.StatusCode) success=$($r.Json.success) id=$($r.Json.user.id) user=$($r.Json.user.username) role=$($r.Json.user.role)"
        $script:token = $r.Json.token
        $r.StatusCode -eq 200 -and $r.Json.success -eq $true -and $r.Json.token
    }

    Test-Case 'Search users with token' {
        $r = Invoke-Api -Path '/api/users?limit=5' -Token $script:token
        Write-Host "    status=$($r.StatusCode) total=$($r.Json.total) returned=$($r.Json.users.Count)"
        Write-Host "    (password field present in response: $($r.Content -match '"password"'))"
        $r.StatusCode -eq 200 -and $r.Json.success -eq $true -and ($r.Content -notmatch '"password"')
    }

    Test-Case 'Dashboard totals with token' {
        $r = Invoke-Api -Path '/api/stats' -Token $script:token
        Write-Host "    status=$($r.StatusCode) body=$($r.Content)"
        $r.StatusCode -eq 200
    }

    Test-Case 'Year-wise statistics with token' {
        $r = Invoke-Api -Path '/api/stats/yearly' -Token $script:token
        Write-Host "    status=$($r.StatusCode) body=$($r.Content)"
        $r.StatusCode -eq 200
    }

    Test-Case 'Tampered token is rejected' {
        $bad = $script:token.Substring(0, $script:token.Length - 2) + 'xy'
        $r = Invoke-Api -Path '/api/users' -Token $bad
        Write-Host "    status=$($r.StatusCode) body=$($r.Content)"
        $r.StatusCode -eq 401
    }
} else {
    Write-Host ""
    Write-Host "Skipped authenticated tests. Re-run with -Username <user> -Password <pass>." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Passed: $script:pass   Failed: $script:fail" -ForegroundColor $(if ($script:fail -eq 0) { 'Green' } else { 'Red' })
exit $(if ($script:fail -eq 0) { 0 } else { 1 })
