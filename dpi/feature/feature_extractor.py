import math
from collections import defaultdict



class FeatureExtractor:
    def __init__(self):
        self.flow_last_seen = defaultdict(lambda: None)
        
        
    def calculate_entropy(data: bytes) -> float:
        if not data:
            return 0.0

        frequency = [0] * 256
        for byte in data:
            frequency[byte] += 1

        entropy = 0.0
        length = len(data)

        for count in frequency:
            if count == 0:
                continue
            prob = count / length
            entropy -= prob * math.log2(prob)

        return entropy


    def get_payload(packet) -> bytes:
        """Extract raw payload bytes safely across TCP, UDP, or generic Data layers."""
        try:
            if hasattr(packet, "tcp") and hasattr(packet.tcp, "payload"):
                return bytes.fromhex(packet.tcp.payload.replace(":", ""))
            if hasattr(packet, "udp") and hasattr(packet.udp, "payload"):
                return bytes.fromhex(packet.udp.payload.replace(":", ""))
            if hasattr(packet, "data") and hasattr(packet.data, "data"):
                return bytes.fromhex(packet.data.data.replace(":", ""))
        except Exception:
            pass
        return b""


    def safe_int(value, default=0):
        try:
            if value is None or value == "":
                return default
            return int(value)
        except (ValueError, TypeError):
            return default


    def safe_float(value, default=0.0):
        try:
            if value is None or value == "":
                return default
            return float(value)
        except (ValueError, TypeError):
            return default


    def extract(self, packet):
    


        # 1. Timestamp
        timestamp = self.safe_float(packet.sniff_timestamp)
        # 2. IP information
        src_ip = ""
        dst_ip = ""

        ip_length = 0
        ttl = 0

        if hasattr(packet, "ip"):

            src_ip = getattr(packet.ip, "src", "")
            dst_ip = getattr(packet.ip, "dst", "")

            ip_length = self.safe_int(
                getattr(packet.ip, "len", 0)
            )

            ttl = self.safe_int(
                getattr(packet.ip, "ttl", 0)
            )

        elif hasattr(packet, "ipv6"):

            src_ip = getattr(packet.ipv6, "src", "")
            dst_ip = getattr(packet.ipv6, "dst", "")

            ip_length = (
                self.safe_int(
                    getattr(packet.ipv6, "plen", 0)
                ) + 40
            )

            ttl = self.safe_int(
                getattr(packet.ipv6, "hlim", 0)
            )


        # 3. Transport information


        src_port = 0
        dst_port = 0

        protocol = 0
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

        # TCP sequence-related information
        tcp_seq = 0
        tcp_ack_num = 0

        # ---------------------------------------------------------
        # TCP
        # ---------------------------------------------------------

        if hasattr(packet, "tcp"):

            transport_protocol = "TCP"
            protocol = 6

            src_port = self.safe_int(
                getattr(packet.tcp, "srcport", 0)
            )

            dst_port = self.safe_int(
                getattr(packet.tcp, "dstport", 0)
            )

            header_length = self.safe_int(
                getattr(packet.tcp, "hdr_len", 0)
            )

            window_size = self.safe_int(
                getattr(packet.tcp, "window_size", 0)
            )

            fin = self.safe_int(
                getattr(packet.tcp, "flags_fin", 0)
            )

            syn = self.safe_int(
                getattr(packet.tcp, "flags_syn", 0)
            )

            rst = self.safe_int(
                getattr(packet.tcp, "flags_reset", 0)
            )

            psh = self.safe_int(
                getattr(packet.tcp, "flags_push", 0)
            )

            ack = self.safe_int(
                getattr(packet.tcp, "flags_ack", 0)
            )

            urg = self.safe_int(
                getattr(packet.tcp, "flags_urg", 0)
            )

            ece = self.safe_int(
                getattr(packet.tcp, "flags_ecn", 0)
            )

            cwe = self.safe_int(
                getattr(packet.tcp, "flags_cwr", 0)
            )

            tcp_seq = self.safe_int(
                getattr(packet.tcp, "seq", 0)
            )

            tcp_ack_num = self.safe_int(
                getattr(packet.tcp, "ack", 0)
            )

        # ---------------------------------------------------------
        # UDP
        # ---------------------------------------------------------

        elif hasattr(packet, "udp"):

            transport_protocol = "UDP"
            protocol = 17

            src_port = self.safe_int(
                getattr(packet.udp, "srcport", 0)
            )

            dst_port = self.safe_int(
                getattr(packet.udp, "dstport", 0)
            )

            # UDP header = 8 bytes
            header_length = 8


        # 4. Packet length


        packet_length = self.safe_int(
            getattr(packet, "length", 0)
        )


        # 5. Payload


        payload = self.get_payload(packet)

        payload_length = len(payload)

        payload_entropy = round(
            self.calculate_entropy(payload),
            4
        )


        # 6. Flow identity


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


        # 7. Packet-level IAT


        last_flow_ts = self.flow_last_seen.get(flow_key)

        if last_flow_ts is None:
            iat = 0.0
        else:
            iat = max(
                0.0,
                timestamp - last_flow_ts
            )

        self.flow_last_seen[flow_key] = timestamp
# 8. Return packet information
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

            # Protocol
            "protocol": protocol,
            "transport_protocol": transport_protocol,

            # Packet
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
