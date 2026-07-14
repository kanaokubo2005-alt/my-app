import "dotenv/config";
import express from "express";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
import { 
  generateChatReply, 
  generateRecommendation, 
  generateTaskSplit, 
  generateSchedule, 
  generateAnalysis 
} from "./services/ai";
import { requireAuth } from "./middlewares/auth";
import calendarRouter from "./routes/calendar";
import { getTodayEvents } from "./services/googleCalendar";

// PostgreSQL connection config (must configure SSL for Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["query"] });

const app = express();
const PORT = process.env.PORT || 8888;

// Configure template engine for legacy EJS routes
app.set("view engine", "ejs");
app.set("views", "./views");

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Manual CORS middleware for frontend communication
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Google-Token");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use("/api/calendar", calendarRouter);

// Legacy User views routes
app.get("/", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.render("index", { users });
  } catch (error) {
    console.error("Error loading users view:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/users", async (req, res) => {
  try {
    const name = req.body.name;
    if (name) {
      await prisma.user.create({ data: { name } });
    }
    res.redirect("/");
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).send("Internal Server Error");
  }
});

// --- Task CRUD API ---

// Helper function to dynamically promote task priority based on deadline
const getDynamicPriority = (deadlineStr: string, originalPriority: string): string => {
  try {
    const deadlineDate = new Date(deadlineStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
      return "high";
    } else if (diffDays <= 3) {
      return originalPriority === "high" ? "high" : "medium";
    }
    return originalPriority;
  } catch {
    return originalPriority;
  }
};

// 1. Get all tasks
app.get("/api/tasks", async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { id: "asc" },
    });
    // Format id as string and apply dynamic priority logic
    const formatted = tasks.map((t) => ({
      ...t,
      id: String(t.id),
      priority: getDynamicPriority(t.deadline, t.priority),
    }));
    res.json(formatted);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// 2. Create a task
