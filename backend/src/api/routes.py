"""API routes for media conversion."""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel, HttpUrl
from typing import Literal
import os
from pathlib import Path
import uuid

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


@router.post("/compress/image/target-size")
async def compress_image_target_size(
    file: UploadFile = File(...),
    target_size_kb: int = Form(...),
    output_format: str = Form("jpeg"),
    resize_if_needed: bool = Form(True)
):
    """
    Compress image to specific target file size.
    
    Args:
        file: Image file
        target_size_kb: Target size in kilobytes (e.g., 10, 100, 1000)
        output_format: Output format (jpeg, png, webp)
        resize_if_needed: Allow resizing if target cannot be met with compression alone
        
    Returns:
        Compressed image information
    """
    if target_size_kb < 1 or target_size_kb > 50000:
        raise HTTPException(status_code=400, detail="Target size must be between 1kb and 50000kb")
    
    valid_formats = ["jpeg", "jpg", "png", "webp"]
    if output_format.lower() not in valid_formats:
        raise HTTPException(status_code=400, detail="Format must be one of: " + ", ".join(valid_formats))
    
    temp_input = f"/app/temp/target_{file.filename}"
    
    try:
        with open(temp_input, "wb") as f:
            content = await file.read()
            f.write(content)
        
        result = image_compression_service.compress_to_target_size(
            file_path=temp_input,
            target_size_kb=target_size_kb,
            output_format=output_format,
            resize_if_needed=resize_if_needed
        )
        
        os.remove(temp_input)
        
        file_id = Path(result["output_path"]).name
        
        return {
            "success": True,
            "message": f"Compressed to {result[actual_size_kb]}kb (target: {target_size_kb}kb)",
            "file_id": file_id,
            "status": result["status"],
            "original_size_kb": result["original_size_kb"],
            "target_size_kb": result["target_size_kb"],
            "actual_size_kb": result["actual_size_kb"],
            "quality_used": result["quality_used"],
            "iterations": result["iterations"],
            "compression_ratio": result["compression_ratio"],
            "dimensions": result["dimensions"],
            "format": result["format"],
            "note": result.get("note", "")
        }
    except Exception as e:
        if os.path.exists(temp_input):
            os.remove(temp_input)
        raise HTTPException(status_code=500, detail=f"Compression error: {str(e)}")


@router.post("/convert/heic-to-jpg")
async def convert_heic_to_jpg(
    file: UploadFile = File(...),
    quality: int = Form(90)
):
    """
    Convert HEIC/HEIF image to JPG format.
    
    Args:
        file: HEIC image file
        quality: Output quality (1-100)
        
    Returns:
        Converted image information
    """
    if not file.filename.lower().endswith((".heic", ".heif")):
        raise HTTPException(status_code=400, detail="File must be HEIC/HEIF format")
    
    if quality < 1 or quality > 100:
        raise HTTPException(status_code=400, detail="Quality must be between 1 and 100")
    
    temp_input = f"/app/temp/heic_{file.filename}"
    
    try:
        with open(temp_input, "wb") as f:
            content = await file.read()
            f.write(content)
        
        result = image_compression_service.convert_heic(
            file_path=temp_input,
            output_format="jpeg",
            quality=quality
        )
        
        os.remove(temp_input)
        
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["error"])
        
        file_id = Path(result["output_path"]).name
        
        return {
            "success": True,
            "message": "Successfully converted HEIC to JPG",
            "file_id": file_id,
            "original_format": result["original_format"],
            "output_format": result["output_format"],
            "original_size_kb": result["original_size_kb"],
            "output_size_kb": result["output_size_kb"],
            "compression_ratio": result["compression_ratio"],
            "dimensions": result["dimensions"],
            "quality": result["quality"]
        }
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(temp_input):
            os.remove(temp_input)
        raise HTTPException(status_code=500, detail=f"Conversion error: {str(e)}")


@router.post("/convert/to-heic")
async def convert_to_heic(
    file: UploadFile = File(...),
    quality: int = Form(90)
):
    """
    Convert image to HEIC/HEIF format.
    
    Args:
        file: Image file (JPG, PNG, WEBP, etc.)
        quality: Output quality (1-100)
        
    Returns:
        Converted image information
    """
    if quality < 1 or quality > 100:
        raise HTTPException(status_code=400, detail="Quality must be between 1 and 100")
    
    temp_input = f"/app/temp/to_heic_{file.filename}"
    
    try:
        with open(temp_input, "wb") as f:
            content = await file.read()
            f.write(content)
        
        result = image_compression_service.convert_to_heic(
            file_path=temp_input,
            quality=quality
        )
        
        os.remove(temp_input)
        
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["error"])
        
        file_id = Path(result["output_path"]).name
        
        return {
            "success": True,
            "message": "Successfully converted to HEIC",
            "file_id": file_id,
            "original_format": result["original_format"],
            "output_format": result["output_format"],
            "original_size_kb": result["original_size_kb"],
            "output_size_kb": result["output_size_kb"],
            "compression_ratio": result["compression_ratio"],
            "dimensions": result["dimensions"],
            "quality": result["quality"]
        }
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(temp_input):
            os.remove(temp_input)
        raise HTTPException(status_code=500, detail=f"Conversion error: {str(e)}")


