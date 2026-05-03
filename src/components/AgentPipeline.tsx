/**
 * AgentPipeline — Visual representation of the multi-agent execution flow.
 *
 * PROBLEM IT SOLVES:
 *   Previously agents ran internally with no visibility. Users couldn't see
 *   WHICH agent was running or HOW data flowed through the pipeline.
 *   This component makes the invisible visible — critical for demos and trust.
 *
 * HOW IT CONNECTS:
 *   Receives `activeAgent` (index of currently executing agent) and `completed`
 *   (whether the pipeline finished) from the parent component to animate
 *   each step in sequence.
 */

import { motion } from "framer-motion";
import { User, Code2, BookOpen, BarChart3, Trophy, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const agents = [
  { id: "profile", label: "Profile Agent", icon: User, desc: "Building user profile" },
  { id: "assessment", label: "Assessment Agent", icon: Code2, desc: "Evaluating code quality" },
  { id: "recommendation", label: "Recommendation Agent", icon: BookOpen, desc: "Generating learning path" },
  { id: "tracker", label: "Tracker Agent", icon: BarChart3, desc: "Tracking progress" },
  { id: "engagement", label: "Engagement Agent", icon: Trophy, desc: "Updating leaderboard" },
];

interface AgentPipelineProps {
  /** Index of the agent currently executing (-1 = not started) */
  activeAgent: number;
  /** Whether the full pipeline has completed */
  completed: boolean;
}

const AgentPipeline = ({ activeAgent, completed }: AgentPipelineProps) => {
  return (
    <div className="glass rounded-xl p-6 glow-border">
      <h3 className="font-display font-semibold text-foreground mb-1 text-sm">
        Agent Execution Pipeline
      </h3>
      <p className="text-xs text-muted-foreground mb-5">
        {completed ? "All agents completed successfully" : activeAgent >= 0 ? "Processing..." : "Waiting to start"}
      </p>

      <div className="flex items-center justify-between gap-1">
        {agents.map((agent, i) => {
          const isActive = activeAgent === i;
          const isDone = completed || activeAgent > i;
          const isPending = activeAgent < i && !completed;

          return (
            <div key={agent.id} className="flex items-center flex-1 min-w-0">
              {/* Agent node */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{
                  scale: isActive ? 1.1 : 1,
                  opacity: isPending ? 0.4 : 1,
                }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 min-w-0",
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
                    isDone && "gradient-primary shadow-glow",
                    isActive && "bg-primary/20 border-2 border-primary animate-pulse",
                    isPending && "bg-secondary border border-border",
                  )}
                >
                  {isDone ? (
                    <Check className="w-4 h-4 text-primary-foreground" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : (
                    <agent.icon className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium text-center truncate w-full",
                    isDone ? "text-primary" : isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {agent.label.replace(" Agent", "")}
                </span>
                {isActive && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[9px] text-primary/70 text-center"
                  >
                    {agent.desc}
                  </motion.span>
                )}
              </motion.div>

              {/* Connector line */}
              {i < agents.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 mt-[-18px]">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      activeAgent > i || completed ? "bg-primary/60" : "bg-border",
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AgentPipeline;
