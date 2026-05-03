import { motion } from "framer-motion";
import { Check, Circle } from "lucide-react";
import type { ProgressStep } from "@/lib/agents";
import { cn } from "@/lib/utils";

const ProgressTracker = ({ steps }: { steps: ProgressStep[] }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass rounded-xl p-6"
    >
      <h3 className="font-display font-semibold text-foreground mb-5">Progress</h3>
      <div className="space-y-1">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500",
                  step.completed
                    ? "gradient-primary shadow-glow"
                    : "bg-secondary border border-border"
                )}
              >
                {step.completed ? (
                  <Check className="w-4 h-4 text-primary-foreground" />
                ) : (
                  <Circle className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 h-6 transition-colors duration-500",
                    step.completed ? "bg-primary/50" : "bg-border"
                  )}
                />
              )}
            </div>
            <div className="pb-6 last:pb-0">
              <p className={cn("text-sm font-medium", step.completed ? "text-foreground" : "text-muted-foreground")}>
                {step.label}
              </p>
              {step.timestamp && (
                <p className="text-xs text-primary mt-0.5">{step.timestamp}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default ProgressTracker;
