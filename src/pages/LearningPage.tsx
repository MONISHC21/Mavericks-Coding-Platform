import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Code2, ExternalLink, BookOpen, Target, Zap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import LearningPathCard from "@/components/LearningPathCard";
import { usePlatformStore } from "@/lib/store";

const GLOBAL_RESOURCES = [
  {
    name: "LeetCode",
    desc: "Practice coding interview problems by difficulty and topic.",
    url: "https://leetcode.com/",
    color: "from-amber-500/20 to-amber-500/5",
    border: "border-amber-500/20",
    badge: "DSA & Algorithms",
    badgeColor: "bg-amber-400/10 text-amber-400",
  },
  {
    name: "GeeksforGeeks",
    desc: "In-depth tutorials on algorithms, data structures, and CS concepts.",
    url: "https://www.geeksforgeeks.org/",
    color: "from-emerald-500/20 to-emerald-500/5",
    border: "border-emerald-500/20",
    badge: "Tutorials",
    badgeColor: "bg-emerald-400/10 text-emerald-400",
  },
  {
    name: "freeCodeCamp",
    desc: "Free full-stack web development and coding certifications.",
    url: "https://www.freecodecamp.org/",
    color: "from-blue-500/20 to-blue-500/5",
    border: "border-blue-500/20",
    badge: "Full Stack",
    badgeColor: "bg-blue-400/10 text-blue-400",
  },
  {
    name: "MDN Web Docs",
    desc: "Authoritative reference for web technologies: HTML, CSS, JS.",
    url: "https://developer.mozilla.org/",
    color: "from-purple-500/20 to-purple-500/5",
    border: "border-purple-500/20",
    badge: "Reference",
    badgeColor: "bg-purple-400/10 text-purple-400",
  },
  {
    name: "javascript.info",
    desc: "Modern JavaScript tutorial from basic to advanced topics.",
    url: "https://javascript.info/",
    color: "from-yellow-500/20 to-yellow-500/5",
    border: "border-yellow-500/20",
    badge: "JavaScript",
    badgeColor: "bg-yellow-400/10 text-yellow-400",
  },
  {
    name: "System Design Primer",
    desc: "GitHub repo with system design concepts and interview prep.",
    url: "https://github.com/donnemartin/system-design-primer",
    color: "from-pink-500/20 to-pink-500/5",
    border: "border-pink-500/20",
    badge: "System Design",
    badgeColor: "bg-pink-400/10 text-pink-400",
  },
];

const LearningPage = () => {
  const navigate = useNavigate();
  const { recommendations, assessment, profile } = usePlatformStore();

  // ── Module completion tick state (persisted in localStorage) ────────────
  const storageKey = `learning_checked_${profile?.name ?? "default"}`;
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "{}"); }
    catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(checked));
  }, [checked, storageKey]);

  const handleToggle = useCallback((id: string) => {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const doneCount  = recommendations.filter(m => !!checked[m.id]).length;
  const totalCount = recommendations.length;
  const pct        = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  if (!assessment || recommendations.length === 0) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center glass rounded-xl p-12 max-w-md mx-4">
          <Code2 className="w-12 h-12 text-primary/30 mx-auto mb-4" />
          <h2 className="font-display text-xl font-semibold text-foreground mb-2">No Learning Path Yet</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Complete an assessment first to get your personalized learning path.
          </p>
          <Button onClick={() => navigate("/assessment")} className="gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            Take Assessment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-4 mb-8">
          <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
          </Button>

          {/* ── Completion Progress Bar ── */}
          <AnimatePresence>
            {doneCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-5 glass rounded-xl p-4 border border-success/20 bg-success/5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    Learning Progress
                  </div>
                  <span className="text-sm font-bold text-success">{pct}% complete</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-success"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {doneCount} of {totalCount} modules completed
                  {pct === 100 && " 🎉 All modules done!"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-1">Personalized Learning Path</h1>
              <p className="text-muted-foreground">
                Based on your assessment score of{" "}
                <span className="text-primary font-semibold">{assessment.overall}/100</span>
                {profile && (
                  <> · Level: <span className="text-accent font-semibold capitalize">{profile.level}</span></>
                )}
              </p>
            </div>
            {/* Quick stats */}
            <div className="flex gap-4 shrink-0">
              {[
                { icon: BookOpen, label: `${recommendations.length} Modules`,                               color: "text-primary" },
                { icon: Target,   label: `${recommendations.filter(m => m.priority === "high").length} High Priority`, color: "text-destructive" },
                { icon: Zap,      label: `${recommendations.reduce((acc, m) => acc + parseInt(m.estimatedTime), 0)}+ hrs`, color: "text-warning" },
              ].map((s) => (
                <div key={s.label} className="glass rounded-lg px-3 py-2 text-center">
                  <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-0.5`} />
                  <p className="text-xs text-muted-foreground whitespace-nowrap">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Learning Path Modules */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <LearningPathCard modules={recommendations} checked={checked} onToggle={handleToggle} />
        </motion.div>

        {/* Global Resources Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-12">
          <div className="flex items-center gap-2 mb-6">
            <ExternalLink className="w-5 h-5 text-primary" />
            <h2 className="font-display text-xl font-bold text-foreground">Learning Resources</h2>
            <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">Handpicked</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GLOBAL_RESOURCES.map((resource, i) => (
              <motion.a
                key={resource.name}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.06 }}
                className={`glass rounded-xl p-5 border ${resource.border} bg-gradient-to-br ${resource.color} hover:shadow-glow transition-all group`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-display font-semibold text-foreground">{resource.name}</h3>
                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{resource.desc}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${resource.badgeColor}`}>
                  {resource.badge}
                </span>
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LearningPage;
