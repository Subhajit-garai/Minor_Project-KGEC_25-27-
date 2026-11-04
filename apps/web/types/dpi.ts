export type PacketStatus =
  | "captured"
  | "processing"
  | "processed"
  | "dicisioning"
  | "accepted"
  | "rejected"
  | "error";

export interface PacketMessage {
  id?: string;
  status: PacketStatus;
  src_ip: string;
  src_port: string | number;
  protocol: string;
  size: number;
  type: string;
  timestamp: string;
}

export type StageId = PacketStatus;

export interface DpiNodeMeta {
  id: StageId;
  name: string;
  category: "ingress" | "pipeline" | "decision" | "egress";
  description: string;
  color: string;
  glowColor: string;
  bgGlow: string;
  iconName: string;
}

export interface NodeMetrics {
  count: number;
  totalBytes: number;
  lastPacket?: PacketMessage;
  ratePps: number;
  activePulse: boolean;
}

