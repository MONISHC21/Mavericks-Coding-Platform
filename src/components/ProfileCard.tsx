import { motion } from "framer-motion";
import { User, Zap, Code2, FileText } from "lucide-react";
import type { UserProfile } from "@/lib/agents";

const ProfileCard = ({ profile }: { profile: UserProfile }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-6 glow-border"
    >
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center shrink-0">
          <User className="w-7 h-7 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-lg text-foreground">{profile.name}</h3>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Zap className="w-3 h-3" />
              {profile.level}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {profile.skills.map((skill) => (
          <span
            key={skill}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium"
          >
            <Code2 className="w-3 h-3" />
            {skill}
          </span>
        ))}
      </div>
      {profile.resumeAnalysis && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <FileText className="w-3 h-3" /> Resume Analysis Insights
          </p>
          <div className="flex gap-2 text-sm text-foreground">
            <span className="bg-primary/10 text-primary px-2 py-1 rounded font-medium">Confidence: {profile.resumeAnalysis.confidenceScore}%</span>
            <span className="bg-primary/10 text-primary px-2 py-1 rounded font-medium">Exp: {profile.resumeAnalysis.experienceLevel}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ProfileCard;
