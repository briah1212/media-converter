"""API routes for media conversion."""
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel, HttpUrl
from typing import Literal
import os
from pathlib import Path

from src.services.youtube_service import YouTubeService
from src.services.converter_service import ConverterService

router = APIRouter()

# Initialize services
youtube_service = YouTubeService()
converter_service = ConverterService()


class YouTubeDownloadRequest(BaseModel):
    """Request model for YouTube downloads."""
    url: str
    format: Literal["mp4", "mp3"]


class ConversionResponse(BaseModel):
    """Response model for conversions."""
    success: bool
    message: str
    file_id: str | None = None
    title: str | None = None
    duration: float | None = None


@router.post("/youtube/download", response_model=ConversionResponse)
async def download_youtube(request: YouTubeDownloadRequest):
    """
    Download a YouTube video in specified format.
    
    Args:
        request: YouTube download request with URL and format
        
    Returns:
        Conversion response with file information
    """
    try:
        result = youtube_service.download_video(
            url=request.url,
            format_type=request.format
        )
        
        file_id = Path(result["file_path"]).name
        
        return ConversionResponse(
            success=True,
            message=f"Successfully downloaded as {request.format}",
            file_id=file_id,
            title=result.get("title"),
            duration=result.get("duration"),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.post("/convert/mp4-to-mp3", response_model=ConversionResponse)
async def convert_mp4_to_mp3(file: UploadFile = File(...)):
    """
    Convert uploaded MP4 file to MP3.
    
    Args:
        file: Uploaded MP4 file
        
    Returns:
        Conversion response with file information
    """
    if not file.filename.lower().endswith(".mp4"):
        raise HTTPException(
            status_code=400,
            detail="Only MP4 files are supported"
        )
    
    try:
        # Save uploaded file temporarily
        temp_input = f"/app/temp/upload_{file.filename}"
        with open(temp_input, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Convert to MP3
        result = converter_service.mp4_to_mp3(temp_input)
        
        # Cleanup input file
        os.remove(temp_input)
        
        file_id = Path(result["output_path"]).name
        
        return ConversionResponse(
            success=True,
            message="Successfully converted to MP3",
            file_id=file_id,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Cleanup on error
        if os.path.exists(temp_input):
            os.remove(temp_input)
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/download/{file_id}")
async def download_file(file_id: str):
    """
    Download a converted file.
    
    Args:
        file_id: ID of the file to download
        
    Returns:
        File download response
    """
    # Check in both downloads and temp directories
    download_path = Path(f"/app/downloads/{file_id}")
    temp_path = Path(f"/app/temp/{file_id}")
    
    file_path = None
    if download_path.exists():
        file_path = download_path
    elif temp_path.exists():
        file_path = temp_path
    else:
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=str(file_path),
        filename=file_id,
        media_type="application/octet-stream",
    )


@router.get("/status")
async def status():
    """API status endpoint."""
    return {
        "status": "online",
        "services": {
            "youtube_download": "available",
            "mp4_to_mp3": "available",
        }
    }


# Video Compression endpoints
from src.services.video_compression_service import (
    VideoCompressionService,
    CompressionPreset,
    VideoCodec,
)

compression_service = VideoCompressionService()


class VideoCompressionRequest(BaseModel):
    """Request model for video compression."""
    preset: str = "balanced"  # high, balanced, high_compression, max_compression
    codec: str = "h264"       # h264, h265, vp9
    target_size_mb: float | None = None


@router.post("/compress/video", response_model=ConversionResponse)
async def compress_video(
    file: UploadFile = File(...),
    preset: str = "balanced",
    codec: str = "h264",
    target_size_mb: float | None = None,
):
    """
    Compress and optimize a video file.
    
    Args:
        file: Uploaded video file
        preset: Compression preset (high, balanced, high_compression, max_compression)
        codec: Video codec (h264, h265, vp9)
        target_size_mb: Optional target file size in MB
        
    Returns:
        Conversion response with compressed file information
    """
    # Validate inputs
    valid_presets = ["high", "balanced", "high_compression", "max_compression"]
    valid_codecs = ["h264", "h265", "vp9"]
    
    if preset not in valid_presets:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid preset. Must be one of: {', '.join(valid_presets)}"
        )
    
    if codec not in valid_codecs:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid codec. Must be one of: {', '.join(valid_codecs)}"
        )
    
    # Check file extension
    allowed_extensions = [".mp4", ".avi", ".mov", ".mkv", ".webm", ".flv", ".wmv"]
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported video format. Supported: {', '.join(allowed_extensions)}"
        )
    
    temp_input = f"/app/temp/upload_{file.filename}"
    
    try:
        # Save uploaded file
        with open(temp_input, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Compress video
        result = compression_service.compress_video(
            input_path=temp_input,
            preset=CompressionPreset(preset),
            codec=VideoCodec(codec),
            target_size_mb=target_size_mb,
        )
        
        # Cleanup input file
        os.remove(temp_input)
        
        file_id = Path(result["output_path"]).name
        
        return ConversionResponse(
            success=True,
            message=f"Video compressed successfully. Reduced by {result[compression_ratio]}%",
            file_id=file_id,
            duration=result.get("output_duration"),
        )
    except FileNotFoundError as e:
        if os.path.exists(temp_input):
            os.remove(temp_input)
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        if os.path.exists(temp_input):
            os.remove(temp_input)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        if os.path.exists(temp_input):
            os.remove(temp_input)
        raise HTTPException(status_code=500, detail=f"Compression error: {str(e)}")


@router.post("/compress/estimate")
async def estimate_compression(
    file: UploadFile = File(...),
    preset: str = "balanced",
):
    """
    Get compression estimate without actually compressing.
    
    Args:
        file: Uploaded video file
        preset: Compression preset
        
    Returns:
        Estimated compression results
    """
    temp_input = f"/app/temp/estimate_{file.filename}"
    
    try:
        # Save uploaded file temporarily
        with open(temp_input, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Get estimate
        estimate = compression_service.get_compression_estimate(
            input_path=temp_input,
            preset=CompressionPreset(preset),
        )
        
        # Cleanup
        os.remove(temp_input)
        
        return {
            "success": True,
            **estimate
        }
    except Exception as e:
        if os.path.exists(temp_input):
            os.remove(temp_input)
        raise HTTPException(status_code=500, detail=f"Estimate error: {str(e)}")


# Image Compression endpoints
from src.services.image_compression_service import (
    ImageCompressionService,
    CompressionMode as ImageCompressionMode,
    ImageFormat,
)

image_compression_service = ImageCompressionService()


@router.post("/compress/image")
async def compress_image(
    file: UploadFile = File(...),
    mode: str = "balanced",
    target_format: str | None = None,
    quality: int | None = None,
    max_width: int | None = None,
    max_height: int | None = None,
):
    """
    Compress and optimize an image (like TinyPNG).
    
    Supports: PNG, JPEG, WebP, GIF, BMP, TIFF
    
    Args:
        file: Image file to compress
        mode: Compression mode (lossless, balanced, aggressive)
        target_format: Convert to format (png, jpeg, webp, gif)
        quality: Custom quality 1-100 (optional)
        max_width: Maximum width in pixels (optional)
        max_height: Maximum height in pixels (optional)
        
    Returns:
        Compressed image information
    """
    # Validate mode
    valid_modes = ["lossless", "balanced", "aggressive"]
    if mode not in valid_modes:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid mode. Must be one of: {', '.join(valid_modes)}"
        )
    
    # Validate format if provided
    valid_formats = ["png", "jpeg", "jpg", "webp", "gif", "bmp", "tiff"]
    if target_format and target_format not in valid_formats:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid format. Must be one of: {', '.join(valid_formats)}"
        )
    
    # Validate quality
    if quality and (quality < 1 or quality > 100):
        raise HTTPException(
            status_code=400,
            detail="Quality must be between 1 and 100"
        )
    
    temp_input = f"/app/temp/upload_{file.filename}"
    
    try:
        # Save uploaded file
        with open(temp_input, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Detect format
        detected_format = image_compression_service.detect_format(temp_input)
        
        # Compress image
        result = image_compression_service.compress_image(
            input_path=temp_input,
            mode=ImageCompressionMode(mode),
            target_format=ImageFormat(target_format) if target_format else None,
            quality=quality,
            max_width=max_width,
            max_height=max_height,
        )
        
        # Cleanup input file
        os.remove(temp_input)
        
        file_id = Path(result["output_path"]).name
        
        return {
            "success": True,
            "message": f"Image compressed by {result['compression_ratio']}%",
            "file_id": file_id,
            "input_format": result["input_format"],
            "output_format": result["output_format"],
            "input_size_kb": result["input_size_kb"],
            "output_size_kb": result["output_size_kb"],
            "compression_ratio": result["compression_ratio"],
            "dimensions": result["output_dimensions"],
        }
    except FileNotFoundError as e:
        if os.path.exists(temp_input):
            os.remove(temp_input)
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        if os.path.exists(temp_input):
            os.remove(temp_input)
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        if os.path.exists(temp_input):
            os.remove(temp_input)
        raise HTTPException(status_code=500, detail=f"Compression error: {str(e)}")


@router.post("/compress/image/detect")
async def detect_image_format(file: UploadFile = File(...)):
    """
    Auto-detect image format and get metadata.
    
    Args:
        file: Image file
        
    Returns:
        Image information and detected format
    """
    temp_input = f"/app/temp/detect_{file.filename}"
    
    try:
        # Save uploaded file temporarily
        with open(temp_input, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Detect format
        detected_format = image_compression_service.detect_format(temp_input)
        
        # Get full info
        info = image_compression_service.get_image_info(temp_input)
        
        # Cleanup
        os.remove(temp_input)
        
        return {
            "success": True,
            "detected_format": detected_format,
            "width": info["width"],
            "height": info["height"],
            "size_kb": round(info["size_bytes"] / 1024, 2),
            "mode": info["mode"],
            "has_transparency": info["has_transparency"],
        }
    except Exception as e:
        if os.path.exists(temp_input):
            os.remove(temp_input)
        raise HTTPException(status_code=500, detail=f"Detection error: {str(e)}")


@router.post("/convert/image")
async def convert_image_format(
    file: UploadFile = File(...),
    target_format: str = "webp",
):
    """
    Convert image to a different format.
    
    Args:
        file: Image file
        target_format: Target format (png, jpeg, webp, gif)
        
    Returns:
        Converted image information
    """
    valid_formats = ["png", "jpeg", "jpg", "webp", "gif"]
    if target_format not in valid_formats:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid format. Must be one of: {', '.join(valid_formats)}"
        )
    
    temp_input = f"/app/temp/convert_{file.filename}"
    
    try:
        # Save uploaded file
        with open(temp_input, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Convert
        result = image_compression_service.convert_format(
            input_path=temp_input,
            target_format=ImageFormat(target_format),
        )
        
        # Cleanup input file
        os.remove(temp_input)
        
        file_id = Path(result["output_path"]).name
        
        return {
            "success": True,
            "message": f"Converted from {result['input_format']} to {result['output_format']}",
            "file_id": file_id,
            "input_format": result["input_format"],
            "output_format": result["output_format"],
            "output_size_kb": result["output_size_kb"],
        }
    except Exception as e:
        if os.path.exists(temp_input):
            os.remove(temp_input)
        raise HTTPException(status_code=500, detail=f"Conversion error: {str(e)}")
