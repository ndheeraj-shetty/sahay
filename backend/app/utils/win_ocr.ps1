param(
    [Parameter(Mandatory=$true)]
    [string]$ImagePath
)

try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime] | Out-Null
    [Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType = WindowsRuntime] | Out-Null

    $absPath = (Resolve-Path $ImagePath).Path
    $fs = [System.IO.File]::OpenRead($absPath)
    $stream = [System.IO.WindowsRuntimeStreamExtensions]::AsRandomAccessStream($fs)

    $asTaskGeneric = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
        $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    }

    $mDecoder = $asTaskGeneric.MakeGenericMethod([Windows.Graphics.Imaging.BitmapDecoder])
    $taskDecoder = $mDecoder.Invoke($null, @([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)))
    $taskDecoder.Wait()
    $decoder = $taskDecoder.Result

    $mBmp = $asTaskGeneric.MakeGenericMethod([Windows.Graphics.Imaging.SoftwareBitmap])
    $taskBmp = $mBmp.Invoke($null, @($decoder.GetSoftwareBitmapAsync()))
    $taskBmp.Wait()
    $softwareBitmap = $taskBmp.Result

    $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    if ($null -eq $engine) {
        $lang = [Windows.Globalization.Language]::new('en-US')
        $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)
    }

    $mOcr = $asTaskGeneric.MakeGenericMethod([Windows.Media.Ocr.OcrResult])
    $taskOcr = $mOcr.Invoke($null, @($engine.RecognizeAsync($softwareBitmap)))
    $taskOcr.Wait()
    $ocrResult = $taskOcr.Result

    $stream.Dispose()
    $fs.Dispose()

    if ($ocrResult -and $ocrResult.Text) {
        Write-Output $ocrResult.Text
    }
} catch {
    Write-Output ""
}
