Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\user\Downloads\Projects\Bantay-Bayan-System\android\BANTAY BAYAN SYSTEM LOGO.png"
$src = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Image($img, $width, $height, $destPath) {
    $dest = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($img, 0, 0, $width, $height)
    $g.Dispose()
    $dest.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $dest.Dispose()
}

function Create-Foreground($img, $size, $destPath) {
    $dest = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    # Center with 72% scaling inside the adaptive icon box
    $iconSize = [int]($size * 0.72)
    $offset = [int](($size - $iconSize) / 2)
    $g.DrawImage($img, $offset, $offset, $iconSize, $iconSize)
    $g.Dispose()
    $dest.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $dest.Dispose()
}

$resBase = "C:\Users\user\Downloads\Projects\Bantay-Bayan-System\android\app\src\main\res"

# Mipmap configurations: size, foreground size
$densities = @{
    "mipmap-mdpi"    = @{ size = 48;  fg = 108 }
    "mipmap-hdpi"    = @{ size = 72;  fg = 162 }
    "mipmap-xhdpi"   = @{ size = 96;  fg = 216 }
    "mipmap-xxhdpi"  = @{ size = 144; fg = 324 }
    "mipmap-xxxhdpi" = @{ size = 192; fg = 432 }
}

foreach ($folder in $densities.Keys) {
    $cfg = $densities[$folder]
    $dir = Join-Path $resBase $folder
    if (Test-Path $dir) {
        Resize-Image $src $cfg.size $cfg.size (Join-Path $dir "ic_launcher.png")
        Resize-Image $src $cfg.size $cfg.size (Join-Path $dir "ic_launcher_round.png")
        Create-Foreground $src $cfg.fg (Join-Path $dir "ic_launcher_foreground.png")
        Write-Host "Generated $folder icons successfully."
    }
}

# Also update public/logo.png
$publicLogo = "C:\Users\user\Downloads\Projects\Bantay-Bayan-System\public\logo.png"
Copy-Item -Path $srcPath -Destination $publicLogo -Force
Write-Host "Updated public/logo.png"

$src.Dispose()
