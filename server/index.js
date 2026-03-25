/**
 * Mavericks Coding Platform — Backend v3
 *
 * NEW: Full Hackathon Agent System
 *   POST /api/hackathon/setup           — create hackathon
 *   POST /api/hackathon/generate-challenge — AI-generate challenge
 *   GET  /api/hackathons                — list all hackathons
 *   GET  /api/hackathon/:id             — single hackathon
 *   POST /api/hackathon/:id/join        — user joins hackathon
 *   GET  /api/hackathon/:id/participants
 *   POST /api/hackathon/submit          — submit code
 *   POST /api/hackathon/evaluate        — AI evaluate submission
 *   GET  /api/hackathon/:id/submissions
 *   GET  /api/hackathon/:id/leaderboard
 *   DELETE /api/hackathon/:id
 *
 * FIX: Assessment history now correctly appended per submission
 * Admin Panel: GET /admin  (served from server/admin.html)
 */

import express from "express";
import cors    from "cors";
import fs      from "fs";
import path    from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE   = path.join(__dirname, "db.json");
const PORT      = 5000;

// ─── JSON File Database ───────────────────────────────────────────────────────
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], hackathons: [], submissions: [] }, null, 2));
  }
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
    if (!db.hackathons)  db.hackathons  = [];
    if (!db.submissions) db.submissions = [];
    return db;
  } catch { return { users: [], hackathons: [], submissions: [] }; }
}
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ─── AI Challenge Generator (Simulated / Template-based) ─────────────────────
const CHALLENGE_POOL = {
  IoT: {
    easy: [
      {
        problem: "Build a Smart Temperature Monitor: Design a system that reads temperature data from a sensor every 5 seconds, stores the last 10 readings in a circular buffer, and triggers an alert (print/log) when the temperature exceeds 30°C.",
        constraints: "Buffer size = 10. Readings are floats in Celsius. Alert threshold: 30°C. No external libraries.",
        inputFormat: "Stream of temperature readings (floats).",
        outputFormat: "ALERT: High temperature {value}°C when threshold exceeded.",
        testCases: [
          { input: "[25.0, 28.5, 31.2, 29.9]", expected: "ALERT: High temperature 31.2°C" },
          { input: "[20.0, 22.0, 24.0]",        expected: "No alert" },
        ],
        sampleCode: "def monitor(temps):\n    buffer = []\n    for t in temps:\n        buffer.append(t)\n        if len(buffer) > 10: buffer.pop(0)\n        if t > 30: print(f'ALERT: High temperature {t}°C')",
      },
    ],
    medium: [
      {
        problem: "Smart Irrigation System: Design an IoT-based irrigation controller that monitors soil moisture (0–100%), weather forecast data (rain probability), and tank water level. Activate irrigation ONLY when: moisture < 40%, rain probability < 30%, and water level > 20%. Log all decisions.",
        constraints: "Inputs are integers. Decision window: 15-min intervals. Prioritise water conservation.",
        inputFormat: "moisture (int), rainProb (int), waterLevel (int)",
        outputFormat: "IRRIGATE or SKIP + reason string",
        testCases: [
          { input: "moisture=30, rainProb=10, waterLevel=50", expected: "IRRIGATE" },
          { input: "moisture=60, rainProb=10, waterLevel=50", expected: "SKIP - Sufficient moisture" },
          { input: "moisture=25, rainProb=60, waterLevel=50", expected: "SKIP - Rain expected" },
        ],
        sampleCode: "def irrigate(moisture, rain_prob, water_level):\n    if moisture < 40 and rain_prob < 30 and water_level > 20:\n        return 'IRRIGATE'\n    reasons = []\n    if moisture >= 40: reasons.append('Sufficient moisture')\n    if rain_prob >= 30: reasons.append('Rain expected')\n    if water_level <= 20: reasons.append('Low water')\n    return f\"SKIP - {', '.join(reasons)}\"",
      },
    ],
    hard: [
      {
        problem: "Driver Drowsiness Detection System: Build a real-time drowsiness detection algorithm. The system receives eye blink intervals (in ms) as a stream. PERCLOS (% of closure) is: if blink duration > 300ms, count as closure. Calculate PERCLOS over last 60 seconds of data. If PERCLOS > 0.7 (70%), trigger DROWSY alert.",
        constraints: "Sliding window of 60 seconds. Each data point: {timestamp_ms, blink_duration_ms}. Efficiency required: O(n) time.",
        inputFormat: "List of {ts, duration} pairs",
        outputFormat: "ALERT: DROWSY or AWAKE + PERCLOS value",
        testCases: [
          { input: "75% of blinks > 300ms in 60s window", expected: "ALERT: DROWSY (PERCLOS=0.75)" },
          { input: "20% of blinks > 300ms in 60s window", expected: "AWAKE (PERCLOS=0.20)" },
        ],
        sampleCode: "def detect_drowsiness(blinks):\n    window = 60000  # 60 seconds in ms\n    if not blinks: return 'AWAKE (PERCLOS=0.00)'\n    start = blinks[-1]['ts'] - window\n    recent = [b for b in blinks if b['ts'] >= start]\n    if not recent: return 'AWAKE (PERCLOS=0.00)'\n    closures = sum(1 for b in recent if b['duration'] > 300)\n    perclos = closures / len(recent)\n    if perclos > 0.7:\n        return f'ALERT: DROWSY (PERCLOS={perclos:.2f})'\n    return f'AWAKE (PERCLOS={perclos:.2f})'",
      },
    ],
  },
  AI: {
    easy: [
      {
        problem: "Sentiment Classifier (Rule-Based): Build a rule-based sentiment analyser. Given a product review text, classify as POSITIVE, NEGATIVE, or NEUTRAL based on keyword matching. Use at least 10 positive and 10 negative keywords.",
        constraints: "Case-insensitive. Return confidence score (0.0–1.0) based on ratio of matches. Min 10 keywords per class.",
        inputFormat: "String: review text",
        outputFormat: "{ sentiment: 'POSITIVE'|'NEGATIVE'|'NEUTRAL', confidence: float }",
        testCases: [
          { input: "This product is amazing and works great!", expected: "POSITIVE, confidence > 0.5" },
          { input: "Terrible quality, completely broken.", expected: "NEGATIVE, confidence > 0.5" },
        ],
        sampleCode: "def analyse(text):\n    pos = ['amazing','great','love','excellent','perfect','good','best','fantastic','happy','recommended']\n    neg = ['terrible','broken','bad','awful','worst','hate','horrible','poor','useless','disappointed']\n    t = text.lower()\n    ps = sum(1 for w in pos if w in t)\n    ns = sum(1 for w in neg if w in t)\n    total = ps + ns\n    if total == 0: return {'sentiment':'NEUTRAL','confidence':0.5}\n    if ps > ns: return {'sentiment':'POSITIVE','confidence':round(ps/total,2)}\n    return {'sentiment':'NEGATIVE','confidence':round(ns/total,2)}",
      },
    ],
    medium: [
      {
        problem: "Build a K-Nearest Neighbours Classifier from scratch. Implement KNN without any ML libraries. The classifier must: (1) Accept training data as {features: [], label: str} list. (2) For a new point, find K nearest Euclidean neighbours. (3) Return majority label. Test on Iris dataset subset.",
        constraints: "K must be configurable. Euclidean distance only. No sklearn/numpy. Time complexity must be stated.",
        inputFormat: "train: List[{features, label}], test_point: List[float], k: int",
        outputFormat: "predicted_label: str, neighbours: List[{distance, label}]",
        testCases: [
          { input: "train=[{f:[1,2],l:'A'},{f:[2,3],l:'A'},{f:[8,9],l:'B'}], point=[2,2], k=2", expected: "A" },
        ],
        sampleCode: "import math\n\ndef knn(train, point, k):\n    dists = []\n    for item in train:\n        d = math.sqrt(sum((a-b)**2 for a,b in zip(item['features'],point)))\n        dists.append({'distance':round(d,3),'label':item['label']})\n    dists.sort(key=lambda x: x['distance'])\n    top_k = dists[:k]\n    votes = {}\n    for n in top_k: votes[n['label']] = votes.get(n['label'],0)+1\n    return {'predicted_label': max(votes,key=votes.get), 'neighbours': top_k}",
      },
    ],
    hard: [
      {
        problem: "Neural Network from Scratch: Implement a 2-layer feedforward neural network (no libraries). Must include: forward pass, sigmoid activation, binary cross-entropy loss, backpropagation, gradient descent. Train on XOR problem and achieve >95% accuracy.",
        constraints: "Only use Python built-ins and math. Learning rate configurable. Epochs ≥ 1000. Document every equation in comments.",
        inputFormat: "X: List[List[float]], y: List[int], lr: float, epochs: int",
        outputFormat: "Final loss, accuracy, predictions",
        testCases: [
          { input: "XOR: [[0,0],[0,1],[1,0],[1,1]] → [0,1,1,0]", expected: "accuracy >= 0.95 after 1000 epochs" },
        ],
        sampleCode: "import math, random\n\ndef sigmoid(x): return 1/(1+math.exp(-max(-500,min(500,x))))\ndef bce(y,p): return -(y*math.log(p+1e-9)+(1-y)*math.log(1-p+1e-9))\n\n# Full implementation required...",
      },
    ],
  },
  Web: {
    easy: [
      {
        problem: "Build a Rate Limiter: Implement a sliding window rate limiter. The limiter allows max N requests per time window W (in seconds) per user ID. Return ALLOWED or RATE_LIMITED.",
        constraints: "Use sliding window algorithm (not fixed window). O(n) space per user. Clean up expired entries.",
        inputFormat: "user_id: str, timestamp: float (unix), max_requests: int, window: int",
        outputFormat: "ALLOWED or RATE_LIMITED",
        testCases: [
          { input: "user='u1', max=3, window=10, calls at t=1,2,3,4", expected: "ALLOWED,ALLOWED,ALLOWED,RATE_LIMITED" },
        ],
        sampleCode: "from collections import defaultdict\n\nclass RateLimiter:\n    def __init__(self): self.requests = defaultdict(list)\n    \n    def check(self, user_id, timestamp, max_req, window):\n        self.requests[user_id] = [t for t in self.requests[user_id] if timestamp - t < window]\n        if len(self.requests[user_id]) < max_req:\n            self.requests[user_id].append(timestamp)\n            return 'ALLOWED'\n        return 'RATE_LIMITED'",
      },
    ],
    medium: [
      {
        problem: "Design a URL Shortener System: Build a URL shortener backend. Given a long URL, generate a unique 6-character short code (base62). Support: shorten(url), expand(code), and getStats(code) returning click count and creation date. Handle collisions.",
        constraints: "Base62 encoding (a-z, A-Z, 0-9). Codes must be unique. Stats must be real-time. In-memory storage acceptable.",
        inputFormat: "shorten(url: str), expand(code: str), stats(code: str)",
        outputFormat: "short_code, original_url, {clicks, created_at}",
        testCases: [
          { input: "shorten('https://google.com')", expected: "6-char alphanumeric code" },
          { input: "expand(code)", expected: "https://google.com" },
        ],
        sampleCode: "import random, string, time\n\nclass URLShortener:\n    def __init__(self):\n        self.db = {}  # code -> {url, clicks, created}\n        self.chars = string.ascii_letters + string.digits\n    \n    def _gen(self):\n        return ''.join(random.choices(self.chars, k=6))\n    \n    def shorten(self, url):\n        code = self._gen()\n        while code in self.db: code = self._gen()\n        self.db[code] = {'url': url, 'clicks': 0, 'created': time.time()}\n        return code\n    \n    def expand(self, code):\n        if code not in self.db: return None\n        self.db[code]['clicks'] += 1\n        return self.db[code]['url']",
      },
    ],
    hard: [
      {
        problem: "Distributed Cache with LRU Eviction: Implement a thread-safe LRU Cache with: O(1) get/put, configurable max size, TTL (time-to-live) per key, eviction callback, and serialisation to JSON. Demonstrate with a web API caching scenario.",
        constraints: "O(1) get/put using doubly linked list + hashmap. Thread-safe. TTL checked on access. Eviction callback fires on expiry or capacity eviction.",
        inputFormat: "capacity: int, default_ttl: int (seconds)",
        outputFormat: "get(key) → value or None, put(key, value, ttl?), stats() → {hits, misses, evictions}",
        testCases: [
          { input: "cache(2); put(1,'a'); put(2,'b'); put(3,'c') → evicts 1", expected: "get(1)=None, get(2)='b'" },
        ],
        sampleCode: "# Full LRU + TTL implementation required\nfrom collections import OrderedDict\nimport time, threading\n\nclass LRUCache:\n    def __init__(self, capacity, default_ttl=300):\n        self.cap = capacity\n        self.ttl = default_ttl\n        self.cache = OrderedDict()\n        self.meta  = {}  # key -> expire_time\n        self.lock  = threading.Lock()\n        self.stats = {'hits':0,'misses':0,'evictions':0}",
      },
    ],
  },
  DSA: {
    easy: [
      {
        problem: "Implement a Min Stack: Design a stack that supports push, pop, top, and getMin() — all in O(1) time. The getMin() should return the minimum element in the stack at any time.",
        constraints: "O(1) for all operations. No sorting allowed. At most 10^4 operations.",
        inputFormat: "List of operations: ['push(5)', 'push(3)', 'getMin()', 'pop()', 'getMin()']",
        outputFormat: "Results for getMin and top operations",
        testCases: [
          { input: "push(5),push(3),push(7),getMin()", expected: "3" },
          { input: "push(5),push(3),pop(),getMin()", expected: "5" },
        ],
        sampleCode: "class MinStack:\n    def __init__(self):\n        self.stack = []\n        self.min_stack = []\n    \n    def push(self, val):\n        self.stack.append(val)\n        self.min_stack.append(min(val, self.min_stack[-1] if self.min_stack else val))\n    \n    def pop(self):\n        self.stack.pop()\n        self.min_stack.pop()\n    \n    def getMin(self):\n        return self.min_stack[-1]",
      },
    ],
    medium: [
      {
        problem: "Graph: Shortest Path with Obstacles: Given an N×M grid, find shortest path from (0,0) to (N-1,M-1). Cells can be: 0 (passable), 1 (obstacle). You can remove at most K obstacles. Return minimum steps or -1 if impossible.",
        constraints: "N,M ≤ 40. K ≤ 20. BFS with state (row, col, removals_used). Don't revisit same (r,c,k) state.",
        inputFormat: "grid: List[List[int]], k: int",
        outputFormat: "int: minimum steps or -1",
        testCases: [
          { input: "grid=[[0,0,0],[1,1,0],[0,0,0]], k=1", expected: "4" },
          { input: "grid=[[0,1,1],[1,1,1],[1,1,0]], k=1", expected: "-1" },
        ],
        sampleCode: "from collections import deque\n\ndef shortestPath(grid, k):\n    n, m = len(grid), len(grid[0])\n    if n==1 and m==1: return 0\n    queue = deque([(0,0,k,0)])  # row,col,rem_removals,steps\n    visited = set([(0,0,k)])\n    while queue:\n        r,c,rem,steps = queue.popleft()\n        for dr,dc in [(-1,0),(1,0),(0,-1),(0,1)]:\n            nr,nc = r+dr,c+dc\n            if 0<=nr<n and 0<=nc<m:\n                nrem = rem - grid[nr][nc]\n                if nrem >= 0 and (nr,nc,nrem) not in visited:\n                    if nr==n-1 and nc==m-1: return steps+1\n                    visited.add((nr,nc,nrem))\n                    queue.append((nr,nc,nrem,steps+1))\n    return -1",
      },
    ],
    hard: [
      {
        problem: "Segment Tree with Lazy Propagation: Build a segment tree that supports: (1) Range sum query in O(log n), (2) Range update (add value to all elements in range) in O(log n) using lazy propagation. N can be up to 10^6.",
        constraints: "0-indexed. Lazy propagation mandatory. Space O(4n). All updates are 'add x to range [l,r]'.",
        inputFormat: "arr: List[int], queries: List[{type: 'update'|'query', l, r, val?}]",
        outputFormat: "List of query results",
        testCases: [
          { input: "arr=[1,2,3,4,5], update(1,3,+10), query(0,4)", expected: "45" },
        ],
        sampleCode: "class SegTree:\n    def __init__(self, n):\n        self.n = n\n        self.tree = [0]*(4*n)\n        self.lazy = [0]*(4*n)\n    \n    def build(self, arr, node=1, start=0, end=None):\n        if end is None: end = self.n-1\n        if start==end: self.tree[node]=arr[start]; return\n        mid=(start+end)//2\n        self.build(arr,2*node,start,mid)\n        self.build(arr,2*node+1,mid+1,end)\n        self.tree[node]=self.tree[2*node]+self.tree[2*node+1]",
      },
    ],
  },
  General: {
    easy: [
      {
        problem: "Password Strength Validator: Build a function that rates password strength as WEAK, MEDIUM, STRONG, or VERY STRONG. Rules: length≥8 (+1pt, ≥12: +2pt), uppercase (+1), lowercase (+1), digit (+1), special char (+1), no consecutive chars (+1). Score 1-2=WEAK, 3-4=MEDIUM, 5-6=STRONG, 7=VERY STRONG.",
        constraints: "Case sensitive. Special chars: !@#$%^&*(). No dictionary check needed.",
        inputFormat: "password: str",
        outputFormat: "{ score: int, strength: str, tips: List[str] }",
        testCases: [
          { input: "'hello'", expected: "WEAK" },
          { input: "'MyP@ssw0rd!'", expected: "VERY STRONG" },
        ],
        sampleCode: "import re\n\ndef validate(pwd):\n    score = 0; tips = []\n    if len(pwd) >= 8: score+=1\n    elif (tips.append('Use 8+ chars'),True): pass\n    if len(pwd) >= 12: score+=1\n    if re.search(r'[A-Z]',pwd): score+=1\n    else: tips.append('Add uppercase')\n    if re.search(r'[a-z]',pwd): score+=1\n    else: tips.append('Add lowercase')\n    if re.search(r'\\d',pwd): score+=1\n    else: tips.append('Add a digit')\n    if re.search(r'[!@#$%^&*()]',pwd): score+=1\n    else: tips.append('Add special char')\n    levels={1:'WEAK',2:'WEAK',3:'MEDIUM',4:'MEDIUM',5:'STRONG',6:'STRONG',7:'VERY STRONG'}\n    return {'score':score,'strength':levels.get(score,'WEAK'),'tips':tips}",
      },
    ],
    medium: [
      {
        problem: "Design a Task Scheduler: Build a CPU task scheduler that takes a list of tasks (each with id, priority 1-10, and duration), a number of CPU cores, and schedules tasks using priority-based preemption. Output the execution order and total completion time.",
        constraints: "Priority 10 = highest. Preemption: higher priority task can interrupt current. Cores run tasks in parallel. Context switches have zero cost (simplified).",
        inputFormat: "tasks: List[{id, priority, duration}], cores: int",
        outputFormat: "Schedule: List[{core, task_id, start, end}], total_time: int",
        testCases: [
          { input: "tasks=[{id:'A',p:5,d:3},{id:'B',p:9,d:1}], cores=1", expected: "B runs first (priority), then A" },
        ],
        sampleCode: "import heapq\n\ndef schedule(tasks, cores):\n    heap = [(-t['priority'], t['id'], t['duration']) for t in tasks]\n    heapq.heapify(heap)\n    schedule = []\n    time = 0\n    while heap:\n        for _ in range(min(cores, len(heap))):\n            if not heap: break\n            neg_p, tid, dur = heapq.heappop(heap)\n            schedule.append({'task':tid,'start':time,'end':time+dur})\n        time += 1  # simplified\n    return schedule",
      },
    ],
    hard: [
      {
        problem: "Build a Mini Compiler (Lexer + Parser): Implement a lexer and recursive descent parser for a simple expression language supporting: integers, +, -, *, /, parentheses, and variable assignment (x = expr). Return an AST and evaluate the expression.",
        constraints: "Operator precedence: * / before + -. Left associative. Variables stored in symbol table. Error: undefined variable, division by zero.",
        inputFormat: "source: str (e.g. 'x = 3 + 4 * 2; y = x * 2; print(y)')",
        outputFormat: "AST (JSON), result of print statements",
        testCases: [
          { input: "x = 3 + 4 * 2", expected: "x = 11" },
          { input: "y = (3 + 4) * 2", expected: "y = 14" },
        ],
        sampleCode: "# Lexer → Tokens → Parser → AST → Evaluator\n# Tokens: INT, PLUS, MINUS, MUL, DIV, LPAREN, RPAREN, ASSIGN, IDENT\n\nclass Token:\n    def __init__(self, type, value): self.type=type; self.value=value\n\n# Full recursive descent parser required...",
      },
    ],
  },
};

