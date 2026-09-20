$ErrorActionPreference = "Continue"
$adb = "C:\Users\TL Do\AppData\Local\Microsoft\WinGet\Packages\Google.PlatformTools_Microsoft.Winget.Source_8wekyb3d8bbwe\platform-tools\adb.exe"
$s = "3B168E00AEC00000"
$logDir = "$env:TEMP\jpa_hw_val"
$metroPath = "C:\Users\TL Do\.cursor\projects\e-Japanese-Practicing-Application\terminals\253863.txt"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$evidence = Join-Path $logDir "evidence2.txt"
"" | Set-Content $evidence -Encoding UTF8

function Tap([int]$x,[int]$y) { & $adb -s $s shell input tap $x $y; Start-Sleep -Milliseconds 350 }
function Swipe([int]$x1,[int]$y1,[int]$x2,[int]$y2,[int]$ms=120) { & $adb -s $s shell input swipe $x1 $y1 $x2 $y2 $ms }

function Dump-UI {
  & $adb -s $s shell uiautomator dump /sdcard/ui.xml | Out-Null
  & $adb -s $s pull /sdcard/ui.xml "$logDir\ui.xml" 2>$null | Out-Null
  [xml]$script:xml = Get-Content "$logDir\ui.xml" -Encoding UTF8
}

function Has-Text([string]$t) {
  foreach ($n in $xml.SelectNodes("//node")) { if ($n.GetAttribute("text") -eq $t) { return $true } }
  return $false
}

function Restore-Layout {
  for ($i=0; $i -lt 8; $i++) {
    Dump-UI
    $hasCheck = Has-Text "Check"
    $hasChips = $false
    foreach ($n in $xml.SelectNodes("//node[@clickable='true']")) {
      if ($n.GetAttribute("bounds") -match '\[(\d+),(\d+)\]\[(\d+),(\d+)\]') {
        $y1=[int]$Matches[2]; $h=[int]$Matches[4]-$y1; $w=[int]$Matches[3]-[int]$Matches[1]
        if ($y1 -gt 250 -and $y1 -lt 500 -and $w -ge 100 -and $w -le 200 -and $h -ge 150) { $hasChips = $true; break }
      }
    }
    if ($hasCheck -and $hasChips) { return $true }
    if ($hasCheck -and -not $hasChips) { Swipe 540 900 540 1500 180 }
    else { Swipe 540 1500 540 900 180 }
    Start-Sleep -Milliseconds 280
  }
  return $false
}

$chips = @(
  @{x=111;y=375}, @{x=255;y=375}, @{x=399;y=375}, @{x=543;y=375}, @{x=687;y=375}, @{x=831;y=375},
  @{x=111;y=582}, @{x=255;y=582}, @{x=399;y=582}, @{x=543;y=582}
)
$btnCheckX=130; $btnCheckY=1621
$btnUndoX=310; $btnUndoY=1621
$btnClearX=482; $btnClearY=1621
$btnGuideExclX=171; $btnGuideExclY=1745
$btnCaptureX=474; $btnCaptureY=1745
$btnPreferX=777; $btnPreferY=1745
$padX1=80; $padY1=720; $padX2=1000; $padY2=1520

function Draw($strokes) {
  foreach ($stroke in $strokes) {
    for ($i=0; $i -lt $stroke.Count-1; $i++) {
      $ax=[int]($padX1 + $stroke[$i].x * ($padX2-$padX1))
      $ay=[int]($padY1 + $stroke[$i].y * ($padY2-$padY1))
      $bx=[int]($padX1 + $stroke[$i+1].x * ($padX2-$padX1))
      $by=[int]($padY1 + $stroke[$i+1].y * ($padY2-$padY1))
      Swipe $ax $ay $bx $by 100
    }
    Start-Sleep -Milliseconds 280
  }
}

$T = @{
  hira_a = @(@(@{x=.45;y=.15},@{x=.45;y=.75}),@(@{x=.25;y=.35},@{x=.75;y=.35}),@(@{x=.70;y=.40},@{x=.55;y=.55},@{x=.40;y=.70},@{x=.55;y=.85},@{x=.75;y=.75}))
  hira_i = @(@(@{x=.30;y=.20},@{x=.28;y=.75}),@(@{x=.55;y=.30},@{x=.70;y=.75}))
  hira_ka = @(@(@{x=.45;y=.15},@{x=.45;y=.80}),@(@{x=.25;y=.40},@{x=.75;y=.35}),@(@{x=.65;y=.45},@{x=.75;y=.75}))
  hira_ki = @(@(@{x=.25;y=.25},@{x=.75;y=.25}),@(@{x=.25;y=.40},@{x=.75;y=.40}),@(@{x=.50;y=.15},@{x=.50;y=.55}),@(@{x=.35;y=.60},@{x=.50;y=.80},@{x=.70;y=.70}))
  kata_a = @(@(@{x=.30;y=.25},@{x=.75;y=.25},@{x=.55;y=.55}),@(@{x=.55;y=.40},@{x=.55;y=.85}))
  kata_ka = @(@(@{x=.45;y=.15},@{x=.45;y=.80}),@(@{x=.25;y=.40},@{x=.75;y=.35}),@(@{x=.65;y=.45},@{x=.78;y=.75}))
  kata_shi = @(@(@{x=.25;y=.30},@{x=.40;y=.28}),@(@{x=.25;y=.45},@{x=.42;y=.43}),@(@{x=.30;y=.70},@{x=.75;y=.35}))
  kata_tsu = @(@(@{x=.30;y=.25},@{x=.30;y=.40}),@(@{x=.45;y=.25},@{x=.45;y=.40}),@(@{x=.60;y=.25},@{x=.55;y=.75}))
  kata_so = @(@(@{x=.35;y=.25},@{x=.35;y=.40}),@(@{x=.55;y=.25},@{x=.50;y=.75}))
  kata_n = @(@(@{x=.30;y=.30},@{x=.45;y=.28}),@(@{x=.35;y=.70},@{x=.75;y=.35}))
}

