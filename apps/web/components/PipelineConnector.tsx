"use client";

import React from "react";
import { InFlightPacket, StageId } from "../types/dpi";
import { AnimatedPacket } from "./AnimatedPacket";
import { PIPELINE_NODES } from "../lib/pipelineConfig";

interface LinearProps {
  fromStage: StageId;
  toStage: StageId;
  inFlightPackets: InFlightPacket[];
  onPacketArrived: (id: string, toStage: StageId) => void;
}

export const LinearConnector: React.FC<LinearProps> = ({
  fromStage,
  toStage,
  inFlightPackets,
  onPacketArrived,
}) => {
  const destMeta = PIPELINE_NODES[toStage] || PIPELINE_NODES.captured;
  // Match packets currently traversing this segment
  const activeOnSegment = inFlightPackets.filter(
    (p) => p.fromStage === fromStage && p.toStage === toStage
  );

  return (
    <div className="relative flex items-center justify-center w-32 md:w-44 lg:w-52 h-[190px] shrink-0">
      {/* SVG Connecting Track */}
      <svg
        className="w-full h-8 overflow-visible text-slate-200 dark:text-slate-800"
        viewBox="0 0 160 32"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id={`grad-${fromStage}-${toStage}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.4" />
            <stop offset="100%" stopColor={destMeta.color} stopOpacity="0.9" />
          </linearGradient>

          <marker
            id={`arrow-${toStage}`}
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 8 5 L 0 9 z" fill={destMeta.color} />
          </marker>
        </defs>

        {/* Base Track */}
        <line
          x1="2"
          y1="16"
          x2="158"
          y2="16"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Animated Cyber Dash Pulse */}
        <line
          x1="2"
          y1="16"
          x2="150"
          y2="16"
          stroke={`url(#grad-${fromStage}-${toStage})`}
          strokeWidth="2.5"
          strokeDasharray="8 8"
          strokeLinecap="round"
          markerEnd={`url(#arrow-${toStage})`}
          className="animate-flow-dash"
        />
      </svg>

      {/* Render In-Flight Packets moving across this segment */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 pointer-events-none overflow-visible">
        {activeOnSegment.map((pkt) => (
          <AnimatedPacket
            key={pkt.id}
            packet={pkt}
            onArrived={onPacketArrived}
          />
        ))}
      </div>
    </div>
  );
};

interface ForkProps {
  fromStage: StageId; // "decisioning"
  inFlightPackets: InFlightPacket[];
  onPacketArrived: (id: string, toStage: StageId) => void;
}

export const ForkConnector: React.FC<ForkProps> = ({
  fromStage,
  inFlightPackets,
  onPacketArrived,
}) => {
  const acceptedPackets = inFlightPackets.filter(
    (p) => p.fromStage === fromStage && p.toStage === "accepted"
  );
  const rejectedPackets = inFlightPackets.filter(
    (p) => p.fromStage === fromStage && p.toStage === "rejected"
  );

  return (
    <div className="relative flex items-center justify-center w-36 md:w-48 lg:w-56 h-[190px] shrink-0">
      {/* SVG Bifurcated Branching Paths */}
      <svg
        className="w-full h-full overflow-visible text-slate-200 dark:text-slate-800"
        viewBox="0 0 160 190"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="grad-accepted" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="grad-rejected" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.95" />
          </linearGradient>

          <marker
            id="arrow-accepted"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 1 L 8 5 L 0 9 z" fill="#22C55E" />
          </marker>

          <marker
            id="arrow-rejected"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 1 L 8 5 L 0 9 z" fill="#EF4444" />
          </marker>
        </defs>

        {/* Base Track to Accepted (center 95px -> top 45px) */}
        <path
          d="M 4 95 C 75 95, 85 45, 154 45"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
        />
        {/* Animated Cyber Path to Accepted */}
        <path
          d="M 4 95 C 75 95, 85 45, 146 45"
          fill="none"
          stroke="url(#grad-accepted)"
          strokeWidth="2.5"
          strokeDasharray="8 8"
          strokeLinecap="round"
          markerEnd="url(#arrow-accepted)"
          className="animate-flow-dash"
        />

        {/* Base Track to Rejected (center 95px -> bottom 145px) */}
        <path
          d="M 4 95 C 75 95, 85 145, 154 145"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
        />
        {/* Animated Cyber Path to Rejected */}
        <path
          d="M 4 95 C 75 95, 85 145, 146 145"
          fill="none"
          stroke="url(#grad-rejected)"
          strokeWidth="2.5"
          strokeDasharray="8 8"
          strokeLinecap="round"
          markerEnd="url(#arrow-rejected)"
          className="animate-flow-dash"
        />
      </svg>

      {/* Trajectories for In-Flight Packets centered at middle line */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 pointer-events-none">
        {/* Accepted Upper Branch */}
        {acceptedPackets.map((pkt) => (
          <AnimatedPacket
            key={pkt.id}
            packet={pkt}
            onArrived={onPacketArrived}
            isForkUp={true}
          />
        ))}

        {/* Rejected Lower Branch */}
        {rejectedPackets.map((pkt) => (
          <AnimatedPacket
            key={pkt.id}
            packet={pkt}
            onArrived={onPacketArrived}
            isForkDown={true}
          />
        ))}
      </div>
    </div>
  );
};