app.post("/api/tasks", async (req, res) => {
  try {
    const { title, deadline, priority, category, duration, completed, description } = req.body;
    if (!title || !deadline || !priority || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const task = await prisma.task.create({
      data: {
        title,
        deadline,
        priority,
        category,
        duration: (duration === undefined || duration === null || duration === "") ? null : Number(duration),
        completed: Boolean(completed),
        description: description || null,
      },
    });
    res.status(201).json({
      ...task,
      id: String(task.id),
      priority: getDynamicPriority(task.deadline, task.priority),
    });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// 3. Update a task
app.put("/api/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }
    const { title, deadline, priority, category, duration, completed, description } = req.body;

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (deadline !== undefined) data.deadline = deadline;
    if (priority !== undefined) data.priority = priority;
    if (category !== undefined) data.category = category;
    if (duration !== undefined) {
      data.duration = (duration === null || duration === "") ? null : Number(duration);
    }
    if (completed !== undefined) data.completed = Boolean(completed);
    if (description !== undefined) data.description = description;

    const task = await prisma.task.update({
      where: { id },
      data,
    });
    res.json({
      ...task,
      id: String(task.id),
      priority: getDynamicPriority(task.deadline, task.priority),
    });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// 4. Delete a task
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }
    await prisma.task.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// --- Team & Collaboration API ---

// 1. Get all teams with members, tasks, notes, files
app.get("/api/teams", async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        members: true,
        tasks: true,
        sharedFiles: true,
        sharedNotes: true,
      },
      orderBy: { id: "asc" },
    });

    // If no teams exist, create a default University Joint Team
    if (teams.length === 0) {
      const defaultTeam = await prisma.team.create({
        data: {
          name: "大学合同ゼミチーム",
          description: "ゼミ・共同研究プロジェクトのタスク・情報管理スペース",
          members: {
            create: [
              { name: "大久保 佳奈", role: "管理者 (You)", avatarColor: "bg-cobalt", activeTask: "初期チーム設定と計画", status: "active" },
              { name: "山田 太郎", role: "リサーチャー", avatarColor: "bg-emerald-500", activeTask: "先行文献調査", status: "active" },
              { name: "佐藤 花子", role: "デザイナー", avatarColor: "bg-pink-500", activeTask: "スライド資料デザイン", status: "away" },
            ]
          },
          tasks: {
            create: [
              {
                title: "キックオフミーティングの開催",
                assignedTo: "大久保 佳奈",
                progress: 10,
                description: "チーム発足に当たり、アジェンダ設定、役割分担の確認、目標の合意形成を行う。",
                recurrence: "none",
              }
            ]
          }
        },
        include: {
          members: true,
          tasks: true,
          sharedFiles: true,
          sharedNotes: true,
        }
      });
      return res.json([
        {
          ...defaultTeam,
          id: String(defaultTeam.id),
          members: defaultTeam.members.map(m => ({ ...m, id: String(m.id) })),
          tasks: defaultTeam.tasks.map(t => ({
            ...t,
            id: String(t.id),
            recurrenceDays: t.recurrenceDays ? JSON.parse(t.recurrenceDays) : undefined,
            attachments: t.attachments ? JSON.parse(t.attachments) : [],
            links: t.links ? JSON.parse(t.links) : []
          })),
          sharedFiles: defaultTeam.sharedFiles.map(f => ({ ...f, id: String(f.id) })),
          sharedNotes: defaultTeam.sharedNotes.map(n => ({ ...n, id: String(n.id) })),
        }
      ]);
    }

    const formatted = teams.map((team) => ({
      ...team,
      id: String(team.id),
      members: team.members.map(m => ({ ...m, id: String(m.id) })),
      tasks: team.tasks.map(t => ({
        ...t,
        id: String(t.id),
        recurrenceDays: t.recurrenceDays ? JSON.parse(t.recurrenceDays) : undefined,
        attachments: t.attachments ? JSON.parse(t.attachments) : [],
        links: t.links ? JSON.parse(t.links) : []
      })),
      sharedFiles: team.sharedFiles.map(f => ({ ...f, id: String(f.id) })),
      sharedNotes: team.sharedNotes.map(n => ({ ...n, id: String(n.id) })),
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Error fetching teams:", error);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
});

// 2. Create a team
app.post("/api/teams", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Team name is required" });

    const team = await prisma.team.create({
      data: {
        name,
        description: description || "共同作業タスク・情報管理スペース",
        members: {
          create: [
            { name: "大久保 佳奈", role: "管理者 (You)", avatarColor: "bg-cobalt", activeTask: "初期チーム設定と計画", status: "active" }
          ]
        }
      },
      include: {
        members: true,
        tasks: true,
        sharedFiles: true,
        sharedNotes: true,
      }
    });

    res.json({
      ...team,
      id: String(team.id),
      members: team.members.map(m => ({ ...m, id: String(m.id) })),
      tasks: team.tasks.map(t => ({
        ...t,
        id: String(t.id),
        recurrenceDays: t.recurrenceDays ? JSON.parse(t.recurrenceDays) : undefined,
        attachments: t.attachments ? JSON.parse(t.attachments) : [],
        links: t.links ? JSON.parse(t.links) : []
      })),
      sharedFiles: team.sharedFiles.map(f => ({ ...f, id: String(f.id) })),
      sharedNotes: team.sharedNotes.map(n => ({ ...n, id: String(n.id) })),
    });
  } catch (error) {
    console.error("Error creating team:", error);
    res.status(500).json({ error: "Failed to create team" });
  }
});

// 3. Add member to team
app.post("/api/teams/:teamId/members", async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    const { name, role, avatarColor, activeTask, status } = req.body;
    if (!name || !role) return res.status(400).json({ error: "Name and role are required" });

    const member = await prisma.teamMember.create({
      data: {
        teamId,
        name,
        role,
        avatarColor: avatarColor || "bg-cobalt",
        activeTask: activeTask || "未アサインのタスク",
        status: status || "active"
      }
    });

    res.json({
      ...member,
      id: String(member.id),
    });
  } catch (error) {
    console.error("Error adding member:", error);
    res.status(500).json({ error: "Failed to add member" });
  }
});

