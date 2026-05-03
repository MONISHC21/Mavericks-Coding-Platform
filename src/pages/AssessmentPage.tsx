/**
 * Assessment Page — Mixed MCQ + Coding assessment.
 *
 * KEY CHANGES:
 *  - Renders MCQ questions with clickable options (radio-style)
 *  - Renders Coding questions with in-browser code editor + Run button
 *  - Passes mcqSelections map to evaluate() for binary scoring
 *  - Shows per-question type badge (MCQ / Code)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code2,
  ChevronRight,
  ChevronLeft,
  Send,
  Timer,
  AlertCircle,
  Play,
  Terminal,
  X,
  Lightbulb,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AgentPipeline from "@/components/AgentPipeline";
import { assessmentAgent } from "@/lib/agents";
import { usePlatformStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const difficultyBadge = {
  easy:   "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  medium: "text-amber-400  bg-amber-400/10  border-amber-400/20",
  hard:   "text-red-400    bg-red-400/10    border-red-400/20",
};

const AGENT_COUNT = 5;
const AGENT_DELAY = 700;

// ── In-Browser Code Execution ──────────────────────────────────────────────
interface ExecutionResult {
  output: string[];
  error: string | null;
  errorType: "syntax" | "runtime" | null;
  suggestion: string | null;
  success: boolean;
}

function runCode(code: string): ExecutionResult {
  const outputs: string[] = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  const captureLog = (...args: unknown[]) => {
    outputs.push(
      args.map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a))).join(" ")
    );
  };
  console.log = captureLog;
  console.warn = (...args) => captureLog("⚠️", ...args);
  console.error = (...args) => captureLog("🔴", ...args);

  try {
    // eslint-disable-next-line no-new-func
    new Function(code)();
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
    return { output: outputs, error: null, errorType: null, suggestion: null, success: true };
  } catch (err: unknown) {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
    const e = err as Error;
    const msg = e.message || String(e);
    const isSyntax = e instanceof SyntaxError;
    const isRef    = e instanceof ReferenceError;
    const isType   = e instanceof TypeError;
    let suggestion: string | null = null;
    if (isSyntax) suggestion = "Check for missing brackets, parentheses, or semicolons.";
    else if (isRef) suggestion = `'${msg.split(" ")[0]}' is not defined. Did you declare it?`;
    else if (isType) suggestion = "Type mismatch — check that you're calling methods on the right types.";
    else suggestion = "Review your logic carefully — the error may be inside a loop or conditional.";
    return {
      output: outputs,
      error: `${e.name}: ${msg}`,
      errorType: isSyntax ? "syntax" : "runtime",
      suggestion,
      success: false,
    };
  }
}

// ── Component ───────────────────────────────────────────────────────────────
const AssessmentPage = () => {
  const navigate      = useNavigate();
  const [searchParams] = useSearchParams();
  const isRetry       = searchParams.get("retry") === "true";
  const { profile, submitAssessment, retryAssessment } = usePlatformStore();

  const questions = assessmentAgent.getQuestions();

  const [current,    setCurrent]    = useState(0);
  const [answers,    setAnswers]    = useState<string[]>(
    questions.map((q) => q.type === "coding" ? (q.starterCode || "") : "")
  );
  // MCQ selections: questionId → chosen option string
  const [mcqSelections, setMcqSelections] = useState<Record<number, string>>({});
  const [submitting,     setSubmitting]    = useState(false);
  const [activeAgent,    setActiveAgent]   = useState(-1);
  const [pipelineCompleted, setPipelineCompleted] = useState(false);

  // Execution state (coding questions only)
  const [execResult, setExecResult] = useState<ExecutionResult | null>(null);
  const [isRunning,  setIsRunning]  = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile) navigate("/profile-setup");
  }, [profile, navigate]);

  useEffect(() => {
    setExecResult(null);
  }, [current]);

  const q = questions[current];

  const handleRun = useCallback(() => {
    if (!answers[current]?.trim() || q?.type !== "coding") return;
    setIsRunning(true);
    setExecResult(null);
    setTimeout(() => {
      const result = runCode(answers[current]);
      setExecResult(result);
      setIsRunning(false);
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }, 400);
  }, [answers, current, q]);

  const handleSubmit = useCallback(() => {
    setSubmitting(true);
    setActiveAgent(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < AGENT_COUNT) {
        setActiveAgent(step);
      } else {
        clearInterval(interval);
        setPipelineCompleted(true);
        setTimeout(async () => {
          if (isRetry && profile) {
            await retryAssessment(answers, mcqSelections);
          } else {
            await submitAssessment(answers, mcqSelections);
          }
          navigate("/");
        }, 500);
      }
    }, AGENT_DELAY);
  }, [answers, mcqSelections, isRetry, navigate, profile, retryAssessment, submitAssessment]);

  if (!q) return null;

  const completedCount = questions.filter((q, i) => {
    if (q.type === "mcq") return !!mcqSelections[q.id];
    return answers[i] && answers[i].trim() !== q.starterCode;
  }).length;

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 pt-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <Code2 className="w-6 h-6 text-primary" />
              Coding Assessment
              {isRetry && (
                <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full font-normal">Retry</span>
              )}
            </h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1 text-xs bg-secondary px-2 py-1 rounded">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                {completedCount}/{questions.length} answered
              </span>
              <Timer className="w-4 h-4" />
              <span>{current + 1} / {questions.length}</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <motion.div
              className="h-full rounded-full gradient-primary"
              animate={{ width: `${((current + 1) / questions.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>

        {/* Agent Pipeline Overlay */}
        <AnimatePresence>
          {submitting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md"
            >
              <div className="w-full max-w-2xl mx-4 space-y-6">
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-center mb-2">
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">Running AI Agents...</h2>
                  <p className="text-muted-foreground text-sm">Analyzing your responses through our multi-agent pipeline</p>
                </motion.div>
                <AgentPipeline activeAgent={activeAgent} completed={pipelineCompleted} />
                {pipelineCompleted && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-primary text-sm font-medium">
                    ✓ All agents completed — loading results...
                  </motion.p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* Question card */}
            <div className="glass rounded-xl p-6 glow-border">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border", difficultyBadge[q.difficulty])}>
                      {q.difficulty}
                    </span>
                    {/* Question type badge */}
                    {q.type === "mcq" ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400 border border-purple-400/20 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3" /> MCQ
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-400 border border-blue-400/20 flex items-center gap-1">
                        <Code2 className="w-3 h-3" /> Coding
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-xl font-semibold text-foreground">{q.title}</h2>
                </div>
                <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded shrink-0 ml-4">
                  {q.language}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed whitespace-pre-line">{q.description}</p>
              {q.type === "coding" && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-lg w-fit">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  Concepts: {q.expectedConcepts.join(", ")}
                </div>
              )}
            </div>

            {/* ── MCQ OPTIONS ── */}
            {q.type === "mcq" && q.options && (
              <div className="space-y-3">
                {q.options.map((option, oi) => {
                  const selected = mcqSelections[q.id] === option;
                  return (
                    <motion.button
                      key={oi}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: oi * 0.06 }}
                      onClick={() => {
                        setMcqSelections(prev => ({ ...prev, [q.id]: option }));
                        const next = [...answers];
                        next[current] = option;
                        setAnswers(next);
                      }}
                      disabled={submitting}
                      className={cn(
                        "w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 font-mono text-sm",
                        selected
                          ? "border-primary bg-primary/10 text-foreground shadow-glow"
                          : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:bg-secondary/60"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                            selected ? "border-primary bg-primary" : "border-muted-foreground"
                          )}
                        >
                          {selected && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                        </div>
                        <span className={selected ? "text-foreground" : ""}>{option}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* ── CODE EDITOR ── */}
            {q.type === "coding" && (
              <div className="rounded-xl overflow-hidden border border-border shadow-card">
                {/* Editor chrome */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-[hsl(220_18%_8%)] border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-red-500/70" />
                      <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                      <span className="w-3 h-3 rounded-full bg-green-500/70" />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">solution.js</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleRun}
                    disabled={isRunning || submitting}
                    className="h-7 px-3 text-xs gradient-primary text-primary-foreground shadow-glow hover:opacity-90 gap-1.5"
                  >
                    {isRunning ? (
                      <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-3 h-3 border border-primary-foreground/30 border-t-primary-foreground rounded-full" /> Running...</>
                    ) : (
                      <><Play className="w-3 h-3" /> Run Code</>
                    )}
                  </Button>
                </div>

                {/* Line numbers + textarea */}
                <div className="relative">
                  <div className="absolute left-0 top-0 bottom-0 w-10 bg-[hsl(220_18%_7%)] border-r border-border flex flex-col pt-4 select-none" aria-hidden>
                    {(answers[current] || "").split("\n").map((_, i) => (
                      <div key={i} className="text-[10px] font-mono text-muted-foreground/40 text-right pr-2 leading-[21px]">{i + 1}</div>
                    ))}
                  </div>
                  <textarea
                    id={`code-editor-${current}`}
                    value={answers[current] || ""}
                    onChange={(e) => {
                      const next = [...answers];
                      next[current] = e.target.value;
                      setAnswers(next);
                      setExecResult(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Tab") {
                        e.preventDefault();
                        const start = e.currentTarget.selectionStart;
                        const end = e.currentTarget.selectionEnd;
                        const next = [...answers];
                        next[current] = answers[current].substring(0, start) + "  " + answers[current].substring(end);
                        setAnswers(next);
                        setTimeout(() => {
                          const ta = document.getElementById(`code-editor-${current}`) as HTMLTextAreaElement;
                          if (ta) { ta.selectionStart = ta.selectionEnd = start + 2; }
                        }, 0);
                      }
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRun();
                    }}
                    className="w-full h-64 bg-[hsl(220_18%_8%)] pl-12 pr-4 pt-4 pb-4 font-mono text-sm text-foreground resize-none focus:outline-none focus:ring-0 leading-[21px]"
                    spellCheck={false}
                  />
                </div>

                {/* Output Console */}
                <AnimatePresence>
                  {(execResult || isRunning) && (
                    <motion.div
                      ref={outputRef}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-border"
                    >
                      <div className="flex items-center justify-between px-4 py-2 bg-[hsl(220_18%_6%)]">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Terminal className="w-3.5 h-3.5" />
                          <span>Output Console</span>
                          {execResult && (
                            <span className={cn("flex items-center gap-1 ml-2", execResult.success ? "text-emerald-400" : "text-red-400")}>
                              {execResult.success ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {execResult.success ? "Ran successfully" : execResult.errorType === "syntax" ? "Syntax Error" : "Runtime Error"}
                            </span>
                          )}
                        </div>
                        <button onClick={() => setExecResult(null)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="bg-[hsl(220_20%_5%)] p-4 font-mono text-xs min-h-[60px] max-h-48 overflow-y-auto">
                        {isRunning && <div className="text-muted-foreground animate-pulse">Executing code...</div>}
                        {execResult && (
                          <div className="space-y-1">
                            {execResult.output.length > 0 ? (
                              execResult.output.map((line, i) => <div key={i} className="text-emerald-300">{line}</div>)
                            ) : execResult.success ? (
                              <div className="text-muted-foreground italic">// No console output</div>
                            ) : null}
                            {execResult.error && (
                              <div className="mt-2 space-y-1">
                                <div className="text-red-400 font-semibold">{execResult.error}</div>
                                {execResult.suggestion && (
                                  <div className="flex items-start gap-1.5 mt-2 text-amber-300/90 bg-amber-400/5 border border-amber-400/10 rounded p-2">
                                    <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                    <span>{execResult.suggestion}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Keyboard hint — coding only */}
            {q.type === "coding" && (
              <p className="text-xs text-muted-foreground text-right">
                <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono">Ctrl+Enter</kbd> to run •{" "}
                <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono">Tab</kbd> to indent
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrent((p) => Math.max(0, p - 1))}
            disabled={current === 0 || submitting}
            className="border-border text-foreground hover:bg-secondary"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>

          <div className="flex gap-2">
            {questions.map((_, i) => {
              const done = questions[i].type === "mcq"
                ? !!mcqSelections[questions[i].id]
                : answers[i] && answers[i].trim() !== questions[i].starterCode && answers[i].trim().length > 0;
              return (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all",
                    i === current ? "bg-primary scale-125" : done ? "bg-success/70" : "bg-secondary"
                  )}
                />
              );
            })}
          </div>

          {current < questions.length - 1 ? (
            <Button
              onClick={() => setCurrent((p) => p + 1)}
              disabled={submitting}
              className="gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="gradient-accent text-accent-foreground font-semibold shadow-glow hover:opacity-90"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full" />
                  Analyzing...
                </span>
              ) : (
                <>Submit &amp; Analyze <Send className="w-4 h-4 ml-1" /></>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentPage;
