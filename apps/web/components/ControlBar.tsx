"use client";

import React, { useState } from "react";
import {
  Shield,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  PlusCircle,
  Play,
  Pause,
  Sun,
  Moon,
  RefreshCw,
} from "lucide-react";

interface Props {
  wsStatus: "connected" | "connecting" | "disconnected";
  wsUrl: string;
  onUpdateWsUrl: (url: string) => void;
  isSimulating: boolean;
  onToggleSimulating: () => void;
  simSpeed: number;
  onSetSimSpeed: (speed: number) => void;
  onInjectManualPacket: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export const ControlBar: React.FC<Props> = ({
  wsStatus,
  wsUrl,
  onUpdateWsUrl,
  isSimulating,
  onToggleSimulating,
  simSpeed,
  onSetSimSpeed,
  onInjectManualPacket,
  soundEnabled,
  onToggleSound,
  theme,
  onToggleTheme,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [tempUrl, setTempUrl] = useState(wsUrl);

  const handleSaveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateWsUrl(tempUrl);
    setShowSettings(false);
  };

  return (
    <header className="relative w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/80 backdrop-blur-xl p-3.5 sm:p-4 shadow-xl shadow-slate-200/50 dark:shadow-black/40 flex flex-wrap items-center justify-between gap-4 transition-colors duration-300">
      {/* Brand & SOC Status */}
      <div className="flex items-center gap-3">
        <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 text-cyan-600 dark:text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <Shield className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
          </span>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              DPI Flow Sentinel
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                v2.4-DPI
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Deep Packet Inspection & Real-Time Flow Classification
          </p>
        </div>
      </div>

      {/* Action Controls & Telemetry Switches */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Light / Dark Mode Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-medium transition-all shadow-sm"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-cyan-600" />
              <span>Dark Mode</span>
            </>
          )}
        </button>

        {/* WebSocket Connection Status Pill */}
        <div className="relative">
          <div
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono cursor-pointer transition-all shadow-sm ${
              wsStatus === "connected"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                : wsStatus === "connecting"
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
            title="Click to configure WebSocket URL"
          >
            {wsStatus === "connected" ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                <span>WS Online</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </>
            ) : wsStatus === "connecting" ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-slate-400" />
                <span>WS Offline</span>
              </>
            )}
          </div>

          {/* WebSocket Settings Dropdown Modal */}
          {showSettings && (
            <div className="absolute right-0 top-full mt-2 z-50 w-72 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl">
              <form onSubmit={handleSaveUrl} className="space-y-2">
                <label className="text-xs font-mono text-slate-700 dark:text-slate-300 block">
                  Backend WebSocket URL:
                </label>
                <input
                  type="text"
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  placeholder="ws://localhost:8000/ws"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="px-2.5 py-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white"
                  >
                    Connect
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Demo Traffic Simulator Toggle */}
        <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0.5 shadow-sm">
          <button
            onClick={onToggleSimulating}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              isSimulating
                ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
            title="Toggle Live Simulated Packet Stream"
          >
            {isSimulating ? (
              <>
                <Pause className="w-3 h-3 fill-cyan-500 text-cyan-500" />
                <span>Sim Flow: ON</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-slate-400 text-slate-400" />
                <span>Sim Flow: OFF</span>
              </>
            )}
          </button>

          {/* Speed selector */}
          {isSimulating && (
            <div className="flex items-center pl-1 pr-1.5 space-x-1 border-l border-slate-200 dark:border-slate-800 ml-1">
              {[0.5, 1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  onClick={() => onSetSimSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    simSpeed === spd
                      ? "bg-cyan-600 dark:bg-cyan-500 text-white dark:text-slate-950 font-bold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Manual Inject Packet Button */}
        <button
          onClick={onInjectManualPacket}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-850 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 text-xs font-medium transition-colors shadow-sm"
          title="Inject single packet into pipeline"
        >
          <PlusCircle className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Inject Packet</span>
        </button>

        {/* Cyber Audio Telemetry Toggle */}
        <button
          onClick={onToggleSound}
          className={`p-2 rounded-xl border text-xs transition-colors shadow-sm ${
            soundEnabled
              ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/40"
              : "bg-slate-100 dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
          title={soundEnabled ? "Mute Packet Audio FX" : "Enable Cyber Audio FX"}
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </button>
      </div>
    </header>
  );
};
