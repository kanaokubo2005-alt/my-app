import "dotenv/config";
import express from "express";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
import { 
  generateChatReply, 
  generateTaskSplit, 
  generateAnalysis 
} from "./services/ai";
import { requireAuth } from "./middlewares/auth";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Serve static assets from client/dist
app.use(express.static(path.join(__dirname, "client/dist")));

// SPA fallback: return client's index.html for non-API routes
app.get(/^(?!\/api).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, "client/dist/index.html"));
});

// Legacy User views routes
app.get("/users-legacy", async (req, res) => {
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
      await prisma.user.create({ data: { name, username: name.toLowerCase(), password: "password" } });
    }
    res.redirect("/");
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).send("Internal Server Error");
  }
});

const hashPassword = (password: string) => {
  return crypto.createHash("sha256").update(password).digest("hex");
};

// --- Authentication API ---

app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password, name } = req.body;
    if (!username || !password || !name) {
      return res.status(400).json({ error: "ユーザーID、パスワード、表示名は必須です。" });
    }

    const rawUsername = String(username).trim();

    // Validate User ID format: at least 8 characters, lowercase letters or digits only
    const usernameRegex = /^[a-z0-9]{8,}$/;
    if (!usernameRegex.test(rawUsername)) {
      return res.status(400).json({ error: "ユーザーIDは8文字以上の小文字または数字で設定してください。" });
    }

    const normalizedUsername = rawUsername;

    const existingUser = await prisma.user.findUnique({
      where: { username: normalizedUsername }
    });

    if (existingUser) {
      return res.status(400).json({ error: "このユーザーIDは既にデータベースに登録されています。別の異なるIDを設定してください。" });
    }

    const hashedPassword = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        password: hashedPassword,
        name: name.trim(),
      }
    });

    res.status(201).json({
      id: user.id,
      username: user.username,
      name: user.name,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "ユーザー登録に失敗しました。入力内容をご確認ください。" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "ユーザーIDとパスワードが必要です。" });
    }

    const normalizedUsername = String(username).trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { username: normalizedUsername }
    });

    if (!user || user.password !== hashPassword(password)) {
      return res.status(401).json({ error: "ユーザーIDまたはパスワードが正しくありません。" });
    }

    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      token: String(user.id),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "ログインに失敗しました。" });
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
    }
    return originalPriority === "high" ? "high" : "medium";
  } catch {
    return originalPriority === "high" ? "high" : "medium";
  }
};

// 1. Get all tasks
app.get("/api/tasks", requireAuth, async (req: any, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { userId: req.userId },
      orderBy: { id: "asc" },
    });

    // Seed default tasks when a new user checks tasks for the first time
    if (tasks.length === 0) {
      const seedTasksData = [
        { title: "ゼミの発表スライド作成", deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], priority: "high", category: "study", duration: 60, userId: req.userId },
        { title: "英語のレポート提出", deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], priority: "medium", category: "study", duration: 90, userId: req.userId },
        { title: "アルバイトのシフト調整", deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], priority: "low", category: "other", duration: 15, userId: req.userId }
      ];
      for (const tData of seedTasksData) {
        await prisma.task.create({ data: tData });
      }
      const newTasks = await prisma.task.findMany({
        where: { userId: req.userId },
        orderBy: { id: "asc" },
      });
      return res.json(newTasks.map(t => ({ ...t, id: String(t.id), priority: getDynamicPriority(t.deadline, t.priority) })));
    }

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
app.post("/api/tasks", requireAuth, async (req: any, res) => {
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
        userId: req.userId,
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
app.put("/api/tasks/:id", requireAuth, async (req: any, res) => {
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
      where: { id, userId: req.userId },
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
app.delete("/api/tasks/:id", requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid task ID" });
    }
    await prisma.task.delete({
      where: { id, userId: req.userId },
    });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// --- Team & Collaboration API ---

// 1. Get all teams with members, tasks, notes, files
app.get("/api/teams", requireAuth, async (req: any, res) => {
  try {
    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            userId: req.userId
          }
        }
      },
      include: {
        members: true,
        tasks: true,
        sharedFiles: true,
        sharedNotes: true,
      },
      orderBy: { id: "asc" },
    });


    const formatted = teams.map((team) => ({
      ...team,
      id: String(team.id),
      members: team.members.map(m => ({ ...m, id: String(m.id), userId: m.userId ? String(m.userId) : undefined })),
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
app.post("/api/teams", requireAuth, async (req: any, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Team name is required" });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    const team = await prisma.team.create({
      data: {
        name,
        description: description || "共同作業タスク・情報管理スペース",
        members: {
          create: [
            { userId: req.userId, name: user?.name || "メンバー", role: "管理者 (You)", avatarColor: "bg-cobalt", activeTask: "初期チーム設定と計画", status: "active" }
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
      members: team.members.map(m => ({ ...m, id: String(m.id), userId: m.userId ? String(m.userId) : undefined })),
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
app.post("/api/teams/:teamId/members", requireAuth, async (req: any, res) => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    const { userId, role, avatarColor, activeTask, status } = req.body;
    if (!userId || !role) return res.status(400).json({ error: "User ID and role are required" });

    let targetUser = await prisma.user.findUnique({
      where: { username: String(userId).trim() }
    });

    if (!targetUser) {
      const parsedId = parseInt(userId, 10);
      if (!isNaN(parsedId)) {
        targetUser = await prisma.user.findUnique({
          where: { id: parsedId }
        });
      }
    }

    if (!targetUser) {
      return res.status(404).json({ error: "指定されたユーザーIDが見つかりません" });
    }

    // Verify user is not already in team
    const existingMember = await prisma.teamMember.findFirst({
      where: { teamId, userId: targetUser.id }
    });
    if (existingMember) {
      return res.status(400).json({ error: "このユーザーは既にチームに参加しています" });
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId,
        userId: targetUser.id,
        name: targetUser.name,
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

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
