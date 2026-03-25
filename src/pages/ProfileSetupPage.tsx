import { motion } from "framer-motion";
import { Brain, Sparkles, Shield } from "lucide-react";
import ProfileForm from "@/components/ProfileForm";

const ProfileSetupPage = () => {
  return (
    <div className="min-h-screen pt-16 pb-12 gradient-hero">
      <div className="container mx-auto px-4">
        {/* Page hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center pt-12 mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Step 1 of 2 — Profile Setup
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
            Let&apos;s Build Your Dev Profile
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Our AI agents analyze your resume to personalize your coding assessment and learning path.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {[
              { icon: Brain, label: "Auto Skill Extraction" },
              { icon: Shield, label: "Resume Scoring" },
              { icon: Sparkles, label: "Personalized Questions" },
            ].map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium"
              >
                <f.icon className="w-3.5 h-3.5 text-primary" />
                {f.label}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Form */}
        <ProfileForm />
      </div>
    </div>
  );
};

export default ProfileSetupPage;
