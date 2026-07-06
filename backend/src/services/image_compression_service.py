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
            compression_ratio = ((input_size - output_size) / input_size) * 100
            
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
            ratio = max_width / width
            height = int(height * ratio)
            width = max_width
        
        if max_height and height > max_height:
            ratio = max_height / height
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
