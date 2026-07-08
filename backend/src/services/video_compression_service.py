"""Video compression service using ffmpeg with modern codecs."""
import os
import subprocess
import uuid
import json
from pathlib import Path
from typing import Literal, Optional, Dict
from enum import Enum


class CompressionPreset(str, Enum):
    """Compression quality presets."""
    HIGH_QUALITY = "high"      # CRF 18, larger file, best quality
    BALANCED = "balanced"       # CRF 23, good balance (default)
    HIGH_COMPRESSION = "high_compression"  # CRF 28, smaller file, lower quality
    MAX_COMPRESSION = "max_compression"    # CRF 32, smallest file


class VideoCodec(str, Enum):
    """Video codec options."""
    H264 = "h264"      # Best compatibility
    H265 = "h265"      # Better compression (HEVC)
    VP9 = "vp9"        # Good for web


class VideoCompressionService:
    """Service for compressing and optimizing video files."""
    
    def __init__(self, output_dir: str = "/app/downloads"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def compress_video(
        self,
        input_path: str,
        preset: CompressionPreset = CompressionPreset.BALANCED,
        codec: VideoCodec = VideoCodec.H264,
        target_size_mb: Optional[float] = None,
        output_path: Optional[str] = None,
    ) -> Dict:
        """
        Compress a video file with specified settings.
        
        Args:
            input_path: Path to input video file
            preset: Compression quality preset
            codec: Video codec to use
            target_size_mb: Target file size in MB (optional)
            output_path: Custom output path (optional)
            
        Returns:
            Dictionary with compression results and metadata
            
        Raises:
            FileNotFoundError: If input file does not exist
            ValueError: If compression fails
        """
        input_file = Path(input_path)
        
        if not input_file.exists():
            raise FileNotFoundError(f"Input file not found: {input_path}")
        
        # Get input video info
        input_info = self._get_video_info(input_path)
        
        # Generate output path
        if output_path is None:
            unique_id = str(uuid.uuid4())[:8]
            output_path = str(self.output_dir / f"compressed_{unique_id}.mp4")
        
        output_file = Path(output_path)
        
        # Choose compression method
        if target_size_mb:
            result = self._compress_by_size(
                input_path, output_path, target_size_mb, codec, input_info
            )
        else:
            result = self._compress_by_quality(
                input_path, output_path, preset, codec
            )
        
        # Get output info
        output_info = self._get_video_info(output_path)
        
        # Calculate compression ratio
        input_size = input_file.stat().st_size
        output_size = output_file.stat().st_size
        compression_ratio = ((input_size - output_size) / input_size) * 100
        
        return {
            "success": True,
            "input_path": str(input_file),
            "output_path": str(output_file),
            "input_size_mb": round(input_size / (1024 * 1024), 2),
            "output_size_mb": round(output_size / (1024 * 1024), 2),
            "compression_ratio": round(compression_ratio, 2),
            "codec": codec.value,
            "preset": preset.value if not target_size_mb else "target_size",
            "input_duration": input_info.get("duration", 0),
            "output_duration": output_info.get("duration", 0),
            "input_bitrate": input_info.get("bit_rate", 0),
            "output_bitrate": output_info.get("bit_rate", 0),
        }
    
    def _compress_by_quality(
        self,
        input_path: str,
        output_path: str,
        preset: CompressionPreset,
        codec: VideoCodec,
    ) -> Dict:
        """Compress using CRF (Constant Rate Factor) for quality-based compression."""
        # CRF values: lower = better quality, higher = more compression
        crf_map = {
            CompressionPreset.HIGH_QUALITY: 18,
            CompressionPreset.BALANCED: 23,
            CompressionPreset.HIGH_COMPRESSION: 28,
            CompressionPreset.MAX_COMPRESSION: 32,
        }
        
        crf = crf_map[preset]
        
        # Build ffmpeg command based on codec
        if codec == VideoCodec.H264:
            cmd = [
                "ffmpeg", "-i", input_path,
                "-c:v", "libx264",           # H.264 codec
                "-crf", str(crf),            # Quality factor
                "-preset", "medium",          # Encoding speed
                "-c:a", "aac",               # Audio codec
                "-b:a", "128k",              # Audio bitrate
                "-movflags", "+faststart",   # Web optimization
                "-y",                        # Overwrite output
                output_path
            ]
        elif codec == VideoCodec.H265:
            cmd = [
                "ffmpeg", "-i", input_path,
                "-c:v", "libx265",           # H.265 codec
                "-crf", str(crf),
                "-preset", "medium",
                "-c:a", "aac",
                "-b:a", "128k",
                "-movflags", "+faststart",
                "-y",
                output_path
            ]
        elif codec == VideoCodec.VP9:
            cmd = [
                "ffmpeg", "-i", input_path,
                "-c:v", "libvpx-vp9",        # VP9 codec
                "-crf", str(crf),
                "-b:v", "0",                 # VBR mode
                "-c:a", "libopus",           # Opus audio
                "-b:a", "128k",
                "-y",
                output_path
            ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )
            return {"success": True}
        except subprocess.CalledProcessError as e:
            raise ValueError(f"Compression failed: {e.stderr}")
    
    def _compress_by_size(
        self,
        input_path: str,
        output_path: str,
        target_size_mb: float,
        codec: VideoCodec,
        input_info: Dict,
    ) -> Dict:
        """Compress to achieve a specific target file size using two-pass encoding."""
        duration = float(input_info.get("duration", 0))
        
        if duration == 0:
            raise ValueError("Cannot determine video duration")
        
        # Calculate target bitrate (accounting for audio)
        audio_bitrate_kbps = 128
        target_size_bits = target_size_mb * 8 * 1024 * 1024
        target_bitrate_kbps = int((target_size_bits / duration) / 1000)
        video_bitrate_kbps = target_bitrate_kbps - audio_bitrate_kbps
        
        if video_bitrate_kbps < 100:
            raise ValueError(f"Target size too small. Minimum ~{duration * 0.1:.1f} MB")
        
        # Two-pass encoding for better quality at target size
        if codec == VideoCodec.H264:
            # Pass 1
            cmd_pass1 = [
                "ffmpeg", "-i", input_path,
                "-c:v", "libx264",
                "-b:v", f"{video_bitrate_kbps}k",
                "-pass", "1",
                "-an",  # No audio in first pass
                "-f", "null",
                "/dev/null"
            ]
            
            # Pass 2
            cmd_pass2 = [
                "ffmpeg", "-i", input_path,
                "-c:v", "libx264",
                "-b:v", f"{video_bitrate_kbps}k",
                "-pass", "2",
                "-c:a", "aac",
                "-b:a", f"{audio_bitrate_kbps}k",
                "-movflags", "+faststart",
                "-y",
                output_path
            ]
        elif codec == VideoCodec.H265:
            cmd_pass1 = [
                "ffmpeg", "-i", input_path,
                "-c:v", "libx265",
                "-b:v", f"{video_bitrate_kbps}k",
                "-x265-params", "pass=1",
                "-an",
                "-f", "null",
                "/dev/null"
            ]
            
            cmd_pass2 = [
                "ffmpeg", "-i", input_path,
                "-c:v", "libx265",
                "-b:v", f"{video_bitrate_kbps}k",
                "-x265-params", "pass=2",
                "-c:a", "aac",
                "-b:a", f"{audio_bitrate_kbps}k",
                "-movflags", "+faststart",
                "-y",
                output_path
            ]
        else:
            # VP9 two-pass
            cmd_pass1 = [
                "ffmpeg", "-i", input_path,
                "-c:v", "libvpx-vp9",
                "-b:v", f"{video_bitrate_kbps}k",
                "-pass", "1",
                "-an",
                "-f", "null",
                "/dev/null"
            ]
            
            cmd_pass2 = [
                "ffmpeg", "-i", input_path,
                "-c:v", "libvpx-vp9",
                "-b:v", f"{video_bitrate_kbps}k",
                "-pass", "2",
                "-c:a", "libopus",
                "-b:a", f"{audio_bitrate_kbps}k",
                "-y",
                output_path
            ]
        
        try:
            # Run pass 1
            subprocess.run(cmd_pass1, capture_output=True, check=True, timeout=3600)
            # Run pass 2
            subprocess.run(cmd_pass2, capture_output=True, text=True, check=True, timeout=3600)
            
            # Cleanup pass files
            try:
                for f in Path(".").glob("ffmpeg2pass*"):
                    f.unlink()
            except Exception:
                pass  # Ignore cleanup errors
            
            return {"success": True}
        except subprocess.CalledProcessError as e:
            raise ValueError(f"Two-pass compression failed: {e.stderr}")
    
    def _get_video_info(self, file_path: str) -> Dict:
        """Get video file information using ffprobe."""
        cmd = [
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            file_path
        ]
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                timeout=30
            )
            
            data = json.loads(result.stdout)
            format_info = data.get("format", {})
            
            # Extract video stream info
            video_stream = None
            for stream in data.get("streams", []):
                if stream.get("codec_type") == "video":
                    video_stream = stream
                    break
            
            width = 0
            height = 0
            if video_stream:
                width = int(video_stream.get("width", 0))
                height = int(video_stream.get("height", 0))
            
            return {
                "duration": float(format_info.get("duration", 0)),
                "size": int(format_info.get("size", 0)),
                "bit_rate": int(format_info.get("bit_rate", 0)),
                "format_name": format_info.get("format_name", "unknown"),
                "width": width,
                "height": height,
            }
        except Exception as e:
            return {"duration": 0, "size": 0, "bit_rate": 0, "width": 0, "height": 0}
    
    def get_compression_estimate(
        self,
        input_path: str,
        preset: CompressionPreset = CompressionPreset.BALANCED,
    ) -> Dict:
        """
        Estimate compression results without actually compressing.
        
        Args:
            input_path: Path to input video
            preset: Compression preset
            
        Returns:
            Estimated compression metrics
        """
        input_file = Path(input_path)
        
        if not input_file.exists():
            raise FileNotFoundError(f"Input file not found: {input_path}")
        
        input_info = self._get_video_info(input_path)
        input_size = input_file.stat().st_size
        
        # Rough compression ratio estimates based on preset
        ratio_map = {
            CompressionPreset.HIGH_QUALITY: 0.7,      # ~30% reduction
            CompressionPreset.BALANCED: 0.5,           # ~50% reduction
            CompressionPreset.HIGH_COMPRESSION: 0.3,   # ~70% reduction
            CompressionPreset.MAX_COMPRESSION: 0.2,    # ~80% reduction
        }
        
        estimated_ratio = ratio_map.get(preset, 0.5)
        estimated_size = input_size * estimated_ratio
        
        return {
            "input_size_mb": round(input_size / (1024 * 1024), 2),
            "estimated_output_size_mb": round(estimated_size / (1024 * 1024), 2),
            "estimated_compression_percent": round((1 - estimated_ratio) * 100, 2),
            "duration": input_info.get("duration", 0),
            "preset": preset.value,
        }

    def trim_video(self, input_path: str, start_time: float, end_time: Optional[float] = None, duration: Optional[float] = None) -> Dict:
        """Trim video to specified time range."""
        input_file = Path(input_path)
        if not input_file.exists():
            raise FileNotFoundError(f"Input file not found: {input_path}")
        
        if end_time is None and duration is None:
            raise ValueError("Must specify either end_time or duration")
        
        output_path = self.output_dir / f"trimmed_{uuid.uuid4()}.mp4"
        cmd = ["ffmpeg", "-i", str(input_path), "-ss", str(start_time)]
        
        if duration:
            cmd.extend(["-t", str(duration)])
        elif end_time:
            cmd.extend(["-to", str(end_time)])
        
        cmd.extend(["-c", "copy", "-y", str(output_path)])
        
        try:
            subprocess.run(cmd, check=True, capture_output=True, timeout=300)
            output_info = self._get_video_info(str(output_path))
            output_size = output_path.stat().st_size
            
            return {
                "success": True,
                "output_path": str(output_path),
                "start_time": start_time,
                "end_time": end_time,
                "duration": duration or (end_time - start_time if end_time else 0),
                "output_size_mb": round(output_size / (1024 * 1024), 2),
                "actual_duration": output_info.get("duration", 0)
            }
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.decode() if e.stderr else str(e)
            raise ValueError(f"Trim failed: {error_msg}")

    def resize_video(self, input_path: str, width: Optional[int] = None, height: Optional[int] = None, scale: Optional[float] = None) -> Dict:
        """Resize video to specified dimensions or scale."""
        input_file = Path(input_path)
        if not input_file.exists():
            raise FileNotFoundError(f"Input file not found: {input_path}")
        
        input_info = self._get_video_info(input_path)
        
        if scale:
            orig_width = int(input_info.get("width", 1920))
            orig_height = int(input_info.get("height", 1080))
            width = int(orig_width * scale)
            height = int(orig_height * scale)
        elif width and not height:
            orig_width = int(input_info.get("width", 1920))
            orig_height = int(input_info.get("height", 1080))
            height = int((width / orig_width) * orig_height)
        elif height and not width:
            orig_width = int(input_info.get("width", 1920))
            orig_height = int(input_info.get("height", 1080))
            width = int((height / orig_height) * orig_width)
        
        if not width or not height:
            raise ValueError("Must specify width, height, or scale")
        
        width = width - (width % 2)
        height = height - (height % 2)
        
        output_path = self.output_dir / f"resized_{uuid.uuid4()}.mp4"
        cmd = ["ffmpeg", "-i", str(input_path), "-vf", f"scale={width}:{height}", "-c:a", "copy", "-y", str(output_path)]
        
        try:
            subprocess.run(cmd, check=True, capture_output=True, timeout=300)
            output_info = self._get_video_info(str(output_path))
            output_size = output_path.stat().st_size
            input_size = input_file.stat().st_size
            
            return {
                "success": True,
                "output_path": str(output_path),
                "input_resolution": f"{input_info.get('width')}x{input_info.get('height')}",
                "output_resolution": f"{width}x{height}",
                "input_size_mb": round(input_size / (1024 * 1024), 2),
                "output_size_mb": round(output_size / (1024 * 1024), 2),
                "duration": output_info.get("duration", 0)
            }
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.decode() if e.stderr else str(e)
            raise ValueError(f"Resize failed: {error_msg}")

    def convert_video_format(self, input_path: str, output_format: str, quality: str = "medium") -> Dict:
        """Convert video to different format."""
        input_file = Path(input_path)
        if not input_file.exists():
            raise FileNotFoundError(f"Input file not found: {input_path}")
        
        output_path = self.output_dir / f"converted_{uuid.uuid4()}.{output_format}"
        
        if output_format == "mp4":
            codec_params = ["-c:v", "libx264", "-preset", quality]
        elif output_format == "webm":
            codec_params = ["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "30"]
        else:
            codec_params = ["-c:v", "libx264", "-preset", quality]
        
        cmd = ["ffmpeg", "-i", str(input_path)] + codec_params + ["-c:a", "aac", "-y", str(output_path)]
        
        try:
            subprocess.run(cmd, check=True, capture_output=True, timeout=300)
            output_info = self._get_video_info(str(output_path))
            output_size = output_path.stat().st_size
            input_size = input_file.stat().st_size
            
            return {
                "success": True,
                "output_path": str(output_path),
                "input_format": input_file.suffix[1:],
                "output_format": output_format,
                "input_size_mb": round(input_size / (1024 * 1024), 2),
                "output_size_mb": round(output_size / (1024 * 1024), 2),
                "duration": output_info.get("duration", 0),
                "resolution": f"{output_info.get('width')}x{output_info.get('height')}"
            }
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.decode() if e.stderr else str(e)
            raise ValueError(f"Format conversion failed: {error_msg}")
