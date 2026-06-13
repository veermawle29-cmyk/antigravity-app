Add-Type -AssemblyName System.Drawing

$inputPath = "C:\Users\ADMIN\.gemini\antigravity\brain\445b332a-e566-4a2b-990a-2f1b9bbead90\media__1779213496870.jpg"
$outputPath = "c:\Users\ADMIN\Desktop\antigravity app code\assets\logo.png"

$bitmap = New-Object System.Drawing.Bitmap($inputPath)

# We need to iterate over all pixels
$width = $bitmap.Width
$height = $bitmap.Height

for ($x = 0; $x -lt $width; $x++) {
    for ($y = 0; $y -lt $height; $y++) {
        $pixel = $bitmap.GetPixel($x, $y)
        
        # Calculate luminance
        $lum = (0.299 * $pixel.R) + (0.587 * $pixel.G) + (0.114 * $pixel.B)
        
        if ($lum -lt 40) {
            # Make dark pixels transparent
            # Since Powershell might be slow for complex math per pixel, let's just make it fully transparent if it's really dark
            # Or use a smooth alpha. Let's use smooth alpha
            $alpha = [math]::Floor(($lum / 40.0) * 255)
            $newColor = [System.Drawing.Color]::FromArgb($alpha, $pixel.R, $pixel.G, $pixel.B)
            $bitmap.SetPixel($x, $y, $newColor)
        }
    }
}

$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()

Write-Host "Background removed and saved to logo.png"
