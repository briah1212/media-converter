"""Integration tests for the entire media conversion pipeline."""
import pytest
import os
from src.services.youtube_service import YouTubeService
from src.services.converter_service import ConverterService


@pytest.fixture
def youtube_service(tmp_path):
    """Create YouTube service instance."""
    return YouTubeService(download_dir=str(tmp_path / "downloads"))


@pytest.fixture
def converter_service(tmp_path):
    """Create converter service instance."""
    return ConverterService(temp_dir=str(tmp_path / "temp"))


@pytest.mark.integration
class TestIntegration:
    """Integration tests for complete workflows."""
    
    def test_youtube_to_mp4_workflow(self, youtube_service):
        """Test complete YouTube to MP4 workflow."""
        url = "https://www.youtube.com/watch?v=jNQXAC9IVRw"
        
        # Download video
        result = youtube_service.download_video(url, format_type="mp4")
        
        assert result["success"] is True
        assert result["format"] == "mp4"
        assert os.path.exists(result["file_path"])
        
        # Verify file size is reasonable
        file_size = os.path.getsize(result["file_path"])
        assert file_size > 1000  # At least 1KB
        
        # Cleanup
        os.remove(result["file_path"])
    
    def test_youtube_to_mp3_workflow(self, youtube_service):
        """Test complete YouTube to MP3 workflow."""
        url = "https://www.youtube.com/watch?v=jNQXAC9IVRw"
        
        # Download and convert to MP3
        result = youtube_service.download_video(url, format_type="mp3")
        
        assert result["success"] is True
        assert result["format"] == "mp3"
        assert os.path.exists(result["file_path"])
        assert result["file_path"].endswith(".mp3")
        
        # Verify file size
        file_size = os.path.getsize(result["file_path"])
        assert file_size > 1000
        
        # Cleanup
        os.remove(result["file_path"])
    
    def test_mp4_to_mp3_conversion_workflow(
        self, 
        youtube_service, 
        converter_service
    ):
        """Test downloading MP4 and then converting to MP3."""
        url = "https://www.youtube.com/watch?v=jNQXAC9IVRw"
        
        # Step 1: Download as MP4
        download_result = youtube_service.download_video(url, format_type="mp4")
        mp4_path = download_result["file_path"]
        
        assert os.path.exists(mp4_path)
        
        # Step 2: Convert MP4 to MP3
        convert_result = converter_service.mp4_to_mp3(mp4_path)
        mp3_path = convert_result["output_path"]
        
        assert convert_result["success"] is True
        assert os.path.exists(mp3_path)
        assert mp3_path.endswith(".mp3")
        
        # Verify both files exist and have reasonable sizes
        mp4_size = os.path.getsize(mp4_path)
        mp3_size = os.path.getsize(mp3_path)
        
        assert mp4_size > 1000
        assert mp3_size > 1000
        
        # Cleanup
        os.remove(mp4_path)
        os.remove(mp3_path)