function generateChallenge(domain, difficulty) {
  const domainPool = CHALLENGE_POOL[domain] || CHALLENGE_POOL["General"];
  const diffPool   = domainPool[difficulty] || domainPool["medium"] || Object.values(domainPool)[0];
  const idx        = Math.floor(Math.random() * diffPool.length);
  const template   = diffPool[idx];
  return {
    id:         `C_${Date.now()}`,
    domain,
    difficulty,
    ...template,
    aiGenerated: true,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Express App ─────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "5mb" }));

// ─── Health ──────────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Standalone Admin Panel ───────────────────────────────────────────────────
app.get("/admin", (_req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// ═══════════════════════════════════════════════════════════════════════════════
//  USERS / ASSESSMENT HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

app.post("/api/users", (req, res) => {
  const { name, email, score, level, skills, badge, assessmentCount, evaluatedAt } = req.body;
  if (!name || score === undefined) return res.status(400).json({ error: "name and score required" });

  const db    = readDB();
  const exIdx = db.users.findIndex(u => u.name === name && u.email === email);
  const hist  = { score: Number(score), level: level || "Beginner", badge: badge || "", evaluatedAt: evaluatedAt || new Date().toISOString() };

  if (exIdx >= 0) {
    const u = db.users[exIdx];
    u.assessmentHistory = [...(u.assessmentHistory || []), hist];
    u.score             = Number(score);
    u.level             = level || u.level;
    u.skills            = Array.isArray(skills) ? skills : u.skills;
    u.badge             = badge || u.badge;
    u.assessmentCount   = u.assessmentHistory.length;
    u.updatedAt         = new Date().toISOString();
    db.users[exIdx]     = u;
  } else {
    db.users.push({
      id: `usr_${Date.now()}`, name, email: email || "",
      score: Number(score), level: level || "Beginner",
      skills: Array.isArray(skills) ? skills : [],
      badge: badge || "", assessmentCount: 1,
      assessmentHistory: [hist],
      evaluatedAt: evaluatedAt || new Date().toISOString(),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  }
  writeDB(db);
  console.log(`[DB] ${name} — score:${score}  history:${(db.users.find(u=>u.name===name)?.assessmentHistory||[]).length}`);
  res.status(201).json({ success: true });
});

app.get("/api/users", (_req, res) => {
  const db = readDB();
  res.json({ users: [...db.users].sort((a, b) => b.score - a.score), total: db.users.length });
});

app.get("/api/users/:id/history", (req, res) => {
  const user = readDB().users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });
  res.json({ history: user.assessmentHistory || [], user: { name: user.name, email: user.email } });
});

app.delete("/api/users/:id", (req, res) => {
  const db = readDB();
  const before = db.users.length;
  db.users = db.users.filter(u => u.id !== req.params.id);
  if (db.users.length === before) return res.status(404).json({ error: "Not found" });
  writeDB(db);
  res.json({ success: true });
});

app.get("/api/leaderboard", (_req, res) => {
  const ranked = [...readDB().users].sort((a, b) => b.score - a.score)
    .map((u, i) => ({ rank: i+1, name: u.name, score: u.score, level: u.level, badge: u.badge, streak: u.assessmentCount||1 }));
  res.json({ leaderboard: ranked });
});

app.get("/api/analytics", (_req, res) => {
  const users = readDB().users;
  if (!users.length) return res.json({ totalUsers:0, averageScore:0, topSkill:"N/A", weakestSkill:"N/A", averageCompletionTime:"N/A", scoreDistribution:{"0-50":0,"50-70":0,"70-90":0,"90+":0} });
  const scores = users.map(u => u.score);
  const avg = Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
  const freq = {}; users.forEach(u=>(u.skills||[]).forEach(s=>{freq[s]=(freq[s]||0)+1;}));
  const se = Object.entries(freq).sort((a,b)=>b[1]-a[1]);
  const dist = {"0-50":0,"50-70":0,"70-90":0,"90+":0};
  scores.forEach(s=>{ if(s<50)dist["0-50"]++; else if(s<70)dist["50-70"]++; else if(s<90)dist["70-90"]++; else dist["90+"]++; });
  res.json({ totalUsers:users.length, averageScore:avg, topSkill:se[0]?.[0]||"N/A", weakestSkill:se[se.length-1]?.[0]||"N/A", averageCompletionTime:"~15 min", scoreDistribution:dist });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  HACKATHON AGENT APIs
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /api/hackathon/setup — Create a new hackathon */
app.post("/api/hackathon/setup", (req, res) => {
  const { title, theme, duration, difficulty, targetUsers, mode, inviteOnly, description } = req.body;
  if (!title) return res.status(400).json({ error: "title required" });

  const db = readDB();
  let challenges = [];

  // Auto-generate challenges if AI mode
  if (mode === "AI_GENERATED") {
    challenges = [
      generateChallenge(theme || "General", difficulty || "medium"),
    ];
  }

  const hackathon = {
    id:           `H_${Date.now()}`,
    title,
    theme:        theme || "General",
    duration:     duration || "48h",
    difficulty:   difficulty || "medium",
    targetUsers:  Array.isArray(targetUsers) ? targetUsers : [],
    mode:         mode || "MANUAL",
    inviteOnly:   !!inviteOnly,
    description:  description || "",
    status:       "active",
    challenges,
    participants: [],
    createdAt:    new Date().toISOString(),
    updatedAt:    new Date().toISOString(),
  };

  db.hackathons.push(hackathon);
  writeDB(db);
  console.log(`[Hackathon] Created: ${title} (${mode})`);
  res.status(201).json({ success: true, hackathon });
});

/** POST /api/hackathon/generate-challenge — AI generate a challenge */
app.post("/api/hackathon/generate-challenge", (req, res) => {
  const { domain, difficulty, hackathonId } = req.body;
  const challenge = generateChallenge(domain || "General", difficulty || "medium");

  if (hackathonId) {
    const db = readDB();
    const idx = db.hackathons.findIndex(h => h.id === hackathonId);
    if (idx >= 0) {
      db.hackathons[idx].challenges.push(challenge);
      db.hackathons[idx].updatedAt = new Date().toISOString();
      writeDB(db);
    }
  }

  res.json({ success: true, challenge });
});

/** GET /api/hackathons — List all hackathons */
app.get("/api/hackathons", (_req, res) => {
  const db = readDB();
  res.json({ hackathons: db.hackathons || [], total: (db.hackathons||[]).length });
});

/** GET /api/hackathon/:id — Single hackathon */
app.get("/api/hackathon/:id", (req, res) => {
  const h = readDB().hackathons?.find(h => h.id === req.params.id);
  if (!h) return res.status(404).json({ error: "Not found" });
  res.json({ hackathon: h });
});

/** DELETE /api/hackathon/:id */
app.delete("/api/hackathon/:id", (req, res) => {
  const db = readDB();
  const before = (db.hackathons||[]).length;
  db.hackathons = (db.hackathons||[]).filter(h => h.id !== req.params.id);
  if (db.hackathons.length === before) return res.status(404).json({ error: "Not found" });
  writeDB(db);
  res.json({ success: true });
});

/** PATCH /api/hackathon/:id/status — Update status */
app.patch("/api/hackathon/:id/status", (req, res) => {
  const db  = readDB();
  const idx = (db.hackathons||[]).findIndex(h => h.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: "Not found" });
  db.hackathons[idx].status    = req.body.status;
  db.hackathons[idx].updatedAt = new Date().toISOString();
  writeDB(db);
  res.json({ success: true });
});

/** POST /api/hackathon/:id/join — User joins a hackathon */
app.post("/api/hackathon/:id/join", (req, res) => {
  const { name, email } = req.body;
  if (!name) return res.status(400).json({ error: "name required" });

  const db  = readDB();
  const idx = (db.hackathons||[]).findIndex(h => h.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: "Hackathon not found" });

  const h = db.hackathons[idx];
  if (h.status !== "active") return res.status(400).json({ error: "Hackathon is not active" });

  const alreadyJoined = h.participants.some(p => p.email === email || p.name === name);
  if (alreadyJoined) return res.status(400).json({ error: "Already joined" });

  h.participants.push({ name, email: email||"", joinedAt: new Date().toISOString() });
  h.updatedAt = new Date().toISOString();
  writeDB(db);
  res.json({ success: true, message: `${name} joined ${h.title}` });
});

/** GET /api/hackathon/:id/participants */
app.get("/api/hackathon/:id/participants", (req, res) => {
  const h = readDB().hackathons?.find(h => h.id === req.params.id);
  if (!h) return res.status(404).json({ error: "Not found" });
  res.json({ participants: h.participants, total: h.participants.length });
});

/** POST /api/hackathon/submit — Submit code for a challenge */
app.post("/api/hackathon/submit", (req, res) => {
  const { userId, userName, userEmail, hackathonId, challengeId, code, language } = req.body;
  if (!hackathonId || !challengeId || !code) return res.status(400).json({ error: "hackathonId, challengeId, code required" });

  const db = readDB();
  const sub = {
    id:          `S_${Date.now()}`,
    userId:      userId || `u_${Date.now()}`,
    userName:    userName || "Anonymous",
    userEmail:   userEmail || "",
    hackathonId,
    challengeId,
    code,
    language:    language || "python",
    status:      "pending",
    score:       null,
    feedback:    null,
    submittedAt: new Date().toISOString(),
  };

  db.submissions.push(sub);

  // Auto-evaluate (simulated AI scoring)
  const score    = evaluateCode(code, challengeId, db.hackathons);
  sub.score      = score.score;
  sub.feedback   = score.feedback;
  sub.status     = "evaluated";
  sub.evaluatedAt = new Date().toISOString();

  db.submissions[db.submissions.length - 1] = sub;
  writeDB(db);
  res.status(201).json({ success: true, submission: sub });
});

/** POST /api/hackathon/evaluate — Re-evaluate a submission */
app.post("/api/hackathon/evaluate", (req, res) => {
  const { submissionId } = req.body;
  const db  = readDB();
  const idx = db.submissions.findIndex(s => s.id === submissionId);
  if (idx < 0) return res.status(404).json({ error: "Submission not found" });

  const score = evaluateCode(db.submissions[idx].code, db.submissions[idx].challengeId, db.hackathons);
  db.submissions[idx].score     = score.score;
  db.submissions[idx].feedback  = score.feedback;
  db.submissions[idx].status    = "evaluated";
  writeDB(db);
  res.json({ success: true, score: score.score, feedback: score.feedback });
});

/** Simulated AI Code Evaluator */
function evaluateCode(code, challengeId, hackathons) {
  if (!code || code.trim().length < 20) {
    return { score: 0, feedback: "❌ No meaningful code submitted. Please attempt the problem." };
  }

  const len   = code.trim().length;
  const lines = code.split("\n").filter(l => l.trim()).length;

  // Heuristic scoring
  let score = 0;
  const feedbackParts = [];

  if (len > 50)  { score += 20; feedbackParts.push("✅ Code has meaningful length"); }
  if (lines > 3) { score += 10; feedbackParts.push("✅ Multiple lines of logic"); }

  const hasFunction = /def |function |=>/.test(code);
  if (hasFunction) { score += 20; feedbackParts.push("✅ Function defined"); }

  const hasReturn = /return /.test(code);
  if (hasReturn) { score += 15; feedbackParts.push("✅ Returns a value"); }

  const hasConditional = /if |else|elif|switch|case/.test(code);
  if (hasConditional) { score += 10; feedbackParts.push("✅ Conditional logic present"); }

  const hasLoop = /for |while |forEach|map\(|reduce\(/.test(code);
  if (hasLoop) { score += 10; feedbackParts.push("✅ Iteration/loop present"); }

  const hasDataStructure = /\[\]|\{\}|dict|list|array|stack|queue|heap|map\b|set\b/.test(code);
  if (hasDataStructure) { score += 10; feedbackParts.push("✅ Uses data structures"); }

  const hasComments = /\/\/|#/.test(code);
  if (hasComments) { score += 5; feedbackParts.push("✅ Code is commented"); }

  score = Math.min(100, score);

  if (score < 40) feedbackParts.push("💡 Tip: Add more logic — try to handle edge cases and return proper output.");
  if (!hasFunction) feedbackParts.push("💡 Tip: Wrap your logic in a function for better structure.");
  if (!hasReturn)   feedbackParts.push("💡 Tip: Ensure your function returns the expected output.");

  return { score, feedback: feedbackParts.join("\n") };
}

/** GET /api/hackathon/:id/submissions */
app.get("/api/hackathon/:id/submissions", (req, res) => {
  const subs = readDB().submissions.filter(s => s.hackathonId === req.params.id);
  res.json({ submissions: subs, total: subs.length });
});

/** GET /api/hackathon/:id/leaderboard */
app.get("/api/hackathon/:id/leaderboard", (req, res) => {
  const subs = readDB().submissions
    .filter(s => s.hackathonId === req.params.id && s.score !== null)
    .sort((a, b) => (b.score||0) - (a.score||0));

  // Best score per user
  const seen = new Map();
  subs.forEach(s => {
    if (!seen.has(s.userName) || seen.get(s.userName).score < s.score) seen.set(s.userName, s);
  });

  const lb = [...seen.values()].sort((a,b) => b.score - a.score)
    .map((s, i) => ({ rank: i+1, name: s.userName, score: s.score, language: s.language, submittedAt: s.submittedAt }));

  res.json({ leaderboard: lb });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Mavericks Backend  →  http://localhost:${PORT}`);
  console.log(`   Admin Panel        →  http://localhost:${PORT}/admin`);
  console.log(`   DB file            →  ${DB_FILE}\n`);
});
