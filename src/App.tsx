import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/Navbar";
import Dashboard from "@/pages/Dashboard";
import AssessmentPage from "@/pages/AssessmentPage";
import LearningPage from "@/pages/LearningPage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import NotFound from "@/pages/NotFound";
import ProfileSetupPage from "@/pages/ProfileSetupPage";
import AdminDashboard    from "@/pages/AdminDashboard";
import AchievementsPage from "@/pages/AchievementsPage";
import HackathonPage   from "@/pages/HackathonPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/profile-setup" element={<ProfileSetupPage />} />
          <Route path="/assessment" element={<AssessmentPage />} />
          <Route path="/learning" element={<LearningPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/admin"        element={<AdminDashboard />} />
          <Route path="/achievements" element={<AchievementsPage />} />
          <Route path="/hackathons"   element={<HackathonPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
