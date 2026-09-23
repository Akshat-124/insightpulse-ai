import csv
import io
import os
from typing import Tuple
from app.config import settings

class FileValidator:
    @staticmethod
    def validate_csv(file_bytes: bytes, filename: str) -> Tuple[bool, str, str]:
        """
        Validates CSV content.
        Returns: (is_valid, error_message, detected_delimiter)
        """
        # 1. Size check
        size_mb = len(file_bytes) / (1024 * 1024)
        if size_mb > settings.MAX_CSV_SIZE_MB:
            return False, f"File size ({size_mb:.1f}MB) exceeds limit of {settings.MAX_CSV_SIZE_MB}MB.", ","

        # 2. Extension check
        ext = os.path.splitext(filename)[1].lower()
        if ext not in [".csv", ".tsv", ".txt"]:
            return False, f"Unsupported file extension '{ext}'. Please upload a .csv file.", ","

        # 3. Decode & Delimiter Sniffing
        sample_text = ""
        for encoding in ["utf-8", "utf-8-sig", "latin-1", "cp1252"]:
            try:
                sample_text = file_bytes[:8192].decode(encoding)
                break
            except UnicodeDecodeError:
                continue

        if not sample_text:
            return False, "Failed to decode CSV with supported encodings (UTF-8, Latin-1).", ","

        if not sample_text.strip():
            return False, "Uploaded CSV file is completely empty.", ","

        # Detect delimiter
        try:
            sniffer = csv.Sniffer()
            dialect = sniffer.sniff(sample_text)
            delimiter = dialect.delimiter
        except Exception:
            delimiter = ","

        return True, "", delimiter
