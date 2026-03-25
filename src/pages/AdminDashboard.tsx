/**
 * Admin Dashboard — Connected to real backend API.
 *
 * CHANGES:
 *  - Fetches user data from /api/users (real users only, no dummy data)
 *  - Fetches analytics from /api/analytics
 *  - Auto-refreshes every 10 seconds (live sync with user assessment submissions)
 *  - Admin can delete any user record via DELETE /api/users/:id
 *  - Shows "No users yet" empty state when DB is empty
 */

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search, Filter, Users, TrendingUp, AlertCircle, Clock, Trophy,
  Trash2, RefreshCw, Wifi, WifiOff,
} from "lucide-react";

const API = "http://localhost:5000";

interface UserEntry {
  id: string;
  name: string;
  email: string;
  score: number;
  level: string;
  skills: string[];
  badge: string;
  assessmentCount: number;
  evaluatedAt: string;
  createdAt: string;
}

interface Analytics {
  totalUsers: number;
  averageScore: number;
  topSkill: string;
  weakestSkill: string;
  averageCompletionTime: string;
  scoreDistribution: Record<string, number>;
}

const AdminDashboard = () => {
  const [search, setSearch]           = useState("");
  const [filterLevel, setFilterLevel] = useState("All");
  const [users, setUsers]             = useState<UserEntry[]>([]);
  const [analytics, setAnalytics]     = useState<Analytics | null>(null);
  const [loading, setLoading]         = useState(true);
  const [backendOk, setBackendOk]     = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, analyticsRes] = await Promise.all([
        fetch(`${API}/api/users`),
        fetch(`${API}/api/analytics`),
      ]);
      if (!usersRes.ok || !analyticsRes.ok) throw new Error("API error");

      const usersData   = await usersRes.json();
      const analyticsData = await analyticsRes.json();

      setUsers(usersData.users || []);
      setAnalytics(analyticsData);
      setBackendOk(true);
    } catch {
      setBackendOk(false);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  // Initial load + 10-second auto-refresh
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this user from the database?")) return;
    try {
      await fetch(`${API}/api/users/${id}`, { method: "DELETE" });
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch {
      alert("Failed to delete — is the backend running?");
    }
  };

  const filteredUsers = users.filter(u =>
    (u.name.toLowerCase().includes(search.toLowerCase()) ||
     u.email.toLowerCase().includes(search.toLowerCase())) &&
    (filterLevel === "All" || u.level.toLowerCase() === filterLevel.toLowerCase())
  );

  const dist = analytics?.scoreDistribution ?? { "0-50": 0, "50-70": 0, "70-90": 0, "90+": 0 };
  const maxRange = Math.max(...Object.values(dist), 1);

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Real-time platform analytics &amp; user management
              <span className="ml-3 text-xs">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Backend status indicator */}
            <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${backendOk ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
              {backendOk ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {backendOk ? "Backend Connected" : "Backend Offline"}
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>

        {/* Backend offline warning */}
        {!backendOk && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
          >
            <strong>Backend server not running.</strong> Start it with:{" "}
            <code className="bg-destructive/20 px-2 py-0.5 rounded font-mono text-xs">
              npm run server
            </code>{" "}
            in a second terminal. Data will load automatically once connected.
          </motion.div>
        )}

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Users,       label: "Total Users",    value: analytics?.totalUsers ?? 0,              color: "text-primary" },
            { icon: TrendingUp,  label: "Average Score",  value: analytics?.averageScore ?? 0,            color: "text-success" },
            { icon: AlertCircle, label: "Top Skill",      value: analytics?.topSkill ?? "N/A",            color: "text-warning" },
            { icon: Clock,       label: "Avg Time",       value: analytics?.averageCompletionTime ?? "N/A", color: "text-accent" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-xl p-5 border-border/50"
            >
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <stat.icon className="w-4 h-4" /> {stat.label}
              </div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Score Distribution Chart */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-6 border-border/50 col-span-1">
            <h3 className="font-display font-semibold mb-6 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" /> Score Distribution
            </h3>
            {loading ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
            ) : analytics?.totalUsers === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm">
                <Trophy className="w-8 h-8 opacity-30" />
                No assessment data yet
              </div>
            ) : (
              <div className="h-48 flex items-end gap-4 justify-between">
                {Object.entries(dist).map(([label, count], i) => {
                  const barHeight = Math.max(4, Math.round((count / maxRange) * 160));
                  return (
                    <div key={label} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-mono text-muted-foreground">{count}</span>
                      <div className="w-full flex items-end" style={{ height: '160px' }}>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: barHeight }}
                          transition={{ duration: 0.8, delay: i * 0.1 }}
                          className="w-full rounded-t-sm relative overflow-hidden"
                          style={{ minHeight: count > 0 ? 4 : 0 }}
                        >
                          <div className="absolute inset-0 gradient-primary opacity-80" />
                        </motion.div>
                      </div>
                      <span className="text-[10px] text-muted-foreground text-center whitespace-nowrap">{label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* User Table */}
          <div className="col-span-2 space-y-4">
            {/* Controls */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-9 pr-4 py-2 bg-background/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div className="relative w-48">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <select
                  className="w-full pl-9 pr-4 py-2 appearance-none bg-background/50 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                  value={filterLevel}
                  onChange={e => setFilterLevel(e.target.value)}
                >
                  <option value="All">All Levels</option>
                  <option value="advanced">Advanced</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="beginner">Beginner</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="glass rounded-xl border border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-secondary/30 border-b border-border/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Top Skills</th>
                      <th className="px-4 py-3 font-medium">Score</th>
                      <th className="px-4 py-3 font-medium">Level</th>
                      <th className="px-4 py-3 font-medium">Tests</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Loading users...</td></tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Users className="w-8 h-8 opacity-30" />
                            <p className="text-sm">
                              {users.length === 0
                                ? "No users yet — data will appear after first assessment is submitted"
                                : "No users match your filter"}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredUsers.map((user, i) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="border-b border-border/30 hover:bg-secondary/20"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{user.name}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap max-w-[140px]">
                            {(user.skills || []).slice(0, 3).map(s => (
                              <span key={s} className="bg-secondary px-1.5 py-0.5 rounded text-[10px] text-muted-foreground">{s}</span>
                            ))}
                            {user.skills?.length > 3 && (
                              <span className="text-[10px] text-muted-foreground">+{user.skills.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-mono font-bold text-sm ${user.score >= 80 ? "text-success" : user.score >= 50 ? "text-warning" : "text-destructive"}`}>
                            {user.score}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="capitalize text-muted-foreground text-xs bg-secondary px-2 py-0.5 rounded-full">
                            {user.level}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                          {user.assessmentCount}×
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
