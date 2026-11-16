"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { InFlightPacket, StageId } from "../types/dpi";
import { PIPELINE_NODES } from "../lib/pipelineConfig";

interface Props {
  packet: InFlightPacket;
  onArrived: (id: string, toStage: StageId) => void;
  isForkUp?: boolean;
  isForkDown?: boolean;
}

export const AnimatedPacket: React.FC<Props> = ({
  packet,
  onArrived,
  isForkUp = false,
  isForkDown = false,
}) => {
  const destMeta = PIPELINE_NODES[packet.toStage] || PIPELINE_NODES.captured;
  const isMalicious = packet.isMalicious;
  const glowColor = isMalicious ? "#EF4444" : destMeta.color;

  useEffect(() => {
    const timer = setTimeout(() => {
      onArrived(packet.id, packet.toStage);
    }, packet.durationMs);

    return () => clearTimeout(timer);
  }, [packet.id, packet.toStage, packet.durationMs, onArrived]);

  // Trajectory for bifurcated branches from decisioning stage
  const yTrajectory = isForkUp ? [0, -26, -52] : isForkDown ? [0, 26, 52] : [0, 0, 0];

  return (
    <motion.div
      initial={{ left: "8%", y: yTrajectory[0], opacity: 0, scale: 0.8 }}
      animate={{
        left: "92%",
        y: yTrajectory,
        opacity: [0, 1, 1, 1, 0.85],
        scale: [0.8, 1.02, 1, 1, 0.9],
      }}
      transition={{
        duration: packet.durationMs / 1000,
        ease: "easeInOut",
      }}
      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center justify-center whitespace-nowrap"
    >
      {/* High-Tech Cyber Packet Capsule */}
      <div
        className="relative flex items-center gap-1.5 px-2 py-0.5 rounded-full border shadow-xl backdrop-blur-md bg-slate-950/95 max-w-[190px]"
        style={{
          borderColor: glowColor,
          boxShadow: `0 0 16px ${glowColor}55, 0 0 5px ${glowColor}aa, inset 0 0 6px ${glowColor}25`,
        }}
      >
        {/* Core Pulsing Point */}
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 animate-ping opacity-75"
          style={{ backgroundColor: glowColor }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 -ml-2"
          style={{ backgroundColor: glowColor }}
        />

        {/* Protocol Chip */}
        <span
          className="text-[9.5px] font-mono font-bold tracking-wider uppercase px-1 py-0.2 rounded bg-slate-800/90 border border-slate-700/80 shadow-sm shrink-0"
          style={{ color: glowColor }}
        >
          {packet.protocol}
        </span>

        {/* Divider */}
        <span className="text-slate-600 text-[9px] font-mono shrink-0">•</span>

        {/* Source IP and Port */}
        <span className="text-[10px] font-mono font-semibold text-slate-100 tracking-tight flex items-baseline truncate">
          <span className="truncate">{packet.src_ip || "192.168.1.1"}</span>
          {packet.src_port ? (
            <span className="text-cyan-400 font-mono text-[9px] ml-0.5 shrink-0">
              :{packet.src_port}
            </span>
          ) : null}
        </span>

        {/* Motion Blur Trail */}
        <div
          className="absolute right-full top-1/2 -translate-y-1/2 h-1.5 w-10 rounded-l-full pointer-events-none opacity-80"
          style={{
            background: `linear-gradient(to left, ${glowColor}, transparent)`,
          }}
        />
      </div>
    </motion.div>
  );
};
