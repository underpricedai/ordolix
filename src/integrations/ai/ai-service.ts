/**
 * AI service for Ordolix - provides AI-powered features via Perplexity API.
 *
 * Uses Perplexity's sonar model for fast, accurate responses.
 * Falls back gracefully when API key is not configured.
 *
 * @module integrations/ai/ai-service
 */

const PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions";

/** Structured response from the Perplexity API. */
interface AIResponse {
  content: string;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

/**
 * Call the Perplexity API with a system prompt and user prompt.
 *
 * @param systemPrompt - Instruction context for the AI model
 * @param userPrompt - The user's actual request content
 * @param options - Optional configuration for max tokens and temperature
 * @returns Parsed AI response with content, model name, and token usage
 * @throws Error if PERPLEXITY_API_KEY is not configured
 * @throws Error if the Perplexity API returns a non-2xx status
 */
async function callPerplexity(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; temperature?: number },
): Promise<AIResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY not configured");
  }

  const response = await fetch(PERPLEXITY_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: options?.maxTokens ?? 1024,
      temperature: options?.temperature ?? 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    model: data.model,
    usage: data.usage,
  };
}

/**
 * Check if AI features are available (API key configured).
 *
 * @returns true if the PERPLEXITY_API_KEY environment variable is set
 */
export function isAIAvailable(): boolean {
  return !!process.env.PERPLEXITY_API_KEY;
}

/**
 * Summarize an issue and its discussion into 2-3 concise sentences.
 *
 * @param issue - The issue data including summary, description, and comments
 * @returns A brief plain-text summary of the issue and its discussion
 *
 * @example
 * ```ts
 * const summary = await summarizeIssue({
 *   summary: "Login page returns 500",
 *   description: "After the last deploy, the login page crashes...",
 *   comments: [{ body: "I can reproduce this", author: "Alice" }],
 * });
 * ```
 */
export async function summarizeIssue(issue: {
  summary: string;
  description: string | null;
  comments: Array<{ body: string; author: string }>;
}): Promise<string> {
  const commentsText = issue.comments
    .map((c) => `${c.author}: ${c.body}`)
    .join("\n");

  const userPrompt = [
    `Issue: ${issue.summary}`,
    issue.description ? `Description: ${issue.description}` : null,
    commentsText ? `Comments:\n${commentsText}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await callPerplexity(
    "You are a concise technical writer. Summarize this issue in 2-3 sentences. Focus on the key problem, current status, and any resolution discussed.",
    userPrompt,
  );

  return result.content;
}

/**
 * Suggest appropriate labels for an issue based on its content.
 *
 * @param issue - Issue data with summary, description, existing labels, and available labels
 * @returns Array of suggested label strings from the available labels pool
 *
 * @example
 * ```ts
 * const labels = await suggestLabels({
 *   summary: "Fix memory leak in worker pool",
 *   description: "The worker pool doesn't release connections...",
 *   existingLabels: ["backend"],
 *   availableLabels: ["bug", "performance", "backend", "frontend", "security"],
 * });
 * // Returns: ["bug", "performance"]
 * ```
 */
export async function suggestLabels(issue: {
  summary: string;
  description: string | null;
  existingLabels: string[];
  availableLabels: string[];
}): Promise<string[]> {
  const userPrompt = [
    `Issue: ${issue.summary}`,
    issue.description ? `Description: ${issue.description}` : null,
    `Current labels: ${issue.existingLabels.join(", ") || "none"}`,
    `Available labels: ${issue.availableLabels.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await callPerplexity(
    "You are a project management assistant. Suggest appropriate labels for this issue from the available labels list. Only suggest labels that are NOT already applied. Return ONLY a JSON array of label strings, nothing else. Example: [\"bug\", \"performance\"]",
    userPrompt,
    { maxTokens: 256 },
  );

  try {
    const parsed = JSON.parse(result.content);
    if (Array.isArray(parsed)) {
      return parsed.filter((l): l is string => typeof l === "string");
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Generate a structured description template for an issue based on its summary and type.
 *
 * @param summary - The issue summary/title
 * @param issueType - The type of issue (e.g., "Bug", "Story", "Task")
 * @returns A markdown-formatted description template
 *
 * @example
 * ```ts
 * const description = await generateDescription(
 *   "Users cannot upload files larger than 10MB",
 *   "Bug",
 * );
 * ```
 */
export async function generateDescription(
  summary: string,
  issueType: string,
): Promise<string> {
  const userPrompt = `Issue type: ${issueType}\nSummary: ${summary}`;

  const result = await callPerplexity(
    "You are a technical writer. Generate a detailed issue description template based on the summary and issue type. Use markdown formatting with appropriate sections (e.g., Steps to Reproduce for bugs, Acceptance Criteria for stories). Keep it concise and actionable.",
    userPrompt,
    { maxTokens: 1024, temperature: 0.3 },
  );

  return result.content;
}

/**
 * Find potentially related issues by analyzing content similarity.
 *
 * @param currentSummary - The summary of the current issue to find relations for
 * @param allIssues - Array of candidate issues with their keys and summaries
 * @returns Top 3-5 related issues with brief explanations of the relationship
 *
 * @example
 * ```ts
 * const related = await suggestRelatedIssues(
 *   "Login page returns 500 error",
 *   [
 *     { key: "PROJ-101", summary: "Auth service timeout" },
 *     { key: "PROJ-102", summary: "Update footer links" },
 *   ],
 * );
 * // Returns: [{ key: "PROJ-101", reason: "Both involve authentication failures" }]
 * ```
 */
export async function suggestRelatedIssues(
  currentSummary: string,
  allIssues: Array<{ key: string; summary: string }>,
): Promise<Array<{ key: string; reason: string }>> {
  if (allIssues.length === 0) {
    return [];
  }

  const issueList = allIssues
    .map((i) => `${i.key}: ${i.summary}`)
    .join("\n");

  const userPrompt = [
    `Current issue: ${currentSummary}`,
    "",
    `Other issues:\n${issueList}`,
  ].join("\n");

  const result = await callPerplexity(
    "You are a project analyst. Find the top 3-5 issues from the list that are most likely related to the current issue. Return ONLY a JSON array of objects with \"key\" and \"reason\" fields. Example: [{\"key\": \"PROJ-1\", \"reason\": \"Both involve auth failures\"}]. If no issues are related, return an empty array [].",
    userPrompt,
    { maxTokens: 512, temperature: 0.2 },
  );

  try {
    const parsed = JSON.parse(result.content);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is { key: string; reason: string } =>
          typeof item === "object" &&
          item !== null &&
          typeof item.key === "string" &&
          typeof item.reason === "string",
      );
    }
    return [];
  } catch {
    return [];
  }
}
