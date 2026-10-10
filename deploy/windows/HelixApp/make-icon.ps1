# Build Helix.ico — AgenticOps teal ops-graph mark + DNA twist (no VS required).
# Brand kinship: chrysalis-convert/branding/agenticop/logo-mark.svg + Helix teal chrome.
param(
  [string]$OutIco = ''
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$here = $PSScriptRoot
if (-not $OutIco) { $OutIco = Join-Path $here 'Helix.ico' }

function New-HelixBitmap([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)

  $s = [double]$size
  $pad = [Math]::Max(1.0, $s * 0.06)
  $radius = $s * 0.22
  $bg = [System.Drawing.Color]::FromArgb(255, 2, 6, 23)
  $teal = [System.Drawing.Color]::FromArgb(255, 20, 184, 166)
  $tealDeep = [System.Drawing.Color]::FromArgb(255, 15, 118, 110)
  $cyan = [System.Drawing.Color]::FromArgb(255, 34, 211, 238)
  $mint = [System.Drawing.Color]::FromArgb(255, 61, 184, 154)
  $tickGreen = [System.Drawing.Color]::FromArgb(255, 16, 185, 129)
  $tickInk = [System.Drawing.Color]::FromArgb(255, 2, 44, 34)

  # Rounded square (AgenticOps app-icon field)
  $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $s - (2 * $pad)
  $x = $pad; $y = $pad; $r = [float]$radius
  $gp.AddArc([float]$x, [float]$y, $r, $r, 180, 90)
  $gp.AddArc([float]($x + $d - $r), [float]$y, $r, $r, 270, 90)
  $gp.AddArc([float]($x + $d - $r), [float]($y + $d - $r), $r, $r, 0, 90)
  $gp.AddArc([float]$x, [float]($y + $d - $r), $r, $r, 90, 90)
  $gp.CloseFigure()
  $bgBrush = New-Object System.Drawing.SolidBrush $bg
  $g.FillPath($bgBrush, $gp)
  $bgBrush.Dispose()
  $gp.Dispose()

  # Soft core wash
  $wash = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(40, 34, 211, 238))
  $wr = [float]($s * 0.38)
  $g.FillEllipse($wash, [float]($s * 0.5 - $wr), [float]($s * 0.48 - $wr), (2 * $wr), (2 * $wr))
  $wash.Dispose()

  $nR = [float]($s * 0.095)
  $topX = [float]($s * 0.50); $topY = [float]($s * 0.28)
  $blX = [float]($s * 0.30); $blY = [float]($s * 0.68)
  $brX = [float]($s * 0.70); $brY = [float]($s * 0.68)

  $penW = [float]([Math]::Max(1.5, $s * 0.045))
  $edge = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 13, 148, 136), $penW)
  $edge.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $edge.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawLine($edge, $topX, $topY, $blX, $blY)
  $g.DrawLine($edge, $topX, $topY, $brX, $brY)
  $g.DrawLine($edge, $blX, $blY, $brX, $brY)
  $edge.Dispose()

  # DNA twist (Helix product)
  $helixW = [float]([Math]::Max(1.2, $s * 0.028))
  $penA = New-Object System.Drawing.Pen $cyan, $helixW
  $penB = New-Object System.Drawing.Pen $mint, $helixW
  $penA.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $penA.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $penB.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $penB.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $ptsA = New-Object 'System.Drawing.PointF[]' 5
  $ptsB = New-Object 'System.Drawing.PointF[]' 5
  for ($i = 0; $i -lt 5; $i++) {
    $t = $i / 4.0
    $yy = [float]($s * (0.34 + (0.30 * $t)))
    $amp = $s * 0.07
    $ptsA[$i] = New-Object System.Drawing.PointF ([float](($s * 0.50) + ($amp * [Math]::Sin($t * [Math]::PI * 2))), $yy)
    $ptsB[$i] = New-Object System.Drawing.PointF ([float](($s * 0.50) - ($amp * [Math]::Sin($t * [Math]::PI * 2))), $yy)
  }
  $g.DrawCurve($penA, $ptsA)
  $g.DrawCurve($penB, $ptsB)
  $penA.Dispose(); $penB.Dispose()

  foreach ($node in @(
      @{ X = $topX; Y = $topY },
      @{ X = $blX; Y = $blY },
      @{ X = $brX; Y = $brY }
    )) {
    $rect = New-Object System.Drawing.RectangleF ($node.X - $nR), ($node.Y - $nR), (2 * $nR), (2 * $nR)
    $gb = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $teal, $tealDeep, 45.0
    $g.FillEllipse($gb, $rect)
    $gb.Dispose()
    $hi = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(90, 207, 250, 254))
    $g.FillEllipse($hi, ($node.X - $nR * 0.45), ($node.Y - $nR * 0.55), ($nR * 0.7), ($nR * 0.55))
    $hi.Dispose()
  }

  # Verified tick
  $tickR = [float]($s * 0.07)
  $tx = [float]($s * 0.78); $ty = [float]($s * 0.22)
  $g.FillEllipse((New-Object System.Drawing.SolidBrush $tickGreen), ($tx - $tickR), ($ty - $tickR), (2 * $tickR), (2 * $tickR))
  $tickPen = New-Object System.Drawing.Pen $tickInk, ([float]([Math]::Max(1.2, $s * 0.028)))
  $tickPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $tickPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawLines($tickPen, @(
      (New-Object System.Drawing.PointF ($tx - $tickR * 0.45), $ty),
      (New-Object System.Drawing.PointF ($tx - $tickR * 0.1), ($ty + $tickR * 0.35)),
      (New-Object System.Drawing.PointF ($tx + $tickR * 0.5), ($ty - $tickR * 0.35))
    ))
  $tickPen.Dispose()

  $g.Dispose()
  return $bmp
}

function Write-PngIco([System.Drawing.Bitmap[]]$bitmaps, [string]$path) {
  $pngs = @()
  foreach ($b in $bitmaps) {
    $ms = New-Object System.IO.MemoryStream
    $b.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngs += ,$ms.ToArray()
    $ms.Dispose()
  }
  $fs = [System.IO.File]::Create($path)
  $bw = New-Object System.IO.BinaryWriter $fs
  $bw.Write([uint16]0)
  $bw.Write([uint16]1)
  $bw.Write([uint16]$pngs.Count)
  $offset = 6 + (16 * $pngs.Count)
  for ($i = 0; $i -lt $pngs.Count; $i++) {
    $b = $bitmaps[$i]
    $w = if ($b.Width -ge 256) { [byte]0 } else { [byte]$b.Width }
    $h = if ($b.Height -ge 256) { [byte]0 } else { [byte]$b.Height }
    $bw.Write($w)
    $bw.Write($h)
    $bw.Write([byte]0)
    $bw.Write([byte]0)
    $bw.Write([uint16]1)
    $bw.Write([uint16]32)
    $bw.Write([uint32]$pngs[$i].Length)
    $bw.Write([uint32]$offset)
    $offset += $pngs[$i].Length
  }
  foreach ($p in $pngs) { $bw.Write($p) }
  $bw.Close()
}

$sizes = @(16, 32, 48, 64, 128, 256)
$bmps = @()
foreach ($sz in $sizes) { $bmps += ,(New-HelixBitmap $sz) }
Write-PngIco $bmps $OutIco
foreach ($b in $bmps) { $b.Dispose() }

$preview = Join-Path $here 'Helix.png'
$p = New-HelixBitmap 256
$p.Save($preview, [System.Drawing.Imaging.ImageFormat]::Png)
$p.Dispose()

Write-Host "HELIX_ICON_OK $OutIco"
