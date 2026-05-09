import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { Octokit } from "octokit";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 5000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // GitHub Push Logic
  app.post("/api/github/execute", async (req, res) => {
    const { token, repo, requirements, branchName = `nexus-ai-${Date.now()}` } = req.body;

    if (!token || !repo || !requirements) {
      return res.status(400).json({ error: "Missing required fields (token, repo, requirements)" });
    }

    try {
      const octokit = new Octokit({ auth: token });
      const [owner, repoName] = repo.split("/");

      // 1. Get default branch
      const { data: repository } = await octokit.rest.repos.get({ owner, repo: repoName });
      const defaultBranch = repository.default_branch;

      // 2. Get latest commit SHA
      const { data: ref } = await octokit.rest.git.getRef({
        owner,
        repo: repoName,
        ref: `heads/${defaultBranch}`,
      });
      const latestCommitSha = ref.object.sha;

      // 3. Create new branch
      await octokit.rest.git.createRef({
        owner,
        repo: repoName,
        ref: `refs/heads/${branchName}`,
        sha: latestCommitSha,
      });

      // 4. Create a "Nexus Requirement" file as a placeholder for the AI's work
      // In a real "Devin" scenario, the AI would modify existing files.
      // Here we simulate the output of the requirements analysis.
      await octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo: repoName,
        path: "NEXUS_REQUIREMENTS.md",
        message: "feat: automated requirements extraction by Nexus AI",
        content: Buffer.from(`# AI Generated Requirements\n\n${requirements}`).toString("base64"),
        branch: branchName,
      });

      // 5. Create Pull Request
      const { data: pr } = await octokit.rest.pulls.create({
        owner,
        repo: repoName,
        title: `Nexus AI: ${requirements.split("\n")[0].slice(0, 50)}`,
        head: branchName,
        base: defaultBranch,
        body: `Automated implementation of client requirements:\n\n${requirements}`,
      });

      res.json({ success: true, prUrl: pr.html_url, branch: branchName });
    } catch (error: any) {
      console.error("Github Execution Error:", error);
      res.status(500).json({ error: error.message || "Failed to execute GitHub tasks" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
