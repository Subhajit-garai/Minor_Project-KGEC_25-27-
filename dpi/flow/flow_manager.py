from flow.flow import Flow


class FlowManager:

    def __init__(self):

        self.flows = {}

    def process_packet(self, packet):

        flow_key = packet["flow_key"]
        reverse_key = packet["reverse_flow_key"]

        # Existing forward flow
        if flow_key in self.flows:

            self.flows[flow_key].add_packet(
                packet,
                is_forward=True
            )

            return self.flows[flow_key]

        # Existing backward flow
        elif reverse_key in self.flows:

            self.flows[reverse_key].add_packet(
                packet,
                is_forward=False
            )

            return self.flows[reverse_key]

        # New flow
        else:

            flow = Flow(packet)

            self.flows[flow_key] = flow

            return flow