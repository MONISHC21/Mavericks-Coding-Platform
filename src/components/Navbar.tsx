import { Link, useLocation, useNavigate } from "react-router-dom";
import { Code2, LayoutDashboard, Trophy, BookOpen, BarChart3, RotateCcw, Star, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlatformStore } from "@/lib/store";

const navItems = [
  { to: "/",             label: "Dashboard",   icon: LayoutDashboard },
  { to: "/assessment",   label: "Assessment",  icon: Code2 },
  { to: "/learning",     label: "Learning",    icon: BookOpen },
  { to: "/leaderboard",  label: "Leaderboard", icon: Trophy },
  { to: "/hackathons",   label: "Hackathons",  icon: Swords },
  { to: "/achievements", label: "Achievements",icon: Star },
];

const Navbar = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const { profile, reset } = usePlatformStore();

  const handleReset = () => { reset(); navigate("/"); };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
            <Code2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="hidden sm:block">
            <span className="font-display font-bold text-lg text-foreground leading-none block">Mavericks</span>
            <span className="text-[10px] text-muted-foreground leading-none">Coding Platform</span>
          </div>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-xs font-mono text-muted-foreground">
            <BarChart3 className="w-3.5 h-3.5 text-primary" />
            <span>v2.0 MVP</span>
          </div>

          {/* Reset button — only visible when profile exists */}
          {profile && (
            <button
              onClick={handleReset}
              title="Reset Platform (start over)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden flex border-t border-border/50">
        {navItems.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default Navbar;

