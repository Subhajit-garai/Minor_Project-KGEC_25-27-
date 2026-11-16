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
from ws.ws import broadcast_packet ,_start_loop ,start_server_background


if __name__ == "__main__":
    logger = log()
    feature_extractor = FeatureExtractor()
    flow_manager = FlowManager()
    start_server_background()

    def process_packet(packet_features: dict):
        logger.log(
            "info",
            f"Packet: {packet_features['src_ip']}:{packet_features['src_port']} -> "
            f"{packet_features['dst_ip']}:{packet_features['dst_port']} "
            f"[{packet_features['transport_protocol']}] len={packet_features['packet_length']}"
        )

        import uuid
        pkt_id = f"PKT-{str(uuid.uuid4())[:8].upper()}"

        # 1. Telemetry: Ingress Captured
        if broadcast_packet:
            broadcast_packet(
                packet_id=pkt_id,
                status="captured",
                src_ip=packet_features["src_ip"],
                src_port=packet_features["src_port"],
                dst_ip=packet_features["dst_ip"],
                dst_port=packet_features["dst_port"],
                protocol=packet_features.get("transport_protocol", "TCP"),
                size=packet_features.get("packet_length", 1500),
            )
            # Stage 2: Processing (Feature analysis)
            broadcast_packet(
                packet_id=pkt_id,
                status="processing",
                src_ip=packet_features["src_ip"],
                src_port=packet_features["src_port"],
                dst_ip=packet_features["dst_ip"],
                dst_port=packet_features["dst_port"],
                protocol=packet_features.get("transport_protocol", "TCP"),
                size=packet_features.get("packet_length", 1500),
            )

        flow = flow_manager.process_packet(packet_features)

        # Stage 3: Processed (Flow & features assembled)
        if broadcast_packet:
            broadcast_packet(
                packet_id=pkt_id,
                status="processed",
                src_ip=packet_features["src_ip"],
                src_port=packet_features["src_port"],
                dst_ip=packet_features["dst_ip"],
                dst_port=packet_features["dst_port"],
                protocol=packet_features.get("transport_protocol", "TCP"),
                size=packet_features.get("packet_length", 1500),
                flow_key=flow.bidirectional_key,
            )

        print(
            f"Flow Key: {flow.bidirectional_key} | "
            f"Total Pkts: {flow.total_packets} (Fwd: {len(flow.fwd_lengths)}, Bwd: {len(flow.bwd_lengths)}) | "
            f"Bytes: {flow.total_bytes} | Duration: {flow.duration}s"
        )

        # Stage 4: Decisioning (ML / Model evaluation)
        if broadcast_packet:
            broadcast_packet(
                packet_id=pkt_id,
                status="decisioning",
                src_ip=packet_features["src_ip"],
                src_port=packet_features["src_port"],
                dst_ip=packet_features["dst_ip"],
                dst_port=packet_features["dst_port"],
                protocol=packet_features.get("transport_protocol", "TCP"),
                size=packet_features.get("packet_length", 1500),
                flow_key=flow.bidirectional_key,
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

        # 5. Telemetry: Final Verdict (Accepted or Rejected)
        if broadcast_packet:
            is_malicious = "malicious" in pred_label.lower() or "attack" in pred_label.lower()
            verdict = "rejected" if is_malicious else "accepted"
            broadcast_packet(
                packet_id=pkt_id,
                status=verdict,
                src_ip=packet_features["src_ip"],
                src_port=packet_features["src_port"],
                dst_ip=packet_features["dst_ip"],
                dst_port=packet_features["dst_port"],
                protocol=packet_features.get("transport_protocol", "TCP"),
                size=packet_features.get("packet_length", 1500),
                prediction=pred_label,
                confidence=confidence,
                flow_key=flow.bidirectional_key,
            )

    import os
    target_interface = os.environ.get("DPI_INTERFACE", sys.argv[1] if len(sys.argv) > 1 else "Wi-Fi")

    capturer = PacketCapture()
    print(f"Initializing DPI Packet Capture on interface '{target_interface}' (packet_count=0 for continuous)...")
    try:
        capturer.capture_live(
            interface=target_interface,
            packet_count=0,
            bpf_filter="ip or ip6",
            display_filter="tcp.port == 3000",
            callback=process_packet,
            feature_extractor=feature_extractor
        )
        pass
    except KeyboardInterrupt:
        print("\nPacket capture stopped by user.")
    except Exception as e:
        print(f"[ERROR] Live capture failed on interface '{target_interface}': {e}")
        print("[TIP] You can pass a different interface: python dpi/main.py <interface_name>")
        print("[TIP] For example: python dpi/main.py Ethernet or python dpi/main.py \"Wi-Fi\"")
