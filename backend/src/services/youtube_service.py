"""YouTube download service using yt-dlp."""
import os
import uuid
from pathlib import Path
from typing import Literal, Optional
import yt_dlp


class YouTubeService:
    """Service for downloading YouTube videos."""
    
    def __init__(self, download_dir: str = "/app/downloads"):
        self.download_dir = Path(download_dir)
        self.download_dir.mkdir(parents=True, exist_ok=True)
    
    def download_video(
        self, 
        url: str, 
        format_type: Literal["mp4", "mp3"] = "mp4"
    ) -> dict:
        """
        Download a YouTube video in the specified format.
        
        Args:
            url: YouTube video URL
            format_type: Output format (mp4 or mp3)
            
        Returns:
            Dictionary with file path and metadata
            
        Raises:
            ValueError: If URL is invalid or download fails
        """
        if not self._is_valid_url(url):
            raise ValueError(f"Invalid YouTube URL: {url}")
        
        unique_id = str(uuid.uuid4())[:8]
        
        if format_type == "mp4":
            return self._download_mp4(url, unique_id)
        elif format_type == "mp3":
            return self._download_mp3(url, unique_id)
        else:
            raise ValueError(f"Unsupported format: {format_type}")
    
    def _download_mp4(self, url: str, unique_id: str) -> dict:
        """Download video as MP4."""
        output_template = str(self.download_dir / f"{unique_id}.%(ext)s")
        
        ydl_opts = {
            "format": "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "outtmpl": output_template,
            "merge_output_format": "mp4",
            "quiet": False,
            "no_warnings": False,
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filename = ydl.prepare_filename(info)
                
                return {
                    "success": True,
                    "file_path": filename,
                    "format": "mp4",
                    "title": info.get("title", "Unknown"),
                    "duration": info.get("duration", 0),
                }
        except Exception as e:
            raise ValueError(f"Download failed: {str(e)}")
    
    def _download_mp3(self, url: str, unique_id: str) -> dict:
        """Download video and convert to MP3."""
        output_template = str(self.download_dir / f"{unique_id}.%(ext)s")
        
        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": output_template,
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }],
            "quiet": False,
            "no_warnings": False,
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                # yt-dlp changes the extension after postprocessing
                base_filename = ydl.prepare_filename(info)
                filename = os.path.splitext(base_filename)[0] + ".mp3"
                
                return {
                    "success": True,
                    "file_path": filename,
                    "format": "mp3",
                    "title": info.get("title", "Unknown"),
                    "duration": info.get("duration", 0),
                }
        except Exception as e:
            raise ValueError(f"Download failed: {str(e)}")
    
    def _is_valid_url(self, url: str) -> bool:
        """Check if URL is a valid YouTube URL."""
        valid_domains = ["youtube.com", "youtu.be", "www.youtube.com"]
        return any(domain in url for domain in valid_domains)
