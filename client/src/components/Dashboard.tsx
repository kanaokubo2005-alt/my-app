import { useState, useEffect } from "react";
import { 
  Search, 
  Plus, 
  Play, 
  Clock, 
  Check, 
  Zap, 
  Calendar, 
  Flame, 
  Award,
  AlertCircle,
  Trash2,
  ListPlus,
  LogOut,
  User as UserIcon,
  Info
} from "lucide-react";
import type { Task } from "../types";
import TaskCalendar from "./TaskCalendar";

interface DashboardProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onAddTaskClick: () => void;
  onStartFocusSession: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  user: any;
  onLogout: () => void;
}

export default function Dashboard({
  tasks,
  onToggleTask,
  onAddTaskClick,
  onStartFocusSession,
  onDeleteTask,
  searchQuery,
  setSearchQuery,
  user,
  onLogout
}: DashboardProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "today" | "completed" | "deadlines">("all");
  const [showAll, setShowAll] = useState(false);

  // Get current greeting based on hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    const userName = user?.name || "ゲスト";
    if (hour < 12) return `おはようございます、${userName}さん`;
    if (hour < 18) return `こんにちは、${userName}さん`;
    return `こんばんは、${userName}さん`;
  };

  // Get formatted Japanese date
  const getFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      weekday: 'long' 
    };
    return new Date().toLocaleDateString('ja-JP', options);
  };


  // Filter tasks based on search query and active card selection
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.category.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeFilter === "today") {
      const d = new Date();
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return task.deadline.startsWith(todayStr) || task.priority === 'high';
    }
    if (activeFilter === "completed") {
      return task.completed;
    }
    if (activeFilter === "deadlines") {
      if (task.completed) return false;
      const diff = new Date(task.deadline).getTime() - new Date().getTime();
      return diff > 0 && diff < (3 * 24 * 60 * 60 * 1000); // 3 days
    }

    return true; // default show all tasks (both completed and uncompleted) when filter is "all"
  });

  const getPriorityScore = (p: string) => {
    if (p === 'high') return 3;
    if (p === 'medium') return 2;
    return 1;
  };

  // Automatically sort by priority and deadline
  const sortedDashboardTasks = [...filteredTasks].sort((a, b) => {
    const scoreA = getPriorityScore(a.priority);
    const scoreB = getPriorityScore(b.priority);
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  // Stats calculation
  const todayTasksCount = tasks.filter(t => {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return t.deadline.startsWith(todayStr) || t.priority === 'high';
  }).length;
  
  const completedCount = tasks.filter(t => t.completed).length;
  
  const upcomingDeadlinesCount = tasks.filter(t => {
    if (t.completed) return false;
    const diff = new Date(t.deadline).getTime() - new Date().getTime();
    return diff > 0 && diff < (3 * 24 * 60 * 60 * 1000); // 3 days
  }).length;

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-rose-50 border border-rose-100 text-rose-500 font-bold";
      case "medium":
        return "bg-amber-50 border border-amber-100 text-amber-500 font-bold";
      case "low":
        return "bg-emerald-50 border border-emerald-100 text-emerald-500 font-bold";
      default:
        return "bg-slate-50 border border-slate-100 text-slate-500 font-semibold";
    }
  };

  const getListHeaderTitle = () => {
    switch (activeFilter) {
      case "today":
        return "今日のタスク / 高優先度";
      case "completed":
        return "完了したタスク";
      case "deadlines":
        return "期限が近いタスク (3日以内)";
      default:
        return showAll ? "すべてのタスク" : "最近のタスク";
    }
  };

  // If a filter is selected, show all matching tasks directly. Otherwise show up to 4 unless showAll is true.
  const visibleTasks = (activeFilter !== "all" || showAll) 
    ? sortedDashboardTasks 
    : sortedDashboardTasks.slice(0, 4);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-bg p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in relative">
      
      {/* 1. Header Row (Greeting, Search Bar, Profile) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="font-sans font-bold text-2xl md:text-3xl text-slate-800 leading-tight">
            {getGreeting()}
          </h1>
          <p className="text-slate-400 text-xs md:text-sm font-semibold mt-1">
            {getFormattedDate()}
          </p>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          {/* Dedicated Start Focus Session button */}
          <button
            onClick={() => {
              const activeTask = tasks.find(t => !t.completed) || tasks[0];
              if (activeTask) {
                onStartFocusSession(activeTask);
              } else {
                alert("タスクが登録されていません。まずは新しく追加してください。");
              }
            }}
            className="bg-emerald-500 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/10 hover:scale-[1.01]"
          >
            <Clock className="w-4 h-4 animate-pulse" />
            <span>Start Focus Session</span>
          </button>

          {/* Search bar */}
          <div className="relative flex-1 md:flex-none">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="タスクやカテゴリーを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-xs md:text-sm w-full md:w-60 focus:outline-hidden focus:ring-1 focus:ring-cobalt focus:border-cobalt transition-all text-slate-700 placeholder:text-slate-400 shadow-2xs"
            />
          </div>

          {/* Profile Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen(!profileOpen);
              }}
              className="w-10 h-10 rounded-xl bg-cobalt/10 text-cobalt border border-slate-100 flex items-center justify-center font-bold text-sm shadow-2xs hover:bg-cobalt/15 transition-colors cursor-pointer"
            >
              {user?.name ? user.name.slice(0, 2).toUpperCase() : "G"}
            </button>

            {/* Profile actions dropdown */}
            {profileOpen && (
              <div className="absolute right-0 mt-2.5 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-4 space-y-3 text-xs">
                <div className="border-b border-slate-50 pb-2">
                  <span className="block font-bold text-slate-800">{user?.name || "ゲスト"}</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">ユーザーID: {user?.username || user?.id || "N/A"}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-slate-600 font-medium">
                    <UserIcon className="w-4 h-4" />
                    <span>マイアカウント</span>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 p-2 border-t border-slate-50 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors text-left font-bold cursor-pointer mt-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>ログアウト</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. TASK LIST AT THE TOP OF THE PAGE (タスク一覧がページのトップに来るように) */}
      <div className="space-y-4 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-sans font-bold text-slate-800 text-lg flex items-center gap-2">
              <Check className="w-5 h-5 text-cobalt stroke-[2.5]" />
              <span>{getListHeaderTitle()}</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-semibold">
              {filteredTasks.length}件
            </span>
          </div>
          
          <button 
            onClick={onAddTaskClick}
            className="bg-cobalt hover:bg-cobalt/95 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
          >
            新規作成 <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleTasks.length === 0 ? (
            <div className="col-span-full py-10 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2">
              <ListPlus className="w-7 h-7 text-slate-300" />
              <p className="text-slate-400 text-xs font-medium">一致するタスクはありません。</p>
              <button 
                onClick={onAddTaskClick}
                className="text-[11px] text-cobalt hover:underline font-bold mt-1 cursor-pointer"
              >
                新しいタスクを追加
              </button>
            </div>
          ) : (
            visibleTasks.map((task) => (
              <div 
                key={task.id}
                className={`rounded-xl border transition-all p-3.5 flex flex-col justify-between gap-2.5 shadow-2xs hover:shadow-xs hover:border-slate-200 group ${
                  task.completed 
                    ? "opacity-60 border-slate-100 bg-slate-50/50" 
                    : task.priority === "high"
                      ? "bg-rose-50/80 border-rose-100 shadow-xs shadow-rose-500/5"
                      : "bg-white border-slate-100"
                }`}
              >
                <div className="flex items-start gap-2.5 justify-between">
                  {/* Left: Checkbox + Title */}
                  <div className="flex items-start gap-2.5 min-w-0">
                    <button
                      onClick={() => onToggleTask(task.id)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        task.completed 
                          ? "bg-cobalt border-cobalt text-white" 
                          : "border-slate-200 hover:border-cobalt bg-white"
                      }`}
                    >
                      {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>

                    <div className="min-w-0">
                      <span className={`font-sans font-bold text-xs md:text-sm text-slate-700 block tracking-tight leading-tight group-hover:text-slate-900 ${
                        task.completed ? "line-through text-slate-400" : ""
                      }`}>
                        {task.title}
                      </span>
                      
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[9px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.2 rounded">
                          {task.category}
                        </span>
                        
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${getPriorityBadgeClass(task.priority)}`}>
                          {task.priority.toUpperCase()}
                        </span>

                        {/* Emergency Countdown / Urgent Badge */}
                        {!task.completed && (() => {
                          const deadlineDate = new Date(task.deadline);
                          const now = new Date();
                          const diffTime = deadlineDate.getTime() - now.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          
                          if (diffDays <= 0) {
                            return (
                              <span className="bg-rose-500 text-white font-extrabold px-1.5 py-0.2 rounded text-[8px] animate-pulse shrink-0 flex items-center gap-0.5">
                                <AlertCircle className="w-2 h-2" />
                                <span>期限超過 / 今日締切！</span>
                              </span>
                            );
                          } else if (diffDays === 1) {
                            return (
                              <span className="bg-rose-600 text-white font-extrabold px-1.5 py-0.2 rounded text-[8px] animate-pulse shrink-0 flex items-center gap-0.5">
                                <AlertCircle className="w-2.5 h-2.5 animate-spin" />
                                <span>24H未満！</span>
                              </span>
                            );
                          } else if (diffDays <= 3) {
                            return (
                              <span className="bg-amber-500 text-white font-extrabold px-1.5 py-0.2 rounded text-[8px] shrink-0 flex items-center gap-0.5">
                                <AlertCircle className="w-2.5 h-2.5 text-white" />
                                <span>あと {diffDays}日</span>
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      title="タスクを削除"
                      className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Bottom row */}
                <div className="flex items-center justify-between border-t border-slate-50 pt-2 text-[10px] text-slate-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    締切: {task.deadline}
                  </span>

                  {!task.completed && (
                    <button
                      onClick={() => onStartFocusSession(task)}
                      className="text-cobalt hover:text-cobalt-light flex items-center gap-0.5 font-bold transition-colors cursor-pointer"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>Focus</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {activeFilter === "all" && filteredTasks.length > 4 && (
          <div className="text-center pt-1 border-t border-slate-50">
            <button 
              onClick={() => setShowAll(!showAll)}
              className="text-[11px] font-bold text-cobalt hover:underline cursor-pointer"
            >
              {showAll ? "一部のみ表示" : `すべてのタスクを表示 (${filteredTasks.length}件中4件を表示中)`}
            </button>
          </div>
        )}
      </div>

      {/* 2.5 Task Monthly Calendar */}
      <TaskCalendar tasks={tasks} onToggleTask={onToggleTask} />

      {/* 3. Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pb-4">
        {/* Today's Tasks */}
        <div 
          onClick={() => {
            setActiveFilter(activeFilter === "today" ? "all" : "today");
            setShowAll(true);
          }}
          className={`border rounded-2xl p-3 md:p-4 flex items-center gap-3 shadow-2xs hover:shadow-md transition-all cursor-pointer select-none ${
            activeFilter === "today" 
              ? "bg-cobalt/5 border-cobalt ring-2 ring-cobalt/10" 
              : "bg-white border-slate-100 hover:border-slate-200"
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-cobalt/10 text-cobalt flex items-center justify-center shrink-0">
            <Zap className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="block text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Today's Tasks</span>
            <span className="font-sans font-bold text-slate-800 text-sm md:text-base">{todayTasksCount}</span>
          </div>
        </div>

        {/* Completed */}
        <div 
          onClick={() => {
            setActiveFilter(activeFilter === "completed" ? "all" : "completed");
            setShowAll(true);
          }}
          className={`border rounded-2xl p-3 md:p-4 flex items-center gap-3 shadow-2xs hover:shadow-md transition-all cursor-pointer select-none ${
            activeFilter === "completed" 
              ? "bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/10" 
              : "bg-white border-slate-100 hover:border-slate-200"
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Award className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="block text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Completed</span>
            <span className="font-sans font-bold text-slate-800 text-sm md:text-base">{completedCount}</span>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div 
          onClick={() => {
            setActiveFilter(activeFilter === "deadlines" ? "all" : "deadlines");
            setShowAll(true);
          }}
          className={`border rounded-2xl p-3 md:p-4 flex items-center gap-3 shadow-2xs hover:shadow-md transition-all cursor-pointer select-none ${
            activeFilter === "deadlines" 
              ? "bg-rose-50/50 border-rose-500 ring-2 ring-rose-500/10" 
              : "bg-white border-slate-100 hover:border-slate-200"
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="block text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Deadlines (3d)</span>
            <span className="font-sans font-bold text-slate-800 text-sm md:text-base">{upcomingDeadlinesCount}</span>
          </div>
        </div>

        {/* All Tasks */}
        <div 
          onClick={() => {
            setActiveFilter("all");
            setShowAll(true);
          }}
          className={`border rounded-2xl p-3 md:p-4 flex items-center gap-3 shadow-2xs hover:shadow-md transition-all cursor-pointer select-none ${
            activeFilter === "all" && showAll
              ? "bg-amber-50/50 border-amber-500 ring-2 ring-amber-500/10" 
              : "bg-white border-slate-100 hover:border-slate-200"
          }`}
          title="すべてのタスクを表示"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
            <ListPlus className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="block text-[9px] text-slate-400 font-semibold uppercase tracking-wider">All Tasks</span>
            <span className="font-sans font-bold text-slate-800 text-sm md:text-base">{tasks.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
