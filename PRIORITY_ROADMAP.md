# Brian Tools - Priority Implementation Roadmap
## From Current State to World-Class Converter

**Created:** 2026-07-06  
**Goal:** Build a converter that matches/exceeds ConvertFast, CloudConvert, TinyPNG  
**Timeline:** 8-10 weeks (aggressive), 12-16 weeks (sustainable)  

---

## Executive Summary

**Current State:**
- ✅ 960 lines of backend code (image, video, audio, YouTube services)
- ✅ FFmpeg 7.1.5 with GPU support (cuda, vaapi, opencl, vulkan)
- ✅ 9 working API endpoints
- ✅ Basic Next.js frontend

**Critical Gaps:**
- ❌ No GPU acceleration implementation (have hardware, not using it)
- ❌ No real-time progress tracking
- ❌ No drag-and-drop UI
- ❌ No batch processing
- ❌ No queue system for concurrent jobs
- ❌ Limited audio processing
- ❌ No document processing

**Success Metrics:**
1. **Speed:** 1080p video (1min) < 15s with GPU, < 1s image compression
2. **Quality:** SSIM > 0.95 (structural similarity to original)
3. **Scale:** 50+ concurrent conversions
4. **UX:** Drag-drop, real-time progress, batch upload

---

## Phase 0: Foundation (Week 1) - CRITICAL

### Priority 0.1: GPU Acceleration Implementation ⚡
**Impact:** 10-15x speed improvement  
**Effort:** 2-3 days  
**Status:** MUST DO FIRST

**Tasks:**
1. Test GPU availability in container
2. Implement NVENC/CUDA video encoding
3. Benchmark CPU vs GPU performance
4. Update video service to use GPU by default

**Implementation:**

```python
# backend/src/services/gpu_video_service.py
import subprocess
import os
from typing import Dict, Optional, Literal

class GPUVideoService:
    """GPU-accelerated video processing using NVENC/CUDA."""
    
    def __init__(self):
        self.gpu_available = self._check_gpu()
    
    def _check_gpu(self) -> bool:
        """Check if NVIDIA GPU is available."""
        try:
            result = subprocess.run(
                ['nvidia-smi'],
                capture_output=True,
                text=True
            )
            return result.returncode == 0
        except FileNotFoundError:
            return False
    
    def compress_with_gpu(
        self,
        input_file: str,
        codec: Literal['h264', 'h265'] = 'h264',
        quality: int = 23,  # CRF equivalent
        preset: str = 'p7',  # p1-p7, p7=best quality
        output_file: Optional[str] = None
    ) -> Dict:
        """
        Compress video using NVIDIA GPU.
        
        Performance gains:
        - H.264: 5-10x faster than libx264
        - H.265: 10-15x faster than libx265
        - Quality: Nearly identical at same bitrate
        
        Args:
            input_file: Input video path
            codec: 'h264' or 'h265'
            quality: 0-51 (lower=better, 23=balanced)
            preset: p1 (fastest) to p7 (best quality)
            output_file: Output path (auto if None)
            
        Returns:
            Compression result with stats
        """
        if not self.gpu_available:
            raise RuntimeError("NVIDIA GPU not available. Install drivers: nvidia-smi")
        
        if output_file is None:
            output_file = f"/app/downloads/{os.path.basename(input_file)}.compressed.mp4"
        
        # Select encoder
        encoder = 'h264_nvenc' if codec == 'h264' else 'hevc_nvenc'
        
        # Build FFmpeg command
        cmd = [
            'ffmpeg',
            '-hwaccel', 'cuda',                    # GPU decode
            '-hwaccel_output_format', 'cuda',      # Keep on GPU
            '-i', input_file,
            '-c:v', encoder,                       # GPU encode
            '-preset', preset,                     # Quality preset
            '-rc', 'vbr',                          # Variable bitrate
            '-cq', str(quality),                   # Quality (CRF equivalent)
            '-b:v', '0',                           # Let CQ control bitrate
            '-c:a', 'aac',                         # Audio codec
            '-b:a', '192k',                        # Audio bitrate
            '-movflags', '+faststart',             # Web optimization
            '-y',                                  # Overwrite
            output_file
        ]
        
        # Execute
        import time
        start_time = time.time()
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True
        )
        
        elapsed = time.time() - start_time
        
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg failed: {result.stderr}")
        
        # Get file sizes
        input_size = os.path.getsize(input_file)
        output_size = os.path.getsize(output_file)
        compression_ratio = (1 - output_size / input_size) * 100
        
        return {
            'success': True,
            'output_path': output_file,
            'input_size_mb': round(input_size / 1024 / 1024, 2),
            'output_size_mb': round(output_size / 1024 / 1024, 2),
            'compression_ratio': round(compression_ratio, 2),
            'processing_time': round(elapsed, 2),
            'gpu_used': True,
            'codec': codec,
            'preset': preset
        }
    
    def convert_resolution_gpu(
        self,
        input_file: str,
        target_resolution: Literal['4k', '1080p', '720p', '480p', '360p'],
        codec: str = 'h264',
        quality: int = 23
    ) -> Dict:
        """
        Change video resolution using GPU scaling.
        
        Resolutions:
        - 4k: 3840x2160
        - 1080p: 1920x1080
        - 720p: 1280x720
        - 480p: 854x480
        - 360p: 640x360
        """
        # Resolution mapping
        resolutions = {
            '4k': '3840:2160',
            '1080p': '1920:1080',
            '720p': '1280:720',
            '480p': '854:480',
            '360p': '640:360'
        }
        
        scale = resolutions[target_resolution]
        encoder = 'h264_nvenc' if codec == 'h264' else 'hevc_nvenc'
        output_file = f"/app/downloads/{os.path.basename(input_file)}.{target_resolution}.mp4"
        
        cmd = [
            'ffmpeg',
            '-hwaccel', 'cuda',
            '-i', input_file,
            '-vf', f'scale_cuda={scale}',          # GPU scaling
            '-c:v', encoder,
            '-preset', 'p7',
            '-cq', str(quality),
            '-c:a', 'copy',                        # Copy audio (faster)
            '-y',
            output_file
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            raise RuntimeError(f"Resolution conversion failed: {result.stderr}")
        
        return {
            'success': True,
            'output_path': output_file,
            'resolution': target_resolution,
            'gpu_used': True
        }
```

