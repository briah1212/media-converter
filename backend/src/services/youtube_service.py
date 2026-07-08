"""YouTube download service using yt-dlp with enhanced bot detection bypass."""
import os
import uuid
import logging
from pathlib import Path
from typing import Literal, Optional
import yt_dlp

logger = logging.getLogger(__name__)


class YouTubeService:
    """Service for downloading YouTube videos with anti-bot measures."""
    
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
    
    def _get_common_opts(self, cookies_from_browser: Optional[str] = None) -> dict:
        """
        Get common yt-dlp options with comprehensive anti-bot measures.
        
        Args:
            cookies_from_browser: Browser to extract cookies from (e.g., 'chrome', 'firefox')
                                 If None, will try multiple strategies
        """
        # Base configuration with Android client (most reliable)
        opts = {
            "quiet": False,
            "no_warnings": False,
            "verbose": True,  # Enable verbose logging for debugging
            
            # Use Android client to bypass bot detection (most effective)
            "extractor_args": {
                "youtube": {
                    # Try multiple player clients in order
                    "player_client": ["android_creator", "android", "android_embedded", "web"],
                    "player_skip": ["configs", "webpage"],  # Skip unnecessary requests
                    "skip": ["authcheck"],  # Skip authentication check when possible
                },
            },
            
            # Android app headers (impersonate official YouTube app)
            "http_headers": {
                "User-Agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 13; en_US) gzip",
                "X-YouTube-Client-Name": "3",
                "X-YouTube-Client-Version": "19.09.37",
                "Accept-Language": "en-US,en;q=0.9",
            },
            
            # Retry configuration
            "retries": 15,
            "fragment_retries": 15,
            "extractor_retries": 10,
            
            # Network optimization
            "concurrent_fragment_downloads": 5,
            "http_chunk_size": 10485760,  # 10MB chunks
            
            # Bypass geo-restrictions
            "geo_bypass": True,
            "geo_bypass_country": "US",
        }
        
        # Try to use cookies if available
        if cookies_from_browser:
            try:
                opts["cookiesfrombrowser"] = (cookies_from_browser,)
                logger.info(f"Using cookies from browser: {cookies_from_browser}")
            except Exception as e:
                logger.warning(f"Could not extract cookies from {cookies_from_browser}: {e}")
        
        return opts
    
    def _download_with_fallback_strategies(self, ydl_opts: dict, url: str) -> dict:
        """
        Attempt download with multiple fallback strategies.
        
        Strategy order:
        1. Try with Android client + cookies from Chrome
        2. Try with Android client + cookies from Firefox  
        3. Try with Android client only
        4. Try with web client
        5. Try with embedded client
        """
        strategies = [
            ("android_with_chrome_cookies", lambda opts: {**opts, **{"cookiesfrombrowser": ("chrome",)}}),
            ("android_with_firefox_cookies", lambda opts: {**opts, **{"cookiesfrombrowser": ("firefox",)}}),
            ("android_only", lambda opts: opts),
            ("web_client", lambda opts: {**opts, **{
                "extractor_args": {
                    "youtube": {
                        "player_client": ["web", "web_creator"],
                    }
                },
                "http_headers": {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                }
            }}),
            ("tv_embedded", lambda opts: {**opts, **{
                "extractor_args": {
                    "youtube": {
                        "player_client": ["tv_embedded", "android_embedded"],
                    }
                }
            }}),
        ]
        
        last_error = None
        
        for strategy_name, strategy_modifier in strategies:
            try:
                logger.info(f"Attempting download with strategy: {strategy_name}")
                modified_opts = strategy_modifier(ydl_opts.copy())
                
                with yt_dlp.YoutubeDL(modified_opts) as ydl:
                    info = ydl.extract_info(url, download=True)
                    logger.info(f"Successfully downloaded with strategy: {strategy_name}")
                    return info
                    
            except Exception as e:
                error_msg = str(e).lower()
                logger.warning(f"Strategy {strategy_name} failed: {e}")
                last_error = e
                
                # If it's a cookies error, skip to next strategy quickly
                if "cookies" in error_msg or "browser" in error_msg:
                    continue
                    
                # If it's a bot detection error, try next strategy
                if any(keyword in error_msg for keyword in ["sign in", "bot", "captcha", "verify"]):
                    continue
                    
                # If it's a different error, might be worth retrying
                if "http error" in error_msg or "network" in error_msg:
                    continue
        
        # All strategies failed
        raise ValueError(f"All download strategies failed. Last error: {str(last_error)}")
    
    def _download_mp4(self, url: str, unique_id: str) -> dict:
        """Download video as MP4 with fallback strategies."""
        output_template = str(self.download_dir / f"{unique_id}.%(ext)s")
        
        base_opts = self._get_common_opts()
        ydl_opts = {
            **base_opts,
            "format": "best[ext=mp4][height<=1080]/bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[height<=1080]/best",
            "outtmpl": output_template,
            "merge_output_format": "mp4",
        }
        
        try:
            info = self._download_with_fallback_strategies(ydl_opts, url)
            
            # Prepare filename
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
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
        """Download video and convert to MP3 with fallback strategies."""
        output_template = str(self.download_dir / f"{unique_id}.%(ext)s")
        
        base_opts = self._get_common_opts()
        ydl_opts = {
            **base_opts,
            "format": "bestaudio[ext=m4a]/bestaudio/best",
            "outtmpl": output_template,
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }],
        }
        
        try:
            info = self._download_with_fallback_strategies(ydl_opts, url)
            
            # yt-dlp changes the extension after postprocessing
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
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
