import os
import sys
import unittest
import tempfile
import csv

# Add workspace root to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from feature.feature_extractor import FeatureExtractor, get_bidirectional_key
from flow.flow import Flow
from flow.flow_manager import FlowManager
from capture.packet_writer import PacketWriter
from capture.packet_capture import PacketCapture
from model.prediction_engine import PredictionEngine


class MockLayer:
    """Mock layer representing PyShark layer objects."""
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


class MockPacket:
    """Mock PyShark Packet object."""
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


class TestDPIFeatureExtractor(unittest.TestCase):
    def setUp(self):
        self.extractor = FeatureExtractor()

    def test_tcp_packet_extraction(self):
        """Test extraction of full TCP packet features."""
        pkt = MockPacket(
            sniff_timestamp="1700000000.100",
            length=1500,
            ip=MockLayer(src="192.168.1.10", dst="10.0.0.1", len="1500", ttl="64", proto="6"),
            tcp=MockLayer(
                srcport="54321",
                dstport="443",
                hdr_len="32",
                window_size="65535",
                flags_syn="1",
                flags_ack="0",
                flags_fin="0",
                flags_reset="0",
                flags_push="0",
                flags_urg="0",
                flags_ecn="0",
                flags_cwr="0",
                seq="1000",
                ack="0",
                payload="deadbeef"
            )
        )
        features = self.extractor.extract(pkt)

        self.assertEqual(features["src_ip"], "192.168.1.10")
        self.assertEqual(features["dst_ip"], "10.0.0.1")
        self.assertEqual(features["src_port"], 54321)
        self.assertEqual(features["dst_port"], 443)
        self.assertEqual(features["protocol"], 6)
        self.assertEqual(features["transport_protocol"], "TCP")
        self.assertEqual(features["tcp_syn"], 1)
        self.assertEqual(features["tcp_ack"], 0)
        self.assertEqual(features["tcp_seq"], 1000)
        self.assertEqual(features["window_size"], 65535)
        self.assertEqual(features["header_length"], 32)
        self.assertEqual(features["payload_length"], 4)
        self.assertGreater(features["payload_entropy"], 0.0)

    def test_udp_packet_extraction(self):
        """Test extraction of UDP packet features."""
        pkt = MockPacket(
            sniff_timestamp="1700000001.000",
            length=100,
            ip=MockLayer(src="192.168.1.10", dst="8.8.8.8", len="100", ttl="128", proto="17"),
            udp=MockLayer(
                srcport="5353",
                dstport="53",
                payload="01000001000000000000"
            )
        )
        features = self.extractor.extract(pkt)

        self.assertEqual(features["src_ip"], "192.168.1.10")
        self.assertEqual(features["dst_ip"], "8.8.8.8")
        self.assertEqual(features["src_port"], 5353)
        self.assertEqual(features["dst_port"], 53)
        self.assertEqual(features["protocol"], 17)
        self.assertEqual(features["transport_protocol"], "UDP")
        self.assertEqual(features["header_length"], 8)
        self.assertEqual(features["payload_length"], 10)

    def test_ipv4_packet_extraction(self):
        """Test IPv4-specific fields and type conversions."""
        pkt = MockPacket(
            sniff_timestamp="1700000002.500",
            length="84",
            ip=MockLayer(src="172.16.0.1", dst="172.16.0.2", len="84", ttl="64", proto="1")
        )
        features = self.extractor.extract(pkt)

        self.assertEqual(features["src_ip"], "172.16.0.1")
        self.assertEqual(features["dst_ip"], "172.16.0.2")
        self.assertEqual(features["ip_length"], 84)
        self.assertEqual(features["ttl"], 64)
        self.assertEqual(features["protocol"], 1)

    def test_ipv6_packet_extraction(self):
        """Test IPv6 packet fields and verify no concatenation errors."""
        pkt = MockPacket(
            sniff_timestamp="1700000003.000",
            length=64,
            ipv6=MockLayer(
                src="2001:db8::1",
                dst="2001:db8::2",
                plen="24",
                hlim="64",
                nxt="6"
            ),
            tcp=MockLayer(srcport="80", dstport="8080", hdr_len="20", window_size="1024")
        )
        features = self.extractor.extract(pkt)

        self.assertEqual(features["src_ip"], "2001:db8::1")
        self.assertEqual(features["dst_ip"], "2001:db8::2")
        self.assertEqual(features["ip_length"], 64)
        self.assertEqual(features["ttl"], 64)
        self.assertEqual(features["transport_protocol"], "TCP")

    def test_missing_packet_layers(self):
        """Test handling packets missing IP or transport layers without crashing."""
        pkt = MockPacket(
            sniff_timestamp="1700000004.000",
            length=60
        )
        features = self.extractor.extract(pkt)

        self.assertEqual(features["src_ip"], "")
        self.assertEqual(features["dst_ip"], "")
        self.assertEqual(features["src_port"], 0)
        self.assertEqual(features["dst_port"], 0)
        self.assertEqual(features["transport_protocol"], "OTHER")
        self.assertEqual(features["packet_length"], 60)
        self.assertEqual(features["payload_length"], 0)

    def test_empty_payloads(self):
        """Test handling empty payloads and verify get_payload() does not raise errors."""
        pkt = MockPacket(
            sniff_timestamp="1700000005.000",
            length=54,
            ip=MockLayer(src="10.0.0.1", dst="10.0.0.2", len="54", ttl="64", proto="6"),
            tcp=MockLayer(srcport="1234", dstport="80", hdr_len="20", window_size="4096")
        )
        features = self.extractor.extract(pkt)

        self.assertEqual(features["payload_length"], 0)
        self.assertEqual(features["payload_entropy"], 0.0)

    def test_payload_entropy(self):
        """Test payload Shannon entropy computation."""
        self.assertEqual(FeatureExtractor.calculate_entropy(b""), 0.0)
        self.assertEqual(FeatureExtractor.calculate_entropy(b"\x00" * 100), 0.0)
        self.assertEqual(FeatureExtractor.calculate_entropy(b"AAAA"), 0.0)
        self.assertAlmostEqual(FeatureExtractor.calculate_entropy(b"\x00\x01" * 50), 1.0, places=3)
        all_bytes = bytes(range(256))
        self.assertAlmostEqual(FeatureExtractor.calculate_entropy(all_bytes), 8.0, places=3)

    def test_packet_iat_calculation(self):
        """Test inter-arrival time calculation between consecutive packets in a flow."""
        pkt1 = MockPacket(
            sniff_timestamp="100.000000",
            length=100,
            ip=MockLayer(src="192.168.1.1", dst="192.168.1.2", len="100", ttl="64", proto="6"),
            tcp=MockLayer(srcport="5000", dstport="80")
        )
        pkt2 = MockPacket(
            sniff_timestamp="100.250000",
            length=100,
            ip=MockLayer(src="192.168.1.2", dst="192.168.1.1", len="100", ttl="64", proto="6"),
            tcp=MockLayer(srcport="80", dstport="5000")
        )

        f1 = self.extractor.extract(pkt1)
        self.assertEqual(f1["iat"], 0.0)

        f2 = self.extractor.extract(pkt2)
        self.assertAlmostEqual(f2["iat"], 0.25, places=5)