// 4. Add task to team (supports files and notes if specified)
app.post("/api/teams/:teamId/tasks", async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    const { 
      title, 
      assignedTo, 
      description, 
      recurrence, 
      recurrenceDays, 
      attachments, 
      links,
      fileAttachment, // optional file to upload to sharedFiles
      noteAttachment  // optional note to upload to sharedNotes
    } = req.body;

    if (!title) return res.status(400).json({ error: "Task title is required" });

    // Create the task
    const task = await prisma.teamTask.create({
      data: {
        teamId,
        title,
        assignedTo: assignedTo || "未設定",
        description: description || "",
        recurrence: recurrence || "none",
        recurrenceDays: recurrenceDays ? JSON.stringify(recurrenceDays) : null,
        attachments: attachments ? JSON.stringify(attachments) : null,
        links: links ? JSON.stringify(links) : null,
      }
    });

    // If there is a file attachment, write to SharedFile
    let newFile = null;
    if (fileAttachment) {
      newFile = await prisma.sharedFile.create({
        data: {
          teamId,
          name: fileAttachment.name,
          size: fileAttachment.size || "1.5 MB",
          type: fileAttachment.type,
          uploadedBy: "大久保 佳奈",
          associatedTask: title,
          uploadedAt: "たった今",
          previewUrl: fileAttachment.previewUrl || null,
        }
      });
    }

    // If there is a note attachment, write to SharedNote
    let newNote = null;
    if (noteAttachment) {
      newNote = await prisma.sharedNote.create({
        data: {
          teamId,
          title: noteAttachment.title,
          content: noteAttachment.content,
          author: "大久保 佳奈",
          timestamp: "今日 " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }
      });
    }

    // Also update matching member status task title
    if (assignedTo) {
      const match = await prisma.teamMember.findFirst({
        where: { teamId, name: assignedTo }
      });
      if (match) {
        await prisma.teamMember.update({
          where: { id: match.id },
          data: { activeTask: title }
        });
      }
    }

    res.json({
      task: {
        ...task,
        id: String(task.id),
        recurrenceDays: recurrenceDays || undefined,
        attachments: attachments || [],
        links: links || []
      },
      file: newFile ? { ...newFile, id: String(newFile.id) } : null,
      note: newNote ? { ...newNote, id: String(newNote.id) } : null,
    });
  } catch (error) {
    console.error("Error creating team task:", error);
    res.status(500).json({ error: "Failed to create team task" });
  }
});

// 5. Update task progress or properties
app.put("/api/teams/:teamId/tasks/:taskId", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const { progress } = req.body;

    const data: any = {};
    if (progress !== undefined) data.progress = progress;

    const task = await prisma.teamTask.update({
      where: { id: taskId },
      data
    });

    res.json({
      ...task,
      id: String(task.id),
      recurrenceDays: task.recurrenceDays ? JSON.parse(task.recurrenceDays) : undefined,
      attachments: task.attachments ? JSON.parse(task.attachments) : [],
      links: task.links ? JSON.parse(task.links) : []
    });
  } catch (error) {
    console.error("Error updating team task:", error);
    res.status(500).json({ error: "Failed to update team task" });
  }
});

// 6. Delete team task
app.delete("/api/teams/:teamId/tasks/:taskId", async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    await prisma.teamTask.delete({
      where: { id: taskId }
    });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting team task:", error);
    res.status(500).json({ error: "Failed to delete team task" });
  }
});


// --- Google Calendar Mock Helpers (for guests/fallback) ---
const getMockCalendarEvents = (): any[] => {
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return [
    {
      id: "mock-1",
      summary: "憲法講義 (法学講義)",
      start: { dateTime: `${todayStr}T09:00:00` },
      end: { dateTime: `${todayStr}T10:30:00` }
    },
    {
      id: "mock-2",
      summary: "ゼミ研究室発表準備",
      start: { dateTime: `${todayStr}T13:00:00` },
      end: { dateTime: `${todayStr}T15:00:00` }
    },
    {
      id: "mock-3",
      summary: "居酒屋アルバイト",
      start: { dateTime: `${todayStr}T17:00:00` },
      end: { dateTime: `${todayStr}T21:00:00` }
    }
  ];
};

