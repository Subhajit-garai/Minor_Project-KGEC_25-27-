


import asyncio
import nest_asyncio
# Apply nest_asyncio to current loop and Windows ProactorEventLoop used by PyShark
nest_asyncio.apply()
if hasattr(asyncio, "ProactorEventLoop"):
    try:
        nest_asyncio.apply(asyncio.ProactorEventLoop())
    except Exception:
        pass
import pyshark
import csv
from packet.feature_extractor import FeatureExtractor




fe = FeatureExtractor()


def live_capture_packets(interface="Wi-Fi", packet_count=0,extract_packet_features_fn=fe.extract, next_fn=None):
    capture = pyshark.LiveCapture(interface=interface)
    if hasattr(capture, "eventloop"):
        nest_asyncio.apply(capture.eventloop)
    packet_iterator = capture.sniff_continuously(packet_count=packet_count)
    
    for packet in packet_iterator:
        try:
            features = extract_packet_features_fn(packet)
            if next_fn:
                next_fn(features)
        except KeyboardInterrupt:
                print(f"\n live Capture stopped by user")


def extract_packets(
    pcap_file=None,
    output_file=None,
    live_capture=False,
    interface="Wi-Fi",
    packet_count=None,
    extract_packet_features_fn=extract_packet_features
):
    print("Starting packet extraction...")
    print(f"Live capture: {live_capture} | Interface: {interface}")
    if packet_count:
        print(f"Target count: {packet_count} packets")

    capture = pyshark.FileCapture(pcap_file, keep_packets=False)
    if hasattr(capture, "eventloop"):
        nest_asyncio.apply(capture.eventloop)
    packet_iterator = capture

    csv_file = None
    csv_writer = None
    count = 0

    try:
        if output_file:
            csv_file = open(output_file, mode="w", newline="", encoding="utf-8")

        for packet in packet_iterator:
            try:
                features = extract_packet_features_fn(packet)
                
                # Initialize CSV writer with headers on the first packet
                if csv_file:
                    if csv_writer is None:
                        csv_writer = csv.DictWriter(csv_file, fieldnames=list(features.keys()))
                        csv_writer.writeheader()
                    csv_writer.writerow(features)
                    csv_file.flush()  # Ensure data is saved immediately to disk

                count += 1
                if packet_count and count >= packet_count:
                    print(f"Reached target of {packet_count} packets.")
                    break

            except Exception as e:
                print(f"Packet skipped: {e}")

    except KeyboardInterrupt:
        print(f"\nCapture stopped by user. Total packets captured: {count}")
    finally:
        if csv_file:
            csv_file.close()
            print(f"Saved {count} packets to {output_file}")
        try:
            capture.close()
        except Exception:
            pass





# extract_packets(
#     output_file="features.csv",
#     live_capture=True,
#     interface="Wi-Fi",
#     packet_count=50,
# )



