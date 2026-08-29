<#
.SYNOPSIS
  Repeatable SEO/technical QA check for the Shree Hari Chasma Ghar static site.
  Read-only: never modifies any file. Run from anywhere; it locates the repo root
  relative to this script's own location.

.CHECKS
  1. Every <loc> in sitemap.xml maps to a real file on disk.
  2. Every sitemap URL's file has a <link rel="canonical"> whose href matches the
     sitemap URL exactly (canonical does not point somewhere else / does not "redirect").
  3. No noindexed page (meta name="robots" containing "noindex") appears in sitemap.xml.
  4. Every internal href="/..." found in any .html file resolves to a real file.
  5. Every entry in _redirects points at a real, indexable (non-noindex) file.
  6. No two indexable pages share an identical <title> (redirect stub pages are
     expected to share a title and are excluded automatically via their noindex tag).
  7. No two indexable pages share an identical meta name="description".
  8. Every indexable page has exactly one <h1>.
  9. Every indexable page has a non-empty <title> and meta description.
  10. Every application/ld+json block on every page parses as valid JSON.

.OUTPUT
  Prints PASS/FAIL per check with details, then a final summary line.
  Exits with code 0 if everything passed, 1 if anything failed.
#>

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$failures = 0
function Report-Fail($msg) { Write-Host "  FAIL: $msg" -ForegroundColor Red; $script:failures++ }
function Report-Pass($msg) { Write-Host "  PASS: $msg" -ForegroundColor Green }
function Section($title) { Write-Host "`n== $title ==" -ForegroundColor Cyan }

# ---- Load sitemap ----
[xml]$sitemapXml = Get-Content -Raw -Encoding UTF8 "sitemap.xml"
$sitemapUrls = $sitemapXml.urlset.url | ForEach-Object { $_.loc.Trim() }
$base = "https://www.shreeharichasmaghar.com"

function UrlToFile($url) {
    $path = $url -replace [regex]::Escape($base), ''
    if ($path -eq '' -or $path -eq '/') { return 'index.html' }
    $path = $path.TrimStart('/')
    if ($path -match '\.[a-zA-Z0-9]+$') { return $path }
    return "$path.html"
}

# ---- 1. Sitemap URLs map to real files ----
Section "1. Sitemap URLs resolve to files"
$sitemapFileMap = @{}
foreach ($u in $sitemapUrls) {
    $f = UrlToFile $u
    $sitemapFileMap[$u] = $f
    if (-not (Test-Path $f)) { Report-Fail "sitemap URL $u -> missing file $f" }
}
if ($failures -eq 0) { Report-Pass "$($sitemapUrls.Count) sitemap URLs all map to existing files" }

# ---- Gather per-file head data once ----
$allHtml = Get-ChildItem -Recurse -Filter *.html -File | Where-Object {
    $_.FullName -notmatch '\\node_modules\\'
}
$pageData = @{}
foreach ($f in $allHtml) {
    $rel = $f.FullName.Substring($Root.Length + 1) -replace '\\', '/'
    $content = Get-Content -Raw -Encoding UTF8 $f.FullName
    $canonical = [regex]::Match($content, 'rel="canonical"\s+href="([^"]+)"')
    if (-not $canonical.Success) { $canonical = [regex]::Match($content, "rel='canonical'\s+href='([^']+)'") }
    $robots = [regex]::Match($content, 'name="robots"\s+content="([^"]*)"')
    $title = [regex]::Match($content, '<title[^>]*>([\s\S]*?)</title>')
    $desc = [regex]::Match($content, 'name="description"\s+content="([^"]*)"')
    $h1s = [regex]::Matches($content, '<h1[\s>]')
    $isNoindex = $robots.Success -and $robots.Groups[1].Value -match 'noindex'
    $pageData[$rel] = [PSCustomObject]@{
        RelPath   = $rel
        Content   = $content
        Canonical = if ($canonical.Success) { $canonical.Groups[1].Value } else { $null }
        Robots    = if ($robots.Success) { $robots.Groups[1].Value } else { $null }
        Title     = if ($title.Success) { ($title.Groups[1].Value -replace '\s+', ' ').Trim() } else { $null }
        Desc      = if ($desc.Success) { $desc.Groups[1].Value.Trim() } else { $null }
        H1Count   = $h1s.Count
        IsNoindex = $isNoindex
    }
}

# ---- 2. Canonical matches sitemap URL (no self-redirect / mismatch) ----
Section "2. Canonical tags match their sitemap URL"
$canonMismatch = 0
foreach ($u in $sitemapUrls) {
    $f = $sitemapFileMap[$u]
    if (-not $pageData.ContainsKey($f)) { continue }
    $p = $pageData[$f]
    if ($null -eq $p.Canonical) { Report-Fail "$f has no canonical tag (sitemap URL $u)"; $canonMismatch++; continue }
    if ($p.Canonical.TrimEnd('/') -ne $u.TrimEnd('/')) {
        Report-Fail "$f canonical is '$($p.Canonical)' but sitemap says '$u'"
        $canonMismatch++
    }
}
if ($canonMismatch -eq 0) { Report-Pass "All sitemap pages self-canonicalize correctly" }

# ---- 3. No noindex page in sitemap ----
Section "3. No noindexed page appears in sitemap"
$noindexInSitemap = 0
foreach ($u in $sitemapUrls) {
    $f = $sitemapFileMap[$u]
    if ($pageData.ContainsKey($f) -and $pageData[$f].IsNoindex) {
        Report-Fail "sitemap includes noindexed page: $u"
        $noindexInSitemap++
    }
}
if ($noindexInSitemap -eq 0) { Report-Pass "No noindexed pages found in sitemap.xml" }

