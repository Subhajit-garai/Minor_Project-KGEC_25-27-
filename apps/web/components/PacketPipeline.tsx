"use client";

import React from "react";
import { InFlightPacket, PipelineStats, StageId, PacketMessage } from "../types/dpi";
import { PIPELINE_NODES } from "../lib/pipelineConfig";
import { PipelineNode } from "./PipelineNode";
import { LinearConnector, ForkConnector } from "./PipelineConnector";
import {
  Workflow,
  Network,
  Filter,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";

interface Props {
  stats: PipelineStats;
  inFlightPackets: InFlightPacket[];
  activePulses: Record<StageId, boolean>;
  onPacketArrived: (id: string, toStage: StageId) => void;
  selectedStageFilter: StageId | "all";
  onSelectStage: (stage: StageId | "all") => void;
  packets?: PacketMessage[];
}

const STAGE_NAV_ITEMS: { id: StageId | "all"; label: string; color?: string }[] = [
  { id: "all", label: "All Stages" },
  { id: "internet", label: "Internet", color: "#64748B" },
  { id: "captured", label: "Captured", color: "#3B82F6" },
  { id: "processing", label: "Processing", color: "#F59E0B" },
  { id: "processed", label: "Processed", color: "#8B5CF6" },
  { id: "decisioning", label: "Decisioning", color: "#06B6D4" },
  { id: "accepted", label: "Accepted", color: "#22C55E" },
  { id: "rejected", label: "Rejected", color: "#EF4444" },
];

export const PacketPipeline: React.FC<Props> = ({
  stats,
  inFlightPackets,
  activePulses,
  onPacketArrived,
  selectedStageFilter,
  onSelectStage,
  packets = [],
}) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scrollByAmount = (offset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const lastPacketByStage = React.useMemo(() => {
    const map: Partial<Record<StageId, PacketMessage>> = {};
    for (const pkt of packets) {
      if (!map[pkt.status]) {
        map[pkt.status] = pkt;
      }
    }
    return map;
  }, [packets]);

  const activeCountsByStage = React.useMemo(() => {
    const map: Partial<Record<StageId, number>> = {};
    for (const pkt of packets) {
      map[pkt.status] = (map[pkt.status] || 0) + 1;
    }
    return map;
  }, [packets]);

  const stageCounts = stats.stageCounts || {
    internet: stats.totalCaptured,
    captured: stats.totalCaptured,
    processing: stats.currentlyProcessing,
    processed: stats.successfullyProcessed,
    decisioning: stats.acceptedPackets + stats.rejectedPackets,
    accepted: stats.acceptedPackets,
    rejected: stats.rejectedPackets,
    error: 0,
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* 1. SEPARATE PIPELINE NAVIGATION & STAGE CONTROLS BAR */}
      <nav
        aria-label="Pipeline Stage Navigation"
        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 backdrop-blur-xl p-3 sm:p-4 shadow-md shadow-slate-200/50 dark:shadow-black/30 flex flex-wrap items-center justify-between gap-3 transition-colors duration-300"
      >
        {/* Title & Pipeline Nav Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30 shadow-xs">
            <Workflow className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Pipeline Navigation
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {selectedStageFilter === "all" ? "All Stages View" : `${selectedStageFilter.toUpperCase()} STAGE`}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Filter pipeline stages, monitor in-flight traffic, and navigate visualizer track
            </p>
          </div>
        </div>

        {/* Stage Navigation Pills / Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1 px-1 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80">
          {STAGE_NAV_ITEMS.map((item) => {
            const isSelected = selectedStageFilter === item.id;
            const countForStage =
              item.id === "all"
                ? stats.totalCaptured
                : stageCounts[item.id as StageId] ?? 0;

            return (
              <button
                key={item.id}
                onClick={() => onSelectStage(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-300 dark:border-slate-700 font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                title={`Filter pipeline by ${item.label}`}
              >
                {item.color && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                <span>{item.label}</span>
                <span className="text-[10px] opacity-70 font-normal">
                  ({countForStage.toLocaleString()})
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Tools: In-Flight Pill, Viewport Scroll & Reset */}
        <div className="flex items-center gap-2.5 ml-auto sm:ml-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
            <Network className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-pulse" />
            <span>
              In-Flight:{" "}
              <strong className="text-cyan-600 dark:text-cyan-400">{inFlightPackets.length}</strong>
            </span>
          </div>

          {/* Viewport Scroll Left / Right Buttons */}
          <div className="flex items-center rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-0.5">
            <button
              onClick={() => scrollByAmount(-360)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Scroll Visualizer Left"
              aria-label="Scroll Visualizer Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollByAmount(360)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Scroll Visualizer Right"
              aria-label="Scroll Visualizer Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Reset Filter Button */}
          {selectedStageFilter !== "all" && (
            <button
              onClick={() => onSelectStage("all")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/40 text-xs font-medium hover:bg-cyan-100 dark:hover:bg-cyan-500/30 transition-colors shadow-xs"
              title="Reset stage filter to show all"
            >
              <Filter className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </nav>

      {/* 2. DEDICATED LIVE VISUALIZER CANVAS WITH THICK 50% CYBER GRID */}
      <section
        aria-label="Live Visualizer Canvas"
        className="relative w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 backdrop-blur-xl p-5 md:p-7 shadow-xl shadow-slate-200/50 dark:shadow-2xl overflow-hidden transition-colors duration-300 min-h-[380px] md:min-h-[420px] flex flex-col justify-between"
      >
        {/* Background Cyber Grid Pattern */}
        <div
          className="absolute inset-0 opacity-50 dark:opacity-50 pointer-events-none text-slate-400 dark:text-slate-500"
          style={{
            backgroundImage: `
              linear-gradient(to right, currentColor 2px, transparent 2px),
              linear-gradient(to bottom, currentColor 2px, transparent 2px)
            `,
            backgroundSize: "28px 28px",
          }}
        />

        {/* Ambient background glow points */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-72 h-72 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-72 h-72 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />

        {/* Visualizer Canvas Sub-Header */}
        <div className="relative z-10 flex items-center justify-between gap-3 mb-6 pb-3 border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              LIVE VISUALIZER
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
              Real-Time DPI Network Packet Processing Pipeline Graph
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
            Flow: Internet ➔ Captured ➔ Processing ➔ Processed ➔ Decisioning ➔ Egress
          </div>
        </div>

        {/* Horizontal Pipeline Track Container with overflow scroll support & increased vertical room */}
        <div
          ref={scrollRef}
          className="relative z-10 w-full overflow-x-auto py-8 md:py-12 scroll-smooth flex items-center my-auto"
        >
          <div className="min-w-[1550px] flex items-center justify-between px-4 w-full">
            {/* 1. Stage: Internet Ingress */}
            <PipelineNode
              meta={PIPELINE_NODES.internet}
              count={stageCounts.internet ?? stats.totalCaptured}
              isPulsing={activePulses.internet}
              isSelected={selectedStageFilter === "internet"}
              onSelect={(id) => onSelectStage(selectedStageFilter === id ? "all" : id)}
              lastPacket={lastPacketByStage.internet}
              activeCount={activeCountsByStage.internet || 0}
            />

            {/* Connector: Internet -> Captured */}
            <LinearConnector
              fromStage="internet"
              toStage="captured"
              inFlightPackets={inFlightPackets}
              onPacketArrived={onPacketArrived}
            />

            {/* 2. Stage: Captured */}
            <PipelineNode
              meta={PIPELINE_NODES.captured}
              count={stageCounts.captured ?? stats.totalCaptured}
              isPulsing={activePulses.captured}
              isSelected={selectedStageFilter === "captured"}
              onSelect={(id) => onSelectStage(selectedStageFilter === id ? "all" : id)}
              lastPacket={lastPacketByStage.captured}
              activeCount={activeCountsByStage.captured || 0}
            />

            {/* Connector: Captured -> Processing */}
            <LinearConnector
              fromStage="captured"
              toStage="processing"
              inFlightPackets={inFlightPackets}
              onPacketArrived={onPacketArrived}
            />

            {/* 3. Stage: Processing */}
            <PipelineNode
              meta={PIPELINE_NODES.processing}
              count={stageCounts.processing ?? stats.currentlyProcessing}
              isPulsing={activePulses.processing}
              isSelected={selectedStageFilter === "processing"}
              onSelect={(id) => onSelectStage(selectedStageFilter === id ? "all" : id)}
              lastPacket={lastPacketByStage.processing}
              activeCount={activeCountsByStage.processing || 0}
            />

            {/* Connector: Processing -> Processed */}
            <LinearConnector
              fromStage="processing"
              toStage="processed"
              inFlightPackets={inFlightPackets}
              onPacketArrived={onPacketArrived}
            />

            {/* 4. Stage: Processed */}
            <PipelineNode
              meta={PIPELINE_NODES.processed}
              count={stageCounts.processed ?? stats.successfullyProcessed}
              isPulsing={activePulses.processed}
              isSelected={selectedStageFilter === "processed"}
              onSelect={(id) => onSelectStage(selectedStageFilter === id ? "all" : id)}
              lastPacket={lastPacketByStage.processed}
              activeCount={activeCountsByStage.processed || 0}
            />

            {/* Connector: Processed -> Decisioning */}
            <LinearConnector
              fromStage="processed"
              toStage="decisioning"
              inFlightPackets={inFlightPackets}
              onPacketArrived={onPacketArrived}
            />

            {/* 5. Stage: Decisioning */}
            <PipelineNode
              meta={PIPELINE_NODES.decisioning}
              count={stageCounts.decisioning ?? (stats.acceptedPackets + stats.rejectedPackets)}
              isPulsing={activePulses.decisioning}
              isSelected={selectedStageFilter === "decisioning"}
              onSelect={(id) => onSelectStage(selectedStageFilter === id ? "all" : id)}
              lastPacket={lastPacketByStage.decisioning}
              activeCount={activeCountsByStage.decisioning || 0}
            />

            {/* Bifurcated Fork Connector: Decisioning -> [Accepted, Rejected] */}
            <ForkConnector
              fromStage="decisioning"
              inFlightPackets={inFlightPackets}
              onPacketArrived={onPacketArrived}
            />

            {/* 6. Vertical Branch Column: Accepted (Top) & Rejected (Bottom) */}
            <div className="flex flex-col justify-between h-[195px] shrink-0">
              {/* Accepted Egress */}
              <PipelineNode
                meta={PIPELINE_NODES.accepted}
                count={stageCounts.accepted ?? stats.acceptedPackets}
                isPulsing={activePulses.accepted}
                isSelected={selectedStageFilter === "accepted"}
                onSelect={(id) => onSelectStage(selectedStageFilter === id ? "all" : id)}
                branchType="accepted"
                lastPacket={lastPacketByStage.accepted}
                activeCount={activeCountsByStage.accepted || 0}
              />

              {/* Rejected Egress */}
              <PipelineNode
                meta={PIPELINE_NODES.rejected}
                count={stageCounts.rejected ?? stats.rejectedPackets}
                isPulsing={activePulses.rejected}
                isSelected={selectedStageFilter === "rejected"}
                onSelect={(id) => onSelectStage(selectedStageFilter === id ? "all" : id)}
                branchType="rejected"
                lastPacket={lastPacketByStage.rejected}
                activeCount={activeCountsByStage.rejected || 0}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
