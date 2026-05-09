import { Router } from "express";
import { extractUserId, AuthRequest } from "../middleware/auth.js";
import { Octokit } from "octokit";
import { db } from "../services/firebase.js";
import { doc, getDoc } from "firebase/firestore";

const router = Router();

router.post("/execute", extractUserId, async (req: AuthRequest, res) => {
  const { repo, requirements, branchName = `nexus-ai-${Date.now()}` } = req.body;
  const userId = req.userId!;

  if (!repo || !requirements) {
    return res.status(400).json({ error: "Missing repo or requirements" });
  }

  try {
    const userSnap = await getDoc(doc(db, "users", userId));
    const token = userSnap.data()?.githubToken;
    if (!token) return res.status(400).json({ error: "GitHub token not configured" });

    const octokit = new Octokit({ auth: token });
    const [owner, repoName] = repo.split("/");

    const { data: repository } = await octokit.rest.repos.get({ owner, repo: repoName });
    const defaultBranch = repository.default_branch;

    const { data: ref } = await octokit.rest.git.getRef({
      owner, repo: repoName, ref: `heads/${defaultBranch}`
    });

    await octokit.rest.git.createRef({
      owner, repo: repoName,
      ref: `refs/heads/${branchName}`,
      sha: ref.object.sha
    });

    await octokit.rest.repos.createOrUpdateFileContents({
      owner, repo: repoName,
      path: "NEXUS_REQUIREMENTS.md",
      message: "feat: automated requirements extraction by Nexus AI",
      content: Buffer.from(`# AI Generated Requirements\n\n${requirements}`).toString("base64"),
      branch: branchName
    });

    const { data: pr } = await octokit.rest.pulls.create({
      owner, repo: repoName,
      title: `Nexus AI: ${requirements.split("\n")[0].slice(0, 50)}`,
      head: branchName,
      base: defaultBranch,
      body: `Automated implementation of client requirements:\n\n${requirements}`
    });

    res.json({ success: true, prUrl: pr.html_url, branch: branchName });
  } catch (err: any) {
    console.error("GitHub execute error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/repos", extractUserId, async (req: AuthRequest, res) => {
  try {
    const userSnap = await getDoc(doc(db, "users", req.userId!));
    const token = userSnap.data()?.githubToken;
    if (!token) return res.json([]);

    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated", per_page: 20
    });
    res.json(data.map(r => ({ fullName: r.full_name, description: r.description, defaultBranch: r.default_branch })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
