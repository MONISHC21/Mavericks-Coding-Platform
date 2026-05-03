import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Lightbulb, BarChart3, Trophy, FileText, Radar, BrainCircuit } from "lucide-react";
import type { SkillScore } from "@/lib/agents";
import { engagementAgent } from "@/lib/agents";
import { usePlatformStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const ScoreRing = ({ score }: { score: number }) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-36 h-36">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
        <motion.circle
          cx="60" cy="60" r={radius} fill="none"
          stroke="url(#scoreGradient)" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(185 70% 50%)" />
            <stop offset="100%" stopColor="hsl(260 60% 60%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-display font-bold text-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
};

const ResultCard = ({ assessment }: { assessment: SkillScore }) => {
  const { resumeAnalysis } = usePlatformStore();
  const badge = engagementAgent.calculateBadge(assessment.overall, resumeAnalysis?.confidenceScore);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Score Overview */}
      <div className="glass rounded-xl p-6 glow-border">
        <h3 className="font-display font-semibold text-foreground mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            AI Skill Analysis
          </div>
          <div className="flex items-center gap-2">
            {resumeAnalysis && (
              <span className="text-xs bg-secondary text-secondary-foreground px-3 py-1 rounded-full flex items-center gap-1">
                <FileText className="w-3 h-3"/> Resume: {resumeAnalysis.experienceLevel}
              </span>
            )}
            <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-full flex items-center gap-1">
              <Trophy className="w-3 h-3"/> {badge}
            </span>
          </div>
        </h3>
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <ScoreRing score={assessment.overall} />
          <div className="flex-1 space-y-3 w-full">
            {assessment.categories.map((cat, i) => (
              <div key={cat.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-secondary-foreground">{cat.name}</span>
                  <span className="font-mono text-primary">{cat.score}%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className="h-full rounded-full gradient-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.score}%` }}
                    transition={{ duration: 1, delay: 0.2 + i * 0.1 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Skill Gap Radar */}
      <div className="glass rounded-xl p-5 glow-border">
        <h4 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
          <Radar className="w-5 h-5 text-accent" />
          Skill Gap Radar
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {assessment.categories.map((c, i) => {
            const gap = 100 - c.score;
            return (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 * i }} className="flex flex-col gap-2 p-3 rounded-lg bg-secondary/30 border border-border/50">
                <span className="text-sm font-semibold text-foreground">{c.name}</span>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Current: {c.score}%</span>
                  <span className={gap > 30 ? "text-warning" : "text-success"}>Gap: {gap}%</span>
                </div>
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div className={cn("h-full", gap > 30 ? "bg-warning" : "gradient-primary")} style={{ width: `${c.score}%` }} />
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Smart Insights Panel */}
      <div className="glass rounded-xl p-6 border-l-4 border-l-primary">
        <h4 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4 text-lg">
          <BrainCircuit className="w-5 h-5 text-primary" />
          Smart Insights Panel
        </h4>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h5 className="text-sm font-semibold flex items-center gap-2 mb-3 text-success">
              <TrendingUp className="w-4 h-4" /> You are strong in...
            </h5>
            <ul className="space-y-2">
              {assessment.strengths.slice(0, 2).map((s, i) => (
                <li key={i} className="text-sm text-secondary-foreground flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 shrink-0" /> {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="text-sm font-semibold flex items-center gap-2 mb-3 text-warning">
              <TrendingDown className="w-4 h-4" /> Improve this to reach next level...
            </h5>
            <ul className="space-y-2">
              {assessment.weaknesses.slice(0, 2).map((w, i) => (
                <li key={i} className="text-sm text-secondary-foreground flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 shrink-0" /> {w}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="glass rounded-xl p-5">
        <h4 className="font-display font-semibold text-foreground flex items-center gap-2 mb-3">
          <Lightbulb className="w-4 h-4 text-primary" />
          AI Recommendations
        </h4>
        <div className="grid sm:grid-cols-2 gap-2">
          {assessment.recommendations.map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }} className="flex items-start gap-2 p-3 rounded-lg bg-secondary/50">
              <span className="text-primary font-mono text-xs mt-0.5">0{i + 1}</span>
              <span className="text-sm text-secondary-foreground">{r}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ResultCard;
