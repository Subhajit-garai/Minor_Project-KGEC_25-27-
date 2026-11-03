import math
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)


def get_bidirectional_key(flow_key: tuple) -> tuple:
    """
    Computes a deterministic, canonical bidirectional key for any 5-tuple.
    Whether traffic is A -> B or B -> A, the resulting key is identical.
    
    :param flow_key: (src_ip, dst_ip, src_port, dst_port, transport_protocol)
    :return: Canonical (endpoint1_ip, endpoint2_ip, endpoint1_port, endpoint2_port, proto)
    """
    if not flow_key or len(flow_key) < 5:
        return ("", "", 0, 0, "OTHER")
    src_ip, dst_ip, src_port, dst_port, proto = flow_key
    ep1 = (str(src_ip), int(src_port or 0))
    ep2 = (str(dst_ip), int(dst_port or 0))
    proto_str = str(proto).upper()
    if ep1 <= ep2:
        return (ep1[0], ep2[0], ep1[1], ep2[1], proto_str)
    else:
        return (ep2[0], ep1[0], ep2[1], ep1[1], proto_str)


class FeatureExtractor:
    """
    Extracts packet-level network features from PyShark or mock packet objects.
    Maintains packet-level inter-arrival time (IAT) state per bidirectional flow.
    """

    def __init__(self):
        # Maps canonical bidirectional flow key -> timestamp of last observed packet
        self.flow_last_seen = defaultdict(lambda: None)

    @staticmethod
    def calculate_entropy(data: bytes) -> float:
        """
        Calculates Shannon entropy of the given byte array.
        Returns a float between 0.0 (uniform/empty) and 8.0 (maximum randomness).
        """
        if not data:
            return 0.0

        length = len(data)
        frequency = [0] * 256
        for byte in data:
            frequency[byte] += 1

        entropy = 0.0
        for count in frequency:
            if count > 0:
                prob = count / length
                entropy -= prob * math.log2(prob)

        return float(round(entropy, 4))

    @staticmethod
    def get_payload(packet) -> bytes:
        """
        Safely extracts raw payload bytes across TCP, UDP, or generic Data layers.
        Supports PyShark packet objects, hex strings, and raw bytes from mock packets.
        """
        try:
            # 1. TCP payload
            if hasattr(packet, "tcp") and hasattr(packet.tcp, "payload"):
                raw = packet.tcp.payload
                if isinstance(raw, bytes):
                    return raw
                raw_str = str(raw).replace(":", "")
                return bytes.fromhex(raw_str) if raw_str else b""

            # 2. UDP payload
            if hasattr(packet, "udp") and hasattr(packet.udp, "payload"):
                raw = packet.udp.payload
                if isinstance(raw, bytes):
                    return raw
                raw_str = str(raw).replace(":", "")
                return bytes.fromhex(raw_str) if raw_str else b""

            # 3. Generic Data layer
            if hasattr(packet, "data") and hasattr(packet.data, "data"):
                raw = packet.data.data
                if isinstance(raw, bytes):
                    return raw
                raw_str = str(raw).replace(":", "")
                return bytes.fromhex(raw_str) if raw_str else b""

            # 4. Direct payload attribute fallback (mock packets)
            if hasattr(packet, "payload"):
                raw = packet.payload
                if isinstance(raw, bytes):
                    return raw
                if isinstance(raw, str):
                    raw_str = raw.replace(":", "")
                    return bytes.fromhex(raw_str) if raw_str else b""
        except Exception as e:
            logger.debug(f"Could not parse payload bytes: {e}")

        return b""

    @staticmethod
    def safe_int(value, default: int = 0) -> int:
        """Safely converts value to int without raising exceptions."""
        if value is None or value == "":
            return default
        try:
            return int(value)
        except (ValueError, TypeError):
            try:
                return int(float(value))
            except (ValueError, TypeError):
                return default

    @staticmethod
    def safe_float(value, default: float = 0.0) -> float:
        """Safely converts value to float without raising exceptions."""
        if value is None or value == "":
            return default
        try:
            return float(value)
        except (ValueError, TypeError):
            return default

    def reset_flow_state(self):
        """Clears the stored IAT state."""
        self.flow_last_seen.clear()

    def extract(self, packet) -> dict:
        """
        Extracts all standard packet-level features required for DPI and flow analysis.
        Handles missing layers, non-IP packets, and malformed fields gracefully.
        """
        # 1. Timestamp extraction
        timestamp = 0.0
        if hasattr(packet, "sniff_timestamp"):
            timestamp = self.safe_float(packet.sniff_timestamp)
        elif hasattr(packet, "sniff_time"):
            try:
                timestamp = float(packet.sniff_time.timestamp())
            except Exception:
                timestamp = 0.0
        elif hasattr(packet, "timestamp"):
            timestamp = self.safe_float(packet.timestamp)

        # 2. IP layer extraction (IPv4 or IPv6)
        src_ip = ""
        dst_ip = ""
        ip_length = 0
        ttl = 0
        ip_proto = 0

        if hasattr(packet, "ip"):
            src_ip = str(getattr(packet.ip, "src", ""))
            dst_ip = str(getattr(packet.ip, "dst", ""))
            ip_length = self.safe_int(getattr(packet.ip, "len", 0))
            ttl = self.safe_int(getattr(packet.ip, "ttl", 0))
            ip_proto = self.safe_int(getattr(packet.ip, "proto", 0))
        elif hasattr(packet, "ipv6"):
            src_ip = str(getattr(packet.ipv6, "src", ""))
            dst_ip = str(getattr(packet.ipv6, "dst", ""))
            # IPv6 fixed base header is 40 bytes + payload length (plen)
            payload_len = self.safe_int(getattr(packet.ipv6, "plen", 0))
            ip_length = payload_len + 40
            ttl = self.safe_int(getattr(packet.ipv6, "hlim", 0))
            ip_proto = self.safe_int(getattr(packet.ipv6, "nxt", 0))

        # 3. Transport layer extraction (TCP or UDP)
        src_port = 0
        dst_port = 0
        protocol = ip_proto
        transport_protocol = "OTHER"

        header_length = 0
        window_size = 0

        # TCP flags
        fin = 0
        syn = 0
        rst = 0
        psh = 0
        ack = 0
        urg = 0
        ece = 0
        cwe = 0

        # Sequence and acknowledgment numbers
        tcp_seq = 0
        tcp_ack_num = 0

        if hasattr(packet, "tcp"):
            transport_protocol = "TCP"
            protocol = 6

            src_port = self.safe_int(getattr(packet.tcp, "srcport", 0))
            dst_port = self.safe_int(getattr(packet.tcp, "dstport", 0))
            header_length = self.safe_int(getattr(packet.tcp, "hdr_len", 0))
            window_size = self.safe_int(
                getattr(packet.tcp, "window_size", getattr(packet.tcp, "window_size_value", 0))
            )

            fin = self.safe_int(getattr(packet.tcp, "flags_fin", 0))
            syn = self.safe_int(getattr(packet.tcp, "flags_syn", 0))
            rst = self.safe_int(getattr(packet.tcp, "flags_reset", 0))
            psh = self.safe_int(getattr(packet.tcp, "flags_push", 0))
            ack = self.safe_int(getattr(packet.tcp, "flags_ack", 0))
            urg = self.safe_int(getattr(packet.tcp, "flags_urg", 0))
            ece = self.safe_int(getattr(packet.tcp, "flags_ecn", getattr(packet.tcp, "flags_ece", 0)))
            cwe = self.safe_int(getattr(packet.tcp, "flags_cwr", 0))

            tcp_seq = self.safe_int(getattr(packet.tcp, "seq", 0))
            tcp_ack_num = self.safe_int(getattr(packet.tcp, "ack", 0))

        elif hasattr(packet, "udp"):
            transport_protocol = "UDP"
            protocol = 17

            src_port = self.safe_int(getattr(packet.udp, "srcport", 0))
            dst_port = self.safe_int(getattr(packet.udp, "dstport", 0))
            # Standard UDP header length is always 8 bytes
            header_length = 8

        # 4. Total packet length (fallback to IP length or 0)
        packet_length = self.safe_int(
            getattr(packet, "length", getattr(packet, "sniff_packet_length", ip_length))
        )
        if ip_length == 0 and packet_length > 0:
            ip_length = packet_length

        # 5. Payload extraction & Entropy
        payload = self.get_payload(packet)
        payload_length = len(payload)
        payload_entropy = self.calculate_entropy(payload)

        # 6. Flow Identity
        flow_key = (
            src_ip,
            dst_ip,
            src_port,
            dst_port,
            transport_protocol
        )

        reverse_flow_key = (
            dst_ip,
            src_ip,
            dst_port,
            src_port,
            transport_protocol
        )

        bidirectional_key = get_bidirectional_key(flow_key)

        # 7. Packet-level Inter-Arrival Time (IAT)
        # Measured relative to the previous packet in this bidirectional conversation
        last_seen = self.flow_last_seen.get(bidirectional_key)
        if last_seen is None:
            iat = 0.0
        else:
            iat = max(0.0, round(timestamp - last_seen, 6))

        if timestamp > 0:
            self.flow_last_seen[bidirectional_key] = timestamp

        # 8. Return standardized features dict
        return {
            # Identity
            "timestamp": timestamp,
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "src_port": src_port,
            "dst_port": dst_port,

            # Flow
            "flow_key": flow_key,
            "reverse_flow_key": reverse_flow_key,
            "bidirectional_key": bidirectional_key,

            # Protocol
            "protocol": protocol,
            "transport_protocol": transport_protocol,

            # Packet lengths
            "packet_length": packet_length,
            "ip_length": ip_length,
            "header_length": header_length,
            "payload_length": payload_length,

            # IP
            "ttl": ttl,

            # TCP
            "window_size": window_size,
            "tcp_fin": fin,
            "tcp_syn": syn,
            "tcp_rst": rst,
            "tcp_psh": psh,
            "tcp_ack": ack,
            "tcp_urg": urg,
            "tcp_ece": ece,
            "tcp_cwe": cwe,
            "tcp_seq": tcp_seq,
            "tcp_ack_num": tcp_ack_num,

            # Payload
            "payload_entropy": payload_entropy,

            # Timing
            "iat": iat,
        }