class TestFlowIdentification(unittest.TestCase):
    def setUp(self):
        self.extractor = FeatureExtractor()
        self.processor = FlowManager()

    def test_forward_and_reverse_flow_identification(self):
        """Test that forward and reverse packets correctly map to the same bidirectional Flow."""
        fwd_pkt = MockPacket(
            sniff_timestamp="1000.000",
            length=200,
            ip=MockLayer(src="10.10.10.1", dst="20.20.20.2", len="200", ttl="64", proto="6"),
            tcp=MockLayer(srcport="45678", dstport="80", hdr_len="20", window_size="8192", flags_syn="1")
        )
        bwd_pkt = MockPacket(
            sniff_timestamp="1000.050",
            length=150,
            ip=MockLayer(src="20.20.20.2", dst="10.10.10.1", len="150", ttl="64", proto="6"),
            tcp=MockLayer(srcport="80", dstport="45678", hdr_len="20", window_size="16384", flags_ack="1")
        )

        fwd_features = self.extractor.extract(fwd_pkt)
        bwd_features = self.extractor.extract(bwd_pkt)

        self.assertEqual(fwd_features["bidirectional_key"], bwd_features["bidirectional_key"])

        flow1 = self.processor.process_packet(fwd_features)
        flow2 = self.processor.process_packet(bwd_features)

        self.assertIs(flow1, flow2)
        self.assertEqual(flow1.total_packets, 2)
        self.assertEqual(len(flow1.fwd_lengths), 1)
        self.assertEqual(len(flow1.bwd_lengths), 1)
        self.assertEqual(flow1.fwd_lengths[0], 200)
        self.assertEqual(flow1.bwd_lengths[0], 150)
        self.assertEqual(flow1.fwd_bytes, 200)
        self.assertEqual(flow1.bwd_bytes, 150)
        self.assertEqual(flow1.total_bytes, 350)
        self.assertEqual(flow1.syn, 1)
        self.assertEqual(flow1.ack, 1)
        self.assertAlmostEqual(flow1.duration, 0.05, places=5)

    def test_flow_timeout_cleanup(self):
        """Test purging idle flows to prevent unbounded memory growth."""
        pkt = MockPacket(
            sniff_timestamp="100.0",
            length=100,
            ip=MockLayer(src="1.1.1.1", dst="2.2.2.2", len="100", ttl="64", proto="6"),
            tcp=MockLayer(srcport="1000", dstport="2000")
        )
        features = self.extractor.extract(pkt)
        self.processor.process_packet(features)
        self.assertEqual(len(self.processor.get_all_flows()), 1)

        expired = self.processor.clean_inactive_flows(current_time=150.0, timeout_seconds=120.0)
        self.assertEqual(expired, 0)
        self.assertEqual(len(self.processor.get_all_flows()), 1)

        expired = self.processor.clean_inactive_flows(current_time=300.0, timeout_seconds=120.0)
        self.assertEqual(expired, 1)
        self.assertEqual(len(self.processor.get_all_flows()), 0)


