"use client";

import React, { useState, useEffect } from "react";
import { useDpiStream } from "../hooks/useDpiStream";
import { StageId, PacketMessage } from "../types/dpi";
import { ControlBar } from "../components/ControlBar";
import { PacketStatistics } from "../components/PacketStatistics";
import { PacketPipeline } from "../components/PacketPipeline";
import { LivePacketTable } from "../components/LivePacketTable";
import { PacketDetailsDrawer } from "../components/PacketDetailsDrawer";

export default function Home() {
  const {
    packets,
    inFlightPackets,
    stats,
    wsStatus,
    wsUrl,
    setWsUrl,
    isPaused,
    setIsPaused,
    isSimulating,
    setIsSimulating,
    simSpeed,
    setSimSpeed,
    soundEnabled,
    toggleSound,
    activeNodePulses,
    handlePacketArrived,
    clearPackets,
    sendManualPacket,
  } = useDpiStream();

  const [selectedPacket, setSelectedPacket] = useState<PacketMessage | null>(null);
  const [selectedStageFilter, setSelectedStageFilter] = useState<StageId | "all">("all");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Sync theme with localStorage and root HTML document class
  useEffect(() => {
    const savedTheme = localStorage.getItem("dpi-flow-theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      // Default to dark for cybersecurity dashboard
      document.documentElement.classList.add("dark");
    }
  }, []);

  const handleToggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("dpi-flow-theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-3 sm:p-5 md:p-8 flex flex-col gap-5 max-w-[1600px] mx-auto selection:bg-cyan-500/30 selection:text-cyan-800 dark:selection:text-cyan-200 transition-colors duration-300">
      {/* 1. Top SOC Header & Control Bar */}
      <ControlBar
        wsStatus={wsStatus}
        wsUrl={wsUrl}
        onUpdateWsUrl={setWsUrl}
        isSimulating={isSimulating}
        onToggleSimulating={() => setIsSimulating(!isSimulating)}
        simSpeed={simSpeed}
        onSetSimSpeed={setSimSpeed}
        onInjectManualPacket={sendManualPacket}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* 2. Real-Time Aggregate Statistics Cards */}
      <PacketStatistics stats={stats} />

      {/* 3. Main Real-Time Packet Flow Visualization Pipeline */}
      <section className="w-full">
        <PacketPipeline
          stats={stats}
          inFlightPackets={inFlightPackets}
          activePulses={activeNodePulses}
          onPacketArrived={handlePacketArrived}
          selectedStageFilter={selectedStageFilter}
          onSelectStage={setSelectedStageFilter}
          packets={packets}
        />
      </section>

      {/* 4. Live Packet Activity Table */}
      <section className="w-full">
        <LivePacketTable
          packets={packets}
          onSelectPacket={setSelectedPacket}
          isPaused={isPaused}
          onTogglePause={() => setIsPaused(!isPaused)}
          onClear={clearPackets}
          selectedStageFilter={selectedStageFilter}
          onSelectStage={setSelectedStageFilter}
        />
      </section>

      {/* 5. Packet Details Drawer (Opens when a packet is clicked) */}
      <PacketDetailsDrawer
        packet={selectedPacket}
        onClose={() => setSelectedPacket(null)}
      />

      {/* Bottom Footer Info */}
      <footer className="w-full py-4 border-t border-slate-200 dark:border-slate-900 text-center flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-slate-500 dark:text-slate-500 transition-colors duration-300">
        <div>
          <span>Deep Packet Inspection (DPI) System</span> • <span>ML Inference Engine</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
            Socket Live Buffer: {packets.length}
          </span>
          <span>•</span>
          <span>KGEC Minor Project 2025-2027</span>
        </div>
      </footer>
    </main>
  );
}
