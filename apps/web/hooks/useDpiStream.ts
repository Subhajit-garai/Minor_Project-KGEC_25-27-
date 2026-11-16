"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  PacketMessage,
  PacketStatus,
  StageId,
  InFlightPacket,
  PipelineStats,
} from "../types/dpi";
import { soundEffects } from "../lib/audio";
import { getNextLogicalStage } from "../lib/pipelineConfig";

const MAX_PACKET_BUFFER = 400;
const MAX_CONCURRENT_ANIMATIONS = 24;

export function useDpiStream() {
  const [packets, setPackets] = useState<PacketMessage[]>([]);
  const [inFlightPackets, setInFlightPackets] = useState<InFlightPacket[]>([]);
  const [wsStatus, setWsStatus] = useState<
    "connected" | "connecting" | "disconnected"
  >("disconnected");
  const [wsUrl, setWsUrl] = useState<string>("ws://localhost:8000/ws");
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false); // Default to active simulation for immediate interactivity
  const [simSpeed, setSimSpeed] = useState<number>(1); // 0.5x, 1x, 2x, 4x
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [activeNodePulses, setActiveNodePulses] = useState<
    Record<StageId, boolean>
  >({
    internet: false,
    captured: false,
    processing: false,
    processed: false,
    decisioning: false,
    accepted: false,
    rejected: false,
    error: false,
  });

  const [stats, setStats] = useState<PipelineStats>({
    totalCaptured: 0,
    currentlyProcessing: 0,
    successfullyProcessed: 0,
    acceptedPackets: 0,
    rejectedPackets: 0,
    packetProcessingRate: 0,
    totalBytes: 0,
    threatRatio: 0,
    stageCounts: {
      internet: 0,
      captured: 0,
      processing: 0,
      processed: 0,
      decisioning: 0,
      accepted: 0,
      rejected: 0,
      error: 0,
    },
  });

  // Refs for state accessible inside high-frequency listeners
  const wsRef = useRef<WebSocket | null>(null);
  const packetHistoryMap = useRef<
    Map<string, { lastStage: StageId; packet: PacketMessage }>
  >(new Map());
  const packetTimestamps = useRef<number[]>([]);
  const pulseTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;

  // Trigger pulse animation on a node
  const pulseNode = useCallback((stage: StageId) => {
    setActiveNodePulses((prev) => ({ ...prev, [stage]: true }));
    soundEffects.playPacketTick(stage);

    if (pulseTimeouts.current[stage]) {
      clearTimeout(pulseTimeouts.current[stage]);
    }
    pulseTimeouts.current[stage] = setTimeout(() => {
      setActiveNodePulses((prev) => ({ ...prev, [stage]: false }));
    }, 600);
  }, []);

  // Update in-flight packet removal on animation arrival
  const handlePacketArrived = useCallback(
    (inFlightId: string, toStage: StageId) => {
      setInFlightPackets((prev) => prev.filter((p) => p.id !== inFlightId));
      pulseNode(toStage);
    },
    [pulseNode],
  );

  // Unified Packet Dispatcher: Handles actual incoming packet status updates
  const dispatchPacketEvent = useCallback(
    (incoming: PacketMessage) => {
      if (isPausedRef.current) return;

      const pktId =
        incoming.id || `pkt-${Math.random().toString(36).substring(2, 9)}`;
      const normalizedStatus: StageId =
        incoming.status === ("dicisioning" as any)
          ? "decisioning"
          : incoming.status;

      const tracked = packetHistoryMap.current.get(pktId);
      const lastStage = tracked ? tracked.lastStage : null;

      // Prevent duplicate animations for identical repeat events
      if (lastStage === normalizedStatus) {
        return;
      }

      // Determine the source stage for the transition
      let fromStage: StageId = "internet";
      if (lastStage) {
        fromStage = lastStage;
      } else {
        // First time seeing this packet
        if (normalizedStatus === "captured") fromStage = "internet";
        else if (normalizedStatus === "processing") fromStage = "captured";
        else if (normalizedStatus === "processed") fromStage = "processing";
        else if (normalizedStatus === "decisioning") fromStage = "processed";
        else if (
          normalizedStatus === "accepted" ||
          normalizedStatus === "rejected"
        )
          fromStage = "decisioning";
      }

      // Record rate timestamp
      const now = Date.now();
      packetTimestamps.current.push(now);
      // Keep timestamps from the last 3 seconds
      const threeSecsAgo = now - 3000;
      packetTimestamps.current = packetTimestamps.current.filter(
        (t) => t > threeSecsAgo,
      );
      const calculatedPps =
        Math.round((packetTimestamps.current.length / 3) * 10) / 10;

      // Track full packet with history
      const existingPacket = tracked ? tracked.packet : null;
      const historyEntry = {
        stage: normalizedStatus,
        timestamp: incoming.timestamp || new Date().toISOString(),
        note: incoming.prediction
          ? `Classification: ${incoming.prediction}`
          : undefined,
      };

      const updatedPacket: PacketMessage = {
        ...(existingPacket || incoming),
        ...incoming,
        id: pktId,
        status: normalizedStatus,
        history: existingPacket?.history
          ? [...existingPacket.history, historyEntry]
          : [historyEntry],
      };

      packetHistoryMap.current.set(pktId, {
        lastStage: normalizedStatus,
        packet: updatedPacket,
      });

      // Update table packets buffer
      setPackets((prev) => {
        const idx = prev.findIndex((p) => p.id === pktId);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updatedPacket;
          return copy;
        } else {
          return [updatedPacket, ...prev.slice(0, MAX_PACKET_BUFFER - 1)];
        }
      });

      // Create in-flight animation if fromStage != toStage
      if (fromStage !== normalizedStatus) {
        const isThreat =
          normalizedStatus === "rejected" ||
          Boolean(
            updatedPacket.prediction &&
            /malicious|attack|dos|probe|exploit/i.test(
              updatedPacket.prediction,
            ),
          );

        const inFlightItem: InFlightPacket = {
          id: `anim-${pktId}-${fromStage}-${normalizedStatus}-${now}`,
          packetId: pktId,
          protocol: updatedPacket.protocol || "TCP",
          src_ip: updatedPacket.src_ip || "192.168.1.1",
          src_port: updatedPacket.src_port,
          dst_ip: updatedPacket.dst_ip,
          dst_port: updatedPacket.dst_port,
          size: updatedPacket.size || 1024,
          fromStage,
          toStage: normalizedStatus,
          status: normalizedStatus,
          startTime: now,
          durationMs: Math.max(550, Math.floor(1050 / (simSpeed || 1))),
          isMalicious: isThreat,
        };

        setInFlightPackets((prev) => {
          // Drop oldest if exceeding max concurrent to protect rendering
          const filtered =
            prev.length >= MAX_CONCURRENT_ANIMATIONS
              ? prev.slice(prev.length - MAX_CONCURRENT_ANIMATIONS + 1)
              : prev;
          return [...filtered, inFlightItem];
        });
      } else {
        pulseNode(normalizedStatus);
      }

      // Update aggregate statistics
      setStats((prev) => {
        const isNewPacket = !lastStage;
        const newTotal = isNewPacket
          ? prev.totalCaptured + 1
          : prev.totalCaptured;
        const newBytes = prev.totalBytes + (incoming.size || 0);

        let currentlyProc = prev.currentlyProcessing;
        if (normalizedStatus === "processing") currentlyProc += 1;
        if (
          normalizedStatus === "accepted" ||
          normalizedStatus === "rejected" ||
          normalizedStatus === "error"
        ) {
          currentlyProc = Math.max(0, currentlyProc - 1);
        }

        const succProcessed =
          normalizedStatus === "processed" || normalizedStatus === "decisioning"
            ? prev.successfullyProcessed + 1
            : prev.successfullyProcessed;

        const accCount =
          normalizedStatus === "accepted"
            ? prev.acceptedPackets + 1
            : prev.acceptedPackets;
        const rejCount =
          normalizedStatus === "rejected"
            ? prev.rejectedPackets + 1
            : prev.rejectedPackets;
        const totalDecided = accCount + rejCount;
        const threatRatio =
          totalDecided > 0
            ? Math.round((rejCount / totalDecided) * 1000) / 10
            : 0;

        const stageCounts = { ...prev.stageCounts };
        if (isNewPacket) {
          stageCounts.internet = (stageCounts.internet || 0) + 1;
        }
        stageCounts[normalizedStatus] = (stageCounts[normalizedStatus] || 0) + 1;

        return {
          totalCaptured: newTotal,
          currentlyProcessing: currentlyProc,
          successfullyProcessed: succProcessed,
          acceptedPackets: accCount,
          rejectedPackets: rejCount,
          packetProcessingRate: calculatedPps,
          totalBytes: newBytes,
          threatRatio,
          stageCounts,
        };
      });
    },
    [pulseNode],
  );

  // Setup Real WebSocket Connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    function connect() {
      try {
        setWsStatus("connecting");
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsStatus("connected");
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "batch" && Array.isArray(data.packets)) {
              data.packets.forEach(dispatchPacketEvent);
            } else if (data.status) {
              dispatchPacketEvent(data);
            }
          } catch {
            // Non-JSON payload ignore
          }
        };

        ws.onerror = () => {
          setWsStatus("disconnected");
        };

        ws.onclose = () => {
          setWsStatus("disconnected");
          // Reconnect with backoff
          reconnectTimeout = setTimeout(connect, 4000);
        };
      } catch {
        setWsStatus("disconnected");
      }
    }

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, [wsUrl, dispatchPacketEvent]);

  // Traffic Simulation Engine: Runs lifecycle Internet -> Captured -> Processing -> Processed -> Decisioning -> Accepted/Rejected
  useEffect(() => {
    if (!isSimulating) return;

    const sampleIps = [
      "192.168.1.104",
      "192.168.1.45",
      "10.0.8.21",
      "172.16.0.88",
      "142.250.190.46",
      "1.1.1.1",
      "8.8.8.8",
      "45.33.32.156",
      "185.220.101.5",
    ];
    const sampleProtocols = ["TCP", "UDP", "TLS", "DNS", "HTTP", "ICMP"];
    const attackTypes = [
      "DDoS SYN Flood",
      "PortScan Probe",
      "SSH BruteForce",
      "SQLi Injection",
      "Botnet C2",
    ];

    let count = 1000;
    const intervalTime = Math.max(250, Math.floor(1200 / simSpeed));

    const interval = setInterval(() => {
      if (isPausedRef.current) return;

      count += 1;
      const pktId = `PKT-${count}`;
      const src = sampleIps[Math.floor(Math.random() * sampleIps.length)];
      const dst = sampleIps[Math.floor(Math.random() * sampleIps.length)];
      const protocol =
        sampleProtocols[Math.floor(Math.random() * sampleProtocols.length)];
      const size = Math.floor(Math.random() * 1400) + 64;
      const isMalicious = Math.random() < 0.18; // 18% malicious
      const predictionLabel = isMalicious
        ? attackTypes[Math.floor(Math.random() * attackTypes.length)]
        : "Benign Traffic";
      const confidence = isMalicious
        ? 0.88 + Math.random() * 0.11
        : 0.94 + Math.random() * 0.05;

      const basePacket: PacketMessage = {
        id: pktId,
        status: "captured",
        src_ip: src,
        src_port: Math.floor(Math.random() * 60000) + 1024,
        dst_ip: dst,
        dst_port: protocol === "DNS" ? 53 : protocol === "HTTP" ? 80 : 443,
        protocol,
        size,
        type: "packet",
        timestamp: new Date().toISOString(),
        prediction: predictionLabel,
        confidence: Math.round(confidence * 100) / 100,
        flow_key: `${src}:${protocol}:${dst}`,
        features: {
          duration: Math.round(Math.random() * 50) / 10,
          total_fwd_packets: Math.floor(Math.random() * 12) + 1,
          total_bwd_packets: Math.floor(Math.random() * 8),
          fwd_packet_length_mean: size,
          flow_bytes_s: Math.round(size * 1000 * Math.random()),
          flow_packets_s: Math.round(Math.random() * 45),
          flags: ["SYN", "ACK"],
          ttl: 64,
          window_size: 65535,
        },
      };

      // 1. Stage: Captured
      dispatchPacketEvent({ ...basePacket, status: "captured" });

      // 2. Stage: Processing (after delay)
      const stepDelay = Math.floor(1100 / simSpeed);
      setTimeout(() => {
        dispatchPacketEvent({ ...basePacket, status: "processing" });
      }, stepDelay);

      // 3. Stage: Processed
      setTimeout(() => {
        dispatchPacketEvent({ ...basePacket, status: "processed" });
      }, stepDelay * 2);

      // 4. Stage: Decisioning
      setTimeout(() => {
        dispatchPacketEvent({ ...basePacket, status: "decisioning" });
      }, stepDelay * 3);

      // 5. Stage: Verdict (Accepted or Rejected)
      setTimeout(() => {
        dispatchPacketEvent({
          ...basePacket,
          status: isMalicious ? "rejected" : "accepted",
        });
      }, stepDelay * 4);
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isSimulating, simSpeed, dispatchPacketEvent]);

  // Controls
  const toggleSound = useCallback(() => {
    const next = soundEffects.toggle();
    setSoundEnabled(next);
  }, []);

  const clearPackets = useCallback(() => {
    setPackets([]);
    setInFlightPackets([]);
    packetHistoryMap.current.clear();
    setStats({
      totalCaptured: 0,
      currentlyProcessing: 0,
      successfullyProcessed: 0,
      acceptedPackets: 0,
      rejectedPackets: 0,
      packetProcessingRate: 0,
      totalBytes: 0,
      threatRatio: 0,
      stageCounts: {
        internet: 0,
        captured: 0,
        processing: 0,
        processed: 0,
        decisioning: 0,
        accepted: 0,
        rejected: 0,
        error: 0,
      },
    });
  }, []);

  const sendManualPacket = useCallback(() => {
    const id = `MANUAL-${Math.floor(Math.random() * 9000) + 1000}`;
    const isMalicious = Math.random() > 0.6;
    const packet: PacketMessage = {
      id,
      status: "captured",
      src_ip: "10.10.50.25",
      src_port: 48992,
      dst_ip: "192.168.1.1",
      dst_port: 8080,
      protocol: "TCP",
      size: 1460,
      type: "manual",
      timestamp: new Date().toISOString(),
      prediction: isMalicious ? "Anomalous Probe" : "Benign Traffic",
      confidence: 0.96,
    };

    dispatchPacketEvent(packet);
    setTimeout(
      () => dispatchPacketEvent({ ...packet, status: "processing" }),
      700,
    );
    setTimeout(
      () => dispatchPacketEvent({ ...packet, status: "processed" }),
      1400,
    );
    setTimeout(
      () => dispatchPacketEvent({ ...packet, status: "decisioning" }),
      2100,
    );
    setTimeout(() => {
      dispatchPacketEvent({
        ...packet,
        status: isMalicious ? "rejected" : "accepted",
      });
    }, 2800);
  }, [dispatchPacketEvent]);

  return {
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
  };
}
