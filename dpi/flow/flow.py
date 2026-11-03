

import numpy as np


class Flow:

    def __init__(self, packet):

        self.flow_key = packet["flow_key"]
        self.reverse_flow_key = packet["reverse_flow_key"]

        self.start_time = packet["timestamp"]
        self.last_time = packet["timestamp"]

        self.protocol = packet["protocol"]

        # Packet statistics
        self.fwd_lengths = []
        self.bwd_lengths = []

        self.fwd_times = []
        self.bwd_times = []
        self.all_times = []

        # Byte statistics
        self.fwd_bytes = 0
        self.bwd_bytes = 0

        # TCP flags
        self.syn = 0
        self.rst = 0
        self.fin = 0
        self.ack = 0
        self.psh = 0
        self.urg = 0

        # Initial TCP window
        self.init_fwd_win = 0
        self.init_bwd_win = 0

        # Number of active packets
        self.total_packets = 0

        self.add_packet(packet, is_forward=True)

    def add_packet(self, packet, is_forward):

        timestamp = float(packet["timestamp"])

        # Use IP packet length consistently with training data
        length = int(packet["ip_length"])

        self.last_time = timestamp
        self.total_packets += 1
        self.all_times.append(timestamp)

        if is_forward:
            self.fwd_lengths.append(length)
            self.fwd_times.append(timestamp)
            self.fwd_bytes += length

            if self.init_fwd_win == 0:
                self.init_fwd_win = packet["window_size"] or 0

        else:
            self.bwd_lengths.append(length)
            self.bwd_times.append(timestamp)
            self.bwd_bytes += length

            if self.init_bwd_win == 0:
                self.init_bwd_win = packet["window_size"] or 0

        # TCP flags
        self.syn += int(bool(packet["tcp_syn"]))
        self.rst += int(bool(packet["tcp_rst"]))
        self.fin += int(bool(packet["tcp_fin"]))
        self.ack += int(bool(packet["tcp_ack"]))
        self.psh += int(bool(packet["tcp_psh"]))
        self.urg += int(bool(packet["tcp_urg"]))