**Testing:**
```bash
# Test GPU availability
ssh bhead "podman exec media-backend nvidia-smi"

# Test GPU encoding
ssh bhead "podman exec media-backend python -c '
from src.services.gpu_video_service import GPUVideoService
svc = GPUVideoService()
print(f\"GPU Available: {svc.gpu_available}\")
'"

# Benchmark: Create a test video
ssh bhead "podman exec media-backend ffmpeg -f lavfi -i testsrc=duration=60:size=1920x1080:rate=30 -pix_fmt yuv420p /app/test_1080p_60s.mp4"

# Test GPU compression
ssh bhead "podman exec media-backend python -c '
import time
from src.services.gpu_video_service import GPUVideoService

svc = GPUVideoService()
start = time.time()
result = svc.compress_with_gpu(\"/app/test_1080p_60s.mp4\", codec=\"h264\", quality=23)
elapsed = time.time() - start

print(f\"GPU Compression: {elapsed:.2f}s\")
print(f\"Compression ratio: {result[\"compression_ratio\"]}%\")
'"
```

**Expected Results:**
- 1080p 60s video: < 15 seconds processing
- Compression ratio: 50-70%
- Quality: SSIM > 0.95

---

### Priority 0.2: Real-Time Progress Tracking (WebSocket)
**Impact:** Critical for UX  
**Effort:** 2-3 days  
**Dependencies:** None

**Implementation:**

