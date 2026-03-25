/**
 * AchievementsPage — User's personal achievement hub.
 *
 * Shows:
 *  1. Badges earned based on assessment scores and milestones
 *  2. Leaderboard rank (fetched from API)
 *  3. Module completion progress (from localStorage)
 *  4. Combined overall progress bar across all three dimensions
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Star, BookOpen, Medal, Crown, Zap, Target, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatformStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const API = "http://localhost:5000";

// ── Badge definitions ────────────────────────────────────────────────────────
const ALL_BADGES = [
  { id: "first_assessment", label: "First Steps",      icon: "🚀", desc: "Complete your first assessment",   condition: (s: number, c: number) => c >= 1 },
  { id: "score_50",         label: "Half Century",     icon: "⚡", desc: "Score 50% or higher",              condition: (s: number) => s >= 50 },
  { id: "score_75",         label: "High Scorer",      icon: "🎯", desc: "Score 75% or higher",              condition: (s: number) => s >= 75 },
  { id: "score_100",        label: "Perfect Score",    icon: "💎", desc: "Score 100% on an assessment",      condition: (s: number) => s >= 100 },
  { id: "three_attempts",   label: "Persistent",       icon: "🔥", desc: "Complete 3 assessments",           condition: (_s: number, c: number) => c >= 3 },
  { id: "intermediate",     label: "Rising Star",      icon: "⭐", desc: "Reach Intermediate level",         condition: (_s: number, _c: number, l: string) => l === "intermediate" || l === "advanced" },
  { id: "advanced",         label: "Code Master",      icon: "👑", desc: "Reach Advanced level",             condition: (_s: number, _c: number, l: string) => l === "advanced" },
  { id: "learning_started", label: "Learner",          icon: "📚", desc: "Complete 1 learning module",       condition: (_s: number, _c: number, _l: string, m: number) => m >= 1 },
  { id: "learning_half",    label: "Halfway There",    icon: "🏃", desc: "Complete 50% of learning modules", condition: (_s: number, _c: number, _l: string, m: number, t: number) => t > 0 && m / t >= 0.5 },
  { id: "learning_complete",label: "Completionist",    icon: "🏆", desc: "Complete all learning modules",    condition: (_s: number, _c: number, _l: string, m: number, t: number) => t > 0 && m >= t },
];

export default function AchievementsPage() {
  const navigate = useNavigate();
  const { profile, assessment, assessmentCount, recommendations } = usePlatformStore();

  const [rank, setRank] = useState<number | null>(null);

  // Module completion from localStorage
  const storageKey  = `learning_checked_${profile?.name ?? "default"}`;
  const checked     = (() => { try { return JSON.parse(localStorage.getItem(storageKey) ?? "{}"); } catch { return {}; } })();
  const doneModules = recommendations.filter(m => !!checked[m.id]).length;
  const totalModules= recommendations.length;

  // Fetch leaderboard rank
  useEffect(() => {
    if (!profile) return;
    const load = async () => {
      try {
        const res  = await fetch(`${API}/api/leaderboard`);
        const data = await res.json();
        const entry = (data.leaderboard || []).find((e: {name: string; rank: number}) => e.name === profile.name);
        if (entry) setRank(entry.rank);
      } catch { /* offline */ }
    };
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, [profile]);

  // Derived values
  const score  = assessment?.overall ?? 0;
  const count  = assessmentCount     ?? (assessment ? 1 : 0);
  const level  = (profile?.level ?? "beginner").toLowerCase();

  // Evaluate earned badges
  const earned = ALL_BADGES.filter(b => b.condition(score, count, level, doneModules, totalModules));
  const locked = ALL_BADGES.filter(b => !b.condition(score, count, level, doneModules, totalModules));

  // Combined progress (0-100%)
  const scorePct   = Math.min(score, 100);
  const modulePct  = totalModules > 0 ? Math.round((doneModules / totalModules) * 100) : 0;
  const badgePct   = Math.round((earned.length / ALL_BADGES.length) * 100);
  const overallPct = Math.round((scorePct + modulePct + badgePct) / 3);

  if (!profile) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center glass rounded-xl p-12 max-w-md mx-4">
          <Trophy className="w-12 h-12 text-primary/30 mx-auto mb-4" />
          <h2 className="font-display text-xl font-semibold text-foreground mb-2">No Profile Yet</h2>
          <p className="text-muted-foreground text-sm mb-6">Complete your profile and an assessment to unlock achievements.</p>
          <Button onClick={() => navigate("/profile-setup")} className="gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            Get Started
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-4 mb-8">
          <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </Button>
          <div className="flex items-center gap-3 mb-1">
            <Star className="w-6 h-6 text-primary" />
            <h1 className="font-display text-3xl font-bold text-foreground">Achievements</h1>
          </div>
          <p className="text-muted-foreground">Your badges, rank, and learning progress — all in one place.</p>
        </motion.div>

        {/* ── Overall Progress Bar ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass rounded-2xl p-6 border border-primary/20 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <h2 className="font-display font-semibold text-foreground">Overall Platform Progress</h2>
            </div>
            <span className="text-2xl font-bold text-primary">{overallPct}%</span>
          </div>
          {/* Master bar */}
          <div className="h-3 bg-secondary rounded-full overflow-hidden mb-4">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-primary to-indigo-400"
              initial={{ width: 0 }}
              animate={{ width: `${overallPct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          {/* Three sub-bars */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Assessment Score", pct: scorePct,  icon: Zap,      color: "bg-violet-500" },
              { label: "Learning Modules", pct: modulePct, icon: BookOpen,  color: "bg-blue-500"  },
              { label: "Badges Earned",    pct: badgePct,  icon: Star,      color: "bg-amber-500" },
            ].map(({ label, pct, icon: Icon, color }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Icon className="w-3 h-3" /> {label}
                  </span>
                  <span className="text-xs font-semibold text-foreground">{pct}%</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", color)}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* ── Leaderboard Rank ──────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6 border border-border/60"
          >
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-primary" />
              <h2 className="font-display font-semibold text-foreground">Leaderboard Rank</h2>
            </div>
            <div className="text-center py-4">
              {rank !== null ? (
                <>
                  <div className={cn(
                    "inline-flex items-center justify-center w-20 h-20 rounded-full text-4xl font-bold mb-3",
                    rank === 1 ? "bg-amber-400/20 text-amber-400" :
                    rank === 2 ? "bg-gray-400/20 text-gray-300" :
                    rank === 3 ? "bg-orange-700/20 text-orange-500" :
                    "bg-primary/10 text-primary"
                  )}>
                    #{rank}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {rank === 1 ? "🏆 You're at the top!" : rank <= 3 ? "🥈 Top 3 — excellent!" : "Keep improving to climb the ranks"}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                    <div className="bg-secondary/50 rounded-lg px-2 py-2">
                      <p className="text-xs text-muted-foreground">Score</p>
                      <p className="text-sm font-bold text-foreground">{score}%</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg px-2 py-2">
                      <p className="text-xs text-muted-foreground">Level</p>
                      <p className="text-sm font-bold text-foreground capitalize">{level}</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg px-2 py-2">
                      <p className="text-xs text-muted-foreground">Attempts</p>
                      <p className="text-sm font-bold text-foreground">{count}</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Medal className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {assessment ? "Fetching rank…" : "Complete an assessment to get ranked"}
                  </p>
                </>
              )}
            </div>
          </motion.div>

          {/* ── Module Completion ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass rounded-2xl p-6 border border-border/60"
          >
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="font-display font-semibold text-foreground">Learning Completion</h2>
            </div>
            {totalModules > 0 ? (
              <>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-4xl font-bold text-foreground">{doneModules}</span>
                  <span className="text-muted-foreground mb-1">/ {totalModules} modules</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden mb-3">
                  <motion.div
                    className="h-full rounded-full bg-success"
                    initial={{ width: 0 }}
                    animate={{ width: `${modulePct}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  />
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {recommendations.map(m => (
                    <div key={m.id} className="flex items-center gap-2 text-xs">
                      {checked[m.id]
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                        : <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
                      }
                      <span className={checked[m.id] ? "text-muted-foreground line-through" : "text-foreground"}>
                        {m.title}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Complete an assessment to unlock your learning path</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Badges ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6 border border-border/60 mt-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <h2 className="font-display font-semibold text-foreground">Badges</h2>
            </div>
            <span className="text-sm text-muted-foreground">{earned.length}/{ALL_BADGES.length} earned</span>
          </div>

          {/* Earned */}
          {earned.length > 0 && (
            <div className="mb-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Earned</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {earned.map((b, i) => (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.25 + i * 0.05 }}
                    className="glass rounded-xl p-3 text-center border border-primary/20 bg-primary/5"
                  >
                    <div className="text-2xl mb-1">{b.icon}</div>
                    <p className="text-xs font-semibold text-foreground leading-tight">{b.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{b.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Locked */}
          {locked.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Locked</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {locked.map(b => (
                  <div
                    key={b.id}
                    className="rounded-xl p-3 text-center border border-border/30 bg-secondary/20 opacity-50"
                  >
                    <div className="relative inline-block mb-1">
                      <span className="text-2xl grayscale">{b.icon}</span>
                      <Lock className="w-3 h-3 text-muted-foreground absolute -bottom-0.5 -right-1" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground leading-tight">{b.label}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 leading-tight">{b.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {earned.length === 0 && (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Complete your assessment to start earning badges!</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
