import { GoogleGenAI } from "@google/genai";
import { 
  RecommendResponse, 
  SplitTaskResponse, 
  ScheduleResponseItem, 
  AnalyzeResponse 
} from "../types/dto";

// Can be overridden for a project that has a different model entitlement.
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";

export class AIConfigurationError extends Error {
  constructor() {
    super("GEMINI_API_KEY is not configured");
    this.name = "AIConfigurationError";
  }
}

/** Create the client lazily so a missing key is reported clearly to the API caller. */
function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new AIConfigurationError();
  return new GoogleGenAI({ apiKey });
}

/**
 * Generate a response in a chat session context, incorporating current tasks.
 */
export async function generateChatReply(
  messages: Array<{ sender: "user" | "ai"; text: string }> = [],
  tasks: Array<any> = [],
  currentMessage?: string
): Promise<string> {
  const ai = getAIClient();
  const lastUserMsg = currentMessage || (messages[messages.length - 1]?.sender === "user" ? messages[messages.length - 1].text : "");
  
  // Gemini chat history must start with a user message and alternate roles.
  // The UI's welcome text is an AI message, so passing it as the first item
  // causes Gemini to reject even the user's first question.
  const previousMessages = messages.slice(
    0,
    messages[messages.length - 1]?.sender === "user" ? -1 : undefined,
  );
  const history: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
  for (const msg of previousMessages) {
    const role = msg.sender === "user" ? "user" : "model";
    if (history.length === 0 && role !== "user") continue;
    if (history.at(-1)?.role === role) continue;
    history.push({ role, parts: [{ text: msg.text }] });
  }

  const systemInstruction = `You are a helpful AI assistant for a task management application called ToDone.
The user's current tasks are:
${tasks.map(t => `- [${t.completed ? "x" : " "}] ${t.title} (Deadline: ${t.deadline}, Priority: ${t.priority}, Category: ${t.category}, Duration: ${t.duration || "N/A"} mins)`).join("\n")}

Help the user manage their tasks, give study advice, split tasks, or plan their schedule.
Please reply in Japanese. Keep your responses friendly, encouraging, and helpful.`;

  const chat = ai.chats.create({
    model: GEMINI_MODEL,
    config: {
      systemInstruction,
    },
    history,
  });

  const response = await chat.sendMessage({ message: lastUserMsg || "こんにちは" });
  return response.text || "";
}

/**
 * Analyze tasks and calendar events to recommend what to do today.
 */
export async function generateRecommendation(
  tasks: Array<any>,
  calendarEvents: Array<any>
): Promise<RecommendResponse> {
  const ai = getAIClient();
  const taskListText = tasks.map(t => `- ID: ${t.id}, Title: "${t.title}", Deadline: "${t.deadline}", Priority: "${t.priority}", Category: "${t.category}"`).join("\n");
  const eventListText = calendarEvents.map(e => {
    const start = e.start?.dateTime || e.start?.date || "N/A";
    const end = e.end?.dateTime || e.end?.date || "N/A";
    return `- Title: "${e.summary}", Start: "${start}", End: "${end}"`;
  }).join("\n");

  const prompt = `Based on the following incomplete tasks and today's calendar events, recommend the tasks the user should focus on today.
Choose 1 to 4 tasks from the task list.

Incomplete tasks:
${taskListText}

Today's calendar events:
${eventListText || "None"}

Please output your response in JSON matching this schema:
{
  "recommendations": [
    {
      "title": "Exact Title of the recommended task (must match one of the task titles)",
      "reason": "Reason for recommendation in Japanese",
      "priority": 1
    }
  ],
  "summary": "A brief summary of today's recommendation in Japanese",
  "motivation": "An encouraging motivation message in Japanese"
}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          recommendations: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                reason: { type: "STRING" },
                priority: { type: "INTEGER" }
              },
              required: ["title", "reason", "priority"]
            }
          },
          summary: { type: "STRING" },
          motivation: { type: "STRING" }
        },
        required: ["recommendations", "summary", "motivation"]
      }
    }
  });

  const parsed = JSON.parse(response.text || "{}");
  
  // Match titles back to IDs
  const suggestedTasks: string[] = [];
  if (Array.isArray(parsed.recommendations)) {
    for (const rec of parsed.recommendations) {
      const matched = tasks.find(t => t.title === rec.title);
      if (matched) {
        suggestedTasks.push(String(matched.id));
      }
    }
  }

  return {
    recommendations: parsed.recommendations || [],
    suggestedTasks,
    summary: parsed.summary || "",
    motivation: parsed.motivation || ""
  };
}

/**
 * Split a task into smaller actionable subtasks.
 */
export async function generateTaskSplit(
  title: string,
  category: string
): Promise<SplitTaskResponse> {
  const ai = getAIClient();
  const prompt = `Please split the task "${title}" (Category: "${category}") into a sequential checklist of smaller, action-oriented subtasks (e.g., 20-minute steps).
Please generate 3 to 6 steps in Japanese. Make them specific and actionable.
Output JSON format matching this schema:
{
  "subtasks": [
    "Step 1 text with duration",
    "Step 2 text with duration"
  ]
}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          subtasks: {
            type: "ARRAY",
            items: { type: "STRING" }
          }
        },
        required: ["subtasks"]
      }
    }
  });

  const parsed = JSON.parse(response.text || "{}");
  const subtasks = parsed.subtasks || [];
  return {
    subtasks,
    steps: subtasks
  };
}