// --- AI API Endpoints ---

// 5. Chat with AI
app.post("/api/chat", requireAuth, async (req: any, res: express.Response) => {
  try {
    const { messages, tasks, message } = req.body;
    
    // Validation
    if (messages !== undefined && !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format" });
    }
    if (message !== undefined && typeof message !== "string") {
      return res.status(400).json({ error: "Invalid message format" });
    }

    // Retrieve active tasks and user info from Prisma to personalize context
    const tasksToUse = tasks || (await prisma.task.findMany({ where: { completed: false } }));
    
    const reply = await generateChatReply(messages, tasksToUse, message);
    res.json({ reply });
  } catch (error) {
    console.error("Error in POST /api/chat:", error);
    const configured = process.env.GEMINI_API_KEY?.trim();
    res.status(configured ? 502 : 503).json({
      error: configured ? "AI service is unavailable" : "AI service is not configured. Set GEMINI_API_KEY on the server."
    });
  }
});

// 6. Get task recommendations
app.post("/api/recommend", requireAuth, async (req: any, res: express.Response) => {
  try {
    let events = [];
    try {
      const headerToken = req.headers["x-google-token"] as string | undefined;
      const gEvents = await getTodayEvents(req.userId!, headerToken);
      events = gEvents.map(e => ({
        id: e.id,
        summary: e.title,
        start: { dateTime: e.start },
        end: { dateTime: e.end }
      }));
    } catch (err) {
      console.warn("Failed to get Google Calendar events, using mocks:", err);
      events = getMockCalendarEvents();
    }
    
    // Retrieve incomplete tasks
    const incompleteTasks = await prisma.task.findMany({ where: { completed: false } });

    const recommendation = await generateRecommendation(incompleteTasks, events);
    res.json(recommendation);
  } catch (error) {
    console.error("Error in POST /api/recommend:", error);
    res.status(500).json({ error: "AI unavailable" });
  }
});

// 7. Split a task into smaller subtasks
app.post("/api/split-task", requireAuth, async (req: any, res: express.Response) => {
  try {
    const title = req.body.title || req.body.taskTitle;
    const description = req.body.description || req.body.category || "";

    if (!title || typeof title !== "string") {
      return res.status(400).json({ error: "Title is required and must be a string" });
    }

    const result = await generateTaskSplit(title, description);
    res.json(result);
  } catch (error) {
    console.error("Error in POST /api/split-task:", error);
    res.status(500).json({ error: "AI unavailable" });
  }
});

// 8. Generate daily schedule
app.post("/api/schedule", requireAuth, async (req: any, res: express.Response) => {
  try {
    const { currentTime } = req.body;

    let events = [];
    try {
      const headerToken = req.headers["x-google-token"] as string | undefined;
      const gEvents = await getTodayEvents(req.userId!, headerToken);
      events = gEvents.map(e => ({
        id: e.id,
        summary: e.title,
        start: { dateTime: e.start },
        end: { dateTime: e.end }
      }));
    } catch (err) {
      console.warn("Failed to get Google Calendar events, using mocks:", err);
      events = getMockCalendarEvents();
    }

    const incompleteTasks = await prisma.task.findMany({ where: { completed: false } });

    const schedule = await generateSchedule(incompleteTasks, events, currentTime);
    res.json(schedule);
  } catch (error) {
    console.error("Error in POST /api/schedule:", error);
    res.status(500).json({ error: "AI unavailable" });
  }
});

// 9. Analyze completed tasks
app.post("/api/analyze", requireAuth, async (req: any, res: express.Response) => {
  try {
    // Retrieve completed tasks
    const completedTasks = await prisma.task.findMany({ where: { completed: true } });
    
    const analysis = await generateAnalysis(completedTasks);
    res.json(analysis);
  } catch (error) {
    console.error("Error in POST /api/analyze:", error);
    res.status(500).json({ error: "AI unavailable" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
