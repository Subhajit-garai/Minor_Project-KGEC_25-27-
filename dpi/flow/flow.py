class Flow:
    """
    Represents a bidirectional network conversation between two endpoints.
    Maintains directional statistics (forward vs backward) for DPI feature engineering.
    """

    def __init__(self, packet: dict):
        self.forward_key = packet["flow_key"]
        self.reverse_key = packet["reverse_flow_key"]
        self.bidirectional_key = packet.get("bidirectional_key") or self.forward_key

        # Backward compatibility aliases
        self.flow_key = self.forward_key
        self.reverse_flow_key = self.reverse_key

        self.protocol = packet.get("protocol", 0)
        self.transport_protocol = packet.get("transport_protocol", "OTHER")

        self.start_time = float(packet.get("timestamp", 0.0))
        self.last_time = self.start_time

        # Packet length statistics
        self.fwd_lengths = []
        self.bwd_lengths = []

        # Timestamp tracking
        self.fwd_times = []
        self.bwd_times = []
        self.all_times = []

        # Byte statistics
        self.fwd_bytes = 0
        self.bwd_bytes = 0

        # TCP flags (cumulative)
        self.syn = 0
        self.rst = 0
        self.fin = 0
        self.ack = 0
        self.psh = 0
        self.urg = 0
        self.ece = 0
        self.cwr = 0

        # Directional TCP flags
        self.fwd_psh = 0
        self.bwd_psh = 0
        self.fwd_urg = 0
        self.bwd_urg = 0

        # Initial TCP window size
        self.init_fwd_win = 0
        self.init_bwd_win = 0

        # Header lengths
        self.fwd_header_len = 0
        self.bwd_header_len = 0

        # Total packet counter
        self.total_packets = 0

        # Add the initial forward packet that triggered flow creation
        self.add_packet(packet, is_forward=True)

    def add_packet(self, packet: dict, is_forward: bool):
        """
        Ingests a packet into the flow, updating directional and overall statistics.
        """
        timestamp = float(packet.get("timestamp", 0.0))
        length = int(packet.get("ip_length", 0) or packet.get("packet_length", 0))
        hdr_len = int(packet.get("header_length", 0))
        win_size = int(packet.get("window_size", 0) or 0)

        self.last_time = timestamp
        self.total_packets += 1
        self.all_times.append(timestamp)

        syn_flag = int(bool(packet.get("tcp_syn", 0)))
        rst_flag = int(bool(packet.get("tcp_rst", 0)))
        fin_flag = int(bool(packet.get("tcp_fin", 0)))
        ack_flag = int(bool(packet.get("tcp_ack", 0)))
        psh_flag = int(bool(packet.get("tcp_psh", 0)))
        urg_flag = int(bool(packet.get("tcp_urg", 0)))
        ece_flag = int(bool(packet.get("tcp_ece", 0)))
        cwr_flag = int(bool(packet.get("tcp_cwe", 0)))

        self.syn += syn_flag
        self.rst += rst_flag
        self.fin += fin_flag
        self.ack += ack_flag
        self.psh += psh_flag
        self.urg += urg_flag
        self.ece += ece_flag
        self.cwr += cwr_flag

        if is_forward:
            self.fwd_lengths.append(length)
            self.fwd_times.append(timestamp)
            self.fwd_bytes += length
            self.fwd_header_len += hdr_len
            self.fwd_psh += psh_flag
            self.fwd_urg += urg_flag

            if self.init_fwd_win == 0 and win_size > 0:
                self.init_fwd_win = win_size
        else:
            self.bwd_lengths.append(length)
            self.bwd_times.append(timestamp)
            self.bwd_bytes += length
            self.bwd_header_len += hdr_len
            self.bwd_psh += psh_flag
            self.bwd_urg += urg_flag

            if self.init_bwd_win == 0 and win_size > 0:
                self.init_bwd_win = win_size

    @property
    def duration(self) -> float:
        """Returns the total duration of the flow in seconds."""
        return max(0.0, round(self.last_time - self.start_time, 6))

    @property
    def total_bytes(self) -> int:
        """Returns total bytes across both directions."""
        return self.fwd_bytes + self.bwd_bytes

    def to_dict(self) -> dict:
        """Serializes summary flow metrics into a dictionary."""
        return {
            "bidirectional_key": self.bidirectional_key,
            "forward_key": self.forward_key,
            "total_packets": self.total_packets,
            "fwd_packets": len(self.fwd_lengths),
            "bwd_packets": len(self.bwd_lengths),
            "fwd_bytes": self.fwd_bytes,
            "bwd_bytes": self.bwd_bytes,
            "duration": self.duration,
            "syn": self.syn,
            "ack": self.ack,
            "fin": self.fin,
            "rst": self.rst,
        }



