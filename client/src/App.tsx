import { useState, useEffect } from "react";
import {
  Menu,
  CheckSquare,
  GraduationCap,
  LogIn,
  Lock,
  Laptop,
  Sparkles,
  Trash2,
  RotateCcw,
  X
} from "lucide-react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import TasksView from "./components/TasksView";
import TeamSpaceView from "./components/TeamSpaceView";
import FocusSession from "./components/FocusSession";
import type { Task, PriorityType, TrashItem } from "./types";

const INITIAL_TASKS: Task[] = [];
const API_BASE = "";

export default function App() {
  // Authentication states
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  
  // Custom Auth Form States
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [usernameVal, setUsernameVal] = useState<string>("");
  const [passwordVal, setPasswordVal] = useState<string>("");
  const [nameVal, setNameVal] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Tab & UI States
  const [currentTab, setCurrentTab] = useState<string>("tasks");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Trash Box & Restorations State
  const [trashItems, setTrashItems] = useState<TrashItem[]>(() => {
    const saved = localStorage.getItem("todone_trash_items");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });
  const [showTrashModal, setShowTrashModal] = useState<boolean>(false);

  const handleAddToTrash = (item: TrashItem) => {
    const updated = [item, ...trashItems];
    setTrashItems(updated);
    localStorage.setItem("todone_trash_items", JSON.stringify(updated));
  };

  const handleRestoreTrashItem = async (trashItem: TrashItem) => {
    if (trashItem.type === "individual_task") {
      try {
        const token = localStorage.getItem("todone_user_token");
        const res = await fetch(`${API_BASE}/api/tasks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            title: trashItem.originalData.title,
            deadline: trashItem.originalData.deadline || new Date().toISOString().split("T")[0],
            priority: trashItem.originalData.priority || "medium",
            category: trashItem.originalData.category || "大学",
            duration: trashItem.originalData.duration || 30,
            description: trashItem.originalData.description || ""
          })
        });
        if (res.ok) {
          const restoredTask = await res.json();
          setTasks(prev => [restoredTask, ...prev]);
        }
      } catch (err) {
        console.error(err);
      }
    } else if (trashItem.type === "team_task" && trashItem.originalData.teamId) {
      try {
        const token = localStorage.getItem("todone_user_token");
        await fetch(`${API_BASE}/api/teams/${trashItem.originalData.teamId}/tasks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(trashItem.originalData)
        });
      } catch (err) {
        console.error(err);
      }
    } else if (trashItem.type === "folder" && trashItem.originalData.teamId) {
      const saved = localStorage.getItem("todone_custom_folders");
      let map: Record<string, string[]> = {};
      if (saved) { try { map = JSON.parse(saved); } catch (e) { console.error(e); } }
      const current = map[trashItem.originalData.teamId] || [];
      if (!current.includes(trashItem.originalData.folderName)) {
        map[trashItem.originalData.teamId] = [...current, trashItem.originalData.folderName];
        localStorage.setItem("todone_custom_folders", JSON.stringify(map));
      }
    }

    const updated = trashItems.filter(t => t.id !== trashItem.id);
    setTrashItems(updated);
    localStorage.setItem("todone_trash_items", JSON.stringify(updated));
    alert(`「${trashItem.title}」を正常に復元しました。`);
  };

  const handlePermanentDelete = (id: string) => {
    const updated = trashItems.filter(t => t.id !== id);
    setTrashItems(updated);
    localStorage.setItem("todone_trash_items", JSON.stringify(updated));
  };

  const handleClearTrash = () => {
    if (window.confirm("ゴミ箱内のすべての項目を完全に削除しますか？")) {
      setTrashItems([]);
      localStorage.removeItem("todone_trash_items");
    }
  };

  // Modals state
  const [activeFocusTask, setActiveFocusTask] = useState<Task | null>(null);

  // Theme settings
  const [theme, setTheme] = useState<string>("light");

  const [tasks, setTasks] = useState<Task[]>([]);

  // Load tasks from backend API when user changes
  useEffect(() => {
    const fetchTasks = async () => {
      if (!user) {
        setTasks([]);
        return;
      }
      try {
        const token = localStorage.getItem("todone_user_token");
        const res = await fetch(`${API_BASE}/api/tasks`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setTasks(data);
        }
      } catch (error) {
        console.error("Failed to fetch tasks from API:", error);
      }
    };
    fetchTasks();
  }, [user]);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem("todone_user_token");
    const storedUser = localStorage.getItem("todone_user");
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("todone_user_token");
        localStorage.removeItem("todone_user");
      }
    }
    setAuthLoading(false);
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const normalizedUsername = usernameVal.trim().toLowerCase();

    // Enforce 8+ characters, lowercase letters and numbers format for registration
    if (isSignUp) {
      const usernameRegex = /^[a-z0-9]{8,}$/;
      if (!usernameRegex.test(normalizedUsername)) {
        setErrorMsg("ユーザーIDは8文字以上の小文字または数字で設定してください。");
        return;
      }
      if (!nameVal.trim()) {
        setErrorMsg("表示名を入力してください。");
        return;
      }
    }

    if (!passwordVal) {
      setErrorMsg("パスワードを入力してください。");
      return;
    }

    const endpoint = isSignUp ? "/api/auth/register" : "/api/auth/login";
    const body = isSignUp 
      ? { username: normalizedUsername, password: passwordVal, name: nameVal.trim() }
      : { username: normalizedUsername, password: passwordVal };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (isSignUp) {
          // Auto log in after register
          const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: normalizedUsername, password: passwordVal })
          });
          const loginData = await loginRes.json().catch(() => ({}));
          if (loginRes.ok) {
            localStorage.setItem("todone_user_token", loginData.token);
            localStorage.setItem("todone_user", JSON.stringify(loginData));
            setUser(loginData);
          } else {
            setErrorMsg("登録されましたが、自動ログインに失敗しました。ログインしてください。");
            setIsSignUp(false);
          }
        } else {
          localStorage.setItem("todone_user_token", data.token);
          localStorage.setItem("todone_user", JSON.stringify(data));
          setUser(data);
        }
        setUsernameVal("");
        setPasswordVal("");
        setNameVal("");
      } else {
        setErrorMsg(data.error || "認証に失敗しました");
      }
    } catch (err) {
      console.error("Auth error:", err);
      setErrorMsg("サーバー通信エラーが発生しました");
    }
  };

  const handleLogout = () => {
    if (window.confirm("ログアウトしますか？")) {
      localStorage.removeItem("todone_user_token");
      localStorage.removeItem("todone_user");
      setUser(null);
    }
  };


  useEffect(() => {
    localStorage.setItem("todone_tasks", JSON.stringify(tasks));
  }, [tasks]);


  const handleToggleTask = async (id: string) => {
    const taskToToggle = tasks.find((t) => t.id === id);
    if (!taskToToggle) return;
    const nextCompleted = !taskToToggle.completed;
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("todone_user_token")}`
        },
        body: JSON.stringify({ completed: nextCompleted }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) =>
          prev.map((task) => (task.id === id ? updated : task))
        );
      }
    } catch (err) {
      console.error("Error toggling task:", err);
    }
  };

  const handleAddTask = async (newTask: Task) => {
    try {
      const { id, ...taskData } = newTask;
      const res = await fetch(`${API_BASE}/api/tasks`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("todone_user_token")}`
        },
        body: JSON.stringify(taskData),
      });
      if (res.ok) {
        const created = await res.json();
        setTasks((prev) => [created, ...prev]);
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
          headers: {
            Authorization: `Bearer ${localStorage.getItem("todone_user_token")}`
          }
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
    if (window.confirm("全てのタスクをリセットしますか？")) {
      try {
        for (const task of tasks) {
          await fetch(`${API_BASE}/api/tasks/${task.id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("todone_user_token")}`
            }
          });
        }
        setTasks([]);
      } catch (err) {
        console.error("Error resetting tasks:", err);
      }
    }
  };

  const handleUpdatePriority = async (id: string, priority: PriorityType) => {
    try {
      const token = localStorage.getItem("todone_user_token");
      const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ priority })
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      }
    } catch (err) {
      console.error("Error updating priority:", err);
    }
  };

  const renderActiveTab = () => {
    switch (currentTab) {
      case "tasks":
      default:
        return (
          <TasksView
            tasks={tasks}
            onAddTask={handleAddTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onStartFocusSession={(task) => setActiveFocusTask(task)}
            onAddToTrash={handleAddToTrash}
            onUpdatePriority={handleUpdatePriority}
          />
        );
      case "team":
        return <TeamSpaceView onAddToTrash={handleAddToTrash} />;
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

  // 2. Custom Login & Register Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center p-4 font-sans text-slate-700 select-none">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 p-8 shadow-xl flex flex-col justify-between relative overflow-hidden space-y-6 animate-fade-in">
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
              大学生向けのタスク管理・ゼミ共同作業スペース同期Webアプリ。
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-500 font-semibold text-center">
                {errorMsg}
              </div>
            )}

            {isSignUp && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">表示名 (お名前)</label>
                <input
                  type="text"
                  required
                  placeholder="例: 大久保 佳奈"
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-700 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-cobalt"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">ユーザーID (8文字以上の小文字・数字)</label>
              <input
                type="text"
                required
                placeholder="例: okubokana12"
                value={usernameVal}
                onChange={(e) => setUsernameVal(e.target.value.toLowerCase())}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-700 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-cobalt"
              />
              <span className="text-[10px] text-slate-400 mt-1 block font-semibold">※ 8文字以上の英小文字と数字のみ使用できます</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">パスワード</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={passwordVal}
                onChange={(e) => setPasswordVal(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-700 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-cobalt"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-cobalt hover:bg-cobalt/95 text-white font-bold py-3 rounded-xl text-xs md:text-sm shadow-md shadow-cobalt/10 hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSignUp ? "新規登録してログイン" : "ログイン"}</span>
            </button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg("");
              }}
              className="text-xs text-cobalt hover:underline font-bold"
            >
              {isSignUp ? "すでにアカウントをお持ちですか？ ログイン" : "新しいアカウントを作成する (新規登録)"}
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
        user={user}
        onOpenTrash={() => setShowTrashModal(true)}
        trashCount={trashItems.length}
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

      {/* Trash Box / Restoration Modal Overlay */}
      {showTrashModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 w-full max-w-lg shadow-xl space-y-4 animate-fade-in text-xs md:text-sm max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-500" />
                <h3 className="font-sans font-bold text-slate-800 text-base">ゴミ箱・削除データの復元 ({trashItems.length}件)</h3>
              </div>
              <button onClick={() => setShowTrashModal(false)} className="text-slate-400 font-bold hover:text-slate-600 cursor-pointer">✕</button>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 p-1">
              {trashItems.length === 0 ? (
                <div className="py-8 text-center text-slate-400 space-y-1">
                  <Trash2 className="w-8 h-8 mx-auto text-slate-200" />
                  <p className="font-semibold text-xs">ゴミ箱は空です</p>
                  <p className="text-[10px]">削除されたタスクやフォルダがここに保管されます</p>
                </div>
              ) : (
                trashItems.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <span className="font-bold text-slate-800 block truncate">{item.title}</span>
                      <span className="text-[9px] text-slate-400">削除日時: {item.deletedAt}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRestoreTrashItem(item)}
                        className="bg-cobalt hover:bg-cobalt/95 text-white font-bold px-3 py-1 rounded-lg text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>復元</span>
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(item.id)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors cursor-pointer"
                        title="完全に削除"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {trashItems.length > 0 && (
              <div className="flex justify-between items-center pt-3 border-t border-slate-100 shrink-0">
                <button
                  onClick={handleClearTrash}
                  className="text-rose-500 hover:underline text-xs font-bold cursor-pointer"
                >
                  ゴミ箱を空にする
                </button>
                <button
                  onClick={() => setShowTrashModal(false)}
                  className="bg-slate-800 text-white font-bold px-4 py-1.5 rounded-xl text-xs cursor-pointer"
                >
                  閉じる
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
