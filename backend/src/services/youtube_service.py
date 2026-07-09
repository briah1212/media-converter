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
        format_type: Literal["mp4", "mp3"] = "mp4",
        quality: Optional[int] = None,
        bitrate: Optional[int] = None,
    ) -> dict:
        """
        Download a YouTube video in the specified format.

        Args:
            url: YouTube video URL
            format_type: Output format (mp4 or mp3)
            quality: Max video height for mp4 (e.g. 720, 1080, 2160)
            bitrate: Audio bitrate in kbps for mp3 (e.g. 128, 192, 256, 320)

        Returns:
            Dictionary with file path and metadata

        Raises:
            ValueError: If URL is invalid or download fails
        """
        if not self._is_valid_url(url):
            raise ValueError(f"Invalid YouTube URL: {url}")

        unique_id = str(uuid.uuid4())[:8]

        if format_type == "mp4":
            return self._download_mp4(url, unique_id, quality=quality)
        elif format_type == "mp3":
            return self._download_mp3(url, unique_id, bitrate=bitrate)
        else:
            raise ValueError(f"Unsupported format: {format_type}")

    def get_video_info(self, url: str) -> dict:
        """
        Fetch video metadata without downloading.

        Returns title, channel, duration, view count, thumbnail, and
        per-quality/per-bitrate size estimates for the frontend pickers.
        """
        if not self._is_valid_url(url):
            raise ValueError(f"Invalid YouTube URL: {url}")

        ydl_opts = {**self._get_common_opts(use_android=True), "skip_download": True}
        info = self._download_with_fallback_strategies(ydl_opts, url, download=False)

        duration = info.get("duration") or 0
        return {
            "title": info.get("title", "Unknown"),
            "channel": info.get("uploader") or info.get("channel") or "Unknown channel",
            "duration": duration,
            "view_count": info.get("view_count"),
            "thumbnail": info.get("thumbnail"),
            "qualities": self._estimate_quality_sizes(info),
            "bitrates": [
                {"label": f"{kbps}kbps", "kbps": kbps, "size_bytes": int(duration * kbps * 1000 / 8)}
                for kbps in (128, 192, 256, 320)
            ],
        }

    def _estimate_quality_sizes(self, info: dict) -> list:
        """Estimate downloadable file size for each available quality tier."""
        duration = info.get("duration") or 0
        formats = info.get("formats") or []
        audio_bytes = duration * 128_000 / 8

        tiers = [("360p", 0, 360), ("480p", 360, 480), ("720p", 480, 720),
                 ("1080p", 720, 1080), ("4K", 1080, 2160)]
        results = []
        for label, min_h, max_h in tiers:
            candidates = [
                f for f in formats
                if f.get("height") and min_h < f["height"] <= max_h
                and f.get("vcodec") not in (None, "none")
            ]
            if not candidates:
                continue
            best = max(candidates, key=lambda f: (f["height"], f.get("tbr") or 0))
            size = best.get("filesize") or best.get("filesize_approx")
            if not size and best.get("tbr"):
                size = best["tbr"] * 1000 / 8 * duration
            if not size:
                continue
            if best.get("acodec") in (None, "none"):
                size += audio_bytes
            results.append({"label": label, "height": max_h, "size_bytes": int(size)})
        return results
    
    def _get_common_opts(self, use_android: bool = True, use_oauth: bool = False) -> dict:
        """
        Get common yt-dlp options with comprehensive anti-bot measures.
        
        Args:
            use_android: Use Android client headers
            use_oauth: Use OAuth authentication (requires token)
        """
        # Base configuration
        opts = {
            "quiet": False,
            "no_warnings": False,
            
            # Retry configuration
            "retries": 20,
            "fragment_retries": 20,
            "extractor_retries": 15,
            
            # Network optimization
            "concurrent_fragment_downloads": 5,
            "http_chunk_size": 10485760,  # 10MB chunks
            
            # Bypass geo-restrictions
            "geo_bypass": True,
            "geo_bypass_country": "US",
        }
        
        if use_android:
            # Android TV client is most reliable for avoiding bot detection
            opts.update({
                "extractor_args": {
                    "youtube": {
                        # Use Android TV and Android Music clients (most reliable)
                        "player_client": ["android_music", "android_vr", "android"],
                        "player_skip": ["webpage", "configs"],
                        "skip": ["authcheck"],
                    },
                },
                "http_headers": {
                    "User-Agent": "com.google.android.apps.youtube.music/7.41.52 (Linux; U; Android 13) gzip",
                    "X-YouTube-Client-Name": "21",  # Android Music client
                    "X-YouTube-Client-Version": "7.41.52",
                    "Accept-Language": "en-US,en;q=0.9",
                },
            })
        else:
            # Fallback to standard web client with aggressive caching
            opts.update({
                "extractor_args": {
                    "youtube": {
                        "player_client": ["web", "web_music"],
                        "skip": ["hls", "dash"],
                    },
                },
                "http_headers": {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.9",
                },
            })
        
        return opts
    
    def _download_with_fallback_strategies(self, ydl_opts: dict, url: str, download: bool = True) -> dict:
        """
        Attempt download with multiple fallback strategies.
        
        Strategy order:
        1. Android Music client (bypasses most restrictions)
        2. Android VR client  
        3. Android client with aggressive retries
        4. Web client with reduced format requirements
        5. Embedded client (last resort)
        """
        strategies = [
            # Strategy 1: Android Music (most reliable)
            ("android_music", lambda opts: {
                **opts,
                "extractor_args": {
                    "youtube": {
                        "player_client": ["android_music"],
                        "player_skip": ["webpage", "configs", "js"],
                        "skip": ["authcheck", "dash", "hls"],
                    }
                },
                "http_headers": {
                    "User-Agent": "com.google.android.apps.youtube.music/7.41.52 (Linux; U; Android 13) gzip",
                    "X-YouTube-Client-Name": "21",
                    "X-YouTube-Client-Version": "7.41.52",
                    "Accept-Language": "en-US,en;q=0.9",
                },
            }),
            
            # Strategy 2: Android VR
            ("android_vr", lambda opts: {
                **opts,
                "extractor_args": {
                    "youtube": {
                        "player_client": ["android_vr"],
                        "player_skip": ["webpage", "configs"],
                        "skip": ["authcheck"],
                    }
                },
                "http_headers": {
                    "User-Agent": "com.google.android.apps.youtube.vr.oculus/1.61.49 (Linux; U; Android 13) gzip",
                },
            }),
            
            # Strategy 3: Standard Android
            ("android", lambda opts: {
                **opts,
                "extractor_args": {
                    "youtube": {
                        "player_client": ["android"],
                        "player_skip": ["configs"],
                    }
                },
                "http_headers": {
                    "User-Agent": "com.google.android.youtube/19.49.37 (Linux; U; Android 13) gzip",
                    "X-YouTube-Client-Name": "3",
                    "X-YouTube-Client-Version": "19.49.37",
                },
            }),
            
            # Strategy 4: TV Embedded (no authentication required)
            ("tv_embedded", lambda opts: {
                **opts,
                "extractor_args": {
                    "youtube": {
                        "player_client": ["tv_embedded"],
                        "skip": ["authcheck", "hls"],
                    }
                },
            }),
            
            # Strategy 5: iOS client
            ("ios", lambda opts: {
                **opts,
                "extractor_args": {
                    "youtube": {
                        "player_client": ["ios"],
                        "skip": ["authcheck"],
                    }
                },
                "http_headers": {
                    "User-Agent": "com.google.ios.youtube/19.49.7 (iPhone16,2; U; CPU iOS 18_2_0 like Mac OS X;)",
                    "X-YouTube-Client-Name": "5",
                    "X-YouTube-Client-Version": "19.49.7",
                },
            }),
        ]
        
        last_error = None
        
        for strategy_name, strategy_modifier in strategies:
            try:
                logger.info(f"Attempting download with strategy: {strategy_name}")
                modified_opts = strategy_modifier(ydl_opts.copy())
                
                with yt_dlp.YoutubeDL(modified_opts) as ydl:
                    info = ydl.extract_info(url, download=download)
                    logger.info(f"Successfully downloaded with strategy: {strategy_name}")
                    return info
                    
            except Exception as e:
                error_msg = str(e).lower()
                logger.warning(f"Strategy {strategy_name} failed: {e}")
                last_error = e
                
                # Continue to next strategy on any error
                continue
        
        # All strategies failed
        raise ValueError(f"All download strategies failed. Last error: {str(last_error)}")
    
    def _download_mp4(self, url: str, unique_id: str, quality: Optional[int] = None) -> dict:
        """Download video as MP4 with fallback strategies."""
        output_template = str(self.download_dir / f"{unique_id}.%(ext)s")

        if quality:
            format_spec = f"best[height<={quality}][ext=mp4]/best[height<={quality}]/best[ext=mp4]/best"
        else:
            # Prioritize MP4 formats that don't require merging
            format_spec = "best[ext=mp4]/best"

        base_opts = self._get_common_opts(use_android=True)
        ydl_opts = {
            **base_opts,
            "format": format_spec,
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
    
    def _download_mp3(self, url: str, unique_id: str, bitrate: Optional[int] = None) -> dict:
        """Download video and convert to MP3 with fallback strategies."""
        output_template = str(self.download_dir / f"{unique_id}.%(ext)s")

        base_opts = self._get_common_opts(use_android=True)
        ydl_opts = {
            **base_opts,
            "format": "bestaudio[ext=m4a]/bestaudio/best",
            "outtmpl": output_template,
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": str(bitrate or 192),
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
