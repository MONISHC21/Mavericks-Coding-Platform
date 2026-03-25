import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Flame, Search, Filter, Crown, Star } from "lucide-react";
import { usePlatformStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const API = "http://localhost:5000";
const levelFilters = ["All", "Advanced", "Intermediate", "Beginner"];

const rankStyle = (rank: number) => {
  if (rank === 1) return "gradient-primary text-primary-foreground shadow-glow";
  if (rank === 2) return "bg-[hsl(220_14%_24%)] text-foreground";
  if (rank === 3) return "bg-[hsl(38_40%_20%)] text-foreground";
  return "bg-secondary text-secondary-foreground";
};

const rankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="w-4 h-4 text-primary-foreground" />;
  if (rank === 2) return <Medal className="w-4 h-4 text-muted-foreground" />;
  if (rank === 3) return <Medal className="w-4 h-4 text-amber-600/80" />;
  return <span className="text-xs font-mono text-muted-foreground">{rank}</span>;
};

const LeaderboardPage = () => {
  const [search, setSearch]           = useState("");
  const [filterLevel, setFilterLevel] = useState("All");
  const [apiEntries, setApiEntries]   = useState<{rank:number;name:string;score:number;level:string;badge:string;streak:number}[]>([]);
  const { leaderboard, profile, assessment } = usePlatformStore();

  // Fetch from real backend; auto-poll every 10 seconds
  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch(`${API}/api/leaderboard`);
        const data = await res.json();
        if (Array.isArray(data.leaderboard) && data.leaderboard.length > 0) {
          setApiEntries(data.leaderboard);
        }
      } catch { /* backend offline */ }
    };
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, []);

  // Prefer real backend data; fall back to in-memory pipeline results
  const entries = apiEntries.length > 0 ? apiEntries : leaderboard;

  const filtered = entries.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchLevel  = filterLevel === "All" || (e.level ?? "").toLowerCase() === filterLevel.toLowerCase();
    return matchSearch && matchLevel;
  });

  const top3 = filtered.slice(0, 3);
  const rest = filtered.slice(3);

  const userEntry = profile ? entries.find((e) => e.name === profile.name) : null;

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-4 mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-7 h-7 text-primary" />
            <h1 className="font-display text-3xl font-bold text-foreground">Global Leaderboard</h1>
          </div>
          <p className="text-muted-foreground">Top developers ranked by assessment performance</p>
        </motion.div>

        {/* Your rank callout */}
        {userEntry && assessment && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 glass rounded-xl p-4 glow-border flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold shrink-0">
              {profile!.name.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Your Rank</p>
              <p className="text-xs text-muted-foreground">{profile!.name}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-display font-bold text-primary">#{userEntry.rank}</p>
              <p className="text-xs text-muted-foreground">{userEntry.score} pts</p>
            </div>
          </motion.div>
        )}

        {/* Top 3 podium */}
        {top3.length >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-4 mb-8 items-end"
          >
            {/* 2nd place */}
            <motion.div className="glass rounded-xl p-4 text-center border border-border/50 h-36 flex flex-col justify-end">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-bold text-sm mx-auto mb-2">
                {top3[1]?.name.charAt(0)}
              </div>
              <p className="text-xs font-semibold text-foreground truncate">{top3[1]?.name}</p>
              <p className="text-xs text-muted-foreground">{top3[1]?.score} pts</p>
              <div className="mt-1 text-muted-foreground"><Medal className="w-4 h-4 mx-auto" /></div>
            </motion.div>

            {/* 1st place */}
            <motion.div
              className="glass rounded-xl p-4 text-center glow-border border-primary/30 h-44 flex flex-col justify-end relative overflow-hidden"
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            >
              <div className="absolute top-2 right-2">
                <Star className="w-4 h-4 text-primary fill-primary" />
              </div>
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-base mx-auto mb-2 shadow-glow">
                {top3[0]?.name.charAt(0)}
              </div>
              <p className="text-sm font-bold text-foreground truncate">{top3[0]?.name}</p>
              <p className="text-sm text-primary font-mono font-bold">{top3[0]?.score} pts</p>
              {top3[0]?.badge && <p className="text-xs text-muted-foreground mt-0.5">{top3[0].badge}</p>}
              <Crown className="w-5 h-5 text-primary mx-auto mt-1" />
            </motion.div>

            {/* 3rd place */}
            <motion.div className="glass rounded-xl p-4 text-center border border-border/50 h-32 flex flex-col justify-end">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-bold text-sm mx-auto mb-2">
                {top3[2]?.name.charAt(0)}
              </div>
              <p className="text-xs font-semibold text-foreground truncate">{top3[2]?.name}</p>
              <p className="text-xs text-muted-foreground">{top3[2]?.score} pts</p>
              <div className="mt-1 text-amber-600/70"><Medal className="w-4 h-4 mx-auto" /></div>
            </motion.div>
          </motion.div>
        )}

        {/* Search & filter */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex gap-3 mb-4"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search developers..."
              className="w-full pl-9 pr-4 py-2 bg-background/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="relative w-44">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="w-full pl-9 pr-4 py-2 appearance-none bg-background/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            >
              {levelFilters.map((l) => (
                <option key={l} value={l}>{l === "All" ? "All Levels" : l}</option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Full table */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass rounded-xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-3 bg-secondary/30 border-b border-border/50 grid grid-cols-12 text-xs text-muted-foreground font-medium uppercase tracking-wider">
            <span className="col-span-1">Rank</span>
            <span className="col-span-5">Developer</span>
            <span className="col-span-2 text-center">Level</span>
            <span className="col-span-2 text-center">Streak</span>
            <span className="col-span-2 text-right">Score</span>
          </div>

          <div className="divide-y divide-border/30">
            {filtered.map((entry, i) => {
              const isCurrentUser = profile && entry.name === profile.name;
              return (
                <motion.div
                  key={entry.rank}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn(
                    "grid grid-cols-12 items-center px-5 py-3.5 transition-colors hover:bg-secondary/20",
                    isCurrentUser && "bg-primary/5 border-l-2 border-l-primary",
                    entry.rank <= 3 && "bg-primary/[0.02]"
                  )}
                >
                  <div className="col-span-1">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs", rankStyle(entry.rank))}>
                      {rankIcon(entry.rank)}
                    </div>
                  </div>
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                      {entry.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                        {entry.name}
                        {isCurrentUser && <span className="text-[9px] bg-primary/20 text-primary px-1.5 rounded-full">You</span>}
                      </p>
                      {entry.badge && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                          {entry.badge}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="text-xs text-muted-foreground">{entry.level}</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Flame className="w-3.5 h-3.5 text-warning" />
                    {entry.streak}d
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="font-mono font-bold text-sm text-primary">{entry.score}</span>
                    <span className="text-xs text-muted-foreground ml-0.5">pts</span>
                  </div>
                </motion.div>
              );
            })}

            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">No developers found</div>
            )}
          </div>
        </motion.div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Rankings update after each assessment · Complete your assessment to join the board
        </p>
      </div>
    </div>
  );
};

export default LeaderboardPage;
