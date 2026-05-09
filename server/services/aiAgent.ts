import { GoogleGenAI } from "@google/genai";
import { db } from "./firebase.js";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";

function getAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  return new GoogleGenAI({ apiKey: key });
}

export async function categorizeMessage(content: string): Promise<{
  category: "client" | "relative" | "undetermined";
  isNewClient: boolean;
  summary: string;
}> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [{
          text: `Analyze this message and classify the sender.

Message: "${content}"

Respond ONLY with valid JSON:
{
  "category": "client" | "relative" | "undetermined",
  "isNewClient": true | false,
  "summary": "one sentence describing the request or context"
}`
        }]
      }]
    });
    const text = response.text?.trim() || "";
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        category: parsed.category || "undetermined",
        isNewClient: parsed.isNewClient ?? false,
        summary: parsed.summary || ""
      };
    }
  } catch (err) {
    console.error("categorizeMessage error:", err);
  }
  return { category: "undetermined", isNewClient: false, summary: "" };
}

export async function extractRequirements(content: string): Promise<string> {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [{
          text: `Extract clear, structured technical requirements from this client message. Be specific and actionable.

Message: "${content}"

Provide a numbered list of requirements:`
        }]
      }]
    });
    return response.text?.trim() || content;
  } catch (err) {
    console.error("extractRequirements error:", err);
    return content;
  }
}

export async function runAgentLoop(
  requirements: string,
  taskId: string,
  userId: string,
  githubRepo?: string | null,
  githubToken?: string | null
): Promise<{ result: string; prUrl?: string }> {
  const ai = getAI();
  const taskRef = doc(db, "users", userId, "tasks", taskId);
  const MAX_ITERATIONS = 4;

  let currentDraft = "";
  let satisfied = false;
  let iteration = 0;

  await updateDoc(taskRef, { status: "executing", executionCount: 1 });

  while (!satisfied && iteration < MAX_ITERATIONS) {
    iteration++;

    const generationPrompt = iteration === 1
      ? `You are an expert AI developer assistant. Based on these client requirements, produce a complete, high-quality solution.

Requirements:
${requirements}

Produce the full solution (code, content, plan, or whatever is appropriate). Be thorough and production-ready.`
      : `You are an expert AI developer assistant. Improve this draft based on the requirements.

Requirements:
${requirements}

Previous draft:
${currentDraft}

Improve it. Fix any issues, add missing pieces, and make it production-ready.`;

    const genRes = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: generationPrompt }] }]
    });
    currentDraft = genRes.text?.trim() || currentDraft;

    await updateDoc(taskRef, { executionCount: iteration, currentDraft });

    const reviewRes = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{
        role: "user",
        parts: [{
          text: `Review this solution against the requirements. Is it complete, correct, and production-ready?

Requirements:
${requirements}

Solution:
${currentDraft}

Respond ONLY with JSON: {"satisfied": true|false, "issues": "list any issues or empty string"}`
        }]
      }]
    });

    const reviewText = reviewRes.text?.trim() || "";
    const reviewMatch = reviewText.match(/\{[\s\S]*\}/);
    if (reviewMatch) {
      try {
        const review = JSON.parse(reviewMatch[0]);
        satisfied = review.satisfied === true;
      } catch { satisfied = false; }
    }
  }

  let prUrl: string | undefined;

  if (githubRepo && githubToken) {
    try {
      const { Octokit } = await import("octokit");
      const octokit = new Octokit({ auth: githubToken });
      const [owner, repoName] = githubRepo.split("/");
      const branchName = `nexus-ai-${Date.now()}`;

      const { data: repository } = await octokit.rest.repos.get({ owner, repo: repoName });
      const defaultBranch = repository.default_branch;
      const { data: ref } = await octokit.rest.git.getRef({ owner, repo: repoName, ref: `heads/${defaultBranch}` });

      await octokit.rest.git.createRef({
        owner, repo: repoName,
        ref: `refs/heads/${branchName}`,
        sha: ref.object.sha
      });

      await octokit.rest.repos.createOrUpdateFileContents({
        owner, repo: repoName,
        path: "NEXUS_AI_RESULT.md",
        message: "feat: Nexus AI automated implementation",
        content: Buffer.from(`# Nexus AI Result\n\n## Requirements\n${requirements}\n\n## Solution\n${currentDraft}`).toString("base64"),
        branch: branchName
      });

      const { data: pr } = await octokit.rest.pulls.create({
        owner, repo: repoName,
        title: `Nexus AI: ${requirements.split("\n")[0].slice(0, 60)}`,
        head: branchName,
        base: defaultBranch,
        body: `Automated implementation by Nexus AI.\n\n## Requirements\n${requirements}\n\n## Solution\n${currentDraft}`
      });

      prUrl = pr.html_url;
    } catch (err: any) {
      console.error("GitHub push error:", err.message);
    }
  }

  await updateDoc(taskRef, {
    status: "completed",
    result: currentDraft,
    githubPrUrl: prUrl || null,
    completedAt: serverTimestamp()
  });

  await addDoc(collection(db, "users", userId, "results"), {
    taskId,
    result: currentDraft,
    requirements,
    githubPrUrl: prUrl || null,
    createdAt: serverTimestamp(),
    read: false
  });

  return { result: currentDraft, prUrl };
}
