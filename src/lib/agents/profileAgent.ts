/**
 * Profile Agent — Whitelist-based tech skill extraction.
 *
 * PROBLEM FIXED: Previous heuristic captured ANY capitalized word,
 *   causing PDF binary garbage (flatedecode, structelem...) to appear as "skills".
 * SOLUTION: Match against an exhaustive canonical tech-skills dictionary.
 *   Only real tech terms match → zero false positives.
 */

import type { UserProfile } from "./types";
import { eventBus } from "./eventBus";
// NOTE: generateDynamicQuestions is called by store.setProfile() only — NOT here.
// Calling it inside createProfile caused a double-call in the orchestrator pipeline
// which re-randomized currentQuestions at score-time, producing constant wrong scores.

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL TECH-SKILLS DICTIONARY
// Key   = display label shown in UI
// Value = lowercase search terms (word-boundary matched in resume text)
// ─────────────────────────────────────────────────────────────────────────────
const TECH_SKILLS: Record<string, string[]> = {
  // ── Programming Languages ──────────────────────────────────────────
  "Python": ["python"],
  "JavaScript": ["javascript", "js", "es6", "es2015", "ecmascript"],
  "TypeScript": ["typescript"],
  "Java": ["java"],
  "C++": ["c\\+\\+", "cpp"],
  "C#": ["c#", "csharp"],
  "Go": ["golang"],
  "Rust": ["rust"],
  "Ruby": ["ruby"],
  "PHP": ["php"],
  "Swift": ["swift"],
  "Kotlin": ["kotlin"],
  "Scala": ["scala"],
  "Dart": ["dart"],
  "Perl": ["perl"],
  "MATLAB": ["matlab"],
  "Bash": ["bash", "shell scripting"],
  "Haskell": ["haskell"],
  "Elixir": ["elixir"],
  // ── Frontend ────────────────────────────────────────────────────────
  "React": ["react"],
  "Vue.js": ["vue\\.js", "vuejs", "vue"],
  "Angular": ["angular"],
  "Next.js": ["next\\.js", "nextjs"],
  "Nuxt.js": ["nuxt"],
  "Svelte": ["svelte"],
  "HTML5": ["html5", "html"],
  "CSS3": ["css3", "css"],
  "Tailwind CSS": ["tailwind"],
  "Bootstrap": ["bootstrap"],
  "SASS": ["sass", "scss"],
  "jQuery": ["jquery"],
  "Redux": ["redux"],
  "Zustand": ["zustand"],
  "Webpack": ["webpack"],
  "Vite": ["vite"],
  "Three.js": ["three\\.js", "threejs"],
  // ── Backend ─────────────────────────────────────────────────────────
  "Node.js": ["node\\.js", "nodejs"],
  "Express.js": ["express\\.js", "expressjs", "express"],
  "Django": ["django"],
  "Flask": ["flask"],
  "FastAPI": ["fastapi"],
  "Spring Boot": ["spring boot"],
  "Spring": ["spring framework"],
  "Laravel": ["laravel"],
  "Ruby on Rails": ["ruby on rails", "rails"],
  "ASP.NET": ["asp\\.net"],
  ".NET": ["\\.net", "dotnet"],
  "NestJS": ["nestjs", "nest\\.js"],
  "Gin": ["gin framework"],
  "Phoenix": ["phoenix framework"],
  // ── Databases ────────────────────────────────────────────────────────
  "MySQL": ["mysql"],
  "PostgreSQL": ["postgresql", "postgres"],
  "MongoDB": ["mongodb", "mongo"],
  "Redis": ["redis"],
  "SQLite": ["sqlite"],
  "Oracle DB": ["oracle"],
  "Cassandra": ["cassandra"],
  "DynamoDB": ["dynamodb"],
  "Firebase": ["firebase"],
  "Supabase": ["supabase"],
  "Elasticsearch": ["elasticsearch"],
  "SQL": ["sql"],
  "NoSQL": ["nosql"],
  "Neo4j": ["neo4j"],
  // ── Cloud & DevOps ─────────────────────────────────────────────────
  "AWS": ["aws", "amazon web services"],
  "Azure": ["azure"],
  "GCP": ["gcp", "google cloud"],
  "Docker": ["docker"],
  "Kubernetes": ["kubernetes", "k8s"],
  "Terraform": ["terraform"],
  "Ansible": ["ansible"],
  "Jenkins": ["jenkins"],
  "GitHub Actions": ["github actions"],
  "CircleCI": ["circleci"],
  "Linux": ["linux", "ubuntu", "debian"],
  "Nginx": ["nginx"],
  "Apache": ["apache"],
  "CI/CD": ["ci\\/cd", "cicd"],
  "Prometheus": ["prometheus"],
  "Grafana": ["grafana"],
  // ── AI / ML / Data ─────────────────────────────────────────────────
  "Machine Learning": ["machine learning"],
  "Deep Learning": ["deep learning"],
  "TensorFlow": ["tensorflow"],
  "PyTorch": ["pytorch"],
  "scikit-learn": ["scikit-learn", "sklearn"],
  "Pandas": ["pandas"],
  "NumPy": ["numpy"],
  "Keras": ["keras"],
  "OpenCV": ["opencv"],
  "Hugging Face": ["hugging face", "huggingface"],
  "NLP": ["natural language processing", "nlp"],
  "Computer Vision": ["computer vision"],
  "Data Science": ["data science"],
  "LangChain": ["langchain"],
  "OpenAI": ["openai"],
  "LLM": ["large language model", "llm"],
  "Spark": ["apache spark", "pyspark"],
  // ── Mobile ──────────────────────────────────────────────────────────
  "React Native": ["react native"],
  "Flutter": ["flutter"],
  "Android": ["android"],
  "iOS": ["ios"],
  "Xamarin": ["xamarin"],
  "Ionic": ["ionic"],
  // ── Testing ─────────────────────────────────────────────────────────
  "Jest": ["jest"],
  "Mocha": ["mocha"],
  "Cypress": ["cypress"],
  "Selenium": ["selenium"],
  "Pytest": ["pytest"],
  "JUnit": ["junit"],
  "Vitest": ["vitest"],
  "Playwright": ["playwright"],
  // ── Messaging / Streaming ───────────────────────────────────────────
  "Apache Kafka": ["kafka"],
  "RabbitMQ": ["rabbitmq"],
  "gRPC": ["grpc"],
  "GraphQL": ["graphql"],
  "REST API": ["rest api", "restful api"],
  "WebSockets": ["websocket", "socket\\.io"],
  // ── Tools & Practices ────────────────────────────────────────────────
  "Git": ["git"],
  "GitHub": ["github"],
  "GitLab": ["gitlab"],
  "Bitbucket": ["bitbucket"],
  "Jira": ["jira"],
  "Agile": ["agile"],
  "Scrum": ["scrum"],
  "Microservices": ["microservices"],
  "System Design": ["system design"],
  "Design Patterns": ["design patterns"],
  "Data Structures": ["data structures"],
  "Algorithms": ["algorithms"],
};

