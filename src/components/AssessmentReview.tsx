/**
 * AssessmentReview Component — Explainable AI per-question breakdown.
 *
 * Shows for each question:
 *  - MCQ: user's selection vs correct answer + why it's correct
 *  - Coding: concepts detected vs expected vs missing + AI hint
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardCheck, ChevronDown, ChevronUp, CheckCircle2,
  XCircle, Code2, HelpCircle, Lightbulb, Brain,
} from "lucide-react";
import type { AssessmentReviewItem } from "@/lib/agents/types";
import { cn } from "@/lib/utils";

interface Props {
  items: AssessmentReviewItem[];
}

const AssessmentReview = ({ items }: Props) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [open, setOpen]         = useState(true);

  const correct = items.filter(i => i.isCorrect).length;

  // Parse simple markdown **bold** and `code`
  const renderExplanation = (text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code class="bg-secondary px-1 py-0.5 rounded text-xs font-mono">$1</code>');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="glass rounded-xl border border-border/60 overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-5 hover:bg-secondary/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="font-display font-semibold text-foreground">Assessment Review</h3>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium ml-1">
            Explainable AI
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("text-sm font-semibold", correct === items.length ? "text-success" : correct > 0 ? "text-warning" : "text-destructive")}>
            {correct}/{items.length} correct
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-3 border-t border-border/40 pt-4">
              {items.map((item, idx) => (
                <motion.div
                  key={item.questionId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.07 }}
                  className={cn(
                    "rounded-xl border overflow-hidden",
                    item.isCorrect
                      ? "border-success/20 bg-success/5"
                      : "border-destructive/20 bg-destructive/5"
                  )}
                >
                  {/* Question row */}
                  <button
                    onClick={() => setExpanded(expanded === idx ? null : idx)}
                    className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-black/10 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {item.isCorrect
                        ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                        : <XCircle className="w-4 h-4 text-destructive shrink-0" />
                      }
                      {item.type === "mcq"
                        ? <HelpCircle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        : <Code2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      }
                      <span className="text-sm font-medium text-foreground truncate">{item.questionTitle}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                        item.isCorrect ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                      )}>
                        {item.isCorrect ? "Correct" : "Incorrect"}
                      </span>
                      {expanded === idx ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {expanded === idx && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-border/30"
                      >
                        <div className="px-4 py-3 space-y-3">
                          {/* Explanation */}
                          <div className="flex gap-2">
                            <Lightbulb className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                            <p
                              className="text-sm text-muted-foreground leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: renderExplanation(item.explanation) }}
                            />
                          </div>

                          {/* MCQ: show user vs correct */}
                          {item.type === "mcq" && (
                            <div className="space-y-1.5 text-xs font-mono">
                              <div className={cn("px-3 py-1.5 rounded-lg", item.isCorrect ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                                Your answer: {item.userAnswer || "(no selection)"}
                              </div>
                              {!item.isCorrect && (
                                <div className="px-3 py-1.5 rounded-lg bg-success/10 text-success">
                                  Correct: {item.correctAnswer}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Coding: concept breakdown */}
                          {item.type === "coding" && (
                            <div className="space-y-2">
                              {item.conceptsExpected && item.conceptsExpected.length > 0 && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Expected concepts:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {item.conceptsExpected.map(c => {
                                      const detected = item.conceptsDetected?.includes(c);
                                      return (
                                        <span key={c} className={cn("text-xs px-2 py-0.5 rounded-full font-mono",
                                          detected ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive/80"
                                        )}>
                                          {detected ? "✓ " : "✗ "}{c}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              {item.userAnswer && item.userAnswer !== "(no attempt)" && (
                                <details className="text-xs">
                                  <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                                    Show your code snippet
                                  </summary>
                                  <pre className="mt-1.5 bg-secondary/50 rounded p-2 overflow-x-auto font-mono text-foreground/80 max-h-32 whitespace-pre-wrap break-all">
                                    {item.userAnswer}
                                  </pre>
                                </details>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}

              {/* Summary footer */}
              <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>{correct} of {items.length} questions answered correctly — score: {Math.round((correct / items.length) * 100)}%</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AssessmentReview;
