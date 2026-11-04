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

try:
    from ws.ws import broadcast_packet
except ImportError:
    broadcast_packet = None


if __name__ == "__main__":
    logger = log()
    feature_extractor = FeatureExtractor()
    flow_manager = FlowManager()

    def process_packet(packet_features: dict):
        logger.log(
            "info",
            f"Packet: {packet_features['src_ip']}:{packet_features['src_port']} -> "
            f"{packet_features['dst_ip']}:{packet_features['dst_port']} "
            f"[{packet_features['transport_protocol']}] len={packet_features['packet_length']}"
        )

        # 1. Telemetry: Ingress Captured
        if broadcast_packet:
            broadcast_packet(
                status="captured",
                src_ip=packet_features["src_ip"],
                src_port=packet_features["src_port"],
                dst_ip=packet_features["dst_ip"],
                dst_port=packet_features["dst_port"],
                protocol=packet_features.get("transport_protocol", "TCP"),
                size=packet_features.get("packet_length", 1500),
            )

        flow = flow_manager.process_packet(packet_features)

        print(
            f"Flow Key: {flow.bidirectional_key} | "
            f"Total Pkts: {flow.total_packets} (Fwd: {len(flow.fwd_lengths)}, Bwd: {len(flow.bwd_lengths)}) | "
            f"Bytes: {flow.total_bytes} | Duration: {flow.duration}s"
        )

        # Predict traffic classification using PredictionEngine
        prediction_result = engine.predict_flow(flow)
        pred_label = str(prediction_result.get("prediction", "Benign"))
        confidence = float(prediction_result.get("confidence", 0.0))

        print(
            f"----> Classification: Packet: {packet_features['src_ip']}:{packet_features['src_port']} ->",
            pred_label,
            f"(Confidence: {confidence * 100:.1f}%)"
        )

        # 2. Telemetry: Final Verdict
        if broadcast_packet:
            is_malicious = "malicious" in pred_label.lower() or "attack" in pred_label.lower()
            verdict = "rejected" if is_malicious else "accepted"
            broadcast_packet(
                status=verdict,
                src_ip=packet_features["src_ip"],
                src_port=packet_features["src_port"],
                dst_ip=packet_features["dst_ip"],
                dst_port=packet_features["dst_port"],
                protocol=packet_features.get("transport_protocol", "TCP"),
                size=packet_features.get("packet_length", 1500),
                prediction=pred_label,
                confidence=confidence,
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
