Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Desktop\.gemini\antigravity\brain\ffb26174-3a05-423a-8368-f91af86af7be\.user_uploaded\media_1786862376503.png"
$srcImg = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Img($outPath, $w, $h) {
    $canvas = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($srcImg, 0, 0, $w, $h)
    $canvas.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $canvas.Dispose()
}

Resize-Img "C:\Users\Desktop\.gemini\antigravity\scratch\ilmifa\public\pwa-192x192.png" 192 192
Resize-Img "C:\Users\Desktop\.gemini\antigravity\scratch\ilmifa\public\pwa-512x512.png" 512 512
Resize-Img "C:\Users\Desktop\.gemini\antigravity\scratch\ilmifa\public\apple-touch-icon.png" 180 180
Resize-Img "C:\Users\Desktop\.gemini\antigravity\scratch\ilmifa\public\favicon.png" 64 64

$srcImg.Dispose()
Write-Output "PWA_ICONS_GENERATED_SUCCESSFULLY"
