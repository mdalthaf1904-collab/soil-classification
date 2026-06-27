param(
  [int]$Port = 8080
)

$root = (Get-Location).Path
$listener = [System.Net.HttpListener]::new()
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

function Get-ContentType {
  param([string]$Path)

  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8" }
    ".css" { "text/css; charset=utf-8" }
    ".js" { "application/javascript; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    ".png" { "image/png" }
    ".jpg" { "image/jpeg" }
    ".jpeg" { "image/jpeg" }
    ".svg" { "image/svg+xml" }
    ".ico" { "image/x-icon" }
    default { "application/octet-stream" }
  }
}

try {
  $listener.Start()
  Write-Host "GeoLab Pro server running at $prefix"
  Write-Host "Press Ctrl+C to stop."

  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $requestPath = [System.Uri]::UnescapeDataString($context.Request.Url.AbsolutePath.TrimStart("/"))

    if ([string]::IsNullOrWhiteSpace($requestPath)) {
      $requestPath = "index.html"
    }

    $localPath = Join-Path $root $requestPath
    $resolvedRoot = [System.IO.Path]::GetFullPath($root)
    $resolvedPath = [System.IO.Path]::GetFullPath($localPath)

    if (-not $resolvedPath.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
      $context.Response.StatusCode = 403
      $context.Response.Close()
      continue
    }

    if (Test-Path -LiteralPath $resolvedPath -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($resolvedPath)
      $context.Response.ContentType = Get-ContentType $resolvedPath
      $context.Response.ContentLength64 = $bytes.Length
      $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $message = [System.Text.Encoding]::UTF8.GetBytes("404 - File not found")
      $context.Response.StatusCode = 404
      $context.Response.ContentType = "text/plain; charset=utf-8"
      $context.Response.ContentLength64 = $message.Length
      $context.Response.OutputStream.Write($message, 0, $message.Length)
    }

    $context.Response.Close()
  }
} finally {
  if ($listener.IsListening) {
    $listener.Stop()
  }

  $listener.Close()
}