```python
# backend/src/websocket/progress_manager.py
from fastapi import WebSocket
from typing import Dict, Set
import asyncio
import json

class ProgressManager:
    """Manage WebSocket connections for real-time progress."""
    
    def __init__(self):
        # task_id -> Set of WebSocket connections
        self.connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, task_id: str):
        """Register a client for task updates."""
        await websocket.accept()
        
        if task_id not in self.connections:
            self.connections[task_id] = set()
        
        self.connections[task_id].add(websocket)
        print(f"Client connected to task {task_id}. Total: {len(self.connections[task_id])}")
    
    async def disconnect(self, websocket: WebSocket, task_id: str):
        """Unregister a client."""
        if task_id in self.connections:
            self.connections[task_id].discard(websocket)
            
            # Clean up empty sets
            if not self.connections[task_id]:
                del self.connections[task_id]
        
        print(f"Client disconnected from task {task_id}")
    
    async def send_progress(
        self,
        task_id: str,
        progress: int,
        status: str,
        message: str = "",
        metadata: Dict = None
    ):
        """
        Send progress update to all connected clients.
        
        Args:
            task_id: Task identifier
            progress: Progress percentage (0-100)
            status: 'queued', 'processing', 'completed', 'failed'
            message: Status message
            metadata: Additional data
        """
        if task_id not in self.connections:
            return
        
        payload = {
            'task_id': task_id,
            'progress': progress,
            'status': status,
            'message': message,
            'metadata': metadata or {},
            'timestamp': asyncio.get_event_loop().time()
        }
        
        # Send to all connected clients
        disconnected = []
        for ws in self.connections[task_id]:
            try:
                await ws.send_json(payload)
            except Exception as e:
                print(f"Error sending to client: {e}")
                disconnected.append(ws)
        
        # Clean up disconnected clients
        for ws in disconnected:
            await self.disconnect(ws, task_id)

# Global instance
progress_manager = ProgressManager()


# backend/src/api/websocket_routes.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from src.websocket.progress_manager import progress_manager

ws_router = APIRouter()

@ws_router.websocket("/ws/progress/{task_id}")
async def websocket_progress(websocket: WebSocket, task_id: str):
    """WebSocket endpoint for real-time progress updates."""
    await progress_manager.connect(websocket, task_id)
    
    try:
        # Keep connection alive
        while True:
            # Wait for client messages (e.g., ping/pong)
            data = await websocket.receive_text()
            
            if data == "ping":
                await websocket.send_text("pong")
    
    except WebSocketDisconnect:
        await progress_manager.disconnect(websocket, task_id)
    except Exception as e:
        print(f"WebSocket error: {e}")
        await progress_manager.disconnect(websocket, task_id)


# Usage in conversion service
async def compress_video_with_progress(file_path: str, task_id: str):
    """Example: Video compression with progress tracking."""
    from src.websocket.progress_manager import progress_manager
    
    # Start
    await progress_manager.send_progress(
        task_id, 0, 'processing', 'Starting compression...'
    )
    
    # Simulate progress (in real implementation, parse FFmpeg output)
    for i in range(0, 101, 10):
        await progress_manager.send_progress(
            task_id, i, 'processing', f'Compressing... {i}%'
        )
        await asyncio.sleep(1)  # Actual work here
    
    # Complete
    await progress_manager.send_progress(
        task_id, 100, 'completed', 'Compression finished!',
        metadata={'output_path': '/app/downloads/output.mp4'}
    )
```

**Frontend Integration:**
```typescript
// frontend/hooks/useProgress.ts
import { useEffect, useState } from 'react'
import io from 'socket.io-client'

interface ProgressData {
  progress: number
  status: 'queued' | 'processing' | 'completed' | 'failed'
  message: string
  metadata?: any
}

export function useProgress(taskId: string) {
  const [progress, setProgress] = useState<ProgressData>({
    progress: 0,
    status: 'queued',
    message: 'Waiting...'
  })
  
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8001/ws/progress/${taskId}`)
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setProgress(data)
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
    
    // Ping to keep alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('ping')
      }
    }, 30000)
    
    return () => {
      clearInterval(pingInterval)
      ws.close()
    }
  }, [taskId])
  
  return progress
}
```


---

### Priority 0.3: Drag & Drop Frontend
**Impact:** Core UX feature  
**Effort:** 1-2 days  
**Dependencies:** None

**Installation:**
```bash
ssh bhead "podman exec media-frontend npm install react-dropzone framer-motion"
```

**Implementation:**
```typescript
// frontend/components/FileUploader.tsx
'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'

