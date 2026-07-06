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
