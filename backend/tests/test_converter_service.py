"""Tests for converter service."""
import pytest
from pathlib import Path
from src.services.converter_service import ConverterService


@pytest.fixture
def converter_service(tmp_path):
    """Create a converter service instance with temporary directory."""
    return ConverterService(temp_dir=str(tmp_path))


class TestConverterService:
    """Test suite for ConverterService."""
    
    def test_initialization(self, converter_service, tmp_path):
        """Test service initialization."""
        assert converter_service.temp_dir == tmp_path
        assert converter_service.temp_dir.exists()
    
    def test_mp4_to_mp3_file_not_found(self, converter_service):
        """Test conversion with non-existent file."""
        with pytest.raises(FileNotFoundError):
            converter_service.mp4_to_mp3("/nonexistent/file.mp4")
