
import csv
import pyshark
import nest_asyncio

from feature.feature_extractor import FeatureExtractor


class PacketCapture:

    def __init__(
        self,
        interface="Wi-Fi",
        feature_extractor=None,
        next_fn=None
    ):
        self.interface = interface
        self.extractor = feature_extractor or FeatureExtractor()
        self.next_fn = next_fn

        self.capture = None
        self.count = 0
        self.running = False

    def _setup_capture(self, capture):
        self.capture = capture

        if hasattr(capture, "eventloop"):
            nest_asyncio.apply(capture.eventloop)

    def _process_packet(self, packet):
        try:
            features = self.extractor.extract(packet)

            self.count += 1

            if self.next_fn:
                self.next_fn(features)

            return features

        except Exception as e:
            print(f"Packet skipped: {e}")
            return None

    def live_capture(
        self,
        packet_count=0,
        output_file=None,
        next_fn=None
    ):
        capture = pyshark.LiveCapture(
            interface=self.interface
        )

        self._setup_capture(capture)
        self.running = True

        if next_fn:
            self.next_fn = next_fn

        try:
            for packet in capture.sniff_continuously(
                packet_count=packet_count
            ):
                if not self.running:
                    break

                features = self._process_packet(packet)

                if features and output_file:
                    self._write_features(
                        features,
                        output_file
                    )

        except KeyboardInterrupt:
            print("\nLive capture stopped.")

        finally:
            self.running = False
            capture.close()

        print(f"Total packets processed: {self.count}")

    def read_pcap(
        self,
        pcap_file,
        packet_count=None,
        output_file=None,
        next_fn=None
    ):
        capture = pyshark.FileCapture(
            pcap_file,
            keep_packets=False
        )

        self._setup_capture(capture)

        if next_fn:
            self.next_fn = next_fn

        try:
            for packet in capture:

                features = self._process_packet(packet)

                if features and output_file:
                    self._write_features(
                        features,
                        output_file
                    )

                if packet_count and self.count >= packet_count:
                    break

        except KeyboardInterrupt:
            print("\nPCAP processing stopped.")

        finally:
            capture.close()

        print(f"Total packets processed: {self.count}")

    def _write_features(self, features, output_file):
        file_exists = False

        try:
            with open(output_file, "r"):
                file_exists = True
        except FileNotFoundError:
            pass

        with open(
            output_file,
            "a",
            newline="",
            encoding="utf-8"
        ) as file:

            writer = csv.DictWriter(
                file,
                fieldnames=list(features.keys())
            )

            if not file_exists:
                writer.writeheader()

            writer.writerow(features)

    def stop(self):
        self.running = False

        if self.capture:
            self.capture.close()
