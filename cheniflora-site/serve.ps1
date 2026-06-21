$path = $PSScriptRoot
$port = 8000
$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$port/"
$listener.Prefixes.Add($prefix)
try {
    $listener.Start()
} catch {
    Write-Error "Failed to start HttpListener: $_"
    exit 1
}
Write-Output "Serving $path on $prefix - press Ctrl+C to stop"
while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $rel = $req.Url.AbsolutePath.TrimStart('/')
    if ($rel -eq '') { $rel = 'index.html' }
    $file = Join-Path $path $rel
    if (-not (Test-Path $file)) {
        $context.Response.StatusCode = 404
        $data = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
        $context.Response.OutputStream.Write($data,0,$data.Length)
        $context.Response.OutputStream.Close()
        continue
    }
    try {
        $bytes = [System.IO.File]::ReadAllBytes($file)
        $ext = [System.IO.Path]::GetExtension($file).ToLower()
        $ct = switch ($ext) {
            ".html" {"text/html"}
            ".css" {"text/css"}
            ".js" {"application/javascript"}
            ".png" {"image/png"}
            ".jpg" {"image/jpeg"}
            ".jpeg" {"image/jpeg"}
            ".svg" {"image/svg+xml"}
            default {"application/octet-stream"}
        }
        $context.Response.ContentType = $ct
        $context.Response.ContentLength64 = $bytes.Length
        $context.Response.OutputStream.Write($bytes,0,$bytes.Length)
        $context.Response.OutputStream.Close()
    } catch {
        $context.Response.StatusCode = 500
        $err = [System.Text.Encoding]::UTF8.GetBytes("500 Internal Server Error")
        $context.Response.OutputStream.Write($err,0,$err.Length)
        $context.Response.OutputStream.Close()
    }
}
$listener.Stop()
$listener.Close()
