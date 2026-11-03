from typing import Optional, Callable, Any
from capture.packet_capture import PacketCapture, find_tshark_path
from capture.packet_writer import PacketWriter
from feature.feature_extractor import FeatureExtractor

fe = FeatureExtractor()


def live_capture_packets(
    interface: str = "Wi-Fi",
    packet_count: Optional[int] = None,
    bpf_filter: Optional[str] = "ip or ip6",
    extract_packet_features_fn: Callable = fe.extract,
    next_fn: Optional[Callable[[dict], Any]] = None,
    tshark_path: Optional[str] = None
) -> int:
    """
    Backward-compatible wrapper for live packet capture using PacketCapture.
    """
    capturer = PacketCapture(tshark_path=tshark_path)
    return capturer.capture_live(
        interface=interface,
        packet_count=packet_count,
        bpf_filter=bpf_filter,
        callback=next_fn,
        feature_extractor=fe
    )


def extract_packets(
    pcap_file: Optional[str] = None,
    output_file: Optional[str] = None,
    live_capture: bool = False,
    interface: str = "Wi-Fi",
    packet_count: Optional[int] = None,
    bpf_filter: Optional[str] = "ip or ip6",
    extract_packet_features_fn: Callable = fe.extract,
    tshark_path: Optional[str] = None
) -> int:
    """
    Backward-compatible wrapper for extracting packet features from live network or PCAP file.
    """
    capturer = PacketCapture(tshark_path=tshark_path)
    if live_capture:
        return capturer.capture_live(
            interface=interface,
            packet_count=packet_count,
            bpf_filter=bpf_filter,
            output_csv=output_file,
            feature_extractor=fe
        )
    else:
        return capturer.capture_pcap(
            pcap_file=pcap_file,
            packet_count=packet_count,
            output_csv=output_file,
            feature_extractor=fe
        )
