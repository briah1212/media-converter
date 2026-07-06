"""Tests for YouTube download service."""
import pytest
import os
from pathlib import Path
from src.services.youtube_service import YouTubeService


@pytest.fixture
def youtube_service(tmp_path):
    """Create a YouTube service instance with temporary directory."""
    return YouTubeService(download_dir=str(tmp_path))


class TestYouTubeService:
    """Test suite for YouTubeService."""
    
    def test_initialization(self, youtube_service, tmp_path):
        """Test service initialization."""
        assert youtube_service.download_dir == tmp_path
        assert youtube_service.download_dir.exists()
    
    def test_valid_url_detection(self, youtube_service):
        """Test URL validation."""
        valid_urls = [
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "https://youtube.com/watch?v=dQw4w9WgXcQ",
            "https://youtu.be/dQw4w9WgXcQ",
        ]
        
        for url in valid_urls:
            assert youtube_service._is_valid_url(url)
    
    def test_invalid_url_detection(self, youtube_service):
        """Test invalid URL detection."""
        invalid_urls = [
            "https://vimeo.com/123456",
            "https://example.com",
            "not a url",
            "",
        ]
        
        for url in invalid_urls:
            assert not youtube_service._is_valid_url(url)
    
    def test_invalid_url_raises_error(self, youtube_service):
        """Test that invalid URL raises ValueError."""
        with pytest.raises(ValueError, match="Invalid YouTube URL"):
            youtube_service.download_video("https://example.com")
    
    def test_unsupported_format_raises_error(self, youtube_service):
        """Test that unsupported format raises ValueError."""
        with pytest.raises(ValueError, match="Unsupported format"):
            youtube_service.download_video(
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                format_type="avi"
            )
    
    @pytest.mark.integration
    def test_download_mp4(self, youtube_service):
        """Integration test: Download a short YouTube video as MP4."""
        # Using a short test video
        url = "https://www.youtube.com/watch?v=jNQXAC9IVRw"  # "Me at the zoo"
        
        result = youtube_service.download_video(url, format_type="mp4")
        
        assert result["success"] is True
        assert result["format"] == "mp4"
        assert "file_path" in result
        assert os.path.exists(result["file_path"])
        assert "title" in result
        assert result["duration"] > 0
        
        # Cleanup
        os.remove(result["file_path"])
    
    @pytest.mark.integration
    def test_download_mp3(self, youtube_service):
        """Integration test: Download a short YouTube video as MP3."""
        url = "https://www.youtube.com/watch?v=jNQXAC9IVRw"
        
        result = youtube_service.download_video(url, format_type="mp3")
        
        assert result["success"] is True
        assert result["format"] == "mp3"
        assert "file_path" in result
        assert os.path.exists(result["file_path"])
        assert result["file_path"].endswith(".mp3")
        
        # Cleanup
        os.remove(result["file_path"])
