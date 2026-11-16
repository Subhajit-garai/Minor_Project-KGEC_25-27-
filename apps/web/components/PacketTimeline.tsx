"use client";

import React from "react";
import { PacketMessage, StageId } from "../types/dpi";
import { PIPELINE_NODES } from "../lib/pipelineConfig";
import { Check, Clock, AlertTriangle, ShieldCheck } from "lucide-react";

interface Props {
  packet: PacketMessage;
}

const ORDERED_STAGES: StageId[] = [
  "internet",
  "captured",
  "processing",
  "processed",
  "decisioning",
];

export const PacketTimeline: React.FC<Props> = ({ packet }) => {
  const currentStage = packet.status;
  const isMalicious =
    currentStage === "rejected" ||
    Boolean(packet.prediction && /malicious|attack|dos|probe|exploit/i.test(packet.prediction));

  const targetFinalStage: StageId = isMalicious ? "rejected" : "accepted";
  const stagesToDisplay = [...ORDERED_STAGES, targetFinalStage];

  const getStageState = (stage: StageId) => {
    if (stage === currentStage) return "current";

    const currentIdx = stagesToDisplay.indexOf(currentStage);
    const stageIdx = stagesToDisplay.indexOf(stage);

    if (currentIdx === -1) {
      // If current is accepted or rejected, earlier stages are completed
      if (currentStage === "accepted" || currentStage === "rejected") {
        return "completed";
      }
      return "pending";
    }

    if (stageIdx < currentIdx) return "completed";
    return "pending";
  };

  return (
    <div className="w-full py-2">
      <div className="flex flex-col space-y-3">
        {stagesToDisplay.map((stage, idx) => {
          const meta = PIPELINE_NODES[stage];
          const state = getStageState(stage);
          const isLast = idx === stagesToDisplay.length - 1;

          // Check if we have history entry for this stage
          const historyEntry = packet.history?.find((h) => h.stage === stage);

          return (
            <div key={stage} className="relative flex items-start gap-3">
              {/* Vertical connector line */}
              {!isLast && (
                <div
                  className={`absolute left-[13px] top-[26px] bottom-[-14px] w-0.5 ${
                    state === "completed"
                      ? "bg-cyan-500/50"
                      : "bg-slate-200 dark:bg-slate-800"
                  }`}
                />
              )}

              {/* Status Circle Icon */}
              <div
                className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-mono font-bold transition-all duration-300 ${
                  state === "completed"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:border-emerald-500/80 dark:bg-emerald-500/20 dark:text-emerald-300 shadow-sm"
                    : state === "current"
                    ? "border-cyan-500 bg-cyan-50 text-cyan-600 dark:border-cyan-400 dark:bg-cyan-500/30 dark:text-white animate-pulse shadow-sm"
                    : "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600"
                }`}
              >
                {state === "completed" ? (
                  <Check className="w-3.5 h-3.5" />
                ) : state === "current" ? (
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              {/* Stage Content */}
              <div className="flex-1 pb-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-medium ${
                      state === "current"
                        ? "text-cyan-700 dark:text-cyan-300 font-semibold"
                        : state === "completed"
                        ? "text-slate-800 dark:text-slate-200"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {meta.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    {historyEntry?.timestamp
                      ? new Date(historyEntry.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          fractionalSecondDigits: 3,
                        })
                      : state === "completed" || state === "current"
                      ? "In Progress"
                      : "Pending"}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {historyEntry?.note || meta.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
