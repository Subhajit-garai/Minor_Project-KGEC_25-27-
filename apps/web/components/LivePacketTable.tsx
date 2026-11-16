"use client";

import React, { useState, useMemo } from "react";
import { PacketMessage, StageId } from "../types/dpi";
import { PIPELINE_NODES } from "../lib/pipelineConfig";
import {
  Search,
  Filter,
  Play,
  Pause,
  Trash2,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Radio,
  Cpu,
  Layers,
  Sparkles,
} from "lucide-react";

interface Props {
  packets: PacketMessage[];
  onSelectPacket: (packet: PacketMessage) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onClear: () => void;
  selectedStageFilter: StageId | "all";
  onSelectStage: (stage: StageId | "all") => void;
}

export const LivePacketTable: React.FC<Props> = ({
  packets,
  onSelectPacket,
  isPaused,
  onTogglePause,
  onClear,
  selectedStageFilter,
  onSelectStage,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [protocolFilter, setProtocolFilter] = useState("all");

  const filteredPackets = useMemo(() => {
    return packets.filter((pkt) => {
      // Stage filter
      if (selectedStageFilter !== "all" && pkt.status !== selectedStageFilter) {
        return false;
      }
      // Protocol filter
      if (
        protocolFilter !== "all" &&
        pkt.protocol?.toLowerCase() !== protocolFilter.toLowerCase()
      ) {
        return false;
      }
      // Search query filter (Packet ID, src IP, dst IP)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesId = pkt.id?.toLowerCase().includes(query);
        const matchesSrc = pkt.src_ip?.toLowerCase().includes(query);
        const matchesDst = pkt.dst_ip?.toLowerCase().includes(query);
        const matchesPred = pkt.prediction?.toLowerCase().includes(query);
        if (!matchesId && !matchesSrc && !matchesDst && !matchesPred) {
          return false;
        }
      }
      return true;
    });
  }, [packets, selectedStageFilter, protocolFilter, searchQuery]);

  return (
    <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 backdrop-blur-xl shadow-xl shadow-slate-200/50 dark:shadow-2xl overflow-hidden flex flex-col transition-colors duration-300">
      {/* Top Filter and Action Bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Title & Count */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">
              Live Packet Activity Feed
            </h3>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
            {filteredPackets.length} / {packets.length} Packets
          </span>
        </div>

        {/* Right: Controls (Search, Protocol Filter, Stage Filter, Pause, Clear) */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search IP, ID, or threat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-44 md:w-56 shadow-xs"
            />
          </div>

          {/* Protocol Filter */}
          <select
            value={protocolFilter}
            onChange={(e) => setProtocolFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-xs"
          >
            <option value="all">All Protocols</option>
            <option value="TCP">TCP</option>
            <option value="UDP">UDP</option>
            <option value="TLS">TLS</option>
            <option value="DNS">DNS</option>
            <option value="HTTP">HTTP</option>
            <option value="ICMP">ICMP</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStageFilter}
            onChange={(e) => onSelectStage(e.target.value as StageId | "all")}
            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-xs"
          >
            <option value="all">All Stages</option>
            <option value="captured">Captured</option>
            <option value="processing">Processing</option>
            <option value="processed">Processed</option>
            <option value="decisioning">Decisioning</option>
            <option value="accepted">Accepted (Safe)</option>
            <option value="rejected">Rejected (Threat)</option>
          </select>

          {/* Pause / Resume Button */}
          <button
            onClick={onTogglePause}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors shadow-xs ${
              isPaused
                ? "bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40 hover:bg-amber-100"
                : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
            title={isPaused ? "Resume Live Stream" : "Pause Live Stream"}
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Pause</span>
              </>
            )}
          </button>

          {/* Clear Buffer Button */}
          <button
            onClick={onClear}
            className="p-1.5 rounded-xl bg-white dark:bg-slate-900 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-300 dark:border-slate-700/80 hover:border-rose-300 dark:hover:border-rose-500/40 transition-colors shadow-xs"
            title="Clear Buffer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table Data Area */}
      <div className="w-full overflow-x-auto max-h-[480px]">
        <table className="w-full text-left text-xs border-collapse">
          {/* Table Header */}
          <thead className="sticky top-0 z-10 bg-slate-100/95 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[11px] uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3 font-semibold">Packet ID</th>
              <th className="py-2.5 px-3 font-semibold">Source IP</th>
              <th className="py-2.5 px-3 font-semibold">Port</th>
              <th className="py-2.5 px-3 font-semibold">Destination IP</th>
              <th className="py-2.5 px-3 font-semibold">Port</th>
              <th className="py-2.5 px-3 font-semibold">Protocol</th>
              <th className="py-2.5 px-3 font-semibold text-right">Length</th>
              <th className="py-2.5 px-3 font-semibold text-center">Status</th>
              <th className="py-2.5 px-3 font-semibold">Prediction / Model</th>
              <th className="py-2.5 px-3 font-semibold text-right">Timestamp</th>
              <th className="py-2.5 px-2 font-semibold text-center"></th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/60 font-mono text-slate-800 dark:text-slate-300">
            {filteredPackets.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-slate-400 dark:text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Sparkles className="w-6 h-6 text-slate-400 dark:text-slate-600 animate-pulse" />
                    <span>No packets matching current search or filters.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPackets.map((pkt) => {
                const meta = PIPELINE_NODES[pkt.status] || PIPELINE_NODES.captured;
                const isMalicious =
                  pkt.status === "rejected" ||
                  Boolean(
                    pkt.prediction &&
                      /malicious|attack|dos|probe|exploit/i.test(pkt.prediction)
                  );

                return (
                  <tr
                    key={pkt.id}
                    onClick={() => onSelectPacket(pkt)}
                    className="hover:bg-slate-50/90 dark:hover:bg-slate-900/80 cursor-pointer transition-colors group"
                  >
                    {/* ID */}
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                      {pkt.id}
                    </td>

                    {/* Source IP */}
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-200">
                      {pkt.src_ip}
                    </td>

                    {/* Source Port */}
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                      {pkt.src_port}
                    </td>

                    {/* Destination IP */}
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-200">
                      {pkt.dst_ip || "10.0.0.1"}
                    </td>

                    {/* Destination Port */}
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                      {pkt.dst_port || 80}
                    </td>

                    {/* Protocol */}
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {pkt.protocol}
                      </span>
                    </td>

                    {/* Packet Length */}
                    <td className="py-2.5 px-3 text-right text-slate-500 dark:text-slate-400">
                      {pkt.size} B
                    </td>

                    {/* Status Badge */}
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider"
                        style={{
                          backgroundColor: meta.bgGlow,
                          borderColor: meta.color,
                          color: meta.color,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: meta.color }}
                        />
                        {meta.shortName}
                      </span>
                    </td>

                    {/* Prediction / Classification */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        {isMalicious ? (
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        ) : pkt.status === "accepted" ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <Cpu className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                        )}
                        <span
                          className={`truncate max-w-[170px] ${
                            isMalicious
                              ? "text-rose-600 dark:text-rose-400 font-semibold"
                              : pkt.status === "accepted"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {pkt.prediction || "Pending verdict"}
                        </span>
                        {pkt.confidence !== undefined && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                            ({Math.round(pkt.confidence * 100)}%)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td className="py-2.5 px-3 text-right text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(pkt.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>

                    {/* Action Icon */}
                    <td className="py-2.5 px-2 text-center text-slate-400 hover:text-cyan-600 dark:text-slate-500 dark:hover:text-cyan-400">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
