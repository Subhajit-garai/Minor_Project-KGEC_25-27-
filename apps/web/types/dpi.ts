export type PacketStatus =
  | "internet"
  | "captured"
  | "processing"
  | "processed"
  | "decisioning"
  | "accepted"
  | "rejected"
  | "error";

export type StageId = PacketStatus;

export interface PacketMessage {
  id: string;
  status: PacketStatus;
  src_ip: string;
  src_port: string | number;
  dst_ip?: string;
  dst_port?: string | number;
  protocol: string;
  size: number;
  type?: string;
  timestamp: string;
  prediction?: string;
  confidence?: number;
  flow_key?: string;
  features?: {
    duration?: number;
    total_fwd_packets?: number;
    total_bwd_packets?: number;
    fwd_packet_length_mean?: number;
    flow_bytes_s?: number;
    flow_packets_s?: number;
    flags?: string[];
    ttl?: number;
    window_size?: number;
    [key: string]: any;
  };
  history?: Array<{
    stage: PacketStatus;
    timestamp: string;
    note?: string;
  }>;
}

export interface InFlightPacket {
  id: string;
  packetId: string;
  protocol: string;
  src_ip?: string;
  src_port?: string | number;
  dst_ip?: string;
  dst_port?: string | number;
  size: number;
  fromStage: StageId;
  toStage: StageId;
  status: PacketStatus;
  startTime: number;
  durationMs: number;
  isMalicious?: boolean;
}

export interface DpiNodeMeta {
  id: StageId;
  name: string;
  shortName: string;
  category: "ingress" | "pipeline" | "decision" | "egress";
  description: string;
  color: string;
  glowColor: string;
  bgGlow: string;
  borderColor: string;
  accentText: string;
  iconName: "Globe" | "Radio" | "Cpu" | "CheckCircle2" | "BrainCircuit" | "ShieldCheck" | "ShieldAlert";
}

export interface PipelineStats {
  totalCaptured: number;
  currentlyProcessing: number;
  successfullyProcessed: number;
  acceptedPackets: number;
  rejectedPackets: number;
  packetProcessingRate: number; // packets per second
  totalBytes: number;
  threatRatio: number; // percentage
  stageCounts: Record<StageId, number>;
}

export interface FilterOptions {
  searchQuery: string;
  protocol: string;
  status: string;
}
