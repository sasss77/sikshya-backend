import { Router, Request, Response } from "express";
import Groq from "groq-sdk";

const router = Router();

// Initialize Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.1-8b-instant"; // Ultra-fast Llama 3 model

// ─── System context for Sikshya chatbot ────────────────────────────────────
const SIKSHYA_SYSTEM_PROMPT = `You are Sikshya AI, the intelligent learning assistant embedded in the Sikshya platform — a peer-to-peer tutoring marketplace in Nepal.

About Sikshya:
- Students can find and book verified peer tutors for SLC, SEE, +2, and university-level subjects
- Tutors are high-achieving peers who understand the local curriculum (Nepal)
- Subjects available: Physics, Chemistry, Biology, Mathematics, Economics, Accounting, English, Computer Science, and more
- Session prices start from Rs. 600/hour
- Students can use the MCQ Generator to create AI-powered practice questions
- All bookings are managed from the "My Bookings" dashboard section
- Users can chat directly with tutors via the Messages section

Your personality:
- Friendly, encouraging, and helpful
- Use Nepali context where relevant (mention rupees, Nepal curriculum, etc.)
- Keep responses concise but informative (2-4 sentences max unless explaining a concept)
- Use emojis occasionally to be warm and approachable
- If asked about a specific topic/subject, give genuinely helpful study tips
- If asked about a tutor, mention how to find one via Find Tutors page
- Never make up specific tutor names — only guide users to the platform

IMPORTANT: If a student asks you to explain a concept (Physics, Biology, Math, etc.), provide a clear, helpful explanation tailored for high school / +2 level students in Nepal.`;

// ─── POST /api/ai/chat ──────────────────────────────────────────────────────
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body as {
      message: string;
      history?: Array<{ role: "user" | "model"; parts: string }>;
    };

    if (!message?.trim()) {
      return res.status(400).json({ success: false, error: "Message is required" });
    }

    // Build standard OpenAI/Groq message history
    const messages = [
      { role: "system", content: SIKSHYA_SYSTEM_PROMPT },
      ...(history || []).map((h) => ({
        role: h.role === "model" ? "assistant" : "user",
        content: h.parts,
      })),
      { role: "user", content: message },
    ];

    const chatCompletion = await groq.chat.completions.create({
      messages: messages as any,
      model: MODEL,
      temperature: 0.7,
      max_tokens: 512,
    });

    const text = chatCompletion.choices[0]?.message?.content || "";

    return res.json({ success: true, reply: text });
  } catch (err: any) {
    console.error("[AI Chat Error]:", err.message);
    return res.status(500).json({
      success: false,
      error: "AI service temporarily unavailable. Please try again.",
    });
  }
});

// ─── POST /api/ai/mcq ───────────────────────────────────────────────────────
router.post("/mcq", async (req: Request, res: Response) => {
  try {
    const { subject, difficulty, count, topic } = req.body as {
      subject: string;
      difficulty: string;
      count: number;
      topic?: string;
    };

    if (!subject || !difficulty || !count) {
      return res.status(400).json({ success: false, error: "subject, difficulty, and count are required" });
    }

    const topicClause = topic?.trim()
      ? `Focus specifically on the topic: "${topic}".`
      : `Cover a broad range of important topics in ${subject}.`;

    const prompt = `Generate exactly ${count} multiple-choice questions for the subject "${subject}" at "${difficulty}" difficulty level.
${topicClause}
Target audience: High school / +2 level students in Nepal (NEB curriculum).

STRICT JSON FORMAT — respond with ONLY valid JSON, no markdown, no code blocks, no explanation:
{
  "questions": [
    {
      "id": 1,
      "question": "Question text here?",
      "options": [
        { "label": "A", "text": "Option A text" },
        { "label": "B", "text": "Option B text" },
        { "label": "C", "text": "Option C text" },
        { "label": "D", "text": "Option D text" }
      ],
      "correct": "B",
      "explanation": "Brief explanation of why B is correct."
    }
  ]
}

Rules:
- Each question must have exactly 4 options (A, B, C, D)
- "correct" must be exactly one of: "A", "B", "C", "D"
- Vary the correct answer across questions (don't always make it B)
- Questions must be factually accurate and appropriate for the difficulty level
- Explanations must be clear, concise, and educational
- Do NOT include any text before or after the JSON`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are an AI that strictly outputs valid JSON only. No markdown, no pre-text." },
        { role: "user", content: prompt }
      ],
      model: MODEL,
      temperature: 0.5,
    });

    const rawText = chatCompletion.choices[0]?.message?.content || "";

    // Strip markdown code blocks if model wrapped in \`\`\`json ... \`\`\`
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed.questions)) {
      throw new Error("Invalid AI response structure");
    }

    return res.json({ success: true, questions: parsed.questions });
  } catch (err: any) {
    console.error("[AI MCQ Error]:", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to generate questions. Please try again.",
    });
  }
});

export default router;
