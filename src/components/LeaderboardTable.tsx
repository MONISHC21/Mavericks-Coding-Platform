import { motion } from "framer-motion";
import { Trophy, Flame, Medal } from "lucide-react";
import { engagementAgent } from "@/lib/agents";
import { cn } from "@/lib/utils";

const rankIcons: Record<number, JSX.Element> = {
  1: <Trophy className="w-5 h-5 text-warning" />,
  2: <Medal className="w-5 h-5 text-muted-foreground" />,
  3: <Medal className="w-5 h-5 text-warning/60" />,
};

const LeaderboardTable = () => {
  const entries = engagementAgent.getLeaderboard();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl overflow-hidden">
      <div className="p-5 border-b border-border/50">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Global Leaderboard
        </h3>
      </div>
      <div className="divide-y divide-border/30">
        {entries.map((entry, i) => (
          <motion.div
            key={entry.rank}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-secondary/30",
              entry.rank <= 3 && "bg-primary/[0.03]"
            )}
          >
            <div className="w-8 flex justify-center">
              {rankIcons[entry.rank] || <span className="text-sm font-mono text-muted-foreground">{entry.rank}</span>}
            </div>
            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
              {entry.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground truncate">{entry.name}</p>
                {entry.badge && (
                  <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    {entry.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{entry.level}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Flame className="w-3.5 h-3.5 text-warning" />
              {entry.streak}d
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-sm text-primary">{entry.score}</span>
              <p className="text-xs text-muted-foreground">pts</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default LeaderboardTable;
