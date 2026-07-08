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
    
    def _get_common_opts(self, use_android_client: bool = False) -> dict:
        """Get common yt-dlp options with anti-bot measures."""
        if use_android_client:
            # Use Android client to bypass bot detection
            return {
                "quiet": False,
                "no_warnings": False,
                "extractor_args": {
                    "youtube": {
                        "player_client": ["android", "android_embedded"],
                        "player_skip": ["configs"],
                    },
                },
                "http_headers": {
                    "User-Agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 13) gzip",
                    "X-YouTube-Client-Name": "3",
                    "X-YouTube-Client-Version": "19.09.37",
                },
                "retries": 15,
                "fragment_retries": 15,
                "extractor_retries": 5,
            }
        else:
            # Standard web client with enhanced headers
            return {
                "quiet": False,
                "no_warnings": False,
                "http_headers": {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Accept-Encoding": "gzip, deflate, br",
                    "DNT": "1",
                    "Connection": "keep-alive",
                    "Upgrade-Insecure-Requests": "1",
                },
                "retries": 10,
                "fragment_retries": 10,
                "extractor_retries": 5,
                "extractor_args": {
                    "youtube": {
                        "player_client": ["web", "android"],
                    },
                },
            }
    
    def _download_mp4(self, url: str, unique_id: str) -> dict:
        """Download video as MP4."""
        output_template = str(self.download_dir / f"{unique_id}.%(ext)s")
        
        # Try with Android client first (more reliable)
        ydl_opts = {
            **self._get_common_opts(use_android_client=True),
            "format": "best[ext=mp4]/best[height<=1080]/best",
            "outtmpl": output_template,
            "merge_output_format": "mp4",
        }
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                filename = ydl.prepare_filename(info)
                
                # Ensure the file has mp4 extension
                if not filename.endswith('.mp4'):
                    base = os.path.splitext(filename)[0]
                    mp4_filename = base + '.mp4'
                    if os.path.exists(mp4_filename):
                        filename = mp4_filename
                
                return {
                    "success": True,
                    "file_path": filename,
                    "format": "mp4",
                    "title": info.get("title", "Unknown"),
                    "duration": info.get("duration", 0),
                    "file_id": unique_id,
                }
        except Exception as e:
            raise ValueError(f"Download failed: {str(e)}")
    
    def _download_mp3(self, url: str, unique_id: str) -> dict:
        """Download video and convert to MP3."""
        output_template = str(self.download_dir / f"{unique_id}.%(ext)s")
        
        # Use Android client for better reliability
        ydl_opts = {
            **self._get_common_opts(use_android_client=True),
            "format": "bestaudio/best",
            "outtmpl": output_template,
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }],
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
                    "file_id": unique_id,
                }
        except Exception as e:
            raise ValueError(f"Download failed: {str(e)}")
    
    def _is_valid_url(self, url: str) -> bool:
        """Check if URL is a valid YouTube URL."""
        valid_domains = ["youtube.com", "youtu.be", "www.youtube.com"]
        return any(domain in url for domain in valid_domains)
