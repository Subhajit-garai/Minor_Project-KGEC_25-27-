import csv
import os
from typing import Optional, List, Dict, Any


class PacketWriter:
    """
    Dedicated streaming CSV writer for packet features.
    Ensures headers are written only once, handles tuple and nested feature
    values consistently, and supports both context manager and incremental writing.
    """

    def __init__(self, output_file: str, fieldnames: Optional[List[str]] = None, flush_interval: int = 1):
        self.output_file = output_file
        self.fieldnames = list(fieldnames) if fieldnames else None
        self.flush_interval = max(1, flush_interval)

        self._file = None
        self._writer = None
        self._header_written = False
        self._rows_written = 0

    def __enter__(self):
        self.open()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def open(self):
        """Opens the target file and prepares the CSV writer."""
        if self._file is None:
            # Ensure parent directories exist
            parent_dir = os.path.dirname(self.output_file)
            if parent_dir:
                os.makedirs(parent_dir, exist_ok=True)

            self._file = open(self.output_file, mode="w", newline="", encoding="utf-8")
            if self.fieldnames:
                self._writer = csv.DictWriter(self._file, fieldnames=self.fieldnames, extrasaction="ignore")
                self._writer.writeheader()
                self._header_written = True

    @staticmethod
    def sanitize_value(value: Any) -> Any:
        """
        Converts tuples, lists, or complex types into consistent,
        CSV-safe string representations.
        """
        if isinstance(value, (tuple, list)):
            return str(value)
        if isinstance(value, bool):
            return int(value)
        if value is None:
            return ""
        return value

    def write_packet(self, packet_features: Dict[str, Any]):
        """
        Writes a single packet feature record to the CSV file.
        Dynamically initializes fieldnames from the first record if not pre-specified.
        """
        if self._file is None:
            self.open()

        # Sanitize all values
        row = {k: self.sanitize_value(v) for k, v in packet_features.items()}

        if not self._header_written:
            self.fieldnames = list(row.keys())
            self._writer = csv.DictWriter(self._file, fieldnames=self.fieldnames, extrasaction="ignore")
            self._writer.writeheader()
            self._header_written = True

        self._writer.writerow(row)
        self._rows_written += 1

        if self._rows_written % self.flush_interval == 0:
            self.flush()

    def write_packets(self, packets: List[Dict[str, Any]]):
        """Writes a batch of packet feature records."""
        for packet in packets:
            self.write_packet(packet)

    def flush(self):
        """Flushes underlying file buffer to disk."""
        if self._file and not self._file.closed:
            self._file.flush()

    def close(self):
        """Flushes and safely closes the CSV file handle."""
        if self._file and not self._file.closed:
            self._file.flush()
            self._file.close()
            self._file = None

    @property
    def rows_written(self) -> int:
        return self._rows_written

