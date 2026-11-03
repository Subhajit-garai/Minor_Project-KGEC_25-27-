from typing import Dict, Optional, List
from flow.flow import Flow
from feature.feature_extractor import get_bidirectional_key


class FlowProcessor:
    """
    Manages bidirectional network flows in real time.
    Aggregates packet streams into conversations identified by their 5-tuple,
    correctly classifying forward and reverse packets.
    """

    def __init__(self, flow_timeout: float = 120.0):
        # Maps canonical bidirectional key -> Flow instance
        self.flows: Dict[tuple, Flow] = {}
        self.flow_timeout = flow_timeout

    def process_packet(self, packet: dict) -> Flow:
        """
        Processes an extracted packet feature dictionary and maps it to
        its corresponding bidirectional Flow.
        """
        flow_key = packet["flow_key"]
        bidirectional_key = packet.get("bidirectional_key") or get_bidirectional_key(flow_key)

        if bidirectional_key in self.flows:
            flow = self.flows[bidirectional_key]
            # Determine direction relative to the initiator of the flow
            is_forward = (flow_key == flow.forward_key)
            flow.add_packet(packet, is_forward=is_forward)
            return flow
        else:
            flow = Flow(packet)
            self.flows[bidirectional_key] = flow
            return flow

    def get_flow(self, key: tuple) -> Optional[Flow]:
        """Looks up a flow by either its canonical key or directed 5-tuple."""
        bkey = get_bidirectional_key(key)
        return self.flows.get(bkey) or self.flows.get(key)

    def get_all_flows(self) -> List[Flow]:
        """Returns all currently active flows."""
        return list(self.flows.values())

    def clean_inactive_flows(self, current_time: float, timeout_seconds: Optional[float] = None) -> int:
        """
        Purges flows that have been idle longer than timeout_seconds
        to prevent unbounded memory consumption in real-time DPI systems.
        """
        timeout = timeout_seconds if timeout_seconds is not None else self.flow_timeout
        expired_keys = [
            k for k, f in self.flows.items()
            if (current_time - f.last_time) > timeout
        ]
        for k in expired_keys:
            del self.flows[k]
        return len(expired_keys)

    def clear(self):
        """Clears all stored flows."""
        self.flows.clear()


# Backward compatibility alias
FlowManager = FlowProcessor

