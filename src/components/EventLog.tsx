import { motion } from "framer-motion";
import { Activity, Clock } from "lucide-react";
import type { AgentEvent } from "@/lib/agents";
import { cn } from "@/lib/utils";

const agentColors: Record<string, string> = {
  Orchestrator: "text-primary",
  ProfileAgent: "text-success",
  AssessmentAgent: "text-warning",
  RecommendationAgent: "text-accent",
  TrackerAgent: "text-muted-foreground",
  EngagementAgent: "text-destructive",
};

const EventLog = ({ events }: { events: AgentEvent[] }) => {
  if (!events.length) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl overflow-hidden">
      <div className="p-5 border-b border-border/50">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Agent Event Log
        </h3>
        <p className="text-xs text-muted-foreground mt-1">{events.length} events recorded</p>
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-border/20">
        {events.map((evt) => (
          <div key={evt.id} className="px-5 py-2.5 flex items-start gap-3 text-xs hover:bg-secondary/20 transition-colors">
            <Clock className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className={cn("font-mono font-medium", agentColors[evt.from] || "text-foreground")}>
                {evt.from}
              </span>
              <span className="text-muted-foreground"> → </span>
              <span className={cn("font-mono font-medium", agentColors[evt.to] || "text-foreground")}>
                {evt.to}
              </span>
              <span className="text-muted-foreground ml-2 font-mono">{evt.type}</span>
            </div>
            <span className="text-muted-foreground font-mono shrink-0">
              {new Date(evt.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default EventLog;
