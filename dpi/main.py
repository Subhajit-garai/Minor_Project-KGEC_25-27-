
from flow.flow_manager import FlowManager
from utils.logger import logger as log
from capture.livecapture import PacketCapture 

if __name__ == "__main__":
    logger = log()
    flow_manager = FlowManager()
    pc = PacketCapture(interface="Wi-Fi")

    def process_packet(packet_features):
        logger.log("info", "Packet features extracted:")
        logger.log("info", str(packet_features))
        
        flow = flow_manager.process_packet(packet_features)

        print(
            "Flow packets:",
            flow.total_packets,
            "Forward:",
            len(flow.fwd_lengths),
            "Backward:",
            len(flow.bwd_lengths)
        )

    # Start live capture on the active Wi-Fi adapter
    
    
    pc.live_capture(
        packet_count=100,
        output_file="features.csv",
        next_fn=process_packet
    )