@router.post("/convert/to-avif")
async def convert_to_avif(
    file: UploadFile = File(...),
    quality: int = Form(85),
    speed: int = Form(6)
):
    """
    Convert image to AVIF format (next-gen format with superior compression).
    
    Args:
        file: Image file
        quality: Output quality (1-100)
        speed: Encoding speed (0=slowest/best, 10=fastest)
        
    Returns:
        Converted image information
    """
    if quality < 1 or quality > 100:
        raise HTTPException(status_code=400, detail="Quality must be between 1 and 100")
    
    if speed < 0 or speed > 10:
        raise HTTPException(status_code=400, detail="Speed must be between 0 and 10")
    
    temp_input = f"/app/temp/to_avif_{file.filename}"
    
    try:
        with open(temp_input, "wb") as f:
            content = await file.read()
            f.write(content)
        
        result = image_compression_service.convert_to_avif(
            file_path=temp_input,
            quality=quality,
            speed=speed
        )
        
        os.remove(temp_input)
        
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["error"])
        
        file_id = Path(result["output_path"]).name
        
        return {
            "success": True,
            "message": "Successfully converted to AVIF",
            "file_id": file_id,
            "original_format": result["original_format"],
            "output_format": result["output_format"],
            "original_size_kb": result["original_size_kb"],
            "output_size_kb": result["output_size_kb"],
            "compression_ratio": result["compression_ratio"],
            "dimensions": result["dimensions"],
            "quality": result["quality"],
            "speed": result["speed"]
        }
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(temp_input):
            os.remove(temp_input)
        raise HTTPException(status_code=500, detail=f"Conversion error: {str(e)}")


