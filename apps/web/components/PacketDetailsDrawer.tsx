"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PacketMessage } from "../types/dpi";
import { PIPELINE_NODES } from "../lib/pipelineConfig";
import { PacketTimeline } from "./PacketTimeline";
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Radio,
  Clock,
  Layers,
  Code,
  Copy,
  Check,
  Terminal,
  ArrowRight,
  Database,
} from "lucide-react";

interface Props {
  packet: PacketMessage | null;
  onClose: () => void;
}

export const PacketDetailsDrawer: React.FC<Props> = ({ packet, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  if (!packet) return null;

  const currentMeta = PIPELINE_NODES[packet.status] || PIPELINE_NODES.captured;
  const isMalicious =
    packet.status === "rejected" ||
    Boolean(packet.prediction && /malicious|attack|dos|probe|exploit/i.test(packet.prediction));

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className="relative z-10 w-full max-w-xl h-full bg-white/95 dark:bg-slate-950/95 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl transition-colors duration-300"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/60">
            <div className="flex items-center gap-3">
              <div
                className="p-2.5 rounded-xl border flex items-center justify-center"
                style={{
                  backgroundColor: currentMeta.bgGlow,
                  borderColor: currentMeta.color,
                }}
              >
                {isMalicious ? (
                  <ShieldAlert className="w-5 h-5 text-rose-500 dark:text-rose-400" />
                ) : packet.status === "accepted" ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                ) : (
                  <Cpu className="w-5 h-5" style={{ color: currentMeta.color }} />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-mono">
                    {packet.id}
                  </h3>
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full border uppercase font-semibold"
                    style={{
                      backgroundColor: currentMeta.bgGlow,
                      borderColor: currentMeta.color,
                      color: currentMeta.color,
                    }}
                  >
                    {currentMeta.shortName}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(packet.timestamp).toLocaleString()}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-5">
            {/* Verdict Card */}
            <div
              className={`rounded-2xl border p-4 ${
                isMalicious
                  ? "border-rose-500/40 bg-rose-500/10 dark:bg-rose-500/10"
                  : packet.status === "accepted"
                  ? "border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-500/10"
                  : "border-cyan-500/40 bg-cyan-500/10 dark:bg-cyan-500/10"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  DPI Machine Learning Verdict
                </span>
                {packet.confidence !== undefined && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/60 text-slate-900 dark:text-white shadow-xs">
                    Confidence: {(packet.confidence * 100).toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span
                  className={`text-lg md:text-xl font-bold font-mono ${
                    isMalicious
                      ? "text-rose-600 dark:text-rose-400"
                      : packet.status === "accepted"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-cyan-600 dark:text-cyan-400"
                  }`}
                >
                  {packet.prediction || (isMalicious ? "Threat Detected" : "Benign Traffic")}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {isMalicious ? "(Policy: Drop & Alert)" : "(Policy: Permitted Egress)"}
                </span>
              </div>
            </div>

            {/* Network 5-Tuple Header Card */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5 uppercase font-mono tracking-wider text-slate-600 dark:text-slate-400">
                  <Terminal className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  Network 5-Tuple
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {packet.protocol} • {packet.size} bytes
                </span>
              </div>

              {/* Source -> Destination Connection Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-lg bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800/80 shadow-xs">
                {/* Source IP:Port */}
                <div className="flex-1">
                  <div className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-500">
                    Source Endpoint
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs md:text-sm font-mono font-semibold text-slate-900 dark:text-white">
                      {packet.src_ip}
                    </span>
                    <span className="text-xs font-mono font-medium text-cyan-600 dark:text-cyan-400">
                      :{packet.src_port}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(`${packet.src_ip}:${packet.src_port}`, "src")
                      }
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white ml-auto transition-colors"
                      title="Copy source"
                    >
                      {copiedKey === "src" ? (
                        <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="hidden sm:flex items-center justify-center px-2 text-slate-400">
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>

                {/* Destination IP:Port */}
                <div className="flex-1">
                  <div className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-500">
                    Destination Endpoint
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs md:text-sm font-mono font-semibold text-slate-900 dark:text-white">
                      {packet.dst_ip || "10.0.0.1"}
                    </span>
                    <span className="text-xs font-mono font-medium text-cyan-600 dark:text-cyan-400">
                      :{packet.dst_port || 80}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${packet.dst_ip || "10.0.0.1"}:${packet.dst_port || 80}`,
                          "dst"
                        )
                      }
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white ml-auto transition-colors"
                      title="Copy destination"
                    >
                      {copiedKey === "dst" ? (
                        <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Flow Key Info */}
              {packet.flow_key && (
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                  <span className="text-slate-500">Flow Key:</span>
                  <span className="truncate max-w-[280px] text-slate-700 dark:text-slate-300">
                    {packet.flow_key}
                  </span>
                </div>
              )}
            </div>

            {/* Extracted DPI Features Grid */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5 uppercase font-mono tracking-wider text-slate-600 dark:text-slate-400">
                  <Database className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  Extracted DPI Features
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Model Features: 8
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 shadow-xs">
                  <div className="text-[10px] uppercase font-mono text-slate-500">
                    Flow Duration
                  </div>
                  <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {packet.features?.duration ?? 0.042} s
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 shadow-xs">
                  <div className="text-[10px] uppercase font-mono text-slate-500">
                    Fwd / Bwd Packets
                  </div>
                  <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {packet.features?.total_fwd_packets ?? 6} /{" "}
                    {packet.features?.total_bwd_packets ?? 4}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 shadow-xs">
                  <div className="text-[10px] uppercase font-mono text-slate-500">
                    Mean Packet Size
                  </div>
                  <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {packet.features?.fwd_packet_length_mean ?? packet.size} B
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 shadow-xs">
                  <div className="text-[10px] uppercase font-mono text-slate-500">
                    Flow Throughput
                  </div>
                  <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {((packet.features?.flow_bytes_s ?? 24500) / 1024).toFixed(1)} KB/s
                  </div>
                </div>
              </div>
            </div>

            {/* Lifecycle Timeline */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5 uppercase font-mono tracking-wider text-slate-600 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Packet Processing Timeline
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Stage Progress
                </span>
              </div>

              <PacketTimeline packet={packet} />
            </div>

            {/* Raw JSON Toggle */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-3">
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="w-full flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5" />
                  Raw Telemetry JSON
                </span>
                <span className="underline">{showRawJson ? "Hide" : "Show"}</span>
              </button>

              {showRawJson && (
                <pre className="mt-3 p-3 rounded-lg bg-slate-900 text-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono overflow-x-auto max-h-48">
                  {JSON.stringify(packet, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