/**
 * Generate a schedule timeline mapping tasks into free slots.
 */
export async function generateSchedule(
  tasks: Array<any>,
  calendarEvents: Array<any>,
  currentTime?: string
): Promise<ScheduleResponseItem[]> {
  const ai = getAIClient();
  const taskListText = tasks.map(t => `- ID: ${t.id}, Title: "${t.title}", Deadline: "${t.deadline}", Priority: "${t.priority}", Category: "${t.category}", Duration: ${t.duration || "N/A"} mins`).join("\n");
  const eventListText = calendarEvents.map(e => {
    const start = e.start?.dateTime || e.start?.date || "N/A";
    const end = e.end?.dateTime || e.end?.date || "N/A";
    return `- Title: "${e.summary}", Start: "${start}", End: "${end}"`;
  }).join("\n");

  const nowStr = currentTime || new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

  const prompt = `You are a scheduling AI. Plan a timeline for the user's day today.
Create a schedule starting from the current time: ${nowStr}.
Integrate the user's existing calendar events and schedule some of their tasks into the free/empty slots.

Tasks:
${taskListText}

Today's Calendar Events:
${eventListText || "None"}

Please output an array of schedule items, where each item represents an event or task scheduled today. Ensure start and end times do not conflict.
Output JSON format matching this schema:
[
  {
    "start": "HH:MM",
    "end": "HH:MM",
    "task": "Title of the task or calendar event",
    "reason": "Reason for scheduling this here in Japanese"
  }
]`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            start: { type: "STRING" },
            end: { type: "STRING" },
            task: { type: "STRING" },
            reason: { type: "STRING" }
          },
          required: ["start", "end", "task", "reason"]
        }
      }
    }
  });

  const parsed = JSON.parse(response.text || "[]");
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Analyze completed tasks to calculate score and offer feedback.
 */
export async function generateAnalysis(
  completedTasks: Array<any>
): Promise<AnalyzeResponse> {
  const ai = getAIClient();
  const completedText = completedTasks.map(t => `- Title: "${t.title}", Deadline: "${t.deadline}", Priority: "${t.priority}", Category: "${t.category}", Duration: ${t.duration || "N/A"} mins`).join("\n");

  const prompt = `Analyze the user's study productivity based on the list of completed tasks.
Give feedback on their strengths, areas of improvement (weaknesses), and advice for future tasks.
Also, assign a productivity score out of 100.

Completed tasks:
${completedText || "No completed tasks found in this period."}

Please output your response in JSON matching this schema:
{
  "score": 85,
  "strengths": ["list of strengths in Japanese"],
  "weaknesses": ["list of weaknesses in Japanese"],
  "advice": ["list of actionable advice in Japanese"]
}`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          score: { type: "INTEGER" },
          strengths: { type: "ARRAY", items: { type: "STRING" } },
          weaknesses: { type: "ARRAY", items: { type: "STRING" } },
          advice: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["score", "strengths", "weaknesses", "advice"]
      }
    }
  });

  const parsed = JSON.parse(response.text || "{}");
  return {
    score: typeof parsed.score === "number" ? parsed.score : 80,
    strengths: parsed.strengths || [],
    weaknesses: parsed.weaknesses || [],
    advice: parsed.advice || []
  };
}