@router.post("/batch/compress/target-size")
async def batch_compress_target_size(
    files: list[UploadFile] = File(...),
    target_size_kb: int = Form(...),
    output_format: str = Form("jpeg"),
    create_zip: bool = Form(True)
):
    """
    Batch compress multiple images to target file size.
    
    Args:
        files: List of image files
        target_size_kb: Target size for each image in kilobytes
        output_format: Output format (jpeg, png, webp)
        create_zip: If True, return ZIP archive of all results
        
    Returns:
        Batch compression results
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    if len(files) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 files per batch")
    
    if target_size_kb < 1 or target_size_kb > 50000:
        raise HTTPException(status_code=400, detail="Target size must be between 1kb and 50000kb")
    
    temp_files = []
    
    try:
        # Save all uploaded files
        for file in files:
            temp_path = f"/app/temp/batch_{uuid.uuid4()}_{file.filename}"
            with open(temp_path, "wb") as f:
                content = await file.read()
                f.write(content)
            temp_files.append(temp_path)
        
        # Batch compress
        result = image_compression_service.batch_compress_to_target_size(
            file_paths=temp_files,
            target_size_kb=target_size_kb,
            output_format=output_format,
            max_workers=4
        )
        
        # Clean up input files
        for temp_file in temp_files:
            if os.path.exists(temp_file):
                os.remove(temp_file)
        
        # Create ZIP if requested
        zip_file_id = None
        if create_zip and result["successful"] > 0:
            output_files = [
                r["result"]["output_path"]
                for r in result["results"]
                if r["result"]["status"] in ["success", "best_effort"]
            ]
            zip_path = image_compression_service.create_zip_archive(
                file_paths=output_files,
                output_name=f"batch_compressed_{target_size_kb}kb"
            )
            zip_file_id = Path(zip_path).name
        
        return {
            "success": True,
            "message": f"Batch compression complete: {result[successful]}/{result[total_files]} successful",
            "total_files": result["total_files"],
            "successful": result["successful"],
            "failed": result["failed"],
            "zip_file_id": zip_file_id,
            "results": result["results"]
        }
    except Exception as e:
        # Cleanup on error
        for temp_file in temp_files:
            if os.path.exists(temp_file):
                os.remove(temp_file)
        raise HTTPException(status_code=500, detail=f"Batch compression error: {str(e)}")
# Phase 2 - Audio API Endpoints

from src.services.audio_service import AudioService
audio_service = AudioService()

@router.post("/audio/convert")
async def convert_audio(
    file: UploadFile = File(...),
    output_format: str = Form(...),
    bitrate: str = Form("192k"),
    sample_rate: int = Form(None),
    channels: int = Form(None)
):
    """
    Convert audio to different format.
    
    Supported formats: mp3, aac, m4a, wav
    """
    valid_formats = ["mp3", "aac", "m4a", "wav"]
    if output_format not in valid_formats:
        raise HTTPException(status_code=400, detail="Format must be one of: " + ", ".join(valid_formats))
    
    temp_input = f"/app/temp/audio_{uuid.uuid4()}_{file.filename}"
    
    try:
        with open(temp_input, "wb") as f:
            content = await file.read()
            f.write(content)
        
        result = audio_service.convert_audio(
            input_path=temp_input,
            output_format=output_format,
            bitrate=bitrate if bitrate else None,
            sample_rate=sample_rate if sample_rate else None,
            channels=channels if channels else None
        )
        
        os.remove(temp_input)
        
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["error"])
        
        file_id = Path(result["output_path"]).name
        
        return {
            "success": True,
            "message": f"Converted from {result[input_format]} to {result[output_format]}",
            "file_id": file_id,
            "input_format": result["input_format"],
            "output_format": result["output_format"],
            "input_size_kb": result["input_size_kb"],
            "output_size_kb": result["output_size_kb"],
            "compression_ratio": result["compression_ratio"],
            "duration": result["duration"],
            "bitrate": result["bitrate"],
            "sample_rate": result["sample_rate"],
            "channels": result["channels"]
        }
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(temp_input):
            os.remove(temp_input)
        raise HTTPException(status_code=500, detail=f"Audio conversion error: {str(e)}")


@router.post("/audio/normalize")
async def normalize_audio_volume(
    file: UploadFile = File(...),
    target_level: float = Form(-16.0)
):
    """
    Normalize audio volume to target LUFS level.
    
    Default target: -16.0 LUFS (streaming standard)
    """
    temp_input = f"/app/temp/normalize_{uuid.uuid4()}_{file.filename}"
    
    try:
        with open(temp_input, "wb") as f:
            content = await file.read()
            f.write(content)
        
        result = audio_service.normalize_audio(temp_input, target_level)
        os.remove(temp_input)
        
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["error"])
        
        file_id = Path(result["output_path"]).name
        
        return {
            "success": True,
            "message": "Audio normalized successfully",
            "file_id": file_id,
            "target_level": result["target_level"],
            "input_size_kb": result["input_size_kb"],
            "output_size_kb": result["output_size_kb"],
            "duration": result["duration"]
        }
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(temp_input):
            os.remove(temp_input)
        raise HTTPException(status_code=500, detail=f"Normalization error: {str(e)}")


@router.post("/audio/extract-from-video")
async def extract_audio(
    file: UploadFile = File(...),
    output_format: str = Form("mp3"),
    bitrate: str = Form("192k")
):
    """
    Extract audio track from video file.
    
    Supported formats: mp3, aac, m4a, wav
    """
    valid_formats = ["mp3", "aac", "m4a", "wav"]
    if output_format not in valid_formats:
        raise HTTPException(status_code=400, detail="Format must be one of: " + ", ".join(valid_formats))
    
    temp_input = f"/app/temp/video_{uuid.uuid4()}_{file.filename}"
    
    try:
        with open(temp_input, "wb") as f:
            content = await file.read()
            f.write(content)
        
        result = audio_service.extract_audio_from_video(temp_input, output_format, bitrate)
        os.remove(temp_input)
        
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["error"])
        
        file_id = Path(result["output_path"]).name
        
        return {
            "success": True,
            "message": f"Audio extracted as {output_format}",
            "file_id": file_id,
            "output_format": result["output_format"],
            "output_size_kb": result["output_size_kb"],
            "duration": result["duration"],
            "bitrate": result["bitrate"],
            "sample_rate": result["sample_rate"],
            "channels": result["channels"]
        }
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(temp_input):
            os.remove(temp_input)
        raise HTTPException(status_code=500, detail=f"Audio extraction error: {str(e)}")


@router.post("/audio/trim")
async def trim_audio(
    file: UploadFile = File(...),
    start_time: float = Form(...),
    end_time: float = Form(None),
    duration: float = Form(None)
):
    """
    Trim audio to specified time range.
    
    Specify either end_time or duration (not both).
    """
    if end_time is None and duration is None:
        raise HTTPException(status_code=400, detail="Must specify either end_time or duration")
    
    temp_input = f"/app/temp/trim_{uuid.uuid4()}_{file.filename}"
    
    try:
        with open(temp_input, "wb") as f:
            content = await file.read()
            f.write(content)
        
        result = audio_service.trim_audio(temp_input, start_time, end_time, duration)
        os.remove(temp_input)
        
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["error"])
        
        file_id = Path(result["output_path"]).name
        
        return {
            "success": True,
            "message": "Audio trimmed successfully",
            "file_id": file_id,
            "start_time": result["start_time"],
            "end_time": result.get("end_time"),
            "duration": result["duration"],
            "output_size_kb": result["output_size_kb"],
            "actual_duration": result["actual_duration"]
        }
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(temp_input):
            os.remove(temp_input)
        raise HTTPException(status_code=500, detail=f"Audio trim error: {str(e)}")


# Phase 2 - Video API Endpoints

from src.services.video_compression_service import VideoCompressionService
video_service = VideoCompressionService()

@router.post("/video/trim")
async def trim_video(
    file: UploadFile = File(...),
    start_time: float = Form(...),
    end_time: float = Form(None),
    duration: float = Form(None)
):
    """
    Trim video to specified time range.
    
    Specify either end_time or duration (not both).
    """
    if end_time is None and duration is None:
        raise HTTPException(status_code=400, detail="Must specify either end_time or duration")
    
    temp_input = f"/app/temp/video_trim_{uuid.uuid4()}_{file.filename}"
    
    try:
        with open(temp_input, "wb") as f:
            content = await file.read()
            f.write(content)
        
        result = video_service.trim_video(temp_input, start_time, end_time, duration)
        os.remove(temp_input)
        
        file_id = Path(result["output_path"]).name
        
        return {
            "success": True,
            "message": "Video trimmed successfully",
            "file_id": file_id,
            "start_time": result["start_time"],
            "end_time": result.get("end_time"),
            "duration": result["duration"],
            "output_size_mb": result["output_size_mb"],
            "actual_duration": result["actual_duration"]
        }
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(temp_input):
            os.remove(temp_input)
        raise HTTPException(status_code=500, detail=f"Video trim error: {str(e)}")


@router.post("/video/resize")
async def resize_video(
    file: UploadFile = File(...),
    width: int = Form(None),
    height: int = Form(None),
    scale: float = Form(None)
):
    """
    Resize video by dimensions or scale factor.
    
    Provide either (width/height) or scale.
    """
    if not width and not height and not scale:
        raise HTTPException(status_code=400, detail="Must specify width, height, or scale")
    
    temp_input = f"/app/temp/video_resize_{uuid.uuid4()}_{file.filename}"
    
    try:
        with open(temp_input, "wb") as f:
            content = await file.read()
            f.write(content)
        
        result = video_service.resize_video(temp_input, width, height, scale)
        os.remove(temp_input)
        
        file_id = Path(result["output_path"]).name
        
        return {
            "success": True,
            "message": "Video resized successfully",
            "file_id": file_id,
            "input_resolution": result["input_resolution"],
            "output_resolution": result["output_resolution"],
            "input_size_mb": result["input_size_mb"],
            "output_size_mb": result["output_size_mb"],
            "duration": result["duration"]
        }
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(temp_input):
            os.remove(temp_input)
        raise HTTPException(status_code=500, detail=f"Video resize error: {str(e)}")


@router.post("/video/convert-format")
async def convert_video_format(
    file: UploadFile = File(...),
    output_format: str = Form(...),
    quality: str = Form("medium")
):
    """
    Convert video to different format.
    
    Supported formats: mp4, webm, avi, mov, mkv
    Quality: fast, medium, high
    """
    valid_formats = ["mp4", "webm", "avi", "mov", "mkv"]
    if output_format not in valid_formats:
        raise HTTPException(status_code=400, detail="Format must be one of: " + ", ".join(valid_formats))
    
    valid_quality = ["fast", "medium", "high"]
    if quality not in valid_quality:
        raise HTTPException(status_code=400, detail="Quality must be one of: " + ", ".join(valid_quality))
    
    temp_input = f"/app/temp/video_convert_{uuid.uuid4()}_{file.filename}"
    
    try:
        with open(temp_input, "wb") as f:
            content = await file.read()
            f.write(content)
        
        result = video_service.convert_video_format(temp_input, output_format, quality)
        os.remove(temp_input)
        
        file_id = Path(result["output_path"]).name
        
        return {
            "success": True,
            "message": f"Converted to {output_format}",
            "file_id": file_id,
            "input_format": result["input_format"],
            "output_format": result["output_format"],
            "input_size_mb": result["input_size_mb"],
            "output_size_mb": result["output_size_mb"],
            "duration": result["duration"],
            "resolution": result["resolution"]
        }
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(temp_input):
            os.remove(temp_input)
        raise HTTPException(status_code=500, detail=f"Video conversion error: {str(e)}")
