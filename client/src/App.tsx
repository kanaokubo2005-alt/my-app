import { useState, useEffect } from "react";
import {
  Menu,
  CheckSquare,
  GraduationCap,
  LogIn,
  Lock,
  Laptop,
  Sparkles,
} from "lucide-react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import TasksView from "./components/TasksView";
import AnalyticsView from "./components/AnalyticsView";
import SettingsView from "./components/SettingsView";
import TeamSpaceView from "./components/TeamSpaceView";
import FocusSession from "./components/FocusSession";
import type { Task } from "./types";
import type { User } from "firebase/auth";
import {
  googleSignIn,
  logout as firebaseLogout,
  initAuth,
  getFirebaseToken,
} from "./lib/firebase";

const INITIAL_TASKS: Task[] = [];
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "http://localhost:8888" : "";

export default function App() {
  // Authentication states
  const [user, setUser] = useState<User | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Tab & UI States
  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [activeFocusTask, setActiveFocusTask] = useState<Task | null>(null);


  // Notification and theme settings states
  const [theme, setTheme] = useState<string>("light");
  const [notificationSettings, setNotificationSettings] = useState({
    deadline24h: true,
    start5m: true,
    nothingDoneAlert: true,
    channelBrowser: true,
    channelEmail: false,
    channelMobile: false,
    suppressStart: "23:00",
    suppressEnd: "07:00",
    suppressEnabled: true,
  });

  const [tasks, setTasks] = useState<Task[]>([]);

  // Load tasks from backend API on mount
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/tasks`);
        if (res.ok) {
          const data = await res.json();
          setTasks(data);
        }
      } catch (error) {
        console.error("Failed to fetch tasks from API:", error);
      }
    };
    fetchTasks();
  }, []);



  const [notificationCount, setNotificationCount] = useState<number>(3);

  // Initialize Firebase Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser(currentUser);
        setIsDemoMode(false);
        setAuthLoading(false);
      },
      () => {
        // If not authenticated or token not in memory, see if we have demo mode saved
        const demo = sessionStorage.getItem("todone_demo");
        if (demo === "true") {
          setIsDemoMode(true);
        }
        setAuthLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);


  useEffect(() => {
    localStorage.setItem("todone_tasks", JSON.stringify(tasks));
  }, [tasks]);



  const handleGoogleLogin = async () => {
    try {
      setAuthLoading(true);
      const result = await googleSignIn();
      if (result) {
        setUser(result);
        setIsDemoMode(false);
        sessionStorage.removeItem("todone_demo");
      }
    } catch (error) {
      console.error("Login failed:", error);
      alert(
        "Google ログインに失敗しました。詳細についてはコンソールをご確認ください。",
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDemoModeLogin = () => {
    setIsDemoMode(true);
    sessionStorage.setItem("todone_demo", "true");
  };

  const handleLogout = async () => {
    if (window.confirm("ログアウトしますか？")) {
      await firebaseLogout();
      setUser(null);
      setIsDemoMode(false);
      sessionStorage.removeItem("todone_demo");
    }
  };

  const handleToggleTask = async (id: string) => {
    const taskToToggle = tasks.find((t) => t.id === id);
    if (!taskToToggle) return;
    const nextCompleted = !taskToToggle.completed;
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: nextCompleted }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) =>
          prev.map((task) => (task.id === id ? updated : task))
        );
        if (nextCompleted) {
          setNotificationCount((c) => Math.max(0, c - 1));
        }
      }
    } catch (err) {
      console.error("Error toggling task:", err);
    }
  };

  const handleAddTask = async (newTask: Task) => {
    try {
      const { id, ...taskData } = newTask; // strip local temp ID
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
      if (res.ok) {
        const created = await res.json();
        setTasks((prev) => [created, ...prev]);
        setNotificationCount((c) => c + 1);
      }
    } catch (err) {
      console.error("Error adding task:", err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (window.confirm("このタスクを削除しますか？")) {
      try {
        const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setTasks((prev) => prev.filter((task) => task.id !== id));
        }
      } catch (err) {
        console.error("Error deleting task:", err);
      }
    }
  };



  const handleResetTasks = async () => {
    if (window.confirm("全てのタスクをリセットし、初期データに戻しますか？")) {
      try {
        // Delete all current tasks from server
        for (const task of tasks) {
          await fetch(`${API_BASE}/api/tasks/${task.id}`, {
            method: "DELETE",
          });
        }

        // Create INITIAL_TASKS on server
        const addedTasks: Task[] = [];
        for (const initTask of INITIAL_TASKS) {
          const { id, ...taskData } = initTask; // strip static ID
          const res = await fetch(`${API_BASE}/api/tasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(taskData),
          });
          if (res.ok) {
            const created = await res.json();
            addedTasks.push(created);
          }
        }
        setTasks(addedTasks);
      } catch (err) {
        console.error("Error resetting tasks:", err);
      }
    }
  };

  const renderActiveTab = () => {
    switch (currentTab) {
      case "dashboard":
        return (
          <Dashboard
            tasks={tasks}
            onToggleTask={handleToggleTask}
            onAddTaskClick={() => setCurrentTab("tasks")}
            onStartFocusSession={(task) => setActiveFocusTask(task)}
            onDeleteTask={handleDeleteTask}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            user={user}
            onLogout={handleLogout}
          />
        );
      case "tasks":
        return (
          <TasksView
            tasks={tasks}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onStartFocusSession={(task) => setActiveFocusTask(task)}
          />
        );
      case "team":
        return <TeamSpaceView />;
      case "analytics":
        return <AnalyticsView tasks={tasks} onToggleTask={handleToggleTask} />;
      case "settings":
        return (
          <SettingsView
            onResetTasks={handleResetTasks}
            user={user}
            onLogout={handleLogout}
            notificationSettings={notificationSettings}
            setNotificationSettings={setNotificationSettings}
            theme={theme}
            setTheme={setTheme}
          />
        );
      default:
        return <div>Tab not found</div>;
    }
  };

  // 1. Loading screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex flex-col items-center justify-center font-sans text-slate-700">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cobalt flex items-center justify-center text-white shadow-lg animate-spin">
            <GraduationCap className="w-7 h-7" />
          </div>
          <p className="text-sm font-bold text-slate-500 tracking-wider">
            読み込み中...
          </p>
        </div>
      </div>
    );
  }

  // 2. Google OAuth Sign-in Screen (if not logged in AND not in demo mode)
  if (!user && !isDemoMode) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center p-4 font-sans text-slate-700 select-none">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 p-8 shadow-xl flex flex-col justify-between relative overflow-hidden space-y-8 animate-fade-in">
          {/* Subtle decoration */}
          <div className="absolute right-0 top-0 w-32 h-32 bg-cobalt/5 rounded-full blur-2xl -z-10" />

          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-cobalt flex items-center justify-center text-white shadow-md mx-auto">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h1 className="font-sans font-extrabold text-2xl text-slate-800 tracking-tight">
                ToDone
              </h1>
              <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase">
                For University Students
              </p>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed max-w-xs mx-auto">
              大学生向けのAIスケジュール・タスク管理Webアプリ。Googleカレンダーと連携して自動で空き時間に課題を割り当てます。
            </p>
          </div>

          {/* Core Feature bullet points inside a clean visual box */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3.5 text-xs text-slate-600">
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-md bg-cobalt/10 text-cobalt flex items-center justify-center shrink-0 font-bold">
                📅
              </span>
              <div>
                <p className="font-bold text-slate-700">Googleカレンダー同期</p>
                <p className="text-slate-400 text-[10px] mt-0.5">
                  授業やアルバイトの空き時間をインテリジェントに抽出
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-md bg-cobalt/10 text-cobalt flex items-center justify-center shrink-0 font-bold">
                🤖
              </span>
              <div>
                <p className="font-bold text-slate-700">AIタスク自動割り当て</p>
                <p className="text-slate-400 text-[10px] mt-0.5">
                  今日やるべきタスクを最適な時間帯で自動推薦
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-md bg-cobalt/10 text-cobalt flex items-center justify-center shrink-0 font-bold">
                ⏱️
              </span>
              <div>
                <p className="font-bold text-slate-700">Focus Session</p>
                <p className="text-slate-400 text-[10px] mt-0.5">
                  コバルトブルーを基調とした洗練されたポモドーロタイマー
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Elegant Sign-In Button */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 hover:border-slate-300 rounded-xl text-slate-700 font-bold text-sm bg-white hover:bg-slate-50 transition-all cursor-pointer shadow-2xs group"
            >
              <svg
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                className="w-5 h-5 group-hover:scale-105 transition-transform"
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                ></path>
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                ></path>
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                ></path>
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                ></path>
              </svg>
              <span>Google アカウントでログイン</span>
            </button>

            {/* Demo Mode Button for quick review */}
            <button
              onClick={handleDemoModeLogin}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-slate-400 font-semibold text-xs hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <span>カレンダー連携せずに、デモモードで利用する</span>
            </button>
          </div>

          <div className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1.5 border-t border-slate-50 pt-4">
            <Lock className="w-3.5 h-3.5" />
            <span>自動ログイン状態を維持 (セッション保持)</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated App Experience
  return (
    <div
      className={`flex h-screen bg-slate-bg text-slate-700 overflow-hidden font-sans ${theme === "cobalt" ? "theme-cobalt-heavy" : ""}`}
    >
      {/* Mobile Top Navbar Bar */}
      <div className="fixed top-0 inset-x-0 h-14 bg-white border-b border-slate-100 flex items-center justify-between px-4 z-30 lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="font-sans font-bold text-slate-800 text-base">
          ToDone
        </span>
        <div className="w-6" /> {/* Spacer for centering */}
      </div>

      {/* Main sidebar component */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        notificationCount={notificationCount}
        clearNotifications={() => setNotificationCount(0)}
        user={user}
      />

      {/* Central Screen Area */}
      <main className="flex-1 flex flex-col min-w-0 pt-14 lg:pt-0 relative">
        {renderActiveTab()}
      </main>

      {/* Focus Session Countdown Pomodoro Modal Overlay */}
      {activeFocusTask && (
        <FocusSession
          task={activeFocusTask}
          onClose={() => setActiveFocusTask(null)}
          onCompleteTask={handleToggleTask}
        />
      )}

    </div>
  );
}
