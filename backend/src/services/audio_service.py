"""Audio conversion and processing service using FFmpeg."""
import os
import subprocess
import uuid
from pathlib import Path
from typing import Optional, Dict, Literal


class AudioService:
    """Service for audio format conversion and processing."""
    
    def __init__(self, output_dir: str = "/app/downloads"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def get_audio_info(self, file_path: str) -> Dict:
        """
        Get audio file information using ffprobe.
        
        Args:
            file_path: Path to audio file
            
        Returns:
            Dict with audio metadata
        """
        try:
            cmd = [
                "ffprobe",
                "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                "-show_streams",
                file_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=300)
            
            import json
            data = json.loads(result.stdout)
            
            audio_stream = None
            for stream in data.get("streams", []):
                if stream.get("codec_type") == "audio":
                    audio_stream = stream
                    break
            
            format_info = data.get("format", {})
            
            return {
                "format": format_info.get("format_name", "unknown"),
                "duration": float(format_info.get("duration", 0)),
                "bitrate": int(format_info.get("bit_rate", 0)),
                "size": int(format_info.get("size", 0)),
                "codec": audio_stream.get("codec_name", "unknown") if audio_stream else "unknown",
                "sample_rate": int(audio_stream.get("sample_rate", 0)) if audio_stream else 0,
                "channels": int(audio_stream.get("channels", 0)) if audio_stream else 0,
            }
        except Exception as e:
            return {"error": str(e)}
    
    def convert_audio(
        self,
        input_path: str,
        output_format: Literal["mp3", "aac", "m4a", "wav"],
        bitrate: Optional[str] = None,
        sample_rate: Optional[int] = None,
        channels: Optional[int] = None
    ) -> Dict:
        """
        Convert audio to different format.
        
        Args:
            input_path: Input audio file path
            output_format: Target format (mp3, aac, m4a, wav)
            bitrate: Audio bitrate (e.g., "192k", "320k")
            sample_rate: Sample rate in Hz (e.g., 44100, 48000)
            channels: Number of channels (1=mono, 2=stereo)
            
        Returns:
            Dict with conversion results
        """
        if not os.path.exists(input_path):
            return {"status": "error", "error": "Input file not found"}
        
        # Get input info
        input_info = self.get_audio_info(input_path)
        
        # Generate output path
        output_path = f"{self.output_dir}/{uuid.uuid4()}.{output_format}"
        
        # Build ffmpeg command
        cmd = ["ffmpeg", "-i", input_path]
        
        # Set codec based on format
        if output_format == "mp3":
            cmd.extend(["-c:a", "libmp3lame"])
            if not bitrate:
                bitrate = "192k"
        elif output_format in ["aac", "m4a"]:
            cmd.extend(["-c:a", "aac"])
            if not bitrate:
                bitrate = "192k"
        elif output_format == "wav":
            cmd.extend(["-c:a", "pcm_s16le"])
            bitrate = None  # WAV is lossless, no bitrate
        
        # Add bitrate if specified
        if bitrate:
            cmd.extend(["-b:a", bitrate])
        
        # Add sample rate if specified
        if sample_rate:
            cmd.extend(["-ar", str(sample_rate)])
        
        # Add channels if specified
        if channels:
            cmd.extend(["-ac", str(channels)])
        
        # Output file
        cmd.extend(["-y", output_path])
        
        try:
            subprocess.run(cmd, check=True, capture_output=True, timeout=300)
            
            output_info = self.get_audio_info(output_path)
            output_size = os.path.getsize(output_path)
            
            return {
                "status": "success",
                "output_path": str(output_path),
                "input_format": input_info.get("format", "unknown"),
                "output_format": output_format,
                "input_size_kb": round(input_info.get("size", 0) / 1024, 2),
                "output_size_kb": round(output_size / 1024, 2),
                "compression_ratio": round(output_size / input_info.get("size", 1), 3) if input_info.get("size") else 1.0,
                "duration": input_info.get("duration", 0),
                "bitrate": bitrate or "lossless",
                "sample_rate": output_info.get("sample_rate", 0),
                "channels": output_info.get("channels", 0)
            }
        except subprocess.CalledProcessError as e:
            return {
                "status": "error",
                "error": f"FFmpeg conversion failed: {e.stderr.decode() if e.stderr else str(e)}"
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def normalize_audio(self, input_path: str, target_level: float = -16.0) -> Dict:
        """
        Normalize audio volume to target LUFS level.
        
        Args:
            input_path: Input audio file
            target_level: Target loudness in LUFS (default: -16.0)
            
        Returns:
            Dict with normalized file info
        """
        if not os.path.exists(input_path):
            return {"status": "error", "error": "Input file not found"}
        
        # Detect input format
        input_info = self.get_audio_info(input_path)
        input_ext = Path(input_path).suffix
        
        output_path = f"{self.output_dir}/{uuid.uuid4()}{input_ext}"
        
        # Two-pass loudnorm filter
        cmd = [
            "ffmpeg", "-i", input_path,
            "-af", f"loudnorm=I={target_level}:LRA=11:TP=-1.5",
            "-y", output_path
        ]
        
        try:
            subprocess.run(cmd, check=True, capture_output=True, timeout=300)
            
            output_size = os.path.getsize(output_path)
            
            return {
                "status": "success",
                "output_path": str(output_path),
                "target_level": target_level,
                "input_size_kb": round(input_info.get("size", 0) / 1024, 2),
                "output_size_kb": round(output_size / 1024, 2),
                "duration": input_info.get("duration", 0)
            }
        except subprocess.CalledProcessError as e:
            return {
                "status": "error",
                "error": f"Normalization failed: {e.stderr.decode() if e.stderr else str(e)}"
            }
    
    def extract_audio_from_video(
        self,
        video_path: str,
        output_format: Literal["mp3", "aac", "m4a", "wav"] = "mp3",
        bitrate: str = "192k"
    ) -> Dict:
        """
        Extract audio track from video file.
        
        Args:
            video_path: Input video file path
            output_format: Output audio format
            bitrate: Audio bitrate
            
        Returns:
            Dict with extracted audio info
        """
        if not os.path.exists(video_path):
            return {"status": "error", "error": "Video file not found"}
        
        output_path = f"{self.output_dir}/{uuid.uuid4()}.{output_format}"
        
        cmd = ["ffmpeg", "-i", video_path, "-vn"]
        
        if output_format == "mp3":
            cmd.extend(["-c:a", "libmp3lame", "-b:a", bitrate])
        elif output_format in ["aac", "m4a"]:
            cmd.extend(["-c:a", "aac", "-b:a", bitrate])
        elif output_format == "wav":
            cmd.extend(["-c:a", "pcm_s16le"])
        
        cmd.extend(["-y", output_path])
        
        try:
            subprocess.run(cmd, check=True, capture_output=True, timeout=300)
            
            audio_info = self.get_audio_info(output_path)
            output_size = os.path.getsize(output_path)
            
            return {
                "status": "success",
                "output_path": str(output_path),
                "output_format": output_format,
                "output_size_kb": round(output_size / 1024, 2),
                "duration": audio_info.get("duration", 0),
                "bitrate": bitrate,
                "sample_rate": audio_info.get("sample_rate", 0),
                "channels": audio_info.get("channels", 0)
            }
        except subprocess.CalledProcessError as e:
            return {
                "status": "error",
                "error": f"Audio extraction failed: {e.stderr.decode() if e.stderr else str(e)}"
            }
    
    def trim_audio(
        self,
        input_path: str,
        start_time: float,
        end_time: Optional[float] = None,
        duration: Optional[float] = None
    ) -> Dict:
        """
        Trim audio to specified time range.
        
        Args:
            input_path: Input audio file
            start_time: Start time in seconds
            end_time: End time in seconds (optional)
            duration: Duration in seconds (alternative to end_time)
            
        Returns:
            Dict with trimmed audio info
        """
        if not os.path.exists(input_path):
            return {"status": "error", "error": "Input file not found"}
        
        if end_time is None and duration is None:
            return {"status": "error", "error": "Must specify either end_time or duration"}
        
        input_ext = Path(input_path).suffix
        output_path = f"{self.output_dir}/{uuid.uuid4()}{input_ext}"
        
        cmd = ["ffmpeg", "-i", input_path, "-ss", str(start_time)]
        
        if duration:
            cmd.extend(["-t", str(duration)])
        elif end_time:
            cmd.extend(["-to", str(end_time)])
        
        cmd.extend(["-c", "copy", "-y", output_path])
        
        try:
            subprocess.run(cmd, check=True, capture_output=True, timeout=300)
            
            audio_info = self.get_audio_info(output_path)
            output_size = os.path.getsize(output_path)
            
            return {
                "status": "success",
                "output_path": str(output_path),
                "start_time": start_time,
                "end_time": end_time,
                "duration": duration or (end_time - start_time if end_time else 0),
                "output_size_kb": round(output_size / 1024, 2),
                "actual_duration": audio_info.get("duration", 0)
            }
        except subprocess.CalledProcessError as e:
            return {
                "status": "error",
                "error": f"Trim failed: {e.stderr.decode() if e.stderr else str(e)}"
            }
    
    def batch_convert_audio(
        self,
        file_paths: list,
        output_format: str,
        bitrate: str = "192k",
        max_workers: int = 4
    ) -> Dict:
        """
        Batch convert multiple audio files.
        
        Args:
            file_paths: List of input audio file paths
            output_format: Target format
            bitrate: Audio bitrate
            max_workers: Number of parallel workers
            
        Returns:
            Dict with batch conversion results
        """
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        results = []
        successful = 0
        failed = 0
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_file = {
                executor.submit(self.convert_audio, fp, output_format, bitrate): fp
                for fp in file_paths
            }
            
            for future in as_completed(future_to_file):
                file_path = future_to_file[future]
                try:
                    result = future.result()
                    if result["status"] == "success":
                        successful += 1
                    else:
                        failed += 1
                    results.append({"file": os.path.basename(file_path), "result": result})
                except Exception as e:
                    failed += 1
                    results.append({
                        "file": os.path.basename(file_path),
                        "result": {"status": "error", "error": str(e)}
                    })
        
        return {
            "status": "complete",
            "total_files": len(file_paths),
            "successful": successful,
            "failed": failed,
            "results": results
        }
