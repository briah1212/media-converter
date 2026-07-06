"""Tests for video compression service."""
import pytest
import os
from pathlib import Path
from src.services.video_compression_service import (
    VideoCompressionService,
    CompressionPreset,
    VideoCodec,
)


@pytest.fixture
def compression_service(tmp_path):
    """Create a video compression service instance."""
    return VideoCompressionService(output_dir=str(tmp_path))


class TestVideoCompressionService:
    """Test suite for VideoCompressionService."""
    
    def test_initialization(self, compression_service, tmp_path):
        """Test service initialization."""
        assert compression_service.output_dir == tmp_path
        assert compression_service.output_dir.exists()
    
    def test_compress_video_file_not_found(self, compression_service):
        """Test compression with non-existent file."""
        with pytest.raises(FileNotFoundError):
            compression_service.compress_video("/nonexistent/video.mp4")
    
    def test_compression_presets_defined(self):
        """Test that all compression presets are defined."""
        presets = [
            CompressionPreset.HIGH_QUALITY,
            CompressionPreset.BALANCED,
            CompressionPreset.HIGH_COMPRESSION,
            CompressionPreset.MAX_COMPRESSION,
        ]
        assert len(presets) == 4
        assert CompressionPreset.BALANCED.value == "balanced"
    
    def test_video_codecs_defined(self):
        """Test that all video codecs are defined."""
        codecs = [
            VideoCodec.H264,
            VideoCodec.H265,
            VideoCodec.VP9,
        ]
        assert len(codecs) == 3
        assert VideoCodec.H264.value == "h264"
    
    def test_get_compression_estimate_invalid_file(self, compression_service):
        """Test getting estimate for non-existent file."""
        with pytest.raises(FileNotFoundError):
            compression_service.get_compression_estimate("/fake/video.mp4")
