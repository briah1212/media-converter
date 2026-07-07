# IMPLEMENTATION GUIDE - ConvertFast Feature Parity

## Quick Start Priority List

### 🔥 CRITICAL - Implement First (Week 1)

#### 1. Target File Size Image Compression
**Why**: This is their most marketed feature
**Difficulty**: Medium
**Impact**: High

**Implementation**:
```python
# backend/src/services/image_compression_service.py

def compress_to_target_size(
    image_path: str,
    target_size_kb: int,
    output_format: str = "jpg",
    max_iterations: int = 15,
    tolerance: float = 0.05
) -> Dict[str, Any]:
    """
    Compress image to target file size using binary search
    
    Args:
        image_path: Input image path
        target_size_kb: Target size in kilobytes
        output_format: Output format (jpg, png, webp)
        max_iterations: Maximum optimization attempts
        tolerance: Acceptable size difference (5% = 0.05)
    
    Returns:
        Dict with output path, actual size, quality used
    """
    from PIL import Image
    import os
    
    img = Image.open(image_path)
    if img.mode != 'RGB' and output_format.lower() == 'jpg':
        img = img.convert('RGB')
    
    target_bytes = target_size_kb * 1024
    quality_low = 10
    quality_high = 95
    best_output = None
    best_size = float('inf')
    
    for iteration in range(max_iterations):
        quality = (quality_low + quality_high) // 2
        
        # Compress with current quality
        output_path = f"/tmp/test_{quality}.{output_format}"
        
        if output_format.lower() == 'jpg':
            img.save(output_path, "JPEG", quality=quality, optimize=True)
        elif output_format.lower() == 'png':
            img.save(output_path, "PNG", optimize=True, compress_level=9)
        elif output_format.lower() == 'webp':
            img.save(output_path, "WEBP", quality=quality)
        
        actual_size = os.path.getsize(output_path)
        size_diff = abs(actual_size - target_bytes) / target_bytes
        
        # Check if within tolerance
        if size_diff <= tolerance:
            return {
                "output_path": output_path,
                "actual_size_kb": actual_size / 1024,
                "target_size_kb": target_size_kb,
                "quality_used": quality,
                "iterations": iteration + 1
            }
        
        # Track best attempt
        if abs(actual_size - target_bytes) < abs(best_size - target_bytes):
            if best_output and os.path.exists(best_output):
                os.remove(best_output)
            best_output = output_path
            best_size = actual_size
        else:
            os.remove(output_path)
        
        # Adjust quality range
        if actual_size > target_bytes:
            quality_high = quality - 1
        else:
            quality_low = quality + 1
        
        if quality_low > quality_high:
            break
    
    return {
        "output_path": best_output,
        "actual_size_kb": best_size / 1024,
        "target_size_kb": target_size_kb,
        "quality_used": quality,
        "iterations": max_iterations,
        "note": "Closest match within iterations"
    }
```

**API Endpoint**:
```python
# backend/src/api/routes.py

@router.post("/api/v1/compress/image/target-size")
async def compress_image_target_size(
    file: UploadFile = File(...),
    target_size_kb: int = Form(...),
    output_format: str = Form("jpg")
):
    """Compress image to specific target file size"""
    # Save uploaded file
    temp_input = f"/tmp/{uuid4()}.{file.filename.split(.)[-1]}"
    with open(temp_input, "wb") as f:
        f.write(await file.read())
    
    # Compress to target size
    result = compress_to_target_size(
        temp_input,
        target_size_kb,
        output_format
    )
    
    # Clean up input
    os.remove(temp_input)
    
    return {
        "status": "success",
        "result": result,
        "download_url": f"/api/v1/download/{result['output_path']}"
    }
```

**Testing**:
```bash
# Test various target sizes
curl -X POST "http://localhost:8001/api/v1/compress/image/target-size" \
  -F "file=@test.jpg" \
  -F "target_size_kb=100" \
  -F "output_format=jpg"

# Should return file within 95-105kb range
```

---

#### 2. HEIC Format Support
**Why**: Apple ecosystem dominance
**Difficulty**: Easy (library available)
**Impact**: High

**Installation**:
```bash
# In Dockerfile.backend or requirements.txt
pip install pillow-heif
```

