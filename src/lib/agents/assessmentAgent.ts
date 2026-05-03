/**
 * Assessment Agent — Dynamic question generation, mixed MCQ+Coding, binary scoring.
 *
 * KEY CHANGES:
 *  1. Mixed question types: MCQ (multiple choice) + Coding, randomly shuffled every session.
 *  2. Binary scoring: MCQ = correct/wrong (1 pt / 0 pt). Coding = 1 if meaningful attempt.
 *     Final score = (correct / total) × 100 — genuinely reflects performance.
 *  3. generateDynamicQuestions selects from skill-matched pool, randomized each call.
 *  4. Post-assessment level returned for store to update profile.level dynamically.
 */

import type { AssessmentQuestion, SkillScore } from "./types";
import { eventBus } from "./eventBus";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type Category =
  | "javascript"
  | "typescript"
  | "python_style"
  | "java_oop"
  | "react"
  | "node_backend"
  | "dsa"
  | "general";

interface PoolQuestion extends AssessmentQuestion {
  category: Category;
}

// ─────────────────────────────────────────────────────────────────────────────
// MCQ QUESTION POOL (40 MCQs across categories)
// ─────────────────────────────────────────────────────────────────────────────
const MCQ_POOL: PoolQuestion[] = [
  // ── JavaScript MCQs ──
  {
    id: 1001, type: "mcq", category: "javascript", difficulty: "easy",
    language: "JavaScript",
    title: "JavaScript typeof null",
    description: "What does `typeof null` return in JavaScript?",
    starterCode: "",
    expectedConcepts: ["typeof", "null"],
    options: ['"null"', '"undefined"', '"object"', '"boolean"'],
    correctAnswer: '"object"',
  },
  {
    id: 1002, type: "mcq", category: "javascript", difficulty: "easy",
    language: "JavaScript",
    title: "Array.prototype.map",
    description: "What does `[1, 2, 3].map(x => x * 2)` return?",
    starterCode: "",
    expectedConcepts: ["map", "array"],
    options: ["[2, 4, 6]", "[1, 2, 3]", "[3, 6, 9]", "[2, 3, 4]"],
    correctAnswer: "[2, 4, 6]",
  },
  {
    id: 1003, type: "mcq", category: "javascript", difficulty: "medium",
    language: "JavaScript",
    title: "Event Loop Execution Order",
    description: "What is the output of:\n```\nconsole.log(1);\nsetTimeout(() => console.log(2), 0);\nPromise.resolve().then(() => console.log(3));\nconsole.log(4);\n```",
    starterCode: "",
    expectedConcepts: ["event loop", "promise", "timeout"],
    options: ["1 4 2 3", "1 4 3 2", "1 2 3 4", "1 3 4 2"],
    correctAnswer: "1 4 3 2",
  },
  {
    id: 1004, type: "mcq", category: "javascript", difficulty: "medium",
    language: "JavaScript",
    title: "Closure Scope",
    description: "What does this log?\n```\nfor (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0);\n}\n```",
    starterCode: "",
    expectedConcepts: ["closure", "scope", "var"],
    options: ["0 1 2", "3 3 3", "0 0 0", "undefined undefined undefined"],
    correctAnswer: "3 3 3",
  },
  {
    id: 1005, type: "mcq", category: "javascript", difficulty: "hard",
    language: "JavaScript",
    title: "Prototype Chain",
    description: "What is `Object.getPrototypeOf([])`?",
    starterCode: "",
    expectedConcepts: ["prototype", "inheritance"],
    options: ["Array.prototype", "Object.prototype", "null", "Function.prototype"],
    correctAnswer: "Array.prototype",
  },
  // ── TypeScript MCQs ──
  {
    id: 2001, type: "mcq", category: "typescript", difficulty: "easy",
    language: "TypeScript",
    title: "TypeScript Union Type",
    description: "Which is correct syntax for a union type in TypeScript?",
    starterCode: "",
    expectedConcepts: ["union", "types"],
    options: ["string & number", "string | number", "string + number", "string, number"],
    correctAnswer: "string | number",
  },
  {
    id: 2002, type: "mcq", category: "typescript", difficulty: "medium",
    language: "TypeScript",
    title: "TypeScript Generics",
    description: "What is the return type of `function identity<T>(arg: T): T`?",
    starterCode: "",
    expectedConcepts: ["generics", "typescript"],
    options: ["any", "T", "unknown", "void"],
    correctAnswer: "T",
  },
  {
    id: 2003, type: "mcq", category: "typescript", difficulty: "hard",
    language: "TypeScript",
    title: "Mapped Types",
    description: "What does `Readonly<T>` do in TypeScript?",
    starterCode: "",
    expectedConcepts: ["mapped types", "readonly"],
    options: [
      "Makes all properties optional",
      "Makes all properties required",
      "Makes all properties readonly",
      "Makes all properties writable",
    ],
    correctAnswer: "Makes all properties readonly",
  },
  // ── Python/Backend MCQs ──
  {
    id: 3001, type: "mcq", category: "python_style", difficulty: "easy",
    language: "Python",
    title: "Python List Slicing",
    description: 'What does `[1, 2, 3, 4, 5][1:3]` return in Python?',
    starterCode: "",
    expectedConcepts: ["slicing", "list"],
    options: ["[2, 3]", "[2, 3, 4]", "[1, 2, 3]", "[3, 4]"],
    correctAnswer: "[2, 3]",
  },
  {
    id: 3002, type: "mcq", category: "python_style", difficulty: "medium",
    language: "Python",
    title: "Python Decorators",
    description: "In Python, what is a decorator primarily used for?",
    starterCode: "",
    expectedConcepts: ["decorators", "functions"],
    options: [
      "To define class attributes",
      "To modify or wrap another function without changing its code",
      "To import external modules",
      "To define new operators",
    ],
    correctAnswer: "To modify or wrap another function without changing its code",
  },
  {
    id: 3003, type: "mcq", category: "python_style", difficulty: "hard",
    language: "Python",
    title: "Python GIL",
    description: "What does the Python GIL (Global Interpreter Lock) prevent?",
    starterCode: "",
    expectedConcepts: ["gil", "threading", "concurrency"],
    options: [
      "Multiple processes from running",
      "Multiple threads from executing Python bytecode simultaneously",
      "Garbage collection from running",
      "Async functions from executing",
    ],
    correctAnswer: "Multiple threads from executing Python bytecode simultaneously",
  },
  // ── Java/OOP MCQs ──
  {
    id: 4001, type: "mcq", category: "java_oop", difficulty: "easy",
    language: "Java",
    title: "OOP Encapsulation",
    description: "Which OOP principle is best described as 'bundling data and methods that operate on that data within one unit'?",
    starterCode: "",
    expectedConcepts: ["encapsulation", "oop"],
    options: ["Inheritance", "Polymorphism", "Abstraction", "Encapsulation"],
    correctAnswer: "Encapsulation",
  },
  {
    id: 4002, type: "mcq", category: "java_oop", difficulty: "medium",
    language: "Java",
    title: "Design Pattern",
    description: "Which design pattern ensures only one instance of a class exists?",
    starterCode: "",
    expectedConcepts: ["singleton", "design patterns"],
    options: ["Factory", "Observer", "Singleton", "Strategy"],
    correctAnswer: "Singleton",
  },
  {
    id: 4003, type: "mcq", category: "java_oop", difficulty: "hard",
    language: "Java",
    title: "SOLID Principles",
    description: "The 'L' in SOLID stands for the Liskov Substitution Principle. Which statement describes it?",
    starterCode: "",
    expectedConcepts: ["solid", "liskov", "inheritance"],
    options: [
      "A class should have only one reason to change",
      "Objects of a superclass should be replaceable with objects of a subclass",
      "Depend upon abstractions, not concretions",
      "Classes should be open for extension but closed for modification",
    ],
    correctAnswer: "Objects of a superclass should be replaceable with objects of a subclass",
  },
  // ── DSA MCQs ──
  {
    id: 5001, type: "mcq", category: "dsa", difficulty: "easy",
    language: "DSA",
    title: "Time Complexity of Binary Search",
    description: "What is the time complexity of binary search on a sorted array of n elements?",
    starterCode: "",
    expectedConcepts: ["binary search", "complexity"],
    options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
    correctAnswer: "O(log n)",
  },
  {
    id: 5002, type: "mcq", category: "dsa", difficulty: "easy",
    language: "DSA",
    title: "Stack vs Queue",
    description: "A Stack follows _____ order while a Queue follows _____ order.",
    starterCode: "",
    expectedConcepts: ["stack", "queue", "lifo", "fifo"],
    options: ["FIFO, LIFO", "LIFO, FIFO", "LIFO, LIFO", "FIFO, FIFO"],
    correctAnswer: "LIFO, FIFO",
  },
  {
    id: 5003, type: "mcq", category: "dsa", difficulty: "medium",
    language: "DSA",
    title: "Hash Table Collision",
    description: "Which technique resolves hash collisions by storing colliding elements in linked lists at each bucket?",
    starterCode: "",
    expectedConcepts: ["hash table", "collision", "chaining"],
    options: ["Open Addressing", "Separate Chaining", "Double Hashing", "Linear Probing"],
    correctAnswer: "Separate Chaining",
  },
  {
    id: 5004, type: "mcq", category: "dsa", difficulty: "medium",
    language: "DSA",
    title: "Tree Traversal",
    description: "In a BST traversal, which order visits nodes as: Left → Root → Right?",
    starterCode: "",
    expectedConcepts: ["tree", "inorder", "traversal"],
    options: ["Preorder", "Postorder", "Inorder", "Level-order"],
    correctAnswer: "Inorder",
  },
  {
    id: 5005, type: "mcq", category: "dsa", difficulty: "hard",
    language: "DSA",
    title: "Graph Shortest Path",
    description: "Which algorithm finds the shortest path between all pairs of nodes in a weighted graph in O(V³)?",
    starterCode: "",
    expectedConcepts: ["graph", "dijkstra", "floyd"],
    options: ["Dijkstra's", "Bellman-Ford", "Floyd-Warshall", "Prim's"],
    correctAnswer: "Floyd-Warshall",
  },
  // ── React/Frontend MCQs ──
  {
    id: 6001, type: "mcq", category: "react", difficulty: "easy",
    language: "React",
    title: "React useState",
    description: "In React, calling `setState` in a functional component does what?",
    starterCode: "",
    expectedConcepts: ["state", "useState", "re-render"],
    options: [
      "Mutates state directly and re-renders",
      "Queues a state update and schedules a re-render",
      "Synchronously updates state only",
      "Updates state without re-rendering",
    ],
    correctAnswer: "Queues a state update and schedules a re-render",
  },
  {
    id: 6002, type: "mcq", category: "react", difficulty: "medium",
    language: "React",
    title: "useEffect Dependencies",
    description: "When does `useEffect(() => {}, [])` run?",
    starterCode: "",
    expectedConcepts: ["useEffect", "lifecycle", "mount"],
    options: [
      "On every render",
      "Only on the first render (mount)",
      "Only when component unmounts",
      "Never",
    ],
    correctAnswer: "Only on the first render (mount)",
  },
  {
    id: 6003, type: "mcq", category: "react", difficulty: "hard",
    language: "React",
    title: "React Reconciliation",
    description: "React's reconciliation algorithm (diffing) has what time complexity?",
    starterCode: "",
    expectedConcepts: ["reconciliation", "diffing", "complexity"],
    options: ["O(n³)", "O(n²)", "O(n log n)", "O(n)"],
    correctAnswer: "O(n)",
  },
  // ── Node/Backend MCQs ──
  {
    id: 7001, type: "mcq", category: "node_backend", difficulty: "easy",
    language: "Node.js",
    title: "Node.js Event Loop",
    description: "Node.js is single-threaded but handles concurrent I/O through:",
    starterCode: "",
    expectedConcepts: ["event loop", "non-blocking", "async"],
    options: [
      "Multiple OS threads per request",
      "A blocking event queue",
      "Non-blocking I/O with the event loop",
      "Forked processes for each request",
    ],
    correctAnswer: "Non-blocking I/O with the event loop",
  },
  {
    id: 7002, type: "mcq", category: "node_backend", difficulty: "medium",
    language: "Node.js",
    title: "REST HTTP Methods",
    description: "Which HTTP method is idempotent and should be used to fully replace a resource?",
    starterCode: "",
    expectedConcepts: ["rest", "http", "idempotent"],
    options: ["POST", "PATCH", "PUT", "DELETE"],
    correctAnswer: "PUT",
  },
  {
    id: 7003, type: "mcq", category: "node_backend", difficulty: "hard",
    language: "Node.js",
    title: "CAP Theorem",
    description: "The CAP theorem states that a distributed system can guarantee at most TWO of the following three properties. Which is NOT one of the three?",
    starterCode: "",
    expectedConcepts: ["cap theorem", "distributed systems"],
    options: ["Consistency", "Availability", "Partition Tolerance", "Scalability"],
    correctAnswer: "Scalability",
  },
  // ── General MCQs ──
  {
    id: 8001, type: "mcq", category: "general", difficulty: "easy",
    language: "General",
    title: "Big-O Notation",
    description: "The time complexity O(1) means the algorithm takes:",
    starterCode: "",
    expectedConcepts: ["complexity", "big-o"],
    options: [
      "Linear time based on input",
      "Constant time regardless of input size",
      "Logarithmic time",
      "Quadratic time",
    ],
    correctAnswer: "Constant time regardless of input size",
  },
  {
    id: 8002, type: "mcq", category: "general", difficulty: "medium",
    language: "General",
    title: "SQL JOIN Types",
    description: "Which SQL JOIN returns all rows from the left table, and the matched rows from the right table — NULL for unmatched?",
    starterCode: "",
    expectedConcepts: ["sql", "join"],
    options: ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN"],
    correctAnswer: "LEFT JOIN",
  },
  {
    id: 8003, type: "mcq", category: "general", difficulty: "hard",
    language: "General",
    title: "TCP vs UDP",
    description: "Which statement correctly distinguishes TCP from UDP?",
    starterCode: "",
    expectedConcepts: ["tcp", "udp", "networking"],
    options: [
      "TCP is faster and connectionless; UDP is reliable",
      "UDP guarantees delivery; TCP does not",
      "TCP guarantees ordered delivery; UDP does not guarantee delivery",
      "They are identical for most use cases",
    ],
    correctAnswer: "TCP guarantees ordered delivery; UDP does not guarantee delivery",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CODING QUESTION POOL (abbreviated — kept from before)
// ─────────────────────────────────────────────────────────────────────────────
const CODING_POOL: PoolQuestion[] = [
  {
    id: 101, type: "coding", category: "javascript", difficulty: "easy",
    language: "JavaScript",
    title: "Array Deduplication",
    description: "Write `unique(arr)` that removes duplicates while preserving order.",
    starterCode: "function unique(arr) {\n  // Your code here\n}\n\nconsole.log(unique([1, 2, 2, 3, 1])); // [1, 2, 3]",
    expectedConcepts: ["set", "spread", "filter", "iteration"],
  },
  {
    id: 102, type: "coding", category: "javascript", difficulty: "medium",
    language: "JavaScript",
    title: "Debounce Function",
    description: "Implement `debounce(fn, delay)` — delays `fn` until `delay` ms after last call.",
    starterCode: "function debounce(fn, delay) {\n  // Your code here\n}\n\nconsole.log('debounce ready');",
    expectedConcepts: ["closure", "timeout", "timer", "function"],
  },
  {
    id: 103, type: "coding", category: "javascript", difficulty: "medium",
    language: "JavaScript",
    title: "Memoize Function",
    description: "Build `memoize(fn)` that caches results based on arguments.",
    starterCode: "function memoize(fn) {\n  // Your code here\n}\n\nconst double = memoize(n => n * 2);\nconsole.log(double(5)); // 10",
    expectedConcepts: ["closure", "cache", "map", "recursion"],
  },
  {
    id: 301, type: "coding", category: "python_style", difficulty: "easy",
    language: "JavaScript",
    title: "Word Frequency Counter",
    description: "Given string `text`, return an object of word → count (lowercased, ignore punctuation).",
    starterCode: "function wordCount(text) {\n  // Your code here\n}\n\nconsole.log(wordCount('the cat sat on the mat'));",
    expectedConcepts: ["split", "map", "reduce", "objects", "frequency"],
  },
  {
    id: 303, type: "coding", category: "python_style", difficulty: "hard",
    language: "JavaScript",
    title: "LRU Cache",
    description: "Implement an LRU Cache with `get(key)` and `put(key, val)`. Evict least-recently-used at capacity.",
    starterCode: "class LRUCache {\n  constructor(capacity) {\n    this.map = new Map();\n    this.capacity = capacity;\n  }\n  get(key) { }\n  put(key, value) { }\n}\n\nconst c = new LRUCache(2);\nc.put(1,1); c.put(2,2);\nconsole.log(c.get(1)); // 1",
    expectedConcepts: ["class", "map", "cache", "lru"],
  },
  {
    id: 401, type: "coding", category: "java_oop", difficulty: "easy",
    language: "JavaScript",
    title: "Stack Implementation",
    description: "Build a `Stack` class with push, pop, peek, isEmpty, size.",
    starterCode: "class Stack {\n  constructor() { this.items = []; }\n  push(val) { }\n  pop() { }\n  peek() { }\n  isEmpty() { }\n  size() { }\n}\n\nconst s = new Stack();\ns.push(1); s.push(2);\nconsole.log(s.peek()); // 2",
    expectedConcepts: ["class", "constructor", "push", "pop", "array"],
  },
  {
    id: 402, type: "coding", category: "java_oop", difficulty: "medium",
    language: "JavaScript",
    title: "Observer Pattern",
    description: "Implement a `Subject` with subscribe, unsubscribe, and notify methods.",
    starterCode: "class Subject {\n  constructor() { this.listeners = []; }\n  subscribe(fn) { }\n  unsubscribe(fn) { }\n  notify(data) { }\n}\n\nconst s = new Subject();\ns.subscribe(d => console.log('got:', d));\ns.notify('hello');",
    expectedConcepts: ["class", "observer", "subscribe", "array", "filter"],
  },
  {
    id: 701, type: "coding", category: "dsa", difficulty: "easy",
    language: "JavaScript",
    title: "Two Sum",
    description: "Return indices of two numbers in `nums` that add up to `target`. O(n) using a hash map.",
    starterCode: "function twoSum(nums, target) {\n  // Your code here\n}\n\nconsole.log(twoSum([2,7,11,15], 9)); // [0,1]",
    expectedConcepts: ["hash map", "map", "iteration", "two sum"],
  },
  {
    id: 702, type: "coding", category: "dsa", difficulty: "easy",
    language: "JavaScript",
    title: "Valid Parentheses",
    description: "Return true if the bracket string `s` is valid (correctly nested).",
    starterCode: "function isValid(s) {\n  // Your code here\n}\n\nconsole.log(isValid('()[]{}')); // true\nconsole.log(isValid('([)]')); // false",
    expectedConcepts: ["stack", "push", "pop", "map", "brackets"],
  },
  {
    id: 703, type: "coding", category: "dsa", difficulty: "easy",
    language: "JavaScript",
    title: "Binary Search",
    description: "Implement binary search returning the index or -1 in O(log n).",
    starterCode: "function binarySearch(arr, target) {\n  // Your code here\n}\n\nconsole.log(binarySearch([1,3,5,7,9], 7)); // 3",
    expectedConcepts: ["binary search", "mid", "low", "high"],
  },
  {
    id: 704, type: "coding", category: "dsa", difficulty: "medium",
    language: "JavaScript",
    title: "Maximum Subarray (Kadane's)",
    description: "Find the contiguous subarray with the largest sum (Kadane's Algorithm).",
    starterCode: "function maxSubArray(nums) {\n  // Your code here\n}\n\nconsole.log(maxSubArray([-2,1,-3,4,-1,2,1,-5,4])); // 6",
    expectedConcepts: ["dynamic programming", "max", "kadane", "iteration"],
  },
  {
    id: 706, type: "coding", category: "dsa", difficulty: "hard",
    language: "JavaScript",
    title: "Binary Tree BFS",
    description: "Return level-order traversal of a binary tree as nested arrays.",
    starterCode: "function levelOrder(root) {\n  if (!root) return [];\n  const result = [];\n  // Use a queue\n  return result;\n}\n\nconst tree = {val:3,left:{val:9,left:null,right:null},right:{val:20,left:{val:15,left:null,right:null},right:{val:7,left:null,right:null}}};\nconsole.log(JSON.stringify(levelOrder(tree))); // [[3],[9,20],[15,7]]",
    expectedConcepts: ["bfs", "queue", "level order", "trees"],
  },
  {
    id: 707, type: "coding", category: "dsa", difficulty: "hard",
    language: "JavaScript",
    title: "Coin Change (DP)",
    description: "Return the fewest coins needed to make `amount`. Return -1 if impossible.",
    starterCode: "function coinChange(coins, amount) {\n  // Your code here\n}\n\nconsole.log(coinChange([1,5,6,9], 11)); // 2",
    expectedConcepts: ["dynamic programming", "dp", "Infinity", "min"],
  },
  {
    id: 801, type: "coding", category: "general", difficulty: "easy",
    language: "JavaScript",
    title: "FizzBuzz Extended",
    description: "Write `fizzBuzz(n, rules)` where rules = [{divisor, word}]. Output is array of results 1–n.",
    starterCode: "function fizzBuzz(n, rules) {\n  // Your code here\n}\n\nconsole.log(fizzBuzz(15,[{divisor:3,word:'Fizz'},{divisor:5,word:'Buzz'}]));",
    expectedConcepts: ["modulo", "filter", "map", "iteration"],
  },
  {
    id: 803, type: "coding", category: "general", difficulty: "medium",
    language: "JavaScript",
    title: "Deep Clone",
    description: "Implement `deepClone(obj)` without JSON.parse/stringify.",
    starterCode: "function deepClone(obj) {\n  // Your code here\n}\n\nconst o = {a:1,b:{c:[2,3]}};\nconst c = deepClone(o);\nc.b.c.push(4);\nconsole.log(o.b.c.length); // 2\nconsole.log(c.b.c.length); // 3",
    expectedConcepts: ["recursion", "typeof", "arrays", "objects", "clone"],
  },
  {
    id: 601, type: "coding", category: "node_backend", difficulty: "medium",
    language: "JavaScript",
    title: "Rate Limiter",
    description: "Build `createRateLimiter(maxReq, windowMs)` → `isAllowed(userId)` that rate-limits per user.",
    starterCode: "function createRateLimiter(maxRequests, windowMs) {\n  const map = new Map();\n  return function isAllowed(userId) {\n    // Your code here\n  };\n}\n\nconst lim = createRateLimiter(2, 1000);\nconsole.log(lim('u1')); // true\nconsole.log(lim('u1')); // true\nconsole.log(lim('u1')); // false",
    expectedConcepts: ["closure", "map", "timestamp", "filter", "rate limiting"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SKILL → CATEGORY MAPPING
// ─────────────────────────────────────────────────────────────────────────────
const SKILL_TO_CATEGORIES: Record<string, Category[]> = {
  "JavaScript": ["javascript", "dsa"],
  "TypeScript": ["typescript", "javascript"],
  "React": ["react", "javascript"],
  "Vue.js": ["javascript", "react"],
  "Angular": ["javascript", "react"],
  "Next.js": ["react", "javascript"],
  "Node.js": ["node_backend", "javascript"],
  "Express.js": ["node_backend", "javascript"],
  "NestJS": ["node_backend", "typescript"],
  "Python": ["python_style", "dsa"],
  "Django": ["python_style", "node_backend"],
  "Flask": ["python_style", "node_backend"],
  "FastAPI": ["python_style", "node_backend"],
  "Java": ["java_oop", "dsa"],
  "Spring Boot": ["java_oop", "node_backend"],
  "C++": ["dsa", "java_oop"],
  "C#": ["java_oop", "dsa"],
  "Go": ["node_backend", "dsa"],
  "Rust": ["dsa", "java_oop"],
  "Kotlin": ["java_oop", "dsa"],
  "Scala": ["java_oop", "dsa"],
  "Ruby": ["python_style", "node_backend"],
  "PHP": ["node_backend", "python_style"],
  "Machine Learning": ["python_style", "dsa"],
  "Data Science": ["python_style", "dsa"],
  "Data Structures": ["dsa"],
  "Algorithms": ["dsa"],
  "System Design": ["node_backend", "dsa"],
  "MySQL": ["general", "dsa"],
  "PostgreSQL": ["general", "dsa"],
  "MongoDB": ["general", "node_backend"],
  "AWS": ["node_backend", "general"],
  "Docker": ["node_backend", "general"],
  "GraphQL": ["node_backend", "javascript"],
};

// ─────────────────────────────────────────────────────────────────────────────
// CONCEPT DETECTORS (for coding question evaluation)
// ─────────────────────────────────────────────────────────────────────────────
const CONCEPT_KEYWORDS: Record<string, string[]> = {
  set: ["new Set", "Set(", ".add(", ".has("],
  map: ["new Map", "Map(", ".get(", ".set(", ".has("],
  "hash map": ["new Map", "Map(", "{}", "frequency"],
  stack: ["push(", "pop(", "Stack", "inbox", "outbox"],
  queue: ["shift(", "unshift(", "enqueue", "dequeue"],
  iteration: ["for ", "while ", "forEach", "for...of"],
  filter: [".filter("],
  "array-map": [".map("],
  reduce: [".reduce("],
  sort: [".sort("],
  recursion: ["return levelOrder(", "return deepClone(", "return flatDeep("],
  closure: ["return function", "() =>", "const cache", "let cache"],
  "dynamic programming": ["dp[", "dp =", "memo[", "Infinity", "Math.min(", "Math.max("],
  memoization: ["cache[", "new Map", "memo["],
  class: ["class ", "constructor(", "this."],
  "binary search": ["mid", "lo ", "hi ", "low", "high", "Math.floor("],
  bfs: ["queue", "shift(", "push(", "level", "result.push"],
  "level order": ["shift(", "queue", "level"],
  "two sum": ["complement", "target -", "map.get", "map.set"],
  observer: ["subscribe", "unsubscribe", "notify", "listeners"],
  event: ["on(", "emit(", "off(", "listeners"],
  "rate limiting": ["Date.now()", "timestamp", "filter(", "windowMs"],
  promise: ["Promise", ".then(", "resolve", "reject"],
  "async/await": ["async ", "await "],
  timeout: ["setTimeout", "clearTimeout"],
  immutable: ["...", "Object.assign"],
  "kadane": ["currentMax", "maxCurrent", "current", "maxSoFar"],
  clone: ["deepClone", "structuredClone"],
  "lru": ["Map", "delete", "this.map"],
  string: [".split(", ".join(", ".toLowerCase("],
  frequency: ["count[", "freq[", "{}"],
  modulo: ["%"],
  arrays: [".length", "push(", "[0]"],
  objects: ["Object.keys", "Object.entries"],
  "brackets": ["{", "}", "(", ")"],
};

function detectConcepts(code: string): string[] {
  const found: string[] = [];
  for (const [concept, keywords] of Object.entries(CONCEPT_KEYWORDS)) {
    if (keywords.some((kw) => code.includes(kw))) {
      found.push(concept);
    }
  }
  return found;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function pickRandom<T>(arr: T[], count: number): T[] {
  return shuffle(arr).slice(0, count);
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL CURRENT QUESTIONS → updated each session
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_QUESTIONS: PoolQuestion[] = [
  MCQ_POOL.find(q => q.id === 5001)!,   // Binary Search MCQ (easy)
  MCQ_POOL.find(q => q.id === 1003)!,   // Event Loop MCQ (medium)
  CODING_POOL.find(q => q.id === 701)!,  // Two Sum (easy coding)
  CODING_POOL.find(q => q.id === 704)!,  // Kadane's (medium coding)
];

let currentQuestions: PoolQuestion[] = [...DEFAULT_QUESTIONS];

// ─────────────────────────────────────────────────────────────────────────────
export const assessmentAgent = {
  getQuestions(): AssessmentQuestion[] {
    return currentQuestions;
  },

  /**
   * Dynamically pick a MIXED set of MCQ + Coding questions based on:
   *  - User's detected skill categories
   *  - Resume experience level (difficulty weighting)
   *  - Randomized shuffle so questions differ every session
   *
   * Mix: 2 MCQ + 2 Coding = 4 questions total
   *   Beginner     → 2 easy MCQ + 1 easy coding + 1 medium coding
   *   Intermediate → 1 easy MCQ + 1 medium MCQ + 1 medium coding + 1 hard coding
   *   Advanced     → 1 medium MCQ + 1 hard MCQ + 1 hard coding + 1 hard coding
   */
  generateDynamicQuestions(
    skills: { name: string; weight: number }[],
    level: "Beginner" | "Intermediate" | "Advanced" = "Intermediate"
  ): void {
    const cats = new Set<Category>(["dsa", "general"]);
    skills.slice(0, 8).forEach(({ name }) => {
      (SKILL_TO_CATEGORIES[name] || ["general"]).forEach((c) => cats.add(c));
    });

    // Filter pools by matching categories
    const mcqPool = MCQ_POOL.filter((q) => cats.has(q.category));
    const codingPool = CODING_POOL.filter((q) => cats.has(q.category));

    const mcqEasy   = shuffle(mcqPool.filter(q => q.difficulty === "easy"));
    const mcqMedium = shuffle(mcqPool.filter(q => q.difficulty === "medium"));
    const mcqHard   = shuffle(mcqPool.filter(q => q.difficulty === "hard"));
    const cEasy     = shuffle(codingPool.filter(q => q.difficulty === "easy"));
    const cMedium   = shuffle(codingPool.filter(q => q.difficulty === "medium"));
    const cHard     = shuffle(codingPool.filter(q => q.difficulty === "hard"));

    let selected: PoolQuestion[] = [];

    if (level === "Beginner") {
      selected = [
        ...pickRandom(mcqEasy, 2),
        ...pickRandom(cEasy, 1),
        ...pickRandom(cMedium.length ? cMedium : cEasy, 1),
      ];
    } else if (level === "Advanced") {
      selected = [
        ...pickRandom(mcqMedium.length ? mcqMedium : mcqEasy, 1),
        ...pickRandom(mcqHard.length ? mcqHard : mcqMedium, 1),
        ...pickRandom(cHard.length ? cHard : cMedium, 2),
      ];
    } else {
      // Intermediate
      selected = [
        ...pickRandom(mcqEasy.length ? mcqEasy : mcqMedium, 1),
        ...pickRandom(mcqMedium.length ? mcqMedium : mcqEasy, 1),
        ...pickRandom(cMedium.length ? cMedium : cEasy, 1),
        ...pickRandom(cHard.length ? cHard : cMedium, 1),
      ];
    }

    // Deduplicate by id
    const seen = new Set<number>();
    const unique = selected.filter((q) => {
      if (seen.has(q.id)) return false;
      seen.add(q.id);
      return true;
    });

    // Ensure at least 4 questions total (pad with anything from either pool)
    const allPool = shuffle([...mcqPool, ...codingPool]);
    while (unique.length < 4) {
      const next = allPool.find(q => !seen.has(q.id));
      if (!next) break;
      unique.push(next);
      seen.add(next.id);
    }

    // Shuffle final order so MCQ and coding are interleaved
    currentQuestions = shuffle(unique).slice(0, 4);

    eventBus.emit("AssessmentAgent", "Dashboard", "questions:generated", {
      count: currentQuestions.length,
      categories: [...cats],
      level,
    });
  },

  /**
   * GENUINE BINARY SCORING with Explainable AI review items.
   *  - MCQ: 1 pt if selected === correctAnswer, else 0. Unchanged starter = 0.
   *  - Coding: 1 pt if code is meaningfully different from starter AND has
   *    non-trivial implementation (return + concept coverage >= 0.25).
   *  - Final score = (correct / total) × 100 — genuinely varies per person.
   *  - reviewItems: per-question AI explanation of right/wrong.
   */
  evaluate(answers: string[], mcqSelections: Record<number, string> = {}): SkillScore {
    const total = currentQuestions.length;
    let correct = 0;
    const perQuestion: { q: PoolQuestion; isCorrect: boolean; score: number; conceptsDetected: string[]; conceptsMissed: string[]; userAnswer: string }[] = [];

    currentQuestions.forEach((q, idx) => {
      const answer = answers[idx] || "";

      if (q.type === "mcq") {
        const selected = mcqSelections[q.id] ?? answer;
        const isCorrect = selected.trim() !== "" && selected.trim() === (q.correctAnswer ?? "").trim();
        if (isCorrect) correct++;
        perQuestion.push({ q, isCorrect, score: isCorrect ? 1 : 0, conceptsDetected: [], conceptsMissed: [], userAnswer: selected });

      } else {
        // ── Coding scoring ───────────────────────────────────────────────
        const code = answer.trim();
        const starter = (q.starterCode || "").trim();

        // CRITICAL FIX: If user submitted unchanged starter code → automatic 0
        const isUnmodified = code === starter || code.length === 0 ||
          code.replace(/\/\/.*$/gm, "").replace(/\s+/g, " ").trim() ===
          starter.replace(/\/\/.*$/gm, "").replace(/\s+/g, " ").trim();

        if (isUnmodified) {
          perQuestion.push({ q, isCorrect: false, score: 0, conceptsDetected: [], conceptsMissed: q.expectedConcepts, userAnswer: code });
          return;
        }

        const detected = detectConcepts(code);
        const expected = q.expectedConcepts;

        const conceptHits = expected.filter(c =>
          detected.some(d => d === c || d.includes(c) || c.includes(d) || code.toLowerCase().includes(c.toLowerCase()))
        );
        const conceptsMissed = expected.filter(c => !conceptHits.includes(c));
        const conceptCoverage = expected.length > 0 ? conceptHits.length / expected.length : 0;

        const hasReturn = code.includes("return");
        const meaningfulLength = code.replace(/\/\/.*$/gm, "").replace(/\s+/g, "").length > 40;

        const isCorrect = meaningfulLength && hasReturn && conceptCoverage >= 0.25;
        if (isCorrect) correct++;
        perQuestion.push({ q, isCorrect, score: isCorrect ? 1 : 0, conceptsDetected: detected, conceptsMissed, userAnswer: code });
      }
    });

    // ── Genuine percentage ──────────────────────────────────────────────────
    const scorePercent = total > 0 ? Math.round((correct / total) * 100) : 0;

    // ── Build Explainable AI review items ───────────────────────────────────
    const MCQ_EXPLANATIONS: Record<string, string> = {
      '"object"': "In JavaScript, `typeof null` returns `\"object\"` — this is a historical bug in the language that was never fixed for backwards compatibility.",
      "[2, 4, 6]": "`.map(x => x * 2)` creates a new array by applying the callback to each element. [1,2,3] → [2,4,6].",
      "1 4 3 2": "JavaScript's event loop: synchronous code runs first (1, 4), then microtasks like Promises (3), then macrotasks like setTimeout (2).",
      "3 3 3": "Using `var` in a loop creates a single shared variable in the closure. By the time the timeouts fire, `i` is already 3.",
      "Array.prototype": "`Object.getPrototypeOf([])` returns `Array.prototype` — all arrays inherit from Array.prototype in JavaScript.",
      "string | number": "Union types in TypeScript use the `|` (pipe) operator to express types that can be one of several types.",
      "T": "Generics preserve the exact type. `identity<T>(arg: T): T` returns the same type `T` it receives.",
      "Makes all properties readonly": "`Readonly<T>` is a mapped type that adds `readonly` modifier to every property, preventing mutation.",
      "[2, 3]": "Python slicing `[1:3]` returns elements at index 1 and 2 (exclusive of index 3).",
      "To modify or wrap another function without changing its code": "Decorators are higher-order functions that wrap another function, enabling cross-cutting concerns like logging, caching, and auth.",
      "Multiple threads from executing Python bytecode simultaneously": "The GIL ensures only one thread executes Python bytecode at a time, preventing data corruption in the interpreter.",
      "Encapsulation": "Encapsulation bundles data (attributes) and methods that operate on that data within a single unit (class), hiding implementation details.",
      "Singleton": "The Singleton pattern restricts a class to have exactly one instance, providing a global access point to it.",
      "Objects of a superclass should be replaceable with objects of a subclass": "LSP says subclasses must be substitutable for their base classes without altering program correctness.",
      "O(log n)": "Binary search halves the search space each step: T(n) = T(n/2) + O(1) → O(log n).",
      "LIFO, FIFO": "Stack = Last In First Out (think a stack of plates). Queue = First In First Out (think a checkout line).",
      "Separate Chaining": "Each bucket holds a linked list of colliding keys. Open Addressing stores them in the table itself.",
      "Inorder": "Inorder traversal (Left → Root → Right) visits a BST in sorted ascending order.",
      "Floyd-Warshall": "Floyd-Warshall uses dynamic programming to find shortest paths between ALL pairs of nodes in O(V³).",
      "Queues a state update and schedules a re-render": "React batches state updates for performance. The component re-renders after the current event handler completes.",
      "Only on the first render (mount)": "An empty dependency array `[]` means the effect runs once after the initial render — like `componentDidMount`.",
      "O(n)": "React's diffing algorithm runs in O(n) using two heuristics: different types → replace tree; keyed children → stable matching.",
      "Non-blocking I/O with the event loop": "Node.js delegates I/O to the OS and uses the event loop to receive callbacks, enabling high concurrency on a single thread.",
      "PUT": "PUT is idempotent: calling it multiple times has the same effect as once. POST creates a new resource each time.",
      "Scalability": "CAP Theorem only covers Consistency, Availability, and Partition tolerance. Scalability is NOT one of the three CAP properties.",
      "Constant time regardless of input size": "O(1) means the operation takes the same time regardless of n — e.g. array index lookup, hash map get.",
      "LEFT JOIN": "LEFT JOIN returns all rows from the left table. Non-matching right-side rows appear as NULL.",
      "TCP guarantees ordered delivery; UDP does not guarantee delivery": "TCP uses three-way handshake and ACKs. UDP is connectionless — faster but no delivery guarantee.",
    };

    const reviewItems: import("./types").AssessmentReviewItem[] = perQuestion.map(({ q, isCorrect, userAnswer, conceptsDetected, conceptsMissed }) => {
      if (q.type === "mcq") {
        const correct = q.correctAnswer ?? "";
        const explanation = isCorrect
          ? `✅ Correct! ${MCQ_EXPLANATIONS[correct] ?? "Good understanding of this concept."}`
          : `❌ The correct answer is: **${correct}**. ${MCQ_EXPLANATIONS[correct] ?? "Review this concept in your study materials."}`;
        return {
          questionId: q.id,
          questionTitle: q.title,
          type: "mcq" as const,
          isCorrect,
          userAnswer: userAnswer || "(no selection)",
          correctAnswer: correct,
          explanation,
        };
      } else {
        const unchanged = userAnswer.trim() === "" || userAnswer.trim() === (q.starterCode ?? "").trim();
        let explanation = "";
        if (unchanged) {
          explanation = `❌ **No attempt detected.** The starter code was not modified. Try implementing the function body using: ${q.expectedConcepts.slice(0, 3).join(", ")}.`;
        } else if (isCorrect) {
          explanation = `✅ **Good implementation!** Detected patterns: ${conceptsDetected.slice(0, 4).join(", ")}. Your code covers the key concepts for this question.`;
        } else {
          explanation = `❌ **Incomplete implementation.** Missing key patterns: **${conceptsMissed.slice(0, 3).join(", ")}**. Hint: ${q.description.split(".")[0]}.`;
        }
        return {
          questionId: q.id,
          questionTitle: q.title,
          type: "coding" as const,
          isCorrect,
          userAnswer: userAnswer.slice(0, 200) + (userAnswer.length > 200 ? "…" : ""),
          explanation,
          conceptsDetected,
          conceptsExpected: q.expectedConcepts,
          conceptsMissed,
        };
      }
    });

    // ── Summary categories ──────────────────────────────────────────────────
    const easyQs   = perQuestion.filter(p => p.q.difficulty === "easy");
    const mediumQs = perQuestion.filter(p => p.q.difficulty === "medium");
    const hardQs   = perQuestion.filter(p => p.q.difficulty === "hard");
    const catAvg = (qs: typeof perQuestion) =>
      qs.length ? Math.round((qs.filter(p => p.isCorrect).length / qs.length) * 100) : scorePercent;
    const mcqCorrect  = perQuestion.filter(p => p.q.type === "mcq" && p.isCorrect).length;
    const mcqTotal    = perQuestion.filter(p => p.q.type === "mcq").length;
    const codeCorrect = perQuestion.filter(p => p.q.type === "coding" && p.isCorrect).length;
    const codeTotal   = perQuestion.filter(p => p.q.type === "coding").length;

    const categories = [
      { name: "Problem Solving",      score: catAvg(mediumQs.concat(hardQs)) },
      { name: "Code Quality",         score: codeTotal > 0 ? Math.round((codeCorrect / codeTotal) * 100) : 0 },
      { name: "Conceptual Knowledge", score: mcqTotal > 0 ? Math.round((mcqCorrect / mcqTotal) * 100) : 0 },
      { name: "Algorithm Design",     score: catAvg(hardQs) },
      { name: "Fundamentals",         score: catAvg(easyQs) },
    ];

    const newLevel = scorePercent >= 80 ? "Advanced" : scorePercent >= 50 ? "Intermediate" : "Beginner";

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    if (scorePercent >= 80) strengths.push("Excellent overall performance — strong across all areas");
    if (mcqTotal > 0 && mcqCorrect / mcqTotal >= 0.75) strengths.push("Strong conceptual knowledge across MCQ sections");
    if (codeTotal > 0 && codeCorrect / codeTotal >= 0.75) strengths.push("Solid practical coding skills");
    if (perQuestion.filter(p => p.q.difficulty === "hard" && p.isCorrect).length > 0)
      strengths.push("Successfully solved hard-difficulty challenges");
    if (scorePercent < 50) weaknesses.push("Core fundamentals need more practice");
    if (mcqTotal > 0 && mcqCorrect / mcqTotal < 0.5) weaknesses.push("Conceptual/theory knowledge needs improvement");
    if (codeTotal > 0 && codeCorrect / codeTotal < 0.5) weaknesses.push("Coding implementation skills need more practice");
    if (perQuestion.filter(p => p.q.difficulty === "hard" && !p.isCorrect).length > 1)
      weaknesses.push("Hard problems remain a challenge — focus on advanced patterns");

    const recommendations: string[] = [];
    if (scorePercent < 50) recommendations.push("Review fundamentals: data types, arrays, and basic algorithms");
    if (scorePercent < 70) recommendations.push("Practice daily LeetCode Easy problems and theory MCQs");
    recommendations.push(`Assessed level: ${newLevel} — ${newLevel === "Advanced" ? "consider system design next" : "aim for the next tier"}`);
    if (scorePercent >= 70) recommendations.push("Tackle System Design and advanced DP on LeetCode");
    recommendations.push("Check your Assessment Review for detailed question-by-question explanations");

    const scores: SkillScore = {
      overall: Math.min(scorePercent, 100),
      categories,
      strengths: strengths.length > 0 ? strengths : ["Completed the assessment — review the explanations below!"],
      weaknesses: weaknesses.length > 0 ? weaknesses : [],
      recommendations,
      evaluatedAt: new Date().toISOString(),
      reviewItems,
    };

    (scores as SkillScore & { newLevel: string }).newLevel = newLevel;

    eventBus.emit("AssessmentAgent", "RecommendationAgent", "assessment:completed", {
      score: scorePercent, correct, total, newLevel,
    });

    return scores;
  },
};
