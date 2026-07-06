"""Media conversion service using ffmpeg."""
import os
import subprocess
import uuid
from pathlib import Path
from typing import Optional


class ConverterService:
    """Service for converting media files."""
    
    def __init__(self, temp_dir: str = "/app/temp"):
        self.temp_dir = Path(temp_dir)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
    
    def mp4_to_mp3(
        self, 
        input_path: str, 
        output_path: Optional[str] = None,
        bitrate: str = "192k"
    ) -> dict:
        """
        Convert MP4 file to MP3.
        
        Args:
            input_path: Path to input MP4 file
            output_path: Path for output MP3 file (optional)
            bitrate: Audio bitrate (default: 192k)
            
        Returns:
            Dictionary with output file path and metadata
            
        Raises:
            ValueError: If conversion fails
            FileNotFoundError: If input file does not exist
        """
        input_file = Path(input_path)
        
        if not input_file.exists():
            raise FileNotFoundError(f"Input file not found: {input_path}")
        
        if output_path is None:
            unique_id = str(uuid.uuid4())[:8]
            output_path = str(self.temp_dir / f"{unique_id}.mp3")
        
        output_file = Path(output_path)
        
        # Use ffmpeg to convert
        cmd = [
            "ffmpeg",
            "-i", str(input_file),
            "-vn",  # No video
            "-acodec", "libmp3lame",
            "-b:a", bitrate,
            "-y",  # Overwrite output file
            str(output_file)
        ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )
            
            if not output_file.exists():
                raise ValueError("Conversion failed: Output file not created")
            
            return {
                "success": True,
                "input_path": str(input_file),
                "output_path": str(output_file),
                "format": "mp3",
                "bitrate": bitrate,
                "file_size": output_file.stat().st_size,
            }
        except subprocess.CalledProcessError as e:
            raise ValueError(f"Conversion failed: {e.stderr}")
        except Exception as e:
            raise ValueError(f"Conversion error: {str(e)}")
    
    def get_media_info(self, file_path: str) -> dict:
        """
        Get media file information using ffprobe.
        
        Args:
            file_path: Path to media file
            
        Returns:
            Dictionary with media metadata
        """
        input_file = Path(file_path)
        
        if not input_file.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            str(input_file)
        ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )
            
            import json
            data = json.loads(result.stdout)
            
            return {
                "success": True,
                "format": data.get("format", {}).get("format_name", "unknown"),
                "duration": float(data.get("format", {}).get("duration", 0)),
                "size": int(data.get("format", {}).get("size", 0)),
                "bit_rate": int(data.get("format", {}).get("bit_rate", 0)),
            }
        except Exception as e:
            raise ValueError(f"Failed to get media info: {str(e)}")
