# Media Converter API Documentation

Base URL: `http://your-domain.com/api/v1`

## Table of Contents
1. [YouTube Download](#youtube-download)
2. [Media Conversion](#media-conversion)
3. [Video Compression](#video-compression)
4. [File Download](#file-download)

---

## YouTube Download

### Download YouTube Video

**Endpoint:** `POST /youtube/download`

**Description:** Download a YouTube video as MP4 or extract audio as MP3.

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "format": "mp4"
}
```

**Parameters:**
- `url` (string, required): YouTube video URL
- `format` (string, required): Output format - `"mp4"` or `"mp3"`

**Response:**
```json
{
  "success": true,
  "message": "Successfully downloaded as mp4",
  "file_id": "abc123.mp4",
  "title": "Video Title",
  "duration": 180.5
}
```

---

## Media Conversion

### Convert MP4 to MP3

**Endpoint:** `POST /convert/mp4-to-mp3`

**Description:** Convert an uploaded MP4 file to MP3 audio.

**Request:** Multipart form data
- `file`: MP4 video file

**Response:**
```json
{
  "success": true,
  "message": "Successfully converted to MP3",
  "file_id": "converted_xyz.mp3"
}
```

---

## Video Compression

### Compress Video

**Endpoint:** `POST /compress/video`

**Description:** Compress and optimize video files using modern codecs and quality presets.

**Request:** Multipart form data
- `file`: Video file (MP4, AVI, MOV, MKV, WebM, FLV, WMV)
- `preset` (optional): Compression preset
  - `"high"` - High quality, ~30% compression (CRF 18)
  - `"balanced"` - Balanced quality/size, ~50% compression (CRF 23) [DEFAULT]
  - `"high_compression"` - More compression, ~70% reduction (CRF 28)
  - `"max_compression"` - Maximum compression, ~80% reduction (CRF 32)
- `codec` (optional): Video codec
  - `"h264"` - H.264/AVC, best compatibility [DEFAULT]
  - `"h265"` - H.265/HEVC, better compression (~50% smaller than H.264)
  - `"vp9"` - VP9, good for web
- `target_size_mb` (optional): Target file size in MB (uses two-pass encoding)

**Example Request (cURL):**
```bash
# Quality-based compression
curl -X POST "http://localhost:8000/api/v1/compress/video" \
  -F "file=@video.mp4" \
  -F "preset=balanced" \
  -F "codec=h264"

# Size-based compression
curl -X POST "http://localhost:8000/api/v1/compress/video" \
  -F "file=@video.mp4" \
  -F "target_size_mb=10" \
  -F "codec=h265"
```

**Response:**
```json
{
  "success": true,
  "message": "Video compressed successfully. Reduced by 52.3%",
  "file_id": "compressed_abc123.mp4",
  "duration": 120.5
}
```

### Get Compression Estimate

**Endpoint:** `POST /compress/estimate`

**Description:** Get an estimate of compression results without actually compressing.

**Request:** Multipart form data
- `file`: Video file
- `preset` (optional): Compression preset (default: "balanced")

**Response:**
```json
{
  "success": true,
  "input_size_mb": 50.5,
  "estimated_output_size_mb": 25.3,
  "estimated_compression_percent": 49.9,
  "duration": 180.0,
  "preset": "balanced"
}
```

---

## File Download

### Download Converted File

**Endpoint:** `GET /download/{file_id}`

**Description:** Download a converted or compressed file.

**Parameters:**
- `file_id` (path parameter): The file ID returned from conversion endpoints

**Response:** Binary file download

**Example:**
```bash
curl -O "http://localhost:8000/api/v1/download/compressed_abc123.mp4"
```

---

## System Endpoints

### Health Check

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy"
}
```

### API Status

**Endpoint:** `GET /api/v1/status`

**Response:**
```json
{
  "status": "online",
  "services": {
    "youtube_download": "available",
    "mp4_to_mp3": "available"
  }
}
```

---

## Compression Technology Details

### Codecs Explained

#### H.264 (x264)
- **Best for:** Maximum compatibility
- **Pros:** Plays on all devices, fast encoding
- **Cons:** Larger file sizes than newer codecs
- **Use case:** General-purpose compression, legacy device support

#### H.265 (x265/HEVC)
- **Best for:** Modern devices, storage-constrained scenarios
- **Pros:** ~50% smaller files than H.264 at same quality
- **Cons:** Slower encoding, may not play on older devices
- **Use case:** Archival, streaming on modern platforms

#### VP9
- **Best for:** Web delivery, open-source projects
- **Pros:** Royalty-free, good compression
- **Cons:** Slower encoding than H.264
- **Use case:** Web videos, YouTube-style platforms

### Quality Presets (CRF Values)

**CRF (Constant Rate Factor):**
- Lower values = better quality, larger files
- Higher values = lower quality, smaller files
- Range: 0 (lossless) to 51 (worst quality)

| Preset | CRF | Use Case |
|--------|-----|----------|
| high | 18 | Minimal quality loss, archival |
| balanced | 23 | Sweet spot for most use cases |
| high_compression | 28 | Heavy compression, acceptable quality |
| max_compression | 32 | Maximum compression, lower quality |

### Two-Pass Encoding

When specifying `target_size_mb`, the API uses two-pass encoding:

1. **First pass:** Analyzes the video to determine optimal encoding parameters
2. **Second pass:** Encodes the video using the analysis from pass 1

**Benefits:**
- More accurate file size targeting
- Better quality distribution across the video
- Optimal for streaming where file size matters

**Trade-off:**
- Takes ~2x longer than single-pass encoding

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid preset. Must be one of: high, balanced, high_compression, max_compression"
}
```

### 404 Not Found
```json
{
  "detail": "File not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Compression error: [error message]"
}
```

---

## Best Practices

### File Upload Limits
- Recommended max file size: 500MB
- Larger files may timeout depending on server configuration
- Consider implementing chunked uploads for files > 100MB

### Compression Recommendations

**For mobile viewing:**
```json
{
  "preset": "high_compression",
  "codec": "h265"
}
```

**For archival:**
```json
{
  "preset": "high",
  "codec": "h265"
}
```

**For maximum compatibility:**
```json
{
  "preset": "balanced",
  "codec": "h264"
}
```

**For web embedding:**
```json
{
  "preset": "balanced",
  "codec": "vp9"
}
```

### Performance Tips

1. **Use H.264** for fastest encoding
2. **Use estimate endpoint** before compression to verify settings
3. **Consider target_size_mb** for predictable file sizes
4. **Use H.265** when encoding time is less critical

---

## Rate Limiting

*To be implemented*

Recommended limits:
- 10 requests per minute per IP for compression
- 20 requests per minute for YouTube downloads

---

## Examples

### Complete Workflow: Compress a Video

```python
import requests

# 1. Upload and compress
with open(video.mp4, rb) as f:
    response = requests.post(
        http://localhost:8000/api/v1/compress/video,
        files={file: f},
        data={
            preset: balanced,
            codec: h265
        }
    )

result = response.json()
print(f"Compressed! Saved {result[message]}")

# 2. Download compressed file
file_id = result[file_id]
download_url = fhttp://localhost:8000/api/v1/download/{file_id}

compressed = requests.get(download_url)
with open(compressed_video.mp4, wb) as f:
    f.write(compressed.content)

print("Downloaded compressed video!")
```

### Using cURL

```bash
# Compress with balanced preset
curl -X POST "http://localhost:8000/api/v1/compress/video" \
  -F "file=@input.mp4" \
  -F "preset=balanced" \
  -F "codec=h264" \
  -o response.json

# Extract file_id from response
FILE_ID=$(cat response.json | jq -r .file_id)

# Download compressed file
curl "http://localhost:8000/api/v1/download/$FILE_ID" -o compressed.mp4
```

---

## Interactive API Documentation

Visit `/docs` for interactive Swagger UI documentation where you can test all endpoints directly in your browser.

Example: `http://localhost:8000/docs`
