import { GoogleGenAI, Type, GenerateContentResponse, Chat } from '@google/genai';
import { ConversationSummary, Idea, RawIdea, RawTask } from '../types';

const summarizerSchema = {
  type: Type.OBJECT,
  properties: {
    rundown: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "5 bullet points detailing what changed or was learned in this conversation chunk (R).",
    },
    artifacts: {
      type: Type.OBJECT,
      properties: {
        ideas: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List all explicit business ideas, concepts, or designs mentioned.",
        },
        tasks: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List all executable tasks, action items, or next steps proposed.",
        },
        decisions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List all final choices or decisions reached.",
        },
      },
      required: ["ideas", "tasks", "decisions"],
      description: "All concrete outputs generated (A).",
    },
    followups: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 key actions or questions that must happen next (F).",
    },
  },
  required: ['rundown', 'artifacts', 'followups'],
};

const ideaExtractorSchema = {
    type: Type.OBJECT,
    properties: {
        ideas: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    day_1_revenue_target: { type: Type.NUMBER, description: "The explicit Day 1 revenue goal if stated." },
                    initial_setup_time_hours: { type: Type.NUMBER, description: "The estimated Setup Time (in hours)." },
                    r_reach_score: { type: Type.NUMBER, description: "Reach/Revenue Potential (R) score (1-10)." },
                    u_urgency_score: { type: Type.NUMBER, description: "Urgency/Trend Heat (U) score (1-10)." },
                    m_moat_score: { type: Type.NUMBER, description: "Moat/Scalability (M) score (1-10)." },
                    e_effort_score: { type: Type.NUMBER, description: "Ease/Effort (E) score (1-10, where 10 is easiest)." },
                    confidence: { type: Type.NUMBER, description: "Confidence level (0-1) in the idea's viability, based on the clarity and data in the transcript." },
                    market_analysis: {
                        type: Type.OBJECT,
                        properties: {
                            target_audience: { type: Type.STRING, description: "A specific description of the ideal customer profile." },
                            competitors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of 2-3 key competitors." },
                            unique_selling_proposition: { type: Type.STRING, description: "The core differentiator for this idea." }
                        },
                        required: ["target_audience", "competitors", "unique_selling_proposition"]
                    }
                },
                required: ["title", "summary", "tags", "day_1_revenue_target", "initial_setup_time_hours", "r_reach_score", "u_urgency_score", "m_moat_score", "e_effort_score", "confidence", "market_analysis"]
            }
        }
    },
    required: ["ideas"]
};

const taskifierSchema = {
    type: Type.OBJECT,
    properties: {
        tasks: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    task_id: { type: Type.STRING, description: "A unique, URL-safe identifier for the task (e.g., 'task_abc123')." },
                    idea_id_link: { type: Type.STRING, description: "ID of the parent idea." },
                    title: { type: Type.STRING, description: "Concise task title." },
                    steps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Detailed execution steps." },
                    priority: { type: Type.STRING, "enum": [ "H", "M", "L" ] },
                    prerequisites: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Required tools or prior tasks." },
                    owner: { type: Type.STRING, "enum": [ "Founder", "Dev Partner", "AI Agent" ], default: "Founder" }
                },
                required: ["task_id", "idea_id_link", "title", "steps", "priority"]
            }
        }
    },
    required: ["tasks"]
};


