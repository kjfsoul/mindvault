import { GoogleGenAI, Type } from '@google/genai';
import { ConversationSummary, RawIdea, RawTask } from '../types';

if (!process.env.API_KEY) {
  console.error("API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const summarizerSchema = {
  type: Type.OBJECT,
  properties: {
    rundown: {
      type: Type.STRING,
      description: "A concise summary of the key discussion points.",
    },
    artifacts: {
      type: Type.STRING,
      description: "A list of concrete outputs like decisions, plans, or business ideas mentioned.",
    },
    followUps: {
      type: Type.STRING,
      description: "A list of action items or next steps.",
    },
  },
  required: ['rundown', 'artifacts', 'followUps'],
};

const ideaExtractorSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "A concise, catchy title for the business idea.",
      },
      summary: {
        type: Type.STRING,
        description: "A one-sentence summary of the business idea.",
      },
      tags: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "A list of relevant keywords or tags.",
      },
      confidence: {
        type: Type.INTEGER,
        description: "An initial confidence score from 1 to 100 on the idea's viability.",
      },
      reach: {
        type: Type.INTEGER,
        description: "Estimate the potential reach or revenue impact on a scale of 1-100.",
      },
      urgency: {
        type: Type.INTEGER,
        description: "Estimate the market urgency or need for this idea on a scale of 1-100.",
      },
      marketSize: {
        type: Type.INTEGER,
        description: "Estimate the target market size on a scale of 1-100.",
      },
      effort: {
        type: Type.INTEGER,
        description: "Estimate the implementation effort required on a scale of 1-100 (1=low, 100=high).",
      },
    },
    required: ['title', 'summary', 'tags', 'confidence', 'reach', 'urgency', 'marketSize', 'effort'],
  },
};

const taskifierSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "A clear, executable task.",
      },
      relatedIdeaTitle: {
        type: Type.STRING,
        description: "The exact title of the idea this task is linked to.",
      },
      priority: {
        type: Type.STRING,
        description: "The priority of the task: 'High', 'Medium', or 'Low'.",
      },
    },
    required: ['title', 'relatedIdeaTitle', 'priority'],
  },
};


export const summarizeConversation = async (text: string): Promise<ConversationSummary> => {
  const prompt = `Summarize the following conversation transcript in the R/A/F (Rundown, Artifacts, Follow-ups) format. Rundown: A concise summary of the key discussion points. Artifacts: A list of concrete outputs like decisions, plans, or business ideas mentioned. Follow-ups: A list of action items or next steps.\n\nCONVERSATION:\n${text}`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: summarizerSchema,
    },
  });
  
  return JSON.parse(response.text) as ConversationSummary;
};

export const extractIdeas = async (summary: ConversationSummary): Promise<RawIdea[]> => {
  const prompt = `From the provided conversation summary (especially the 'Artifacts' section), extract up to 5 discrete business ideas. For each idea, provide a concise title, a one-sentence summary, relevant tags, and an initial confidence score (1-100). Also, provide initial estimates for the following metrics on a scale of 1-100:
- Reach: Potential revenue or customer impact.
- Urgency: How pressing the need is for the market.
- Market Size: The size of the potential market.
- Effort: The estimated difficulty and time to implement (1 is very low effort, 100 is very high effort).

Base your estimates on any clues in the text, such as revenue targets, setup times, or described user problems.\n\nSUMMARY:\n${JSON.stringify(summary, null, 2)}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: ideaExtractorSchema,
    },
  });

  return JSON.parse(response.text) as RawIdea[];
};

export const createTasks = async (ideas: RawIdea[]): Promise<RawTask[]> => {
  const prompt = `Based on the following list of business ideas, generate a list of concrete, executable tasks to move them forward. For each task, provide a clear title, link it to the corresponding idea title, and assign a priority (High, Medium, or Low).\n\nIDEAS:\n${JSON.stringify(ideas.map(i => i.title), null, 2)}`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: taskifierSchema,
    },
  });

  return JSON.parse(response.text) as RawTask[];
};