// ─────────────────────────────────────────────────────────────────────────────

const resumeCache = new Map<string, ReturnType<typeof profileAgent.analyzeResume>>();

export const profileAgent = {
  /**
   * Extract ONLY real tech skills from resume text using the whitelist.
   *
   * WHY WHITELIST?
   *  - Zero false positives (no "flatdecode", "imageb", "structelem" from PDFs)
   *  - Covers 100+ canonical tech terms with synonyms
   *  - Frequency-based ranking still applies within the matched set
   */
  analyzeResume(text: string) {
    if (resumeCache.has(text)) return resumeCache.get(text)!;

    const found: Record<string, number> = {};

    for (const [displayName, terms] of Object.entries(TECH_SKILLS)) {
      for (const term of terms) {
        try {
          const regex = new RegExp(`\\b${term}\\b`, "gi");
          const matches = text.match(regex);
          if (matches && matches.length > 0) {
            found[displayName] = (found[displayName] || 0) + matches.length;
            break; // One match per skill per candidate term is enough
          }
        } catch {
          // Skip invalid regex (shouldn't happen with our list)
        }
      }
    }

    // Detect years of experience
    const yearsMatch = text.match(/(\d+)\+?\s*years?\s*(?:of\s+)?(?:experience|exp)/i);
    const yearsExperience = yearsMatch ? parseInt(yearsMatch[1], 10) : 0;

    const extractedSkills = Object.entries(found)
      .map(([name, weight]) => ({ name, weight }))
      .sort((a, b) => b.weight - a.weight);

    // Confidence: 6pts per skill + 4pts per year of experience (cap 100)
    const confidenceScore = Math.min(
      100,
      extractedSkills.length * 6 + yearsExperience * 4 + 10
    );

    // Experience level
    const skillCount = extractedSkills.length;
    let experienceLevel: "Beginner" | "Intermediate" | "Advanced" = "Beginner";
    if (skillCount >= 12 || yearsExperience >= 5) experienceLevel = "Advanced";
    else if (skillCount >= 6 || yearsExperience >= 2) experienceLevel = "Intermediate";

    const result = { extractedSkills, experienceLevel, confidenceScore, yearsExperience };
    resumeCache.set(text, result);
    return result;
  },

  async createProfile(
    data: Partial<UserProfile> & { resumeText?: string }
  ): Promise<UserProfile> {
    try {
      let resumeAnalysis: UserProfile["resumeAnalysis"] | undefined;
      let extractedSkills = data.skills || ["JavaScript"];
      let level: UserProfile["level"] = data.level || "intermediate";

      if (data.resumeText && data.resumeText.trim().length > 20) {
        const analysis = this.analyzeResume(data.resumeText);

        const skillNames = analysis.extractedSkills.map((s) => s.name);

        resumeAnalysis = {
          extractedSkills: skillNames,
          extractedSkillsWeighted: analysis.extractedSkills, // preserved for question generation
          experienceLevel: analysis.experienceLevel,
          confidenceScore: analysis.confidenceScore,
        };

        if (skillNames.length > 0) {
          extractedSkills = skillNames;
        }

        level = analysis.experienceLevel.toLowerCase() as UserProfile["level"];

        // ⚠️  generateDynamicQuestions is intentionally NOT called here.
        //    It is called in store.setProfile() after createProfile returns,
        //    ensuring questions are only set once per session.
      }

      const profile: UserProfile = {
        name: data.name || "Developer",
        email: data.email || "dev@mavericks.io",
        skills: extractedSkills,
        level,
        resumeAnalysis,
        avatar: data.avatar,
        createdAt: new Date().toISOString(),
      };

      eventBus.emit("ProfileAgent", "AssessmentAgent", "agent:profile:done", profile);
      return profile;
    } catch (error) {
      console.error("ProfileAgent error:", error);
      eventBus.emit("ProfileAgent", "Orchestrator", "agent:error", {
        agent: "ProfileAgent",
        error,
      });
      return {
        name: data.name || "Developer",
        email: data.email || "dev@mavericks.io",
        skills: ["JavaScript"],
        level: "beginner",
        createdAt: new Date().toISOString(),
      };
    }
  },
};
