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
