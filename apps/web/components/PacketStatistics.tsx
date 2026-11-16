"use client";

import React from "react";
import { PipelineStats } from "../types/dpi";
import {
  Radio,
  Cpu,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Zap,
} from "lucide-react";

interface Props {
  stats: PipelineStats;
}

export const PacketStatistics: React.FC<Props> = ({ stats }) => {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const statCards = [
    {
      title: "Total Captured",
      value: stats.totalCaptured.toLocaleString(),
      subtext: formatBytes(stats.totalBytes),
      icon: Radio,
      color: "text-blue-600 dark:text-blue-400",
      accentBg: "bg-blue-50 dark:bg-blue-500/10",
      borderAccent: "border-blue-200 dark:border-blue-500/30",
      cardGlow: "from-blue-500/5 to-transparent",
    },
    {
      title: "Currently Processing",
      value: stats.currentlyProcessing.toLocaleString(),
      subtext: "In feature pipeline",
      icon: Cpu,
      color: "text-amber-600 dark:text-amber-400",
      accentBg: "bg-amber-50 dark:bg-amber-500/10",
      borderAccent: "border-amber-200 dark:border-amber-500/30",
      cardGlow: "from-amber-500/5 to-transparent",
      pulse: stats.currentlyProcessing > 0,
    },
    {
      title: "Successfully Processed",
      value: stats.successfullyProcessed.toLocaleString(),
      subtext: "Flow features ready",
      icon: CheckCircle2,
      color: "text-purple-600 dark:text-purple-400",
      accentBg: "bg-purple-50 dark:bg-purple-500/10",
      borderAccent: "border-purple-200 dark:border-purple-500/30",
      cardGlow: "from-purple-500/5 to-transparent",
    },
    {
      title: "Accepted Packets",
      value: stats.acceptedPackets.toLocaleString(),
      subtext: `${
        stats.acceptedPackets + stats.rejectedPackets > 0
          ? (
              (stats.acceptedPackets /
                (stats.acceptedPackets + stats.rejectedPackets)) *
              100
            ).toFixed(1)
          : "100"
      }% safe flow`,
      icon: ShieldCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      accentBg: "bg-emerald-50 dark:bg-emerald-500/10",
      borderAccent: "border-emerald-200 dark:border-emerald-500/30",
      cardGlow: "from-emerald-500/5 to-transparent",
    },
    {
      title: "Rejected Packets",
      value: stats.rejectedPackets.toLocaleString(),
      subtext: `${stats.threatRatio}% threat ratio`,
      icon: ShieldAlert,
      color: "text-rose-600 dark:text-rose-400",
      accentBg: "bg-rose-50 dark:bg-rose-500/10",
      borderAccent: "border-rose-200 dark:border-rose-500/30",
      cardGlow: "from-rose-500/5 to-transparent",
      highlight: stats.rejectedPackets > 0,
    },
    {
      title: "Processing Rate",
      value: `${stats.packetProcessingRate} pps`,
      subtext: "real-time throughput",
      icon: Zap,
      color: "text-cyan-600 dark:text-cyan-400",
      accentBg: "bg-cyan-50 dark:bg-cyan-500/10",
      borderAccent: "border-cyan-200 dark:border-cyan-500/30",
      cardGlow: "from-cyan-500/5 to-transparent",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 w-full">
      {statCards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div
            key={idx}
            className={`relative overflow-hidden rounded-xl border bg-white/90 dark:bg-slate-900/60 backdrop-blur-md p-3.5 transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-md dark:shadow-black/40 ${card.borderAccent}`}
          >
            {/* Ambient subtle corner glow */}
            <div
              className={`absolute -top-12 -right-12 h-24 w-24 rounded-full bg-gradient-to-br ${card.cardGlow} blur-xl pointer-events-none`}
            />

            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                {card.title}
              </span>
              <div
                className={`p-1.5 rounded-lg ${card.accentBg} ${card.color} border ${card.borderAccent} shadow-xs`}
              >
                <IconComponent className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
                {card.value}
              </span>
              {card.pulse && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
              )}
            </div>

            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="truncate font-mono">{card.subtext}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
