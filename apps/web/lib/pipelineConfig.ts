import { DpiNodeMeta, StageId } from "../types/dpi";

export const PIPELINE_NODES: Record<StageId, DpiNodeMeta> = {
  internet: {
    id: "internet",
    name: "Internet Traffic",
    shortName: "Internet",
    category: "ingress",
    description: "External raw packet source and WAN ingress gateway",
    color: "#64748B",
    glowColor: "rgba(100, 116, 139, 0.4)",
    bgGlow: "rgba(100, 116, 139, 0.12)",
    borderColor: "border-slate-600",
    accentText: "text-slate-400",
    iconName: "Globe",
  },
  captured: {
    id: "captured",
    name: "Packet Captured",
    shortName: "Captured",
    category: "pipeline",
    description: "Packet received by kernel & mirrored via live socket capture",
    color: "#3B82F6",
    glowColor: "rgba(59, 130, 246, 0.5)",
    bgGlow: "rgba(59, 130, 246, 0.15)",
    borderColor: "border-blue-500",
    accentText: "text-blue-400",
    iconName: "Radio",
  },
  processing: {
    id: "processing",
    name: "Feature Extraction",
    shortName: "Processing",
    category: "pipeline",
    description: "Extracting L3/L4 headers, payload stats, and flow metrics",
    color: "#F59E0B",
    glowColor: "rgba(245, 158, 11, 0.5)",
    bgGlow: "rgba(245, 158, 11, 0.15)",
    borderColor: "border-amber-500",
    accentText: "text-amber-400",
    iconName: "Cpu",
  },
  processed: {
    id: "processed",
    name: "Flow Preprocessed",
    shortName: "Processed",
    category: "pipeline",
    description: "Bidirectional flow aligned & normalized for classifier tensor",
    color: "#8B5CF6",
    glowColor: "rgba(139, 92, 246, 0.5)",
    bgGlow: "rgba(139, 92, 246, 0.15)",
    borderColor: "border-purple-500",
    accentText: "text-purple-400",
    iconName: "CheckCircle2",
  },
  decisioning: {
    id: "decisioning",
    name: "ML / DPI Decisioning",
    shortName: "Decisioning",
    category: "decision",
    description: "Evaluation via Decision Tree/Ensemble model & DPI signature rules",
    color: "#06B6D4",
    glowColor: "rgba(6, 182, 212, 0.5)",
    bgGlow: "rgba(6, 182, 212, 0.15)",
    borderColor: "border-cyan-500",
    accentText: "text-cyan-400",
    iconName: "BrainCircuit",
  },
  accepted: {
    id: "accepted",
    name: "Accepted / Clean",
    shortName: "Accepted",
    category: "egress",
    description: "Safe benign packet routed to internal target destination",
    color: "#22C55E",
    glowColor: "rgba(34, 197, 94, 0.5)",
    bgGlow: "rgba(34, 197, 94, 0.15)",
    borderColor: "border-emerald-500",
    accentText: "text-emerald-400",
    iconName: "ShieldCheck",
  },
  rejected: {
    id: "rejected",
    name: "Rejected / Threat",
    shortName: "Rejected",
    category: "egress",
    description: "Malicious signature or anomaly detected — packet dropped & quarantined",
    color: "#EF4444",
    glowColor: "rgba(239, 68, 68, 0.5)",
    bgGlow: "rgba(239, 68, 68, 0.15)",
    borderColor: "border-rose-500",
    accentText: "text-rose-400",
    iconName: "ShieldAlert",
  },
  error: {
    id: "error",
    name: "Pipeline Error",
    shortName: "Error",
    category: "pipeline",
    description: "Corrupted packet or parsing exception",
    color: "#94A3B8",
    glowColor: "rgba(148, 163, 184, 0.4)",
    bgGlow: "rgba(148, 163, 184, 0.1)",
    borderColor: "border-slate-500",
    accentText: "text-slate-400",
    iconName: "ShieldAlert",
  },
};

export const PIPELINE_TRANSITION_ORDER: StageId[] = [
  "internet",
  "captured",
  "processing",
  "processed",
  "decisioning",
];

export function getNextLogicalStage(current: StageId, isMalicious?: boolean): StageId | null {
  switch (current) {
    case "internet":
      return "captured";
    case "captured":
      return "processing";
    case "processing":
      return "processed";
    case "processed":
      return "decisioning";
    case "decisioning":
      return isMalicious ? "rejected" : "accepted";
    default:
      return null;
  }
}