export const summarizeConversation = async (text: string): Promise<ConversationSummary> => {
  if (!process.env.API_KEY) throw new Error("API_KEY environment variable not set");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analyze the attached conversation transcript. Reduce the content to essential data points following the R/A/F structure. Each bullet point should be concise (maximum 18 words).
- Rundown (R): 5 bullet points detailing what changed or was learned.
- Artifacts (A): All concrete outputs generated. This includes lists of explicit business ideas, executable tasks, and final decisions.
- Follow-ups (F): 3 key actions or questions that must happen next.

CONVERSATION:
${text}`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: summarizerSchema,
    },
  });
  
  return JSON.parse(response.text) as ConversationSummary;
};

export const extractIdeas = async (summary: ConversationSummary, conversationText: string): Promise<RawIdea[]> => {
  if (!summary.artifacts.ideas || summary.artifacts.ideas.length === 0) {
    return [];
  }
  if (!process.env.API_KEY) throw new Error("API_KEY environment variable not set");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `Based on the FULL conversation transcript provided, extract all discrete business ideas from the following list. For each idea, perform a critical analysis and provide the requested structured data. Be realistic and objective.

**Follow these steps for EACH idea:**
1.  **Identify Idea:** Clearly state the idea you are analyzing from the list.
2.  **Critical Analysis:** Step-by-step, evaluate the idea against the scoring rubric below. Justify each score briefly.
3.  **Market Analysis:** Fill out the target audience, competitors, and USP.
4.  **Format Output:** Consolidate all data into a single JSON object for this idea and add it to the 'ideas' array.

IDEAS LIST:
- ${summary.artifacts.ideas.join('\n- ')}

**CRITICAL SCORING RUBRIC (Rate from 1-10):**
- **R (Reach/Revenue):** How large is the total addressable market (TAM)? Is there a clear path to monetization? 1 = Niche, low-value problem. 10 = Massive market, high-value problem.
- **U (Urgency/Trend):** How badly do people need this now? Is it aligned with current market trends? 1 = Nice-to-have, fad. 10 = Urgent "hair on fire" problem, strong growing trend.
- **M (Moat/Scalability):** How easy is it to defend against competitors? How scalable is the business model? 1 = Easily copied, requires heavy manual work. 10 = Strong network effects, patentable tech, highly automated.
- **E (Effort/Ease):** How easy is it to build an MVP and get to market? (10 = Easiest). 1 = Requires years of R&D, heavy regulation. 10 = Can be built with no-code tools in a weekend.

**MARKET ANALYSIS:**
- **Target Audience:** Be specific. Who is the ideal customer? What are their demographics and psychographics?
- **Competitors:** List 2-3 direct or indirect competitors.
- **Unique Selling Proposition (USP):** What makes this idea fundamentally different and better than alternatives?

**CONFIDENCE SCORE:**
- Provide a confidence score (0.0 to 1.0) representing your certainty in the viability and accuracy of the extracted data, based *only* on the information present in the transcript.

FULL CONVERSATION TRANSCRIPT:
${conversationText}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: ideaExtractorSchema,
    },
  });
  
  const result = JSON.parse(response.text);
  return result.ideas as RawIdea[];
};

export const createTasks = async (ideas: Idea[]): Promise<RawTask[]> => {
    if (ideas.length === 0) {
        return [];
    }
  if (!process.env.API_KEY) throw new Error("API_KEY environment variable not set");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `For the list of ideas provided, generate a minimum of 3 executable tasks for each idea. Focus on tasks related to setup, compliance, and launching the MVP within a 72-hour timeframe. Link each task to its parent idea using the provided idea 'id'. Generate a unique 'task_id' for each task.

IDEAS:
${JSON.stringify(ideas.map(i => ({ id: i.id, title: i.title })), null, 2)}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: taskifierSchema,
    },
  });

  const result = JSON.parse(response.text);
  return result.tasks as RawTask[];
};

export const researchWithGoogle = async (query: string): Promise<{ text: string; sources: any[] }> => {
  if (!process.env.API_KEY) throw new Error("API_KEY environment variable not set");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response: GenerateContentResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: query,
    config: {
      tools: [{googleSearch: {}}],
    },
  });
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  return { text: response.text, sources };
};

export const generateImage = async (prompt: string, aspectRatio: string): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API_KEY environment variable not set");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
    },
  });

  const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
  return `data:image/jpeg;base64,${base64ImageBytes}`;
};

export const deepDiveOnIdea = async (idea: Idea): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API_KEY environment variable not set");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Perform a deep dive analysis on the following business idea. Be thorough, critical, and provide actionable insights. Consider market viability, potential challenges, scaling strategies, and unique selling propositions.

Idea Title: ${idea.title}
Summary: ${idea.summary}
Day 1 Revenue Target: $${idea.day1RevenueTarget}
Setup Time: ${idea.initialSetupTimeHours} hours
RUME Scores (R/U/M/E): ${idea.rReachScore}/${idea.uUrgencyScore}/${idea.mMoatScore}/${idea.eEffortScore}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 32768 }
    }
  });

  return response.text;
};

// --- CHATBOT ---
const chatSessions = new Map<string, Chat>();

const getChatInstance = (sessionId: string): Chat => {
    if (!chatSessions.has(sessionId)) {
        if (!process.env.API_KEY) throw new Error("API_KEY environment variable not set");
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: 'You are a helpful AI assistant for the MindVault app. You help users understand their business ideas, tasks, and market analysis. When a new session starts, greet the user and offer assistance related to their newly analyzed content.',
            },
        });
        chatSessions.set(sessionId, chat);
    }
    return chatSessions.get(sessionId)!;
}

export const getChatbotResponse = async (sessionId: string, message: string): Promise<string> => {
    const chat = getChatInstance(sessionId);
    const response = await chat.sendMessage({ message });
    return response.text;
};
