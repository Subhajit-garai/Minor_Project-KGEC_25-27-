from pathlib import Path
import sys

# Ensure dpi root is in sys.path
DPI_DIR = Path(__file__).resolve().parent
if str(DPI_DIR) not in sys.path:
    sys.path.insert(0, str(DPI_DIR))

from capture.packet_capture import PacketCapture
from feature.feature_extractor import FeatureExtractor
from flow.flow_manager import FlowManager
from utils.logger import logger as log
from model.predict import engine, model, features


if __name__ == "__main__":
    logger = log()
    feature_extractor = FeatureExtractor()
    flow_manager = FlowManager()

    def process_packet(packet_features: dict):
        logger.log("info", f"Packet: {packet_features['src_ip']}:{packet_features['src_port']} -> "
        f"{packet_features['dst_ip']}:{packet_features['dst_port']} "
        f"[{packet_features['transport_protocol']}] len={packet_features['packet_length']}")

        flow = flow_manager.process_packet(packet_features)
        
        print(
            f"Flow Key: {flow.bidirectional_key} | "
            f"Total Pkts: {flow.total_packets} (Fwd: {len(flow.fwd_lengths)}, Bwd: {len(flow.bwd_lengths)}) | "
            f"Bytes: {flow.total_bytes} | Duration: {flow.duration}s"
        )
        
        # Predict traffic classification using PredictionEngine
        prediction_result = engine.predict_flow(flow)
        print("----> ML Classification:", prediction_result["prediction"], 
              f"(Confidence: {prediction_result['confidence'] * 100:.1f}%)")

    capturer = PacketCapture()
    print("Initializing DPI Packet Capture...")
    capturer.capture_live(
        interface="Wi-Fi",
        packet_count=1,
        bpf_filter="ip or ip6",
        callback=process_packet,
        feature_extractor=feature_extractor
    )