# ---- 4. All internal hrefs resolve ----
Section "4. Internal href targets exist"
$allHrefs = New-Object System.Collections.Generic.HashSet[string]
foreach ($f in $allHtml) {
    $content = (Get-Content -Raw -Encoding UTF8 $f.FullName)
    $matches = [regex]::Matches($content, 'href="(/[a-zA-Z0-9_/.\-]*)"')
    foreach ($m in $matches) { [void]$allHrefs.Add($m.Groups[1].Value) }
}
$brokenLinks = 0
foreach ($href in $allHrefs) {
    $clean = ($href -split '#')[0] -split '\?' | Select-Object -First 1
    if ([string]::IsNullOrEmpty($clean)) { continue }
    $target = if ($clean -eq '/') { 'index.html' }
              elseif ($clean -match '\.[a-zA-Z0-9]+$') { $clean.TrimStart('/') }
              else { $clean.TrimStart('/') + '.html' }
    if (-not (Test-Path $target)) { Report-Fail "broken href: $href -> $target"; $brokenLinks++ }
}
if ($brokenLinks -eq 0) { Report-Pass "$($allHrefs.Count) unique internal href targets all resolve" }

# ---- 5. _redirects targets valid ----
Section "5. _redirects targets are valid, indexable pages"
$redirectFails = 0
if (Test-Path "_redirects") {
    $lines = Get-Content "_redirects" | Where-Object { $_ -and $_ -notmatch '^\s*#' }
    foreach ($line in $lines) {
        $parts = $line -split '\s+' | Where-Object { $_ }
        if ($parts.Count -lt 2) { continue }
        $to = $parts[1]
        $toFile = ($to.TrimStart('/')) + '.html'
        if (-not (Test-Path $toFile)) { Report-Fail "_redirects target missing: $to"; $redirectFails++; continue }
        if ($pageData.ContainsKey($toFile) -and $pageData[$toFile].IsNoindex) {
            Report-Fail "_redirects points at a noindexed page: $to"
            $redirectFails++
        }
    }
    if ($redirectFails -eq 0) { Report-Pass "All _redirects entries point at valid, indexable pages" }
} else {
    Report-Fail "_redirects file not found"
}

# ---- Indexable page set for duplicate/missing checks ----
$indexable = $pageData.Values | Where-Object { -not $_.IsNoindex -and $_.RelPath -notmatch '^(account|crm)/' -and $_.RelPath -notin @('dashboard.html','login.html') }

# ---- 6. Duplicate titles among indexable pages ----
Section "6. No duplicate <title> among indexable pages"
$dupTitles = $indexable | Where-Object { $_.Title } | Group-Object Title | Where-Object { $_.Count -gt 1 }
if ($dupTitles) {
    foreach ($g in $dupTitles) { Report-Fail "title '$($g.Name)' used by: $($g.Group.RelPath -join ', ')" }
} else { Report-Pass "$($indexable.Count) indexable pages all have unique titles" }

# ---- 7. Duplicate meta descriptions ----
Section "7. No duplicate meta description among indexable pages"
$dupDesc = $indexable | Where-Object { $_.Desc } | Group-Object Desc | Where-Object { $_.Count -gt 1 }
if ($dupDesc) {
    foreach ($g in $dupDesc) { Report-Fail "description reused by: $($g.Group.RelPath -join ', ')" }
} else { Report-Pass "All indexable pages have unique meta descriptions" }

# ---- 8. Exactly one H1 ----
Section "8. Exactly one <h1> per indexable page"
$h1Bad = $indexable | Where-Object { $_.H1Count -ne 1 }
if ($h1Bad) {
    foreach ($p in $h1Bad) { Report-Fail "$($p.RelPath) has $($p.H1Count) <h1> tags" }
} else { Report-Pass "Every indexable page has exactly one <h1>" }

# ---- 9. Title/description present ----
Section "9. Title and meta description present"
$missingMeta = $indexable | Where-Object { -not $_.Title -or -not $_.Desc }
if ($missingMeta) {
    foreach ($p in $missingMeta) { Report-Fail "$($p.RelPath) missing title and/or description" }
} else { Report-Pass "Every indexable page has both a title and a meta description" }

# ---- 10. JSON-LD validity ----
Section "10. JSON-LD blocks parse as valid JSON"
$jsonBad = 0
$jsonChecked = 0
foreach ($f in $allHtml) {
    $content = (Get-Content -Raw -Encoding UTF8 $f.FullName)
    $blocks = [regex]::Matches($content, '<script type="application/ld\+json">([\s\S]*?)</script>')
    foreach ($b in $blocks) {
        $jsonChecked++
        try { $null = $b.Groups[1].Value | ConvertFrom-Json -ErrorAction Stop }
        catch {
            $rel = $f.FullName.Substring($Root.Length + 1) -replace '\\', '/'
            Report-Fail "$rel has invalid JSON-LD: $($_.Exception.Message)"
            $jsonBad++
        }
    }
}
if ($jsonBad -eq 0) { Report-Pass "$jsonChecked JSON-LD blocks across the site all parse correctly" }

# ---- Summary ----
Write-Host ""
if ($failures -eq 0) {
    Write-Host "ALL CHECKS PASSED" -ForegroundColor Green
    exit 0
} else {
    Write-Host "$failures CHECK(S) FAILED" -ForegroundColor Red
    exit 1
}
