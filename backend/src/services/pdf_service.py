"""PDF processing service for merge, split, compress, and conversion."""
import os
import uuid
from pathlib import Path
from typing import Optional, Dict, List
from PIL import Image


class PDFService:
    """Service for PDF operations."""
    
    def __init__(self, output_dir: str = "/app/downloads"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def get_pdf_info(self, file_path: str) -> Dict:
        """
        Get PDF file information.
        
        Args:
            file_path: Path to PDF file
            
        Returns:
            Dict with PDF metadata
        """
        try:
            from PyPDF2 import PdfReader
            
            reader = PdfReader(file_path)
            file_size = os.path.getsize(file_path)
            
            return {
                "page_count": len(reader.pages),
                "file_size_kb": round(file_size / 1024, 2),
                "encrypted": reader.is_encrypted,
                "metadata": reader.metadata if reader.metadata else {}
            }
        except Exception as e:
            return {"error": str(e)}
    
    def merge_pdfs(self, pdf_paths: List[str], output_path: Optional[str] = None) -> Dict:
        """
        Merge multiple PDF files into one.
        
        Args:
            pdf_paths: List of PDF file paths to merge
            output_path: Output file path (optional)
            
        Returns:
            Dict with merge results
        """
        if len(pdf_paths) < 2:
            return {"status": "error", "error": "Need at least 2 PDFs to merge"}
        
        try:
            from PyPDF2 import PdfMerger
            
            # Verify all files exist
            for pdf_path in pdf_paths:
                if not os.path.exists(pdf_path):
                    return {"status": "error", "error": f"File not found: {pdf_path}"}
            
            if output_path is None:
                output_path = self.output_dir / f"merged_{uuid.uuid4()}.pdf"
            else:
                output_path = Path(output_path)
            
            # Merge PDFs
            merger = PdfMerger()
            for pdf_path in pdf_paths:
                merger.append(pdf_path)
            
            merger.write(str(output_path))
            merger.close()
            
            # Get output info
            output_info = self.get_pdf_info(str(output_path))
            
            return {
                "status": "success",
                "output_path": str(output_path),
                "num_files_merged": len(pdf_paths),
                "total_pages": output_info.get("page_count", 0),
                "file_size_kb": output_info.get("file_size_kb", 0)
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def split_pdf(
        self,
        pdf_path: str,
        pages: Optional[List[int]] = None,
        ranges: Optional[List[tuple]] = None
    ) -> Dict:
        """
        Split PDF into separate files.
        
        Args:
            pdf_path: Input PDF file path
            pages: List of page numbers to extract (1-indexed)
            ranges: List of (start, end) tuples for page ranges
            
        Returns:
            Dict with split results
        """
        try:
            from PyPDF2 import PdfReader, PdfWriter
            
            if not os.path.exists(pdf_path):
                return {"status": "error", "error": "PDF file not found"}
            
            reader = PdfReader(pdf_path)
            total_pages = len(reader.pages)
            
            output_files = []
            
            # Extract specific pages
            if pages:
                for page_num in pages:
                    if page_num < 1 or page_num > total_pages:
                        continue
                    
                    writer = PdfWriter()
                    writer.add_page(reader.pages[page_num - 1])
                    
                    output_path = self.output_dir / f"page_{page_num}_{uuid.uuid4()}.pdf"
                    with open(output_path, "wb") as f:
                        writer.write(f)
                    
                    output_files.append({
                        "path": str(output_path),
                        "pages": [page_num],
                        "size_kb": round(os.path.getsize(output_path) / 1024, 2)
                    })
            
            # Extract page ranges
            if ranges:
                for start, end in ranges:
                    if start < 1 or end > total_pages or start > end:
                        continue
                    
                    writer = PdfWriter()
                    for page_num in range(start - 1, end):
                        writer.add_page(reader.pages[page_num])
                    
                    output_path = self.output_dir / f"pages_{start}-{end}_{uuid.uuid4()}.pdf"
                    with open(output_path, "wb") as f:
                        writer.write(f)
                    
                    output_files.append({
                        "path": str(output_path),
                        "pages": list(range(start, end + 1)),
                        "size_kb": round(os.path.getsize(output_path) / 1024, 2)
                    })
            
            return {
                "status": "success",
                "output_files": output_files,
                "num_files_created": len(output_files)
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def compress_pdf(self, pdf_path: str, quality: str = "medium") -> Dict:
        """
        Compress PDF file by reducing image quality.
        
        Args:
            pdf_path: Input PDF file path
            quality: Compression quality (low, medium, high)
            
        Returns:
            Dict with compression results
        """
        try:
            from PyPDF2 import PdfReader, PdfWriter
            
            if not os.path.exists(pdf_path):
                return {"status": "error", "error": "PDF file not found"}
            
            # Quality settings
            quality_map = {
                "low": 50,
                "medium": 75,
                "high": 85
            }
            image_quality = quality_map.get(quality, 75)
            
            reader = PdfReader(pdf_path)
            writer = PdfWriter()
            
            # Copy all pages
            for page in reader.pages:
                writer.add_page(page)
            
            # Compress
            for page in writer.pages:
                page.compress_content_streams()
            
            output_path = self.output_dir / f"compressed_{uuid.uuid4()}.pdf"
            with open(output_path, "wb") as f:
                writer.write(f)
            
            input_size = os.path.getsize(pdf_path)
            output_size = os.path.getsize(output_path)
            compression_ratio = round((1 - output_size / input_size) * 100, 2) if input_size > 0 else 0
            
            return {
                "status": "success",
                "output_path": str(output_path),
                "input_size_kb": round(input_size / 1024, 2),
                "output_size_kb": round(output_size / 1024, 2),
                "compression_ratio": compression_ratio,
                "quality": quality
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def images_to_pdf(
        self,
        image_paths: List[str],
        output_path: Optional[str] = None
    ) -> Dict:
        """
        Convert multiple images to a single PDF.
        
        Args:
            image_paths: List of image file paths
            output_path: Output PDF path (optional)
            
        Returns:
            Dict with conversion results
        """
        if not image_paths:
            return {"status": "error", "error": "No images provided"}
        
        try:
            # Verify all images exist
            for img_path in image_paths:
                if not os.path.exists(img_path):
                    return {"status": "error", "error": f"Image not found: {img_path}"}
            
            if output_path is None:
                output_path = self.output_dir / f"images_{uuid.uuid4()}.pdf"
            else:
                output_path = Path(output_path)
            
            # Open all images
            images = []
            for img_path in image_paths:
                img = Image.open(img_path)
                # Convert to RGB if needed
                if img.mode not in ["RGB", "L"]:
                    img = img.convert("RGB")
                images.append(img)
            
            # Save as PDF
            if images:
                images[0].save(
                    str(output_path),
                    save_all=True,
                    append_images=images[1:] if len(images) > 1 else [],
                    resolution=100.0
                )
            
            output_size = os.path.getsize(output_path)
            pdf_info = self.get_pdf_info(str(output_path))
            
            return {
                "status": "success",
                "output_path": str(output_path),
                "num_images": len(image_paths),
                "page_count": pdf_info.get("page_count", 0),
                "file_size_kb": round(output_size / 1024, 2)
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def pdf_to_images(
        self,
        pdf_path: str,
        dpi: int = 200,
        image_format: str = "png"
    ) -> Dict:
        """
        Convert PDF pages to images.
        
        Args:
            pdf_path: Input PDF file path
            dpi: Resolution in DPI (default: 200)
            image_format: Output format (png, jpg)
            
        Returns:
            Dict with conversion results
        """
        try:
            from pdf2image import convert_from_path
            
            if not os.path.exists(pdf_path):
                return {"status": "error", "error": "PDF file not found"}
            
            # Convert PDF to images
            images = convert_from_path(pdf_path, dpi=dpi)
            
            output_files = []
            for i, image in enumerate(images):
                output_path = self.output_dir / f"page_{i+1}_{uuid.uuid4()}.{image_format}"
                
                if image_format.lower() == "jpg":
                    image.save(str(output_path), "JPEG", quality=95, optimize=True)
                else:
                    image.save(str(output_path), "PNG", optimize=True)
                
                output_files.append({
                    "path": str(output_path),
                    "page_number": i + 1,
                    "size_kb": round(os.path.getsize(output_path) / 1024, 2)
                })
            
            return {
                "status": "success",
                "output_files": output_files,
                "num_pages": len(images),
                "dpi": dpi,
                "format": image_format
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
