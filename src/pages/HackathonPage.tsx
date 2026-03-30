/**
 * HackathonPage — User-facing hackathon portal.
 * Shows active hackathons, challenges, code submission, and leaderboard.
 * Connects live to backend at port 5000.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Code2, ChevronDown, ChevronUp, Users, Clock, Zap,
  CheckCircle2, Send, RefreshCw, Star, Lock, Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatformStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const API = ""; // uses Vite proxy: /api → localhost:5000

// Types
interface Challenge {
  id: string; domain: string; difficulty: string; problem: string;
  constraints: string; testCases: { input: string; expected: string }[];
  sampleCode?: string;
}
interface Participant { name: string; email: string; joinedAt: string; }
interface Hackathon {
  id: string; title: string; theme: string; duration: string;
  difficulty: string; status: string; mode: string; inviteOnly: boolean;
  description: string; challenges: Challenge[]; participants: Participant[];
  createdAt: string;
}
interface LeaderboardEntry { rank: number; name: string; score: number; language: string; submittedAt: string; }
interface Submission { id: string; score: number | null; feedback: string | null; status: string; submittedAt: string; }

const diffColor: Record<string, string> = {
  easy:   "text-emerald-400 bg-emerald-400/10",
  medium: "text-yellow-400 bg-yellow-400/10",
  hard:   "text-red-400 bg-red-400/10",
};

const LANGS = ["python", "javascript", "c", "cpp", "java"];

export default function HackathonPage() {
  const { profile } = usePlatformStore();

  const [hackathons, setHackathons]             = useState<Hackathon[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [selected, setSelected]                 = useState<Hackathon | null>(null);
  const [leaderboard, setLeaderboard]           = useState<LeaderboardEntry[]>([]);
  const [submissions, setSubmissions]           = useState<Submission[]>([]);
  const [activeChallengeIdx, setActiveChallengeIdx] = useState(0);
  const [code, setCode]                         = useState("");
  const [language, setLanguage]                 = useState("python");
  const [submitting, setSubmitting]             = useState(false);
  const [lastResult, setLastResult]             = useState<Submission | null>(null);
  const [joined, setJoined]                     = useState<Record<string, boolean>>({});
  const [joiningId, setJoiningId]               = useState<string | null>(null);
  const [view, setView]                         = useState<"challenge" | "leaderboard">("challenge");

  const fetchHackathons = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/api/hackathons`);
      const data = await res.json();
      setHackathons(data.hackathons || []);
      // Restore join state from localStorage
      const jMap: Record<string, boolean> = {};
      (data.hackathons || []).forEach((h: Hackathon) => {
        if (profile && h.participants?.some(p => p.name === profile.name)) jMap[h.id] = true;
      });
      setJoined(prev => ({ ...prev, ...jMap }));
    } catch { /* offline */ }
    finally { setLoading(false); }
  }, [profile]);

  const fetchLeaderboard = useCallback(async (hId: string) => {
    try {
      const res  = await fetch(`${API}/api/hackathon/${hId}/leaderboard`);
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch {}
  }, []);

  const fetchSubmissions = useCallback(async (hId: string) => {
    try {
      const res  = await fetch(`${API}/api/hackathon/${hId}/submissions`);
      const data = await res.json();
      const mine = (data.submissions || []).filter(
        (s: Submission & { userName: string }) => s.userName === profile?.name
      );
      setSubmissions(mine);
    } catch {}
  }, [profile]);

  useEffect(() => {
    fetchHackathons();
    const iv = setInterval(fetchHackathons, 10000);
    return () => clearInterval(iv);
  }, [fetchHackathons]);

  useEffect(() => {
    if (selected) {
      fetchLeaderboard(selected.id);
      fetchSubmissions(selected.id);
      setCode(selected.challenges[activeChallengeIdx]?.sampleCode || "# Write your solution here\n\n");
    }
  }, [selected, activeChallengeIdx, fetchLeaderboard, fetchSubmissions]);

  const handleJoin = async (h: Hackathon) => {
    if (!profile) { alert("Please complete your profile first."); return; }
    setJoiningId(h.id);
    try {
      const res  = await fetch(`${API}/api/hackathon/${h.id}/join`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profile.name, email: profile.email }),
      });
      const data = await res.json();
      if (data.success || data.error === "Already joined") {
        setJoined(prev => ({ ...prev, [h.id]: true }));
        setSelected(h);
        fetchHackathons();
      } else {
        alert(data.error || "Could not join hackathon");
      }
    } catch { alert("Backend offline. Start backend server."); }
    finally { setJoiningId(null); }
  };

  const handleSubmit = async () => {
    if (!selected || !profile || !code.trim()) return;
    if (code.trim().length < 10) { alert("Please write some code before submitting."); return; }
    setSubmitting(true);
    try {
      const challenge = selected.challenges[activeChallengeIdx];
      const res = await fetch(`${API}/api/hackathon/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName:    profile.name,
          userEmail:   profile.email || "",
          hackathonId: selected.id,
          challengeId: challenge?.id || `C_${activeChallengeIdx}`,
          code,
          language,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLastResult(data.submission);
        fetchLeaderboard(selected.id);
        fetchSubmissions(selected.id);
      }
    } catch { alert("Submission failed — backend offline."); }
    finally { setSubmitting(false); }
  };

  const activeHackathons = hackathons.filter(h => h.status === "active");
  const endedHackathons  = hackathons.filter(h => h.status !== "active");

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading hackathons…</p>
        </div>
      </div>
    );
  }

  // ── Hackathon detail view ──────────────────────────────────────────────────
  if (selected) {
    const challenge = selected.challenges[activeChallengeIdx];
    const hasJoined = joined[selected.id];

    return (
      <div className="min-h-screen pt-20 pb-12">
        <div className="container mx-auto px-4">
          {/* Back + header */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="pt-4 mb-6">
            <button
              onClick={() => { setSelected(null); setLastResult(null); }}
              className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
            >
              ← Back to Hackathons
            </button>
            <div className="flex flex-wrap items-start gap-4 justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">{selected.title}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", diffColor[selected.difficulty])}>{selected.difficulty}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3"/>{selected.duration}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3"/>{selected.participants.length} joined</span>
                  <span className="text-xs text-muted-foreground">📡 {selected.theme}</span>
                </div>
              </div>
              {!hasJoined && (
                <Button onClick={() => handleJoin(selected)} disabled={!!joiningId} className="gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
                  {joiningId === selected.id ? <RefreshCw className="w-4 h-4 animate-spin mr-1"/> : <Zap className="w-4 h-4 mr-1"/>}
                  Join Hackathon
                </Button>
              )}
              {hasJoined && <span className="text-xs bg-success/10 text-success px-3 py-1.5 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/> Joined</span>}
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: Challenge Panel */}
            <div className="lg:col-span-2 space-y-4">
              {/* Challenge selector */}
              {selected.challenges.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {selected.challenges.map((c, i) => (
                    <button key={c.id} onClick={() => setActiveChallengeIdx(i)}
                      className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        i === activeChallengeIdx ? "bg-primary/10 text-primary border border-primary/20" : "glass text-muted-foreground hover:text-foreground"
                      )}>
                      Challenge {i + 1}
                    </button>
                  ))}
                </div>
              )}

              {/* View tabs */}
              <div className="flex gap-1 bg-secondary rounded-xl p-1 w-fit">
                <button onClick={() => setView("challenge")}   className={cn("px-4 py-1.5 rounded-lg text-xs font-medium transition-all", view==="challenge"   ? "bg-background text-foreground shadow" : "text-muted-foreground")}>
                  <Code2 className="w-3.5 h-3.5 inline mr-1"/>Challenge
                </button>
                <button onClick={() => setView("leaderboard")} className={cn("px-4 py-1.5 rounded-lg text-xs font-medium transition-all", view==="leaderboard" ? "bg-background text-foreground shadow" : "text-muted-foreground")}>
                  <Trophy className="w-3.5 h-3.5 inline mr-1"/>Leaderboard
                </button>
              </div>

              <AnimatePresence mode="wait">
                {view === "challenge" ? (
                  <motion.div key="challenge" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    {/* Problem statement */}
                    {challenge ? (
                      <div className="glass rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Code2 className="w-4 h-4 text-primary"/>
                          <h3 className="font-display font-semibold text-foreground">Problem Statement</h3>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", diffColor[challenge.difficulty])}>{challenge.difficulty}</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{challenge.problem}</p>
                        {challenge.constraints && (
                          <div className="bg-secondary/50 rounded-lg p-3 mb-4">
                            <p className="text-xs font-semibold text-foreground mb-1">📌 Constraints</p>
                            <p className="text-xs text-muted-foreground">{challenge.constraints}</p>
                          </div>
                        )}
                        {challenge.testCases?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-foreground mb-2">🧪 Test Cases</p>
                            <div className="space-y-2">
                              {challenge.testCases.slice(0, 2).map((tc, i) => (
                                <div key={i} className="bg-secondary/30 rounded-lg p-3 text-xs font-mono">
                                  <span className="text-emerald-400">Input:  </span>{tc.input}<br/>
                                  <span className="text-blue-400">Expected:</span> {tc.expected}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="glass rounded-xl p-8 text-center">
                        <Code2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3"/>
                        <p className="text-muted-foreground text-sm">No challenges yet. Admin will add them soon.</p>
                      </div>
                    )}

                    {/* Code Editor */}
                    {challenge && (
                      <div className="glass rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                          <div className="flex items-center gap-2">
                            <Code2 className="w-4 h-4 text-primary"/>
                            <span className="text-sm font-medium text-foreground">Code Editor</span>
                          </div>
                          <select
                            value={language}
                            onChange={e => setLanguage(e.target.value)}
                            className="text-xs bg-secondary border border-border rounded-lg px-2 py-1 text-foreground"
                          >
                            {LANGS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                          </select>
                        </div>
                        <textarea
                          value={code}
                          onChange={e => setCode(e.target.value)}
                          rows={16}
                          disabled={!hasJoined}
                          className="w-full bg-gray-950/60 text-sm font-mono p-4 resize-none focus:outline-none text-gray-100 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder={hasJoined ? "Write your solution here..." : "Join the hackathon to submit code"}
                          spellCheck={false}
                        />
                        <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-secondary/20">
                          {!hasJoined ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Lock className="w-3.5 h-3.5"/>
                              <span>Join the hackathon to enable submission</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">{code.split("\n").length} lines · {language}</span>
                          )}
                          <Button
                            onClick={handleSubmit}
                            disabled={submitting || !hasJoined}
                            className="gradient-primary text-primary-foreground shadow-glow hover:opacity-90 text-sm"
                          >
                            {submitting ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5"/> : <Send className="w-4 h-4 mr-1.5"/>}
                            {submitting ? "Evaluating…" : "Submit Solution"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Last Result */}
                    <AnimatePresence>
                      {lastResult && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className={cn("glass rounded-xl p-5 border", lastResult.score && lastResult.score >= 60 ? "border-success/20 bg-success/5" : "border-destructive/20 bg-destructive/5")}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            {lastResult.score && lastResult.score >= 60
                              ? <CheckCircle2 className="w-5 h-5 text-success"/>
                              : <Play className="w-5 h-5 text-warning"/>
                            }
                            <h4 className="font-semibold text-foreground">AI Evaluation Result</h4>
                            <span className={cn("text-lg font-bold ml-auto", lastResult.score && lastResult.score >= 60 ? "text-success" : "text-warning")}>
                              {lastResult.score ?? "—"}%
                            </span>
                          </div>
                          {lastResult.feedback && (
                            <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{lastResult.feedback}</pre>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* My submissions */}
                    {submissions.length > 0 && (
                      <div className="glass rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Star className="w-4 h-4 text-primary"/>My Submissions ({submissions.length})
                        </h4>
                        <div className="space-y-2">
                          {submissions.slice().reverse().slice(0, 5).map((s, i) => (
                            <div key={s.id} className="flex items-center justify-between text-xs bg-secondary/30 rounded-lg px-3 py-2">
                              <span className="text-muted-foreground">#{submissions.length - i}</span>
                              <span className={cn("font-semibold", s.score && s.score >= 60 ? "text-success" : "text-warning")}>
                                {s.score ?? "Pending"}%
                              </span>
                              <span className="text-muted-foreground">{new Date(s.submittedAt).toLocaleTimeString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-primary"/>
                      <h3 className="font-semibold text-foreground">Live Leaderboard</h3>
                      <button onClick={() => fetchLeaderboard(selected.id)} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
                        <RefreshCw className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                    {leaderboard.length === 0 ? (
                      <div className="text-center py-10">
                        <Trophy className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2"/>
                        <p className="text-sm text-muted-foreground">No submissions yet — be the first!</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border/30">
                        {leaderboard.map((e, i) => (
                          <div key={i} className={cn("flex items-center gap-4 px-5 py-3", e.name === profile?.name && "bg-primary/5")}>
                            <span className={cn("font-bold w-8 text-center", i === 0 ? "text-yellow-400 text-lg" : i === 1 ? "text-gray-300" : i === 2 ? "text-orange-400" : "text-muted-foreground")}>
                              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${e.rank}`}
                            </span>
                            <span className={cn("flex-1 font-medium", e.name === profile?.name ? "text-primary" : "text-foreground")}>{e.name} {e.name === profile?.name && "(you)"}</span>
                            <span className="text-xs text-muted-foreground">{e.language}</span>
                            <span className={cn("text-sm font-bold", e.score >= 80 ? "text-success" : e.score >= 50 ? "text-warning" : "text-destructive")}>{e.score}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right: Sidebar */}
            <div className="space-y-4">
              {/* Participants */}
              <div className="glass rounded-xl p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary"/>Participants ({selected.participants.length})
                </h4>
                {selected.participants.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No participants yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {selected.participants.map((p, i) => (
                      <div key={i} className={cn("flex items-center gap-2 text-xs py-1", p.name === profile?.name && "text-primary font-medium")}>
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold", p.name === profile?.name ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                          {p.name[0].toUpperCase()}
                        </div>
                        {p.name} {p.name === profile?.name && "(you)"}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hackathon info */}
              <div className="glass rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Hackathon Info</h4>
                {[
                  { label: "Theme",      value: selected.theme },
                  { label: "Duration",   value: selected.duration },
                  { label: "Difficulty", value: selected.difficulty },
                  { label: "Mode",       value: selected.mode === "AI_GENERATED" ? "🤖 AI Generated" : "✏️ Manual" },
                  { label: "Challenges", value: `${selected.challenges.length} problem${selected.challenges.length !== 1 ? "s" : ""}` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground font-medium capitalize">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Hackathon list view ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-4 mb-8">
          <div className="flex items-center gap-3 mb-1">
            <Trophy className="w-6 h-6 text-primary"/>
            <h1 className="font-display text-3xl font-bold text-foreground">Hackathons</h1>
          </div>
          <p className="text-muted-foreground">Compete in AI-powered coding challenges. Join, solve, and climb the leaderboard.</p>
        </motion.div>

        {hackathons.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <Trophy className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4"/>
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">No Active Hackathons</h2>
            <p className="text-muted-foreground text-sm mb-6">Hackathons will appear here once an admin creates them.</p>
            <p className="text-xs text-muted-foreground">Admin panel → <a href="/admin" target="_blank" className="text-primary underline">/admin</a></p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active */}
            {activeHackathons.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse"/>
                  <h2 className="font-display font-semibold text-foreground">Active Hackathons</h2>
                  <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">{activeHackathons.length} running</span>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {activeHackathons.map((h, i) => (
                    <motion.div key={h.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                      className="glass rounded-xl border border-border/60 hover:border-primary/30 hover:shadow-glow transition-all p-5"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-display font-semibold text-foreground">{h.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{h.description || `${h.theme} · ${h.duration}`}</p>
                        </div>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", diffColor[h.difficulty] || "text-muted-foreground")}>{h.difficulty}</span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3"/>{h.duration}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3"/>{h.participants.length} participants</span>
                        <span className="flex items-center gap-1"><Code2 className="w-3 h-3"/>{h.challenges.length} challenge{h.challenges.length !== 1 ? "s" : ""}</span>
                        {h.mode === "AI_GENERATED" && <span className="text-primary">🤖 AI Generated</span>}
                      </div>
                      <div className="flex gap-2">
                        {joined[h.id] ? (
                          <Button onClick={() => { setSelected(h); setActiveChallengeIdx(0); }} className="flex-1 gradient-primary text-primary-foreground shadow-glow hover:opacity-90 text-sm">
                            <Play className="w-4 h-4 mr-1.5"/>Continue
                          </Button>
                        ) : (
                          <Button onClick={() => handleJoin(h)} disabled={joiningId === h.id} className="flex-1 gradient-primary text-primary-foreground shadow-glow hover:opacity-90 text-sm">
                            {joiningId === h.id ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5"/> : <Zap className="w-4 h-4 mr-1.5"/>}
                            Join & Compete
                          </Button>
                        )}
                        <Button variant="outline" onClick={() => { setSelected(h); setActiveChallengeIdx(0); }} className="text-sm">
                          View
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Ended */}
            {endedHackathons.length > 0 && (
              <div>
                <h2 className="font-display font-semibold text-foreground mb-4 opacity-60">Past Hackathons</h2>
                <div className="grid md:grid-cols-2 gap-4 opacity-60">
                  {endedHackathons.map((h, i) => (
                    <motion.div key={h.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                      className="glass rounded-xl border border-border/40 p-5 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => { setSelected(h); setActiveChallengeIdx(0); }}
                    >
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-foreground">{h.title}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">Ended</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{h.theme} · {h.participants.length} participants</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