**Implementation**:
```python
# backend/src/services/image_compression_service.py

from pillow_heif import register_heif_opener

# Register HEIC opener once at module level
register_heif_opener()

def convert_heic_to_jpg(heic_path: str, output_path: str, quality: int = 85):
    """Convert HEIC to JPG"""
    from PIL import Image
    img = Image.open(heic_path)
    img = img.convert('RGB')
    img.save(output_path, "JPEG", quality=quality, optimize=True)
    return output_path

def convert_to_heic(input_path: str, output_path: str, quality: int = 85):
    """Convert any image to HEIC"""
    from PIL import Image
    img = Image.open(input_path)
    img.save(output_path, "HEIF", quality=quality)
    return output_path
```

**Testing**:
```bash
# Test HEIC to JPG
curl -X POST "http://localhost:8001/api/v1/convert/image" \
  -F "file=@test.heic" \
  -F "output_format=jpg" \
  -F "quality=85"

# Test JPG to HEIC
curl -X POST "http://localhost:8001/api/v1/convert/image" \
  -F "file=@test.jpg" \
  -F "output_format=heic" \
  -F "quality=85"
```

---

#### 3. Batch Processing Infrastructure
**Why**: Core differentiator
**Difficulty**: Hard
**Impact**: Critical

**Implementation**:
```python
# backend/src/services/batch_service.py

from concurrent.futures import ProcessPoolExecutor, as_completed
from multiprocessing import cpu_count
import zipfile

class BatchProcessor:
    def __init__(self, max_workers=None):
        self.max_workers = max_workers or cpu_count()
        self.executor = ProcessPoolExecutor(max_workers=self.max_workers)
    
    def process_batch(
        self,
        files: List[str],
        operation: Callable,
        settings: Dict,
        progress_callback: Optional[Callable] = None
    ) -> List[Dict]:
        """
        Process multiple files in parallel
        
        Args:
            files: List of file paths
            operation: Function to apply (compress_image, convert_video, etc.)
            settings: Common settings for all files
            progress_callback: Function to call with progress updates
        
        Returns:
            List of results
        """
        results = []
        futures = {}
        
        # Submit all tasks
        for idx, file_path in enumerate(files):
            future = self.executor.submit(operation, file_path, **settings)
            futures[future] = {"index": idx, "file": file_path}
        
        # Collect results as they complete
        for future in as_completed(futures):
            task_info = futures[future]
            try:
                result = future.result()
                results.append({
                    "index": task_info["index"],
                    "file": task_info["file"],
                    "status": "success",
                    "result": result
                })
            except Exception as e:
                results.append({
                    "index": task_info["index"],
                    "file": task_info["file"],
                    "status": "error",
                    "error": str(e)
                })
            
            # Progress callback
            if progress_callback:
                progress = len(results) / len(files) * 100
                progress_callback(progress, len(results), len(files))
        
        return sorted(results, key=lambda x: x["index"])
    
    def create_zip(self, files: List[str], output_path: str):
        """Create ZIP file from list of files"""
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file_path in files:
                zipf.write(file_path, os.path.basename(file_path))
        return output_path
```

**API Endpoint**:
```python
@router.post("/api/v1/batch/compress/image")
async def batch_compress_images(
    files: List[UploadFile] = File(...),
    settings: str = Form(...)  # JSON string
):
    """Batch compress multiple images"""
    import json
    settings_dict = json.loads(settings)
    
    # Save uploaded files
    temp_files = []
    for file in files:
        temp_path = f"/tmp/{uuid4()}.{file.filename.split(.)[-1]}"
        with open(temp_path, "wb") as f:
            f.write(await file.read())
        temp_files.append(temp_path)
    
    # Process batch
    processor = BatchProcessor()
    results = processor.process_batch(
        temp_files,
        compress_image,
        settings_dict
    )
    
    # Create ZIP of results
    output_files = [r["result"]["output_path"] for r in results if r["status"] == "success"]
    zip_path = f"/tmp/{uuid4()}.zip"
    processor.create_zip(output_files, zip_path)
    
    return {
        "status": "success",
        "total_files": len(files),
        "successful": len(output_files),
        "failed": len(files) - len(output_files),
        "results": results,
        "download_url": f"/api/v1/download/{zip_path}"
    }
```

---

### 🎯 HIGH PRIORITY (Week 2)

