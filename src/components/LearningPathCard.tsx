/**
 * LearningPathCard — Module cards with tick-to-complete tracking.
 *
 * ADDED:
 *  - Checkbox on each module card to mark as "seen/done"
 *  - Completion state persisted in localStorage per user session
 *  - Emits onCompletionChange so LearningPage can show progress bar
 */

import { motion } from "framer-motion";
import { Clock, BookOpen, ArrowRight, Flame, Compass, ExternalLink, CheckCircle2 } from "lucide-react";
import type { LearningModule } from "@/lib/agents";
import { usePlatformStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const priorityStyles = {
  high:   "border-primary/30 bg-primary/5",
  medium: "border-accent/20 bg-accent/5",
  low:    "border-border",
};

const difficultyColors = {
  beginner:     "text-success bg-success/10",
  intermediate: "text-warning bg-warning/10",
  advanced:     "text-destructive bg-destructive/10",
};

const resourceMap: Record<string, { label: string; url: string; color: string }[]> = {
  "Advanced Data Structures": [
    { label: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/data-structures/",       color: "text-emerald-400" },
    { label: "LeetCode",       url: "https://leetcode.com/tag/tree/",                       color: "text-amber-400" },
  ],
  "Async JavaScript Mastery": [
    { label: "MDN Web Docs",   url: "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous", color: "text-blue-400" },
    { label: "javascript.info",url: "https://javascript.info/async",                        color: "text-yellow-400" },
  ],
  "Algorithm Design Patterns": [
    { label: "LeetCode",       url: "https://leetcode.com/discuss/study-guide/1688903/",   color: "text-amber-400" },
    { label: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/dynamic-programming/",   color: "text-emerald-400" },
  ],
  "System Design Fundamentals": [
    { label: "System Design Primer", url: "https://github.com/donnemartin/system-design-primer", color: "text-purple-400" },
    { label: "Educative.io",  url: "https://www.educative.io/courses/grokking-the-system-design-interview", color: "text-pink-400" },
  ],
  "Clean Code & Best Practices": [
    { label: "refactoring.guru",    url: "https://refactoring.guru/",                          color: "text-cyan-400" },
    { label: "Clean Code Guide",    url: "https://github.com/ryanmcdermott/clean-code-javascript", color: "text-green-400" },
  ],
  "JavaScript Fundamentals Bootcamp": [
    { label: "javascript.info", url: "https://javascript.info/",                            color: "text-yellow-400" },
    { label: "freeCodeCamp",    url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/", color: "text-blue-400" },
  ],
};

const defaultResources = [
  { label: "GeeksforGeeks", url: "https://www.geeksforgeeks.org/", color: "text-emerald-400" },
  { label: "LeetCode",       url: "https://leetcode.com/",          color: "text-amber-400" },
];

interface Props {
  modules: LearningModule[];
  checked: Record<string, boolean>;
  onToggle: (id: string) => void;
}

const LearningPathCard = ({ modules, checked, onToggle }: Props) => {
  const { profile } = usePlatformStore();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-foreground">Your Learning Path</h3>
        </div>
        {profile && (
          <span className="text-xs font-medium px-3 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" />
            {profile.level.charAt(0).toUpperCase() + profile.level.slice(1)} Path
          </span>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {modules.map((mod, i) => {
          const resources = resourceMap[mod.title] || defaultResources;
          const isDone    = !!checked[mod.id];
          return (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "glass rounded-xl p-5 border transition-all hover:shadow-glow group relative",
                priorityStyles[mod.priority],
                isDone && "opacity-70 border-success/30 bg-success/5"
              )}
            >
              {/* Tick checkbox — top right */}
              <button
                onClick={() => onToggle(mod.id)}
                title={isDone ? "Mark as incomplete" : "Mark as complete"}
                className={cn(
                  "absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 z-10",
                  isDone
                    ? "border-success bg-success text-white shadow-md"
                    : "border-muted-foreground/30 hover:border-success hover:bg-success/10"
                )}
              >
                {isDone && <CheckCircle2 className="w-4 h-4" />}
              </button>

              <div className="flex items-start justify-between mb-3 pr-8">
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", difficultyColors[mod.difficulty])}>
                  {mod.difficulty}
                </span>
                {mod.priority === "high" && !isDone && <Flame className="w-4 h-4 text-primary animate-pulse" />}
              </div>
              <h4 className={cn("font-display font-semibold text-foreground mb-2", isDone && "line-through opacity-60")}>
                {mod.title}
              </h4>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{mod.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {mod.topics.map((t) => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{t}</span>
                ))}
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {mod.estimatedTime}
                </span>
                <span className="text-xs text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Explore <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <div className="border-t border-border/40 pt-3 flex flex-wrap gap-x-4 gap-y-1">
                {resources.map((r) => (
                  <a
                    key={r.label}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn("text-xs flex items-center gap-1 hover:underline transition-opacity hover:opacity-80", r.color)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" /> {r.label}
                  </a>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default LearningPathCard;
