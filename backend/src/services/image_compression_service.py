"""Image compression and optimization service using Pillow and system tools."""
import os
import subprocess
import uuid
import imghdr
from pathlib import Path
from typing import Literal, Optional, Dict, Tuple
from enum import Enum
from PIL import Image, ImageFile
import io

# Allow loading of truncated images
ImageFile.LOAD_TRUNCATED_IMAGES = True


class ImageFormat(str, Enum):
    """Supported image formats."""
    PNG = "png"
    JPEG = "jpeg"
    JPG = "jpg"
    WEBP = "webp"
    GIF = "gif"
    BMP = "bmp"
    TIFF = "tiff"


class CompressionMode(str, Enum):
    """Image compression modes."""
    LOSSLESS = "lossless"      # No quality loss
    BALANCED = "balanced"       # Good quality, smaller size
    AGGRESSIVE = "aggressive"   # Maximum compression


class ImageCompressionService:
    """Service for compressing and optimizing images."""
    
    def __init__(self, output_dir: str = "/app/downloads"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def detect_format(self, file_path: str) -> str:
        """
        Automatically detect image format.
        
        Args:
            file_path: Path to image file
            
        Returns:
            Detected format (png, jpeg, webp, etc.)
        """
        try:
            with Image.open(file_path) as img:
                format_name = img.format.lower() if img.format else None
                
            # Fallback to imghdr if Pillow fails
            if not format_name:
                format_name = imghdr.what(file_path)
            
            # Normalize format names
            if format_name in ['jpg', 'jpeg']:
                return 'jpeg'
            
            return format_name or 'unknown'
        except Exception as e:
            # Last resort: check file extension
            ext = Path(file_path).suffix.lower().lstrip('.')
            return ext if ext else 'unknown'
    
    def get_image_info(self, file_path: str) -> Dict:
        """
        Get detailed image information.
        
        Args:
            file_path: Path to image file
            
        Returns:
            Dictionary with image metadata
        """
        try:
            with Image.open(file_path) as img:
                file_size = os.path.getsize(file_path)
                
                return {
                    "format": img.format.lower() if img.format else "unknown",
                    "mode": img.mode,
                    "width": img.width,
                    "height": img.height,
                    "size_bytes": file_size,
                    "size_mb": round(file_size / (1024 * 1024), 2),
                    "has_transparency": img.mode in ('RGBA', 'LA', 'P') or (
                        img.mode == 'P' and 'transparency' in img.info
                    ),
                }
        except Exception as e:
            raise ValueError(f"Failed to read image: {str(e)}")
    
    def compress_image(
        self,
        input_path: str,
        mode: CompressionMode = CompressionMode.BALANCED,
        target_format: Optional[ImageFormat] = None,
        quality: Optional[int] = None,
        max_width: Optional[int] = None,
        max_height: Optional[int] = None,
        output_path: Optional[str] = None,
    ) -> Dict:
        """
        Compress and optimize an image.
        
        Args:
            input_path: Path to input image
            mode: Compression mode
            target_format: Convert to this format (optional)
            quality: Custom quality (1-100, optional)
            max_width: Maximum width (resizes if larger)
            max_height: Maximum height (resizes if larger)
            output_path: Custom output path (optional)
            
        Returns:
            Dictionary with compression results
        """
        input_file = Path(input_path)
        
        if not input_file.exists():
            raise FileNotFoundError(f"Input file not found: {input_path}")
        
        # Get input info
        input_info = self.get_image_info(input_path)
        detected_format = input_info['format']
        
        # Open image
        with Image.open(input_path) as img:
            # Convert RGBA to RGB if saving as JPEG
            output_format = target_format.value if target_format else detected_format
            if output_format in ['jpeg', 'jpg'] and img.mode in ('RGBA', 'LA', 'P'):
                # Create white background
                rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = rgb_img
            
            # Resize if needed
            if max_width or max_height:
                img = self._resize_image(img, max_width, max_height)
            
            # Generate output path
            if output_path is None:
                unique_id = str(uuid.uuid4())[:8]
                ext = output_format if output_format != 'jpeg' else 'jpg'
                output_path = str(self.output_dir / f"compressed_{unique_id}.{ext}")
            
            output_file = Path(output_path)
            
            # Compress based on format
            if output_format in ['jpeg', 'jpg']:
                self._compress_jpeg(img, output_path, mode, quality)
            elif output_format == 'png':
                self._compress_png(img, output_path, mode)
            elif output_format == 'webp':
                self._compress_webp(img, output_path, mode, quality)
            elif output_format == 'gif':
                self._compress_gif(img, output_path)
            else:
                # Default save
                img.save(output_path, optimize=True)
            
            # Get output info
            output_info = self.get_image_info(output_path)
            
            # Calculate compression ratio
            input_size = input_info['size_bytes']
            output_size = output_info['size_bytes']
            compression_ratio = ((input_size - output_size) / input_size) * 100 if input_size > 0 else 0
            
            return {
                "success": True,
                "input_path": str(input_file),
                "output_path": str(output_file),
                "input_format": detected_format,
                "output_format": output_format,
                "input_size_kb": round(input_size / 1024, 2),
                "output_size_kb": round(output_size / 1024, 2),
                "compression_ratio": round(compression_ratio, 2),
                "original_dimensions": f"{input_info['width']}x{input_info['height']}",
                "output_dimensions": f"{output_info['width']}x{output_info['height']}",
                "mode": mode.value,
            }
    
    def _resize_image(
        self, 
        img: Image.Image, 
        max_width: Optional[int], 
        max_height: Optional[int]
    ) -> Image.Image:
        """Resize image maintaining aspect ratio."""
        width, height = img.size
        
        if max_width and width > max_width:
            ratio = max_width / width if width > 0 else 1
            height = int(height * ratio)
            width = max_width
        
        if max_height and height > max_height:
            ratio = max_height / height if height > 0 else 1
            width = int(width * ratio)
            height = max_height
        
        if (width, height) != img.size:
            img = img.resize((width, height), Image.Resampling.LANCZOS)
        
        return img
    
    def _compress_jpeg(
        self, 
        img: Image.Image, 
        output_path: str, 
        mode: CompressionMode,
        custom_quality: Optional[int] = None
    ):
        """Compress JPEG image."""
        if custom_quality:
            quality = custom_quality
        else:
            quality_map = {
                CompressionMode.LOSSLESS: 95,
                CompressionMode.BALANCED: 85,
                CompressionMode.AGGRESSIVE: 75,
            }
            quality = quality_map[mode]
        
        img.save(
            output_path,
            'JPEG',
            quality=quality,
            optimize=True,
            progressive=True,  # Progressive JPEGs load faster
        )
    
    def _compress_png(
        self, 
        img: Image.Image, 
        output_path: str, 
        mode: CompressionMode
    ):
        """Compress PNG image."""
        # Save with Pillow optimization
        compress_level_map = {
            CompressionMode.LOSSLESS: 6,
            CompressionMode.BALANCED: 9,
            CompressionMode.AGGRESSIVE: 9,
        }
        
        compress_level = compress_level_map[mode]
        
        img.save(
            output_path,
            'PNG',
            optimize=True,
            compress_level=compress_level,
        )
        
        # For aggressive mode, try optipng if available
        if mode == CompressionMode.AGGRESSIVE:
            self._try_optipng(output_path)
    
    def _compress_webp(
        self, 
        img: Image.Image, 
        output_path: str, 
        mode: CompressionMode,
        custom_quality: Optional[int] = None
    ):
        """Compress WebP image."""
        if custom_quality:
            quality = custom_quality
        else:
            quality_map = {
                CompressionMode.LOSSLESS: 95,
                CompressionMode.BALANCED: 85,
                CompressionMode.AGGRESSIVE: 75,
            }
            quality = quality_map[mode]
        
        # WebP supports both lossy and lossless
        lossless = mode == CompressionMode.LOSSLESS
        
        img.save(
            output_path,
            'WEBP',
            quality=quality,
            method=6,  # Slowest but best compression
            lossless=lossless,
        )
    
    def _compress_gif(self, img: Image.Image, output_path: str):
        """Compress GIF image."""
        img.save(
            output_path,
            'GIF',
            optimize=True,
            save_all=True,  # Save all frames for animated GIFs
        )
    
    def _try_optipng(self, file_path: str):
        """Try to further optimize PNG with optipng."""
        try:
            subprocess.run(
                ['optipng', '-o7', '-quiet', file_path],
                timeout=30,
                check=False,  # Don't fail if optipng not available
            )
        except (FileNotFoundError, subprocess.TimeoutExpired):
            # optipng not available or timeout, skip
            pass
    
    def convert_format(
        self,
        input_path: str,
        target_format: ImageFormat,
        output_path: Optional[str] = None,
    ) -> Dict:
        """
        Convert image to a different format.
        
        Args:
            input_path: Path to input image
            target_format: Target format
            output_path: Custom output path (optional)
            
        Returns:
            Dictionary with conversion results
        """
        return self.compress_image(
            input_path=input_path,
            target_format=target_format,
            mode=CompressionMode.BALANCED,
            output_path=output_path,
        )
    
    def batch_compress(
        self,
        input_paths: list[str],
        mode: CompressionMode = CompressionMode.BALANCED,
        **kwargs
    ) -> list[Dict]:
        """
        Compress multiple images.
        
        Args:
            input_paths: List of input file paths
            mode: Compression mode
            **kwargs: Additional arguments for compress_image
            
        Returns:
            List of compression results
        """
        results = []
        
        for input_path in input_paths:
            try:
                result = self.compress_image(
                    input_path=input_path,
                    mode=mode,
                    **kwargs
                )
                results.append(result)
            except Exception as e:
                results.append({
                    "success": False,
                    "input_path": input_path,
                    "error": str(e),
                })
        
        return results
    def compress_to_target_size(
        self,
        file_path: str,
        target_size_kb: int,
        output_format: str = "jpeg",
        max_iterations: int = 15,
        tolerance: float = 0.05,
        resize_if_needed: bool = True
    ) -> Dict:
        """
        Compress image to target file size using binary search.
        
        Args:
            file_path: Input image path
            target_size_kb: Target size in kilobytes
            output_format: Output format (jpeg, png, webp)
            max_iterations: Maximum optimization attempts
            tolerance: Acceptable size difference (5% = 0.05)
            resize_if_needed: If True, reduce dimensions if target cannot be met
            
        Returns:
            Dict with output path, actual size, quality used, etc.
        """
        # Validate inputs
        if target_size_kb <= 0:
            raise ValueError("Target size must be greater than 0")
        
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Input file not found: {file_path}")
        
        img = Image.open(file_path)
        original_size = os.path.getsize(file_path) / 1024
        
        if output_format.lower() in ["jpeg", "jpg"] and img.mode not in ["RGB", "L"]:
            img = img.convert("RGB")
        
        target_bytes = target_size_kb * 1024
        quality_low = 10
        quality_high = 95
        best_output = None
        best_size = float("inf")
        best_quality = 85
        
        output_path = f"{self.output_dir}/{uuid.uuid4()}.{output_format}"
        
        for iteration in range(max_iterations):
            quality = (quality_low + quality_high) // 2
            temp_path = f"{self.output_dir}/temp_{uuid.uuid4()}.{output_format}"
            
            try:
                if output_format.lower() in ["jpeg", "jpg"]:
                    img.save(temp_path, "JPEG", quality=quality, optimize=True, progressive=True)
                elif output_format.lower() == "png":
                    img.save(temp_path, "PNG", optimize=True, compress_level=9)
                elif output_format.lower() == "webp":
                    img.save(temp_path, "WEBP", quality=quality, method=6)
                else:
                    img.save(temp_path, format=output_format.upper(), quality=quality)
                
                actual_size = os.path.getsize(temp_path)
                size_diff = abs(actual_size - target_bytes) / target_bytes
                
                if size_diff <= tolerance:
                    if best_output and os.path.exists(best_output):
                        os.remove(best_output)
                    os.rename(temp_path, output_path)
                    
                    return {
                        "status": "success",
                        "output_path": str(output_path),
                        "original_size_kb": round(original_size, 2),
                        "target_size_kb": target_size_kb,
                        "actual_size_kb": round(actual_size / 1024, 2),
                        "quality_used": quality,
                        "iterations": iteration + 1,
                        "compression_ratio": round(actual_size / (original_size * 1024), 3),
                        "dimensions": f"{img.width}x{img.height}",
                        "format": output_format.upper()
                    }
                
                if abs(actual_size - target_bytes) < abs(best_size - target_bytes):
                    if best_output and os.path.exists(best_output):
                        os.remove(best_output)
                    best_output = temp_path
                    best_size = actual_size
                    best_quality = quality
                else:
                    os.remove(temp_path)
                
                if actual_size > target_bytes:
                    quality_high = quality - 1
                else:
                    quality_low = quality + 1
                
                if quality_low > quality_high:
                    break
                    
            except Exception:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                continue
        
        if resize_if_needed and best_size > target_bytes * 1.2:
            scale_factor = 0.8
            attempts = 0
            max_resize_attempts = 5
            
            while attempts < max_resize_attempts and best_size > target_bytes * 1.1:
                new_width = int(img.width * scale_factor)
                new_height = int(img.height * scale_factor)
                
                if new_width < 100 or new_height < 100:
                    break
                
                resized_img = img.resize((new_width, new_height), Image.LANCZOS)
                temp_path = f"{self.output_dir}/temp_resized_{uuid.uuid4()}.{output_format}"
                
                if output_format.lower() in ["jpeg", "jpg"]:
                    resized_img.save(temp_path, "JPEG", quality=best_quality, optimize=True, progressive=True)
                elif output_format.lower() == "png":
                    resized_img.save(temp_path, "PNG", optimize=True, compress_level=9)
                elif output_format.lower() == "webp":
                    resized_img.save(temp_path, "WEBP", quality=best_quality, method=6)
                
                actual_size = os.path.getsize(temp_path)
                
                if abs(actual_size - target_bytes) < abs(best_size - target_bytes):
                    if best_output and os.path.exists(best_output):
                        os.remove(best_output)
                    best_output = temp_path
                    best_size = actual_size
                    img = resized_img
                else:
                    os.remove(temp_path)
                    break
                
                attempts += 1
                scale_factor *= 0.9
        
        if best_output and os.path.exists(best_output):
            os.rename(best_output, output_path)
        else:
            img.save(output_path, format=output_format.upper(), quality=75, optimize=True)
            best_size = os.path.getsize(output_path)
        
        return {
            "status": "success" if abs(best_size - target_bytes) / target_bytes <= 0.15 else "best_effort",
            "output_path": str(output_path),
            "original_size_kb": round(original_size, 2),
            "target_size_kb": target_size_kb,
            "actual_size_kb": round(best_size / 1024, 2),
            "quality_used": best_quality,
            "iterations": max_iterations,
            "compression_ratio": round(best_size / (original_size * 1024), 3),
            "dimensions": f"{img.width}x{img.height}",
            "format": output_format.upper(),
            "note": "Resized to meet target" if resize_if_needed else "Best match"
        }


    def convert_heic(self, file_path: str, output_format: str = "jpeg", quality: int = 90) -> Dict:
        """Convert HEIC/HEIF format to other formats."""
        try:
            from pillow_heif import register_heif_opener
            register_heif_opener()
        except ImportError:
            return {"status": "error", "error": "pillow-heif not installed"}
        
        try:
            img = Image.open(file_path)
            original_size = os.path.getsize(file_path)
            output_path = f"{self.output_dir}/{uuid.uuid4()}.{output_format}"
            
            if output_format.lower() in ["jpeg", "jpg"] and img.mode not in ["RGB", "L"]:
                img = img.convert("RGB")
            
            if output_format.lower() in ["jpeg", "jpg"]:
                img.save(output_path, "JPEG", quality=quality, optimize=True, progressive=True)
            elif output_format.lower() == "png":
                img.save(output_path, "PNG", optimize=True, compress_level=9)
            elif output_format.lower() == "webp":
                img.save(output_path, "WEBP", quality=quality, method=6)
            else:
                img.save(output_path, format=output_format.upper(), quality=quality)
            
            output_size = os.path.getsize(output_path)
            
            return {
                "status": "success",
                "output_path": str(output_path),
                "original_format": "HEIC",
                "output_format": output_format.upper(),
                "original_size_kb": round(original_size / 1024, 2),
                "output_size_kb": round(output_size / 1024, 2),
                "compression_ratio": round(output_size / original_size, 3),
                "dimensions": f"{img.width}x{img.height}",
                "quality": quality
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}


    def convert_to_heic(self, file_path: str, quality: int = 90) -> Dict:
        """Convert image to HEIC/HEIF format."""
        try:
            from pillow_heif import register_heif_opener
            register_heif_opener()
        except ImportError:
            return {"status": "error", "error": "pillow-heif not installed"}
        
        try:
            img = Image.open(file_path)
            original_size = os.path.getsize(file_path)
            original_format = img.format
            output_path = f"{self.output_dir}/{uuid.uuid4()}.heic"
            
            img.save(output_path, format="HEIF", quality=quality)
            output_size = os.path.getsize(output_path)
            
            return {
                "status": "success",
                "output_path": str(output_path),
                "original_format": original_format,
                "output_format": "HEIC",
                "original_size_kb": round(original_size / 1024, 2),
                "output_size_kb": round(output_size / 1024, 2),
                "compression_ratio": round(output_size / original_size, 3),
                "dimensions": f"{img.width}x{img.height}",
                "quality": quality
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}


    def convert_to_avif(self, file_path: str, quality: int = 85, speed: int = 6) -> Dict:
        """Convert image to AVIF format (next-gen)."""
        try:
            img = Image.open(file_path)
            original_size = os.path.getsize(file_path)
            original_format = img.format
            output_path = f"{self.output_dir}/{uuid.uuid4()}.avif"
            
            try:
                img.save(output_path, format="AVIF", quality=quality, speed=speed)
            except Exception:
                try:
                    import pillow_avif
                    img.save(output_path, format="AVIF", quality=quality, speed=speed)
                except ImportError:
                    return {"status": "error", "error": "AVIF support not available"}
            
            output_size = os.path.getsize(output_path)
            
            return {
                "status": "success",
                "output_path": str(output_path),
                "original_format": original_format,
                "output_format": "AVIF",
                "original_size_kb": round(original_size / 1024, 2),
                "output_size_kb": round(output_size / 1024, 2),
                "compression_ratio": round(output_size / original_size, 3),
                "dimensions": f"{img.width}x{img.height}",
                "quality": quality,
                "speed": speed
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}


    def batch_compress_to_target_size(
        self,
        file_paths: list,
        target_size_kb: int,
        output_format: str = "jpeg",
        max_workers: int = 4
    ) -> Dict:
        """Batch compress multiple images to target size."""
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        results = []
        successful = 0
        failed = 0
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_file = {
                executor.submit(self.compress_to_target_size, fp, target_size_kb, output_format): fp
                for fp in file_paths
            }
            
            for future in as_completed(future_to_file):
                file_path = future_to_file[future]
                try:
                    result = future.result()
                    if result["status"] in ["success", "best_effort"]:
                        successful += 1
                    results.append({"file": os.path.basename(file_path), "result": result})
                except Exception as e:
                    failed += 1
                    results.append({"file": os.path.basename(file_path), "result": {"status": "error", "error": str(e)}})
        
        return {
            "status": "complete",
            "total_files": len(file_paths),
            "successful": successful,
            "failed": failed,
            "results": results
        }


    def create_zip_archive(self, file_paths: list, output_name: str = None) -> str:
        """Create ZIP archive from list of files."""
        import zipfile
        
        if output_name is None:
            output_name = f"batch_{uuid.uuid4()}"
        
        zip_path = f"{self.output_dir}/{output_name}.zip"
        
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
            for file_path in file_paths:
                if os.path.exists(file_path):
                    zipf.write(file_path, os.path.basename(file_path))
        
        return zip_path
