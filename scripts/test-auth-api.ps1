<#
    Tests the deployed opticalshop Worker API.

    Usage:
        powershell -File scripts/test-auth-api.ps1
        powershell -File scripts/test-auth-api.ps1 -Username admin -Password secret

    Passing -Username/-Password also runs the authenticated tests
    (search user / add user / year-wise stats). The password is only sent to
    the Worker over HTTPS; it is never written to the console or to a file.
#>
param(
    [string]$Base = 'https://opticalshop.chasmashops.workers.dev',
    [string]$Username,
    [string]$Password
)

$ErrorActionPreference = 'Continue'
$pass = 0
$fail = 0

function Test-Case {
    param([string]$Name, [scriptblock]$Body)
    Write-Host ""
    Write-Host "--- $Name" -ForegroundColor Cyan
    try {
        $result = & $Body
        if ($result) {
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

function Invoke-Api {
    param([string]$Path, [string]$Method = 'GET', $Body, [string]$Token)
    $headers = @{ 'Accept' = 'application/json' }
    if ($Token) { $headers['Authorization'] = "Bearer $Token" }
    $args = @{ Uri = "$Base$Path"; Method = $Method; Headers = $headers; SkipHttpErrorCheck = $true }
    if ($Body) {
        $args['Body'] = ($Body | ConvertTo-Json -Compress)
        $args['ContentType'] = 'application/json'
    }
    return Invoke-WebRequest @args
}

Write-Host "Testing $Base" -ForegroundColor Yellow

Test-Case 'TEST 1 - GET / returns service info JSON' {
    $r = Invoke-Api -Path '/'
    Write-Host "    status=$($r.StatusCode) body=$($r.Content)"
    $r.StatusCode -eq 200 -and $r.Headers['Content-Type'] -like 'application/json*'
}

Test-Case 'GET /api/health - D1 reachable' {
    $r = Invoke-Api -Path '/api/health'
    Write-Host "    status=$($r.StatusCode) body=$($r.Content)"
    $r.StatusCode -eq 200
}

Test-Case 'CORS - OPTIONS preflight on /api/login' {
    $r = Invoke-WebRequest -Uri "$Base/api/login" -Method Options -SkipHttpErrorCheck `
        -Headers @{ 'Origin' = 'https://shreeharichasmaghar.com'; 'Access-Control-Request-Method' = 'POST' }
    Write-Host "    status=$($r.StatusCode) allow-origin=$($r.Headers['Access-Control-Allow-Origin'])"
    $r.StatusCode -eq 204 -and $r.Headers['Access-Control-Allow-Origin']
}

Test-Case 'TEST 3 - invalid credentials return 401' {
    $r = Invoke-Api -Path '/api/login' -Method POST -Body @{ username = 'no_such_user_xyz'; password = 'wrong_pw_xyz' }
    Write-Host "    status=$($r.StatusCode) body=$($r.Content)"
    $r.StatusCode -eq 401
}

Test-Case 'Security - legacy action=insert is refused' {
    $r = Invoke-Api -Path '/api/login' -Method POST -Body @{ action = 'insert'; username = 'probe_user_xyz'; password = 'probe' }
    Write-Host "    status=$($r.StatusCode) body=$($r.Content)"
    $r.StatusCode -eq 403
}

Test-Case 'Security - protected endpoints need a token' {
    $users = Invoke-Api -Path '/api/users'
    $stats = Invoke-Api -Path '/api/stats/yearly'
    Write-Host "    /api/users=$($users.StatusCode) /api/stats/yearly=$($stats.StatusCode)"
    $users.StatusCode -eq 401 -and $stats.StatusCode -eq 401
}

if ($Username -and $Password) {
    $token = $null

    Test-Case 'TEST 4 - valid credentials return success + token' {
        $r = Invoke-Api -Path '/api/login' -Method POST -Body @{ username = $Username; password = $Password }
        $data = $r.Content | ConvertFrom-Json
        Write-Host "    status=$($r.StatusCode) success=$($data.success) user=$($data.user.username) role=$($data.user.role)"
        $script:token = $data.token
        $r.StatusCode -eq 200 -and $data.success -eq $true -and $data.token
    }

    Test-Case 'Search users with token' {
        $r = Invoke-Api -Path '/api/users?limit=5' -Token $token
        $data = $r.Content | ConvertFrom-Json
        Write-Host "    status=$($r.StatusCode) total=$($data.total)"
        $r.StatusCode -eq 200 -and $data.success -eq $true
    }

    Test-Case 'Year-wise statistics with token' {
        $r = Invoke-Api -Path '/api/stats/yearly' -Token $token
        Write-Host "    status=$($r.StatusCode) body=$($r.Content)"
        $r.StatusCode -eq 200
    }

    Test-Case 'Dashboard totals with token' {
        $r = Invoke-Api -Path '/api/stats' -Token $token
        Write-Host "    status=$($r.StatusCode) body=$($r.Content)"
        $r.StatusCode -eq 200
    }

    Test-Case 'Tampered token is rejected' {
        $r = Invoke-Api -Path '/api/users' -Token "$token-tampered"
        Write-Host "    status=$($r.StatusCode)"
        $r.StatusCode -eq 401
    }
} else {
    Write-Host ""
    Write-Host "Skipped authenticated tests. Re-run with -Username <user> -Password <pass>." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Passed: $pass   Failed: $fail" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
exit $(if ($fail -eq 0) { 0 } else { 1 })