class TestPacketWriter(unittest.TestCase):
    def test_csv_serialization(self):
        """Test writing packet features to CSV including tuple keys and resource cleanup."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            csv_path = os.path.join(tmp_dir, "test_output.csv")

            features_list = [
                {
                    "timestamp": 1700000000.1,
                    "src_ip": "1.1.1.1",
                    "dst_ip": "2.2.2.2",
                    "src_port": 1234,
                    "dst_port": 80,
                    "flow_key": ("1.1.1.1", "2.2.2.2", 1234, 80, "TCP"),
                    "payload_entropy": 3.4567
                },
                {
                    "timestamp": 1700000000.2,
                    "src_ip": "2.2.2.2",
                    "dst_ip": "1.1.1.1",
                    "src_port": 80,
                    "dst_port": 1234,
                    "flow_key": ("2.2.2.2", "1.1.1.1", 80, 1234, "TCP"),
                    "payload_entropy": 4.1234
                }
            ]

            with PacketWriter(csv_path) as writer:
                writer.write_packets(features_list)
                self.assertEqual(writer.rows_written, 2)

            self.assertTrue(os.path.exists(csv_path))
            with open(csv_path, mode="r", encoding="utf-8") as f:
                reader = list(csv.DictReader(f))
                self.assertEqual(len(reader), 2)
                self.assertEqual(reader[0]["src_ip"], "1.1.1.1")
                self.assertEqual(reader[0]["dst_ip"], "2.2.2.2")
                self.assertIn("1.1.1.1", reader[0]["flow_key"])
                self.assertEqual(reader[1]["src_ip"], "2.2.2.2")


class TestPredictionEngine(unittest.TestCase):
    def test_model_loading_and_prediction(self):
        """Test loading model and running prediction on a Flow instance."""
        model_path = os.path.join("dpi", "model", "saved", "DT", "dpi_decision_tree.pkl")
        features_path = os.path.join("dpi", "model", "saved", "DT", "dpi_features.pkl")

        if os.path.exists(model_path) and os.path.exists(features_path):
            engine = PredictionEngine(model_path=model_path, features_path=features_path)
            self.assertTrue(engine.is_loaded)

            mock_pkt = {
                'flow_key': ('192.168.1.1', '10.0.0.1', 1234, 80, 'TCP'),
                'reverse_flow_key': ('10.0.0.1', '192.168.1.1', 80, 1234, 'TCP'),
                'bidirectional_key': ('10.0.0.1', '192.168.1.1', 80, 1234, 'TCP'),
                'timestamp': 100.0,
                'protocol': 6,
                'ip_length': 60,
                'header_length': 20,
                'window_size': 8192,
                'tcp_syn': 1
            }
            flow = Flow(mock_pkt)
            result = engine.predict_flow(flow)
            self.assertEqual(result["status"], "success")
            self.assertIn(result["prediction"], ["Benign", "FTP-BruteForce", "SSH-Bruteforce"])
            self.assertGreaterEqual(result["confidence"], 0.0)


class TestPacketCaptureGracefulStopping(unittest.TestCase):
    def test_graceful_capture_stopping(self):
        """Test that PacketCapture.stop() flags the capture to terminate."""
        capturer = PacketCapture()
        self.assertFalse(capturer._stop_requested)

        capturer.stop()
        self.assertTrue(capturer._stop_requested)


if __name__ == "__main__":
    unittest.main()
