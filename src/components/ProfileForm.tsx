import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, User, Mail, Code, ArrowRight, Upload, CheckCircle2, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlatformStore } from "@/lib/store";

const API = "http://localhost:5000";

const SAMPLE_RESUME = `John Doe
Senior Software Engineer

SKILLS
JavaScript, TypeScript, React, Node.js, Python, Docker, AWS, MongoDB, GraphQL, Redis

EXPERIENCE
5 years building scalable web applications.
- Built React dashboards with TypeScript
- Developed Node.js microservices with MongoDB
- Deployed Docker containers on AWS
- Experience with GraphQL APIs and REST services

PROJECTS
- E-commerce platform built with React and Python FastAPI
- Real-time chat app using WebSockets and Redis`;

const ProfileForm = () => {
  const navigate = useNavigate();
  const { setProfile, profileLoading } = usePlatformStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData]         = useState({ name: "", email: "", skills: "", resumeText: "" });
  const [fileUploaded, setFileUploaded] = useState(false);
  const [fileMessage, setFileMessage]   = useState<{ text: string; type: "info" | "warning" } | null>(null);
  const [fileParsing, setFileParsing]   = useState(false);
  const [step, setStep]                 = useState<"idle" | "analyzing" | "done">("idle");

  /** Parse PDF in the browser using PDF.js CDN, or read TXT/MD as text. Images show guidance. */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileParsing(true);
    setFileMessage(null);

    const name = file.name.toLowerCase();
    const isPDF  = name.endsWith(".pdf") || file.type === "application/pdf";
    const isText = name.endsWith(".txt") || name.endsWith(".md");
    const isImage = name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || file.type.startsWith("image/");

    try {
      if (isPDF) {
        // ── Browser-native PDF parsing via PDF.js CDN ───────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfjsLib = (window as any)["pdfjs-dist/build/pdf"] || (window as any).pdfjsLib;
        if (!pdfjsLib) throw new Error("PDF.js not loaded");
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pages: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page    = await pdf.getPage(i);
          const content = await page.getTextContent();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const text    = content.items.map((item: any) => item.str).join(" ");
          pages.push(text);
        }
        const extracted = pages.join("\n").replace(/ {2,}/g, " ").trim();
        if (!extracted || extracted.length < 20) {
          setFileMessage({ text: "PDF appears to be scanned/image-based. Please paste your resume text below.", type: "warning" });
        } else {
          setFormData(prev => ({ ...prev, resumeText: extracted }));
          setFileUploaded(true);
          setFileMessage({ text: `✓ PDF parsed successfully — ${pdf.numPages} page(s), ${extracted.length} characters extracted.`, type: "info" });
        }

      } else if (isImage) {
        // ── Images: guide user to paste text ───────────────────────────
        setFileMessage({
          text: "Image file detected. Browser cannot extract text from images. Please paste your resume text in the field below, or upload a PDF file instead.",
          type: "warning",
        });

      } else if (isText) {
        // ── Plain text / markdown ───────────────────────────────────────
        const reader = new FileReader();
        reader.onload = (ev) => {
          setFormData(prev => ({ ...prev, resumeText: ev.target?.result as string }));
          setFileUploaded(true);
          setFileMessage({ text: `✓ File loaded: ${file.name}`, type: "info" });
        };
        reader.readAsText(file);

      } else {
        setFileMessage({ text: `Unsupported file type. Please upload PDF, TXT, or MD.`, type: "warning" });
      }
    } catch (err) {
      console.error("File parse error:", err);
      setFileMessage({ text: "Failed to read file. Please paste your resume text manually below.", type: "warning" });
    } finally {
      setFileParsing(false);
    }
  };


  const handleUseSample = () => {
    setFormData((prev) => ({ ...prev, resumeText: SAMPLE_RESUME }));
    setFileUploaded(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep("analyzing");

    const skillsArray = formData.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    await setProfile({
      name: formData.name || "Developer",
      email: formData.email || "dev@mavericks.io",
      skills: skillsArray.length > 0 ? skillsArray : undefined,
      resumeText: formData.resumeText,
    });

    setStep("done");
    setTimeout(() => navigate("/assessment"), 600);
  };

  const isSubmitting = profileLoading || step !== "idle";
  const resumeFilled = formData.resumeText.trim().length > 20;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto w-full glass rounded-2xl p-8 glow-border"
    >
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
          <Sparkles className="w-7 h-7 text-primary-foreground" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">Complete Your Profile</h2>
        <p className="text-muted-foreground text-sm">
          Paste or upload your resume — our AI will extract your skills and personalize your assessment.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Full Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={isSubmitting}
            className="w-full bg-background/50 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
            placeholder="John Doe"
          />
        </div>

        {/* Email */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" /> Email Address
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={isSubmitting}
            className="w-full bg-background/50 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
            placeholder="john@example.com"
          />
        </div>

        {/* Skills */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
            <Code className="w-4 h-4 text-primary" /> Core Skills{" "}
            <span className="text-muted-foreground font-normal text-xs">(optional — auto-extracted from resume)</span>
          </label>
          <input
            type="text"
            value={formData.skills}
            onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
            disabled={isSubmitting}
            className="w-full bg-background/50 border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
            placeholder="React, TypeScript, Node.js"
          />
        </div>

        {/* Resume upload */}
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Resume{" "}
            <span className="text-destructive/80 text-xs font-normal">*required</span>
          </label>

          {/* Upload zone */}
          <div
            onClick={() => !isSubmitting && fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-5 mb-3 cursor-pointer transition-all ${
              resumeFilled
                ? "border-primary/40 bg-primary/5"
                : "border-border hover:border-primary/40 hover:bg-secondary/30"
            } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.txt,.md"
              className="hidden"
              onChange={handleFileChange}
              disabled={isSubmitting || fileParsing}
            />
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${resumeFilled ? "gradient-primary" : "bg-secondary"}`}>
                {fileParsing ? (
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                ) : resumeFilled ? (
                  <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
                ) : (
                  <Upload className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className={`text-sm font-medium ${resumeFilled ? "text-primary" : "text-foreground"}`}>
                  {fileParsing ? "Parsing file..." : fileUploaded ? "Resume file loaded ✓" : "Click to upload resume"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports PDF (auto-extracted), JPG, PNG, TXT, MD
                </p>
              </div>
            </div>
          </div>
          {fileMessage && (
            <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg -mt-1 mb-2 ${
              fileMessage.type === "warning" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
            }`}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {fileMessage.text}
            </div>
          )}

          {/* Paste area */}
          <textarea
            required
            value={formData.resumeText}
            onChange={(e) => {
              setFormData({ ...formData, resumeText: e.target.value });
              setFileUploaded(false);
            }}
            disabled={isSubmitting}
            className="w-full h-36 bg-background/50 border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none transition-colors disabled:opacity-50 font-mono"
            placeholder="Paste your resume content here for AI analysis...&#10;&#10;Include: skills, experience, projects, tools you've used."
          />

          {/* Use sample */}
          {!resumeFilled && (
            <button
              type="button"
              onClick={handleUseSample}
              disabled={isSubmitting}
              className="text-xs text-primary hover:underline mt-1.5 flex items-center gap-1 disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3" /> Use sample resume for demo
            </button>
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={isSubmitting || !resumeFilled}
          className="w-full gradient-primary text-primary-foreground shadow-glow h-12 text-base font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {step === "analyzing" ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing Resume...
            </span>
          ) : step === "done" ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Profile Created!
            </span>
          ) : (
            <>
              Analyze &amp; Start Assessment <ArrowRight className="w-5 h-5 ml-1" />
            </>
          )}
        </Button>

        {resumeFilled && step === "idle" && (
          <p className="text-xs text-center text-muted-foreground">
            AI will extract skills from your resume and personalize your assessment
          </p>
        )}
      </form>
    </motion.div>
  );
};

export default ProfileForm;