function Run-Char($label, $idx, $tmpl, $attempts=1, $capture=$false) {
  for ($a=1; $a -le $attempts; $a++) {
    Write-Host (">>> {0} attempt {1}" -f $label, $a)
    Restore-Layout | Out-Null
    Tap $chips[$idx].x $chips[$idx].y
    Start-Sleep -Milliseconds 400
    Restore-Layout | Out-Null
    Tap $btnClearX $btnClearY
    Start-Sleep -Milliseconds 300
    Draw $T[$tmpl]
    Start-Sleep -Milliseconds 400
    Restore-Layout | Out-Null
    Tap $btnCheckX $btnCheckY
    Start-Sleep -Seconds 3.5
    if ($capture -and $a -eq 1) {
      Restore-Layout | Out-Null
      Tap $btnCaptureX $btnCaptureY
      Start-Sleep -Seconds 1.2
    }
  }
}

& $adb -s $s shell am start -a android.intent.action.VIEW -d "jpa://practice/hw-validation" | Out-Null
Start-Sleep -Seconds 2
& $adb -s $s logcat -c

Write-Host "=== CLEAR/UNDO ==="
Restore-Layout | Out-Null
Tap $chips[0].x $chips[0].y
Tap $btnClearX $btnClearY
Draw $T.hira_a
Restore-Layout | Out-Null
Tap $btnCheckX $btnCheckY
Start-Sleep -Seconds 3
Restore-Layout | Out-Null
Tap $btnUndoX $btnUndoY
Start-Sleep -Milliseconds 400
Tap $btnCheckX $btnCheckY
Start-Sleep -Seconds 3
Restore-Layout | Out-Null
Tap $btnClearX $btnClearY
Tap $btnCheckX $btnCheckY
Start-Sleep -Seconds 2

Write-Host "=== EDGE ==="
Restore-Layout | Out-Null
Swipe ($padX1+15) ($padY1+30) ($padX1+15) ($padY2-30) 140
Swipe ($padX2-15) ($padY1+30) ($padX2-15) ($padY2-30) 140
Restore-Layout | Out-Null
Tap $btnClearX $btnClearY

Run-Char "hira-a" 0 "hira_a" 1 $true
Run-Char "hira-i" 1 "hira_i" 1 $true
Run-Char "hira-ka" 2 "hira_ka" 1 $true
Run-Char "hira-ki" 3 "hira_ki" 1 $true
Run-Char "kata-a" 4 "kata_a" 1 $true
Run-Char "kata-ka" 5 "kata_ka" 1 $true
Run-Char "kata-shi" 6 "kata_shi" 2 $true
Run-Char "kata-tsu" 7 "kata_tsu" 2 $true
Run-Char "kata-so" 8 "kata_so" 2 $true
Run-Char "kata-n" 9 "kata_n" 2 $true

Write-Host "=== GUIDE EXCL ==="
Restore-Layout | Out-Null
Tap $chips[0].x $chips[0].y
Tap $btnClearX $btnClearY
Draw $T.hira_a
Restore-Layout | Out-Null
Tap $btnGuideExclX $btnGuideExclY
Start-Sleep -Seconds 5

Write-Host "=== FORCE SOFTWARE ==="
Restore-Layout | Out-Null
Tap $btnPreferX $btnPreferY
Start-Sleep -Milliseconds 500
Tap $chips[0].x $chips[0].y
Tap $btnClearX $btnClearY
Draw $T.hira_a
Restore-Layout | Out-Null
Tap $btnCheckX $btnCheckY
Start-Sleep -Seconds 4

Write-Host "=== COLLECT ==="
Start-Sleep -Seconds 2
Get-Content $metroPath -Tail 800 | Select-String -Pattern "JPA_HW_CHECK|JPA_HW_GUIDE|JPA_HW_FIXTURE|empty drawing|Worklets" | ForEach-Object {
  $l = $_.Line
  if ($l.Length -gt 350) { $l = $l.Substring(0,350) + "..." }
  Add-Content $evidence $l
  Write-Host $l
}
& $adb -s $s logcat -d 2>&1 | Select-String -Pattern "JPA_HW_CHECK|JPA_HW_GUIDE|JPA_HW_FIXTURE" | ForEach-Object {
  Add-Content $evidence $_.Line
}
Write-Host "EVIDENCE=$evidence"
Write-Host "ALL_DONE"
