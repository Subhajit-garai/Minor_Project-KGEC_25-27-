"use client";

import React from "react";
import { DpiNodeMeta, StageId, PacketMessage } from "../types/dpi";
import {
  Globe,
  Radio,
  Cpu,
  CheckCircle2,
  BrainCircuit,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

interface Props {
  meta: DpiNodeMeta;
  count: number;
  isPulsing: boolean;
  isSelected?: boolean;
  onSelect?: (stageId: StageId) => void;
  branchType?: "none" | "accepted" | "rejected";
  lastPacket?: PacketMessage;
  activeCount?: number;
}

const iconMap = {
  Globe,
  Radio,
  Cpu,
  CheckCircle2,
  BrainCircuit,
  ShieldCheck,
  ShieldAlert,
};

export const PipelineNode: React.FC<Props> = ({
  meta,
  count,
  isPulsing,
  isSelected,
  onSelect,
  branchType = "none",
  lastPacket,
  activeCount = 0,
}) => {
  const IconComponent = iconMap[meta.iconName] || Globe;
  const isBranch = branchType !== "none";

  // Compact layout for bifurcated branch cards (Accepted / Rejected)
  if (isBranch) {
    return (
      <div
        onClick={() => onSelect && onSelect(meta.id)}
        className={`group relative flex flex-col justify-between cursor-pointer select-none rounded-2xl border transition-all duration-300 w-56 md:w-60 h-[92px] p-2.5 shrink-0 overflow-hidden backdrop-blur-md shadow-sm dark:shadow-lg dark:shadow-black/50 ${
          isPulsing
            ? `scale-[1.02] shadow-xl ${meta.borderColor} ring-2 ring-offset-1 ring-offset-white dark:ring-offset-slate-950`
            : isSelected
            ? `ring-2 ring-cyan-500 ${meta.borderColor} bg-slate-50 dark:bg-slate-900/90 shadow-md`
            : "border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/90 hover:scale-[1.01]"
        }`}
        style={{
          boxShadow: isPulsing
            ? `0 0 25px ${meta.glowColor}, inset 0 0 12px ${meta.bgGlow}`
            : undefined,
        }}
      >
        {/* Dynamic pulse ripple */}
        {isPulsing && (
          <span
            className="absolute -inset-1 rounded-2xl animate-ping pointer-events-none opacity-40"
            style={{ borderColor: meta.color, borderWidth: 2 }}
          />
        )}

        {/* Top Header Row */}
        <div className="w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="p-1.5 rounded-lg border flex items-center justify-center shrink-0 shadow-xs"
              style={{
                backgroundColor: meta.bgGlow,
                borderColor: meta.color,
              }}
            >
              <IconComponent className="w-3.5 h-3.5 shrink-0" style={{ color: meta.color }} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
                {meta.shortName}
              </span>
              <span className="text-[8.5px] uppercase font-mono text-slate-500 dark:text-slate-400 truncate">
                {branchType === "accepted" ? "Safe Flow" : "Threat Drop"}
              </span>
            </div>
          </div>

          {/* Branch count */}
          <div className="text-right shrink-0">
            <span
              className="text-base md:text-lg font-bold font-mono block leading-none"
              style={{ color: isPulsing ? meta.color : undefined }}
            >
              {count.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Bottom Live Telemetry Pill */}
        <div className="w-full pt-1.5 border-t border-slate-200 dark:border-slate-800/70 flex items-center justify-between gap-1.5 text-[9px] font-mono">
          <span className="text-slate-400 dark:text-slate-500 shrink-0">Live:</span>
          {lastPacket ? (
            <div className="flex items-center gap-1 min-w-0 overflow-hidden">
              <span
                className="font-bold uppercase px-1 py-0.2 rounded text-[8px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0"
                style={{ color: meta.color }}
              >
                {lastPacket.protocol}
              </span>
              <span className="text-slate-700 dark:text-slate-300 truncate text-[9px]">
                {lastPacket.src_ip}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 italic text-[9px]">Listening...</span>
          )}
        </div>
      </div>
    );
  }

  // Standard full-size card for linear pipeline stages
  return (
    <div
      onClick={() => onSelect && onSelect(meta.id)}
      className={`group relative flex flex-col justify-between cursor-pointer select-none rounded-2xl border transition-all duration-300 w-56 md:w-60 h-[195px] p-3.5 shrink-0 overflow-hidden backdrop-blur-md shadow-md shadow-slate-200/50 dark:shadow-lg dark:shadow-black/50 ${
        isPulsing
          ? `scale-[1.02] shadow-xl ${meta.borderColor} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950`
          : isSelected
          ? `ring-2 ring-cyan-500 ${meta.borderColor} bg-slate-50 dark:bg-slate-900/90 shadow-md`
          : "border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/90 hover:scale-[1.01]"
      }`}
      style={{
        boxShadow: isPulsing
          ? `0 0 28px ${meta.glowColor}, inset 0 0 14px ${meta.bgGlow}`
          : undefined,
      }}
    >
      {/* Dynamic pulse ripple effect upon packet arrival */}
      {isPulsing && (
        <span
          className="absolute -inset-1 rounded-2xl animate-ping pointer-events-none opacity-40"
          style={{ borderColor: meta.color, borderWidth: 2 }}
        />
      )}

      {/* Top Header Badge */}
      <div className="w-full flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="p-2 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-xs"
            style={{
              backgroundColor: meta.bgGlow,
              borderColor: meta.color,
            }}
          >
            <IconComponent className="w-4 h-4 shrink-0" style={{ color: meta.color }} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold tracking-wide text-slate-900 dark:text-slate-100 truncate">
              {meta.shortName}
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono truncate">
              {meta.category}
            </span>
          </div>
        </div>

        {/* Active count & Status LED indicator */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeCount > 0 && (
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/40 animate-pulse whitespace-nowrap">
              {activeCount} act
            </span>
          )}
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${isPulsing ? "animate-ping" : ""}`}
            style={{
              backgroundColor: meta.color,
              boxShadow: `0 0 8px ${meta.color}`,
            }}
          />
        </div>
      </div>

      {/* Description Snippet with fixed height */}
      <p className="w-full text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-2 text-left my-1 h-[28px] overflow-hidden">
        {meta.description}
      </p>

      {/* Counter & Flow Row */}
      <div className="w-full pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex flex-col text-left min-w-0">
          <span className="text-[8.5px] uppercase font-mono text-slate-400 dark:text-slate-500 tracking-wider">
            Total Packets
          </span>
          <span
            className="text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white truncate"
            style={{ color: isPulsing ? meta.color : undefined }}
          >
            {count.toLocaleString()}
          </span>
        </div>

        <div className="text-right shrink-0">
          <span className="inline-block text-[9px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 whitespace-nowrap">
            STAGE #{meta.id === "internet" ? 0 : meta.id === "captured" ? 1 : meta.id === "processing" ? 2 : meta.id === "processed" ? 3 : meta.id === "decisioning" ? 4 : 5}
          </span>
        </div>
      </div>

      {/* Latest Transit Telemetry Pill */}
      <div className="w-full pt-1.5 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between gap-1.5 text-[9.5px] font-mono">
        <span className="text-slate-400 dark:text-slate-500 shrink-0">Live:</span>
        {lastPacket ? (
          <div className="flex items-center gap-1 min-w-0 overflow-hidden">
            <span
              className="font-bold uppercase px-1 py-0.2 rounded text-[8px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0"
              style={{ color: meta.color }}
            >
              {lastPacket.protocol}
            </span>
            <span className="text-slate-700 dark:text-slate-200 truncate font-mono text-[9px]">
              {lastPacket.src_ip}
            </span>
          </div>
        ) : (
          <span className="text-slate-400 dark:text-slate-500 italic text-[9px]">Listening...</span>
        )}
      </div>
    </div>
  );
};