interface FileUploaderProps {
  accept?: Record<string, string[]>
  maxSize?: number
  onUpload: (files: File[]) => void
  multiple?: boolean
}

export default function FileUploader({
  accept = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.webm']
  },
  maxSize = 2 * 1024 * 1024 * 1024, // 2GB
  onUpload,
  multiple = true
}: FileUploaderProps) {
  const [files, setFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (acceptedFiles.length > 0) {
      setFiles(acceptedFiles)
      onUpload(acceptedFiles)
    }
    
    if (rejectedFiles.length > 0) {
      alert(`Some files were rejected: ${rejectedFiles.map(f => f.file.name).join(', ')}`)
    }
  }, [onUpload])
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropAccepted: () => setIsDragging(false),
    onDropRejected: () => setIsDragging(false)
  })
  
  return (
    <motion.div
      {...getRootProps()}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      <input {...getInputProps()} />
      
      <div
        style={{
          border: isDragActive ? '3px dashed #667eea' : '2px dashed #ccc',
          borderRadius: '16px',
          padding: '4rem 2rem',
          textAlign: 'center',
          background: isDragActive 
            ? 'linear-gradient(135deg, #667eea22 0%, #764ba222 100%)'
            : 'white',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          minHeight: '300px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <AnimatePresence mode="wait">
          {isDragActive ? (
            <motion.div
              key="dragging"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📥</div>
              <h3 style={{ fontSize: '1.5rem', color: '#667eea' }}>
                Drop files here!
              </h3>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📁</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#333' }}>
                Drag & drop files here
              </h3>
              <p style={{ color: '#666', marginBottom: '1rem' }}>
                or click to browse
              </p>
              <p style={{ fontSize: '0.875rem', color: '#999' }}>
                Max size: 2GB • Supports: Images, Videos, Audio
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        
        {files.length > 0 && !isDragActive && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: '2rem', width: '100%' }}
          >
            <h4 style={{ marginBottom: '1rem', color: '#333' }}>
              Selected files ({files.length}):
            </h4>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {files.map((file, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.75rem',
                    background: '#f5f5f5',
                    borderRadius: '8px',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{file.name}</span>
                  <span style={{ color: '#666', fontSize: '0.875rem' }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
```

---

## Phase 1: Core Enhancements (Week 2-3)

### 1.1: Advanced Audio Service
**Status:** Only MP4→MP3 exists  
**Need:** Full audio converter

**Features:**
- Format conversion (MP3, WAV, FLAC, AAC, OGG, M4A, OPUS)
- Bitrate control (64-320 kbps)
- Sample rate conversion
- Volume normalization
- Trim/fade effects
- Metadata editing

**Implementation:** See  (to be created)

### 1.2: Video Enhancement Features
**Current:** Basic compression  
**Need:** Professional features

**Add:**
- Trimming/cutting
- Resolution conversion presets (4K, 1080p, 720p, 480p, 360p)
- Frame rate conversion (24fps, 30fps, 60fps)
- Aspect ratio conversion (16:9, 4:3, 1:1, 9:16)
- Video to GIF conversion
- Subtitle embedding

### 1.3: Batch Processing API
**Impact:** Handle multiple files efficiently  
**Effort:** 2-3 days

```python
# backend/src/api/batch_routes.py
from fastapi import APIRouter, UploadFile, File
from typing import List
import asyncio

batch_router = APIRouter()

@batch_router.post("/api/v1/batch/compress/images")
async def batch_compress_images(
    files: List[UploadFile] = File(...),
    mode: str = "balanced",
    quality: int = 85
):
    """
    Compress multiple images in parallel.
    
    Limits:
    - Max 100 files per batch
    - Max 2GB total size
    """
    if len(files) > 100:
        raise HTTPException(400, "Max 100 files per batch")
    
    # Process in parallel
    from concurrent.futures import ThreadPoolExecutor
    
    results = []
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [
            executor.submit(
                image_service.compress_image,
                file,
                mode=mode,
                quality=quality
            )
            for file in files
        ]
        
        for future in futures:
            results.append(future.result())
    
    return {
        "success": True,
        "total": len(files),
        "completed": len([r for r in results if r['success']]),
        "failed": len([r for r in results if not r['success']]),
        "results": results
    }
```

---

## Phase 2: Performance & Scale (Week 4-5)

### 2.1: Task Queue System (Celery + Redis)
**Impact:** Handle 50+ concurrent conversions  
**Effort:** 3-4 days

**Why:**
- Current: Synchronous processing (one at a time)
- Needed: Async queue for concurrent jobs
- Benefits: Better resource utilization, no blocking

**Architecture:**
```
Request → API → Queue → Workers (4-8) → Progress Updates → Complete
```

**Installation:**
```bash
# Add to requirements.txt
celery==5.4.0
redis==5.1.0

# Run Redis
podman run -d --name redis -p 6379:6379 redis:7-alpine

# Run Celery workers
celery -A src.tasks worker --loglevel=info --concurrency=4
```

**Implementation:**
```python
# backend/src/tasks.py
from celery import Celery
from src.services.video_compression_service import VideoCompressionService

app = Celery('brian_tools', broker='redis://localhost:6379/0')

@app.task(bind=True)
def compress_video_task(self, input_path, settings):
    """Background task for video compression."""
    service = VideoCompressionService()
    
    # Update progress
    self.update_state(
        state='PROGRESS',
        meta={'progress': 0, 'status': 'Starting...'}
    )
    
    # Do compression
    result = service.compress_video(input_path, **settings)
    
    self.update_state(
        state='PROGRESS',
        meta={'progress': 100, 'status': 'Complete'}
    )
    
    return result
```

### 2.2: Caching Layer (Redis)
**Impact:** 50-80% faster for repeated conversions  
**Effort:** 1-2 days

**What to cache:**
- Common image compressions (same file hash + settings)
- Video thumbnails
- API responses
- User presets

### 2.3: Rate Limiting
**Impact:** Prevent abuse  
**Effort:** 1 day

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/v1/compress/video")
@limiter.limit("10/minute")  # 10 requests per minute
async def compress_video(request: Request, ...):
    ...
```

---

## Phase 3: Advanced Features (Week 6-8)

### 3.1: Document Processing
- PDF compression (Ghostscript)
- PDF merge/split (PyPDF2)
- PDF to images (pdf2image)
- OCR (Tesseract)

### 3.2: Enhanced UI
- Conversion presets UI
- History page
- Analytics dashboard
- Settings panel

### 3.3: Cloud Integration (Optional)
- S3-compatible storage
- Google Drive integration
- Dropbox integration

---

## Testing Requirements

### Performance Benchmarks

| Test | Target | Test Command |
|------|--------|--------------|
| Image compress (1MB PNG) | < 1s | `time compress_image(test.png)` |
| Video compress (1080p 1min) | < 15s | `time compress_video_gpu(test.mp4)` |
| Batch (100 images) | < 30s | `time batch_compress(images)` |
| Concurrent (10 videos) | All < 60s | `parallel_test()` |

### Quality Metrics

| Format | Target SSIM | Target Compression |
|--------|-------------|-------------------|
| PNG (lossless) | > 0.99 | 20-40% |
| JPEG (balanced) | > 0.95 | 50-70% |
| WebP (balanced) | > 0.95 | 60-80% |
| Video H.264 (CRF 23) | > 0.95 | 50-70% |

### Testing Commands

```bash
# Create test files
ssh bhead "podman exec media-backend bash -c '
# Test image (1920x1080 PNG, ~1MB)
convert -size 1920x1080 xc:blue test_image.png

# Test video (1080p, 60 seconds, ~50MB)
ffmpeg -f lavfi -i testsrc=duration=60:size=1920x1080:rate=30 -pix_fmt yuv420p test_video.mp4
'"

# Run tests
ssh bhead "podman exec media-backend pytest -v tests/ --benchmark"

# GPU benchmark
ssh bhead "podman exec media-backend python -m pytest tests/test_performance.py -v"
```

---

## Implementation Checklist

### Week 1: Foundation
- [ ] Implement GPU acceleration (NVENC/CUDA)
- [ ] Add WebSocket progress tracking
- [ ] Create drag-and-drop frontend component
- [ ] Test GPU vs CPU performance
- [ ] Document GPU setup process

### Week 2-3: Core Features
- [ ] Build comprehensive audio service
- [ ] Add video trimming/cutting
- [ ] Add resolution conversion
- [ ] Implement batch processing API
- [ ] Add format-specific optimizations

### Week 4-5: Performance
- [ ] Set up Celery + Redis queue
- [ ] Implement caching layer
- [ ] Add rate limiting
- [ ] Optimize parallel processing
- [ ] Load testing (100+ concurrent)

### Week 6-8: Polish
- [ ] Document processing (PDF)
- [ ] Enhanced UI components
- [ ] Conversion history
- [ ] User presets
- [ ] Analytics dashboard

### Week 9-10: Production Ready
- [ ] Comprehensive test suite
- [ ] Performance benchmarks
- [ ] Security audit
- [ ] Documentation
- [ ] Deployment guides

---

## Success Criteria

### Speed ⚡
- ✅ Image compression: < 1s for 1MB file
- ✅ Video compression (GPU): < 15s for 1080p 1min
- ✅ Batch processing: 100 images < 30s
- ✅ Concurrent: 50+ simultaneous conversions

### Quality 🎯
- ✅ SSIM > 0.95 for balanced mode
- ✅ Compression ratio: 50-70% average
- ✅ No visible artifacts
- ✅ Metadata preservation

### Scale 📈
- ✅ Handle 2GB files
- ✅ Process 100+ files in batch
- ✅ 50+ concurrent users
- ✅ 99.9% uptime

### UX 🎨
- ✅ Drag-and-drop upload
- ✅ Real-time progress
- ✅ < 3 clicks to convert
- ✅ Mobile responsive

---

## Quick Start - First Steps

### 1. Test GPU (5 minutes)
```bash
ssh bhead "podman exec media-backend nvidia-smi"
# Should show GPU info

ssh bhead "podman exec media-backend ffmpeg -hwaccels"
# Should show: cuda, vaapi, opencl
```

### 2. Create GPU Service (30 minutes)
```bash
ssh bhead "podman exec media-backend bash -c 'mkdir -p /app/src/services'"

# Copy GPU service code from above
# Test with sample video
```

### 3. Add WebSocket (1 hour)
```bash
# Add python-socketio to requirements
# Implement progress manager
# Test with frontend
```

### 4. Frontend Drag-Drop (2 hours)
```bash
ssh bhead "podman exec media-frontend npm install react-dropzone framer-motion"
# Add FileUploader component
# Test upload flow
```

---

## Resources & References

**Best Practices:**
- FFmpeg Wiki: https://trac.ffmpeg.org/wiki
- NVIDIA Video Codec SDK: https://developer.nvidia.com/nvidia-video-codec-sdk
- Image Optimization: https://web.dev/fast/#optimize-your-images

**Similar Projects:**
- CloudConvert: https://cloudconvert.com
- HandBrake: https://handbrake.fr
- TinyPNG: https://tinypng.com

**Libraries:**
- FFmpeg-python: https://github.com/kkroening/ffmpeg-python
- Celery: https://docs.celeryproject.org
- React Query: https://tanstack.com/query

---

## Questions & Next Steps

1. **Do you have NVIDIA GPU?** Run: `nvidia-smi` to check
2. **What's your priority?** Speed (GPU) or Features (audio/docs)?
3. **Timeline?** Aggressive (8 weeks) or Sustainable (12-16 weeks)?

**Recommended Start:**
1. Week 1: GPU + Progress + Drag-Drop (3 critical UX wins)
2. Week 2: Audio service (most requested feature)
3. Week 3: Batch processing (scale up)
4. Week 4: Queue system (handle load)

Would you like me to start implementing any of these phases?

