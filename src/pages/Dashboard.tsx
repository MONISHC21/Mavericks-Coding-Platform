/**
 * Dashboard Page — Central hub that renders ALL agent outputs.
 *
 * Now includes:
 *  - ResumeAnalysisCard when resume data is available
 *  - Active agent animation tied to store's activeAgent field
 *  - Stagnation warning from TrackerAgent
 *  - Platform analytics from EngagementAgent
 */

import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Code2, Target, Brain, RotateCcw, BarChart3, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileCard from "@/components/ProfileCard";
import ProgressTracker from "@/components/ProgressTracker";
import ResultCard from "@/components/ResultCard";
import EventLog from "@/components/EventLog";
import AgentPipeline from "@/components/AgentPipeline";
import LeaderboardTable from "@/components/LeaderboardTable";
import ResumeAnalysisCard from "@/components/ResumeAnalysisCard";
import AssessmentReview from "@/components/AssessmentReview";
import { usePlatformStore } from "@/lib/store";
import { engagementAgent } from "@/lib/agents";

const Dashboard = () => {
  const navigate = useNavigate();
  const {
    profile,
    resumeAnalysis,
    assessment,
    recommendations,
    progress,
    eventLog,
    assessmentCount,
    activeAgent,
    stagnationWarning,
  } = usePlatformStore();

  const handleGetStarted = () => {
    if (!profile) {
      navigate("/profile-setup");
    } else {
      navigate("/assessment");
    }
  };

  const handleRetry = () => {
    navigate("/assessment?retry=true");
  };

  // Analytics from engagement agent
  const analytics = assessment ? engagementAgent.getAnalytics() : null;

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="container mx-auto px-4">
        {/* Hero — shown when no profile exists yet */}
        {!profile && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16 pt-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Skill Assessment
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-4">
              Level Up Your
              <span className="text-gradient block mt-1">Coding Skills</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8 text-lg">
              Get assessed by AI agents, discover your strengths, and follow a personalized learning path to become a better developer.
            </p>
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="gradient-primary text-primary-foreground font-semibold px-8 shadow-glow hover:opacity-90 transition-opacity"
            >
              Start Assessment <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto mt-14">
              {[
                { icon: Brain, label: "AI Evaluation", desc: "5 specialized agents" },
                { icon: Target, label: "Skill Mapping", desc: "Precise scoring" },
                { icon: Code2, label: "Learning Path", desc: "Personalized modules" },
              ].map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="glass rounded-xl p-4 text-center"
                >
                  <f.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-xs font-semibold text-foreground">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Full Dashboard — rendered when profile exists */}
        {profile && (
          <div className="space-y-6 pt-4">
            {/* Agent Pipeline Status */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <AgentPipeline
                activeAgent={activeAgent !== -1 ? activeAgent : assessment ? 4 : -1}
                completed={!!assessment && activeAgent === -1}
              />
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left column */}
              <div className="space-y-6">
                <ProfileCard profile={profile} />
                <ProgressTracker steps={progress} />

                {!assessment && (
                  <Button
                    onClick={() => navigate("/assessment")}
                    className="w-full gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-90 transition-opacity"
                  >
                    Start Assessment <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}

                {assessment && (
                  <div className="space-y-3">
                    <Button
                      onClick={() => navigate("/learning")}
                      variant="outline"
                      className="w-full border-primary/30 text-primary hover:bg-primary/10"
                    >
                      View Learning Path ({recommendations.length} modules) <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <Button
                      onClick={handleRetry}
                      variant="outline"
                      className="w-full border-warning/30 text-warning hover:bg-warning/10"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" /> Retake Assessment
                      {assessmentCount > 1 && (
                        <span className="ml-2 text-xs bg-warning/10 px-1.5 py-0.5 rounded">#{assessmentCount}</span>
                      )}
                    </Button>
                  </div>
                )}

                {/* Stagnation warning */}
                {stagnationWarning && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex gap-3 items-start"
                  >
                    <RotateCcw className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>{stagnationWarning}</p>
                  </motion.div>
                )}

                {/* Platform Analytics */}
                {analytics && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass rounded-xl p-5"
                  >
                    <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4 text-sm">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      Platform Analytics
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Assessments", value: analytics.totalAssessments },
                        { label: "Avg Score", value: analytics.averageScore },
                        { label: "Top Skill", value: analytics.topSkill },
                        { label: "Weakest", value: analytics.weakestSkill },
                      ].map((stat) => (
                        <div key={stat.label} className="bg-secondary/50 rounded-lg p-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                          <p className="text-sm font-semibold text-foreground mt-0.5 truncate">{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Right column */}
              <div className="lg:col-span-2 space-y-6">
                {assessment ? (
                  <>
                    <ResultCard assessment={assessment} />
                    {/* Assessment Review — explainable AI per-question breakdown */}
                    {assessment.reviewItems && assessment.reviewItems.length > 0 && (
                      <AssessmentReview items={assessment.reviewItems} />
                    )}
                    {/* Resume Analysis — shown after assessment when available */}
                    {resumeAnalysis && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-4 h-4 text-primary" />
                          <h2 className="font-display font-semibold text-foreground">Resume Analysis</h2>
                        </div>
                        <ResumeAnalysisCard analysis={resumeAnalysis} />
                      </div>
                    )}
                    <EventLog events={eventLog} />
                    <LeaderboardTable />
                  </>
                ) : (
                  <>
                    {/* Show resume analysis even before assessment */}
                    {resumeAnalysis && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-4 h-4 text-primary" />
                          <h2 className="font-display font-semibold text-foreground">Resume Analysis</h2>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Ready</span>
                        </div>
                        <ResumeAnalysisCard analysis={resumeAnalysis} />
                      </motion.div>
                    )}
                    <div className="glass rounded-xl p-12 text-center glow-border">
                      <Brain className="w-16 h-16 text-primary/30 mx-auto mb-4 animate-float" />
                      <h3 className="font-display font-semibold text-foreground text-lg mb-2">Ready to be assessed?</h3>
                      <p className="text-muted-foreground text-sm mb-6">
                        Complete the coding assessment and our AI agents will analyze your skills.
                      </p>
                      <Button
                        onClick={() => navigate("/assessment")}
                        className="gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
                      >
                        Start Assessment <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
