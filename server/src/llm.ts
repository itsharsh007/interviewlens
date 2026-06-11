// LLM provider abstraction. Currently backed by Groq's OpenAI-compatible API.
// Swap the provider here without touching the rest of the codebase.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export async function callLLM(
  system: string,
  history: LLMMessage[],
  maxTokens = 1024,
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set. Add it to your .env file.");
  }
  const model = process.env.GROQ_MODEL ?? DEFAULT_MODEL;

  const messages = [{ role: "system", content: system }, ...history];

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, temperature: 0.5, messages }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${response.status} ${body}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}
