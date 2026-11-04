"use client";

import React, { useState } from "react";
import { useDpiStream } from "../hooks/useDpiStream";
import { StageId } from "../types/dpi";
import { Activity, ShieldCheck, Terminal, Cpu } from "lucide-react";

export default function Home() {
  

  const [selectedStageFilter, setSelectedStageFilter] = useState<StageId | "all">("all");

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col gap-6 max-w-7xl mx-auto selection:bg-cyan-500/30 selection:text-cyan-200">
      <h1>DPI SYSTEM</h1>

      
    </main>
  );
}
