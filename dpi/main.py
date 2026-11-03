from capture.packet_capture import PacketCapture
from feature.feature_extractor import FeatureExtractor
from flow.flow_processor import FlowProcessor
from utils.logger import logger as log


if __name__ == "__main__":
    logger = log()
    feature_extractor = FeatureExtractor()
    flow_processor = FlowProcessor()

    def process_packet(packet_features: dict):
        logger.log("info", f"Packet: {packet_features['src_ip']}:{packet_features['src_port']} -> "
        f"{packet_features['dst_ip']}:{packet_features['dst_port']} "
        f"[{packet_features['transport_protocol']}] len={packet_features['packet_length']}")

        flow = flow_processor.process_packet(packet_features)
        print(
            f"Flow Key: {flow.bidirectional_key} | "
            f"Total Pkts: {flow.total_packets} (Fwd: {len(flow.fwd_lengths)}, Bwd: {len(flow.bwd_lengths)}) | "
            f"Bytes: {flow.total_bytes} | Duration: {flow.duration}s"
        )

    capturer = PacketCapture()
    print("Initializing DPI Packet Capture...")
    capturer.capture_live(
        interface="Wi-Fi",
        packet_count=10,
        bpf_filter="ip or ip6",
        callback=process_packet,
        feature_extractor=feature_extractor
    )
