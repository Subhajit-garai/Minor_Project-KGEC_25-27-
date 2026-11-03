import os
import shutil
import logging
from typing import Optional, Callable, Any
import pyshark
import pyshark.capture.live_capture as lc
from feature.feature_extractor import FeatureExtractor
from capture.packet_writer import PacketWriter

logger = logging.getLogger(__name__)

# Prevent PyShark from crashing on LiveCapture.__init__ if tshark -D encounters permission warnings
_orig_get_tshark_interfaces = lc.get_tshark_interfaces

def _safe_get_tshark_interfaces(tshark_path=None):
    try:
        return _orig_get_tshark_interfaces(tshark_path=tshark_path)
    except Exception:
        return []

lc.get_tshark_interfaces = _safe_get_tshark_interfaces


def find_tshark_path() -> Optional[str]:
    """Locate tshark binary in PATH or default Windows installation folders."""
    path = shutil.which("tshark")
    if path:
        return path
    for default_path in [
        r"C:\Program Files\Wireshark\tshark.exe",
        r"C:\Program Files (x86)\Wireshark\tshark.exe"
    ]:
        if os.path.isfile(default_path):
            return default_path
    return None


class PacketCapture:
    """
    Modular packet capture engine supporting both live network sniffing
    and offline PCAP file processing.
    Decoupled from flow aggregation and prediction logic.
    """

    def __init__(self, tshark_path: Optional[str] = None):
        self.tshark_path = tshark_path or find_tshark_path()
        self._stop_requested = False
        self._current_capture = None

    def stop(self):
        """Signals the active capture to stop gracefully."""
        self._stop_requested = True
        if self._current_capture:
            try:
                self._current_capture.close()
            except Exception:
                pass

    def capture_live(
        self,
        interface: str = "Wi-Fi",
        packet_count: Optional[int] = None,
        bpf_filter: Optional[str] = "ip or ip6",
        callback: Optional[Callable[[dict], Any]] = None,
        output_csv: Optional[str] = None,
        feature_extractor: Optional[FeatureExtractor] = None,
        writer: Optional[PacketWriter] = None,
    ) -> int:
        """
        Captures packets from a live network interface synchronously.

        :param interface: Adapter name or index (e.g. "Wi-Fi", "\\Device\\NPF_...").
        :param packet_count: Maximum packets to capture. None or 0 captures continuously.
        :param bpf_filter: BPF capture filter.
        :param callback: Callback executed per packet with extracted features dict.
        :param output_csv: Path to output CSV file for packet features.
        :param feature_extractor: FeatureExtractor instance (default instantiated if None).
        :param writer: PacketWriter instance (or created if output_csv is provided).
        :return: Total packets captured and processed.
        """
        self._stop_requested = False
        extractor = feature_extractor or FeatureExtractor()
        count = packet_count if (packet_count and packet_count > 0) else None

        # Manage CSV writer
        csv_writer = writer
        owns_writer = False
        if csv_writer is None and output_csv:
            csv_writer = PacketWriter(output_csv)
            csv_writer.open()
            owns_writer = True

        capture = pyshark.LiveCapture(
            interface=interface,
            bpf_filter=bpf_filter,
            tshark_path=self.tshark_path
        )
        self._current_capture = capture

        total_captured = 0
        try:
            for packet in capture.sniff_continuously(packet_count=count):
                if self._stop_requested:
                    break

                try:
                    features = extractor.extract(packet)

                    if csv_writer:
                        csv_writer.write_packet(features)

                    if callback:
                        callback(features)

                    total_captured += 1
                except Exception as e:
                    logger.warning(f"Packet extraction error: {e}")

        except KeyboardInterrupt:
            logger.info("Live capture interrupted by user.")
        except Exception as e:
            logger.error(f"Live capture error: {e}")
            raise
        finally:
            self._cleanup_capture(capture)
            if owns_writer and csv_writer:
                csv_writer.close()

        return total_captured

    def capture_pcap(
        self,
        pcap_file: str,
        packet_count: Optional[int] = None,
        display_filter: Optional[str] = None,
        callback: Optional[Callable[[dict], Any]] = None,
        output_csv: Optional[str] = None,
        feature_extractor: Optional[FeatureExtractor] = None,
        writer: Optional[PacketWriter] = None,
    ) -> int:
        """
        Reads and extracts features sequentially from an offline PCAP file.

        :param pcap_file: Path to PCAP or PCAPNG file.
        :param packet_count: Maximum packets to read.
        :param display_filter: Wireshark display filter.
        :param callback: Callback executed per packet with extracted features dict.
        :param output_csv: Path to output CSV file for packet features.
        :param feature_extractor: FeatureExtractor instance.
        :param writer: PacketWriter instance.
        :return: Total packets processed.
        """
        if not os.path.isfile(pcap_file):
            raise FileNotFoundError(f"PCAP file not found: {pcap_file}")

        self._stop_requested = False
        extractor = feature_extractor or FeatureExtractor()
        count = packet_count if (packet_count and packet_count > 0) else None

        csv_writer = writer
        owns_writer = False
        if csv_writer is None and output_csv:
            csv_writer = PacketWriter(output_csv)
            csv_writer.open()
            owns_writer = True

        capture = pyshark.FileCapture(
            pcap_file,
            keep_packets=False,
            display_filter=display_filter,
            tshark_path=self.tshark_path
        )
        self._current_capture = capture

        total_processed = 0
        try:
            for packet in capture:
                if self._stop_requested:
                    break

                try:
                    features = extractor.extract(packet)

                    if csv_writer:
                        csv_writer.write_packet(features)

                    if callback:
                        callback(features)

                    total_processed += 1
                    if count and total_processed >= count:
                        break
                except Exception as e:
                    logger.warning(f"Packet extraction error: {e}")

        except KeyboardInterrupt:
            logger.info("PCAP processing interrupted by user.")
        except Exception as e:
            logger.error(f"PCAP processing error: {e}")
            raise
        finally:
            self._cleanup_capture(capture)
            if owns_writer and csv_writer:
                csv_writer.close()

        return total_processed

    def _cleanup_capture(self, capture):
        """Safely shuts down the PyShark capture instance."""
        try:
            capture.close()
        except Exception:
            pass
        if self._current_capture is capture:
            self._current_capture = None