#### 4. Advanced Image Optimization

**mozjpeg for JPG**:
```bash
# Install mozjpeg
apt-get install mozjpeg

# Use in Python
import subprocess

def optimize_jpg_mozjpeg(input_path, output_path, quality=85):
    subprocess.run([
        'cjpeg',
        '-quality', str(quality),
        '-optimize',
        '-progressive',
        '-outfile', output_path,
        input_path
    ])
```

**pngquant for PNG**:
```bash
pip install pngquant

def optimize_png(input_path, output_path, quality='85-95'):
    import subprocess
    subprocess.run([
        'pngquant',
        '--quality', quality,
        '--output', output_path,
        input_path
    ])
```

---

### 📋 TESTING CHECKLIST

#### Image Compression Tests
```bash
# Test script
cd /home/brian/brian/media-converter/backend

pytest -v tests/test_target_size_compression.py

# Manual tests
# 1. Compress to 10kb
curl -X POST "http://localhost:8001/api/v1/compress/image/target-size" \
  -F "file=@large_image.jpg" \
  -F "target_size_kb=10"

# Verify output is 9.5-10.5kb

# 2. Compress to 100kb
curl -X POST "http://localhost:8001/api/v1/compress/image/target-size" \
  -F "file=@large_image.jpg" \
  -F "target_size_kb=100"

# Verify output is 95-105kb

# 3. Compress to 1mb
curl -X POST "http://localhost:8001/api/v1/compress/image/target-size" \
  -F "file=@large_image.jpg" \
  -F "target_size_kb=1000"

# Verify output is 950-1050kb
```

#### HEIC Tests
```bash
# 1. HEIC to JPG
curl -X POST "http://localhost:8001/api/v1/convert/image" \
  -F "file=@test.heic" \
  -F "output_format=jpg"

# 2. JPG to HEIC
curl -X POST "http://localhost:8001/api/v1/convert/image" \
  -F "file=@test.jpg" \
  -F "output_format=heic"

# 3. Batch HEIC conversion
# Upload 10 HEIC files, convert all to JPG
```

#### Batch Tests
```bash
# 1. Small batch (10 files)
# 2. Medium batch (100 files)
# 3. Large batch (1000 files)
# 4. Mixed formats
# 5. Error handling (some invalid files)
```

---

## Development Workflow

### 1. Set up development environment
```bash
ssh bhead
cd /home/brian/brian/media-converter

# Create feature branch
git checkout -b feature/target-size-compression

# Install dependencies
cd backend
pip install pillow-heif pngquant mozjpeg-lossless-optimization
```

### 2. Implement feature
```bash
# Edit service file
vim backend/src/services/image_compression_service.py

# Add API endpoint
vim backend/src/api/routes.py

# Write tests
vim backend/tests/test_target_size_compression.py
```

### 3. Test locally
```bash
# Run tests
pytest -v

# Start backend
podman build -f Dockerfile.backend -t media-converter-backend .
podman run -d --name media-backend -p 8001:8000 localhost/media-converter-backend

# Test API
curl -X POST "http://localhost:8001/api/v1/compress/image/target-size" \
  -F "file=@test.jpg" \
  -F "target_size_kb=100"
```

### 4. Commit and push
```bash
git add .
git commit -m "feat: add target file size image compression"
git push origin feature/target-size-compression

# Merge to main when ready
git checkout main
git merge feature/target-size-compression
git push origin main
```

---

## Performance Monitoring

### Metrics to Track
```python
# Add to each service function
import time

start_time = time.time()
result = process_image(...)
processing_time = time.time() - start_time

return {
    "result": result,
    "metrics": {
        "processing_time": processing_time,
        "input_size_kb": input_size / 1024,
        "output_size_kb": output_size / 1024,
        "compression_ratio": output_size / input_size
    }
}
```

### Logging
```python
import logging

logger = logging.getLogger(__name__)

logger.info(f"Processing {filename}: {input_size}KB → {output_size}KB in {time}s")
```

---

## Next Steps

1. **This week**: Implement target size compression + HEIC support
2. **Next week**: Batch processing + advanced optimization
3. **Week 3**: PDF toolkit basics
4. **Week 4**: Polish UI and comprehensive testing

**Goal**: Match 70% of ConvertFast features in 1 month

Let's get started! 🚀
