/**
 * ResumeAnalysisCard — Displays the structured output of the Resume Analysis Agent.
 *
 * Shows: extracted skills, experience level, confidence score, missing skills, suggestions.
 */
import { motion } from "framer-motion";
import { FileText, TrendingUp, AlertTriangle, CheckCircle, Zap, BookOpen } from "lucide-react";
import type { ResumeAnalysis } from "@/lib/agents";
import { cn } from "@/lib/utils";

interface Props {
  analysis: ResumeAnalysis;
}

const COMMON_SKILLS = ["React", "TypeScript", "Node.js", "Python", "Docker", "GraphQL", "AWS", "SQL", "MongoDB", "Redis"];

const levelColors = {
  Beginner: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  Intermediate: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Advanced: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
};

const scoreColor = (score: number) => {
  if (score >= 75) return "hsl(145 60% 45%)";
  if (score >= 50) return "hsl(38 92% 55%)";
  return "hsl(0 72% 55%)";
};

const ResumeAnalysisCard = ({ analysis }: Props) => {
  const { extractedSkills, experienceLevel, confidenceScore } = analysis;

  // Determine "missing" skills (common ones not found)
  const missingSkills = COMMON_SKILLS.filter(
    (s) => !extractedSkills.some((ex) => ex.toLowerCase() === s.toLowerCase())
  ).slice(0, 4);

  // Improvement suggestions based on level
  const suggestions =
    experienceLevel === "Beginner"
      ? [
          "Add more specific technology stacks to your resume",
          "Include project links and GitHub repositories",
          "Quantify your achievements with metrics",
        ]
      : experienceLevel === "Intermediate"
      ? [
          "Highlight leadership and mentoring experiences",
          "Add system design or architecture projects",
          "Include any open source contributions",
        ]
      : [
          "Emphasize scalability and distributed systems work",
          "Include patents, publications, or speaking engagements",
          "Showcase mentoring and team leadership impact",
        ];

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (confidenceScore / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-6 glow-border space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Resume Analysis
        </h3>
        <span className={cn("text-xs font-medium px-3 py-1 rounded-full border", levelColors[experienceLevel])}>
          {experienceLevel}
        </span>
      </div>

      {/* Score ring + top stats */}
      <div className="flex items-center gap-6">
        {/* Resume score ring */}
        <div className="relative w-24 h-24 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
            <motion.circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={scoreColor(confidenceScore)}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold font-display text-foreground">{confidenceScore}</span>
            <span className="text-[9px] text-muted-foreground">Resume Score</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Skills Detected</p>
            <p className="text-2xl font-display font-bold text-foreground">{extractedSkills.length}</p>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: scoreColor(confidenceScore) }}
              initial={{ width: 0 }}
              animate={{ width: `${confidenceScore}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {confidenceScore >= 75
              ? "Strong technical resume — well-structured skills section"
              : confidenceScore >= 50
              ? "Decent resume — a few improvements recommended"
              : "Resume needs more technical detail for better scoring"}
          </p>
        </div>
      </div>

      {/* Extracted Skills */}
      <div>
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          Extracted Skills ({extractedSkills.length})
        </h4>
        <div className="flex flex-wrap gap-2">
          {extractedSkills.slice(0, 16).map((skill, i) => (
            <motion.span
              key={skill}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium"
            >
              {skill}
            </motion.span>
          ))}
          {extractedSkills.length > 16 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
              +{extractedSkills.length - 16} more
            </span>
          )}
        </div>
      </div>

      {/* Missing Skills */}
      {missingSkills.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Skills Gap Detected
          </h4>
          <div className="flex flex-wrap gap-2">
            {missingSkills.map((skill) => (
              <span
                key={skill}
                className="text-xs px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20"
              >
                {skill} missing
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      <div>
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-accent" />
          Improvement Suggestions
        </h4>
        <ul className="space-y-2">
          {suggestions.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-3.5 h-3.5 text-primary/60 shrink-0 mt-0.5" />
              {s}
            </li>
          ))}
        </ul>
      </div>

      {/* Resources */}
      <div className="pt-2 border-t border-border/50">
        <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
          <BookOpen className="w-3.5 h-3.5" /> Suggested Resources
        </h4>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Resume Tips — LinkedIn", url: "https://www.linkedin.com/help/linkedin/answer/161" },
            { label: "ATS Optimization", url: "https://www.jobscan.co/blog/ats-resume/" },
          ].map((r) => (
            <a
              key={r.label}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              {r.label} ↗
            </a>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default ResumeAnalysisCard;
