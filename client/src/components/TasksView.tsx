import React, { useState } from "react";
import { 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertCircle, 
  Filter, 
  ListFilter, 
  RotateCcw, 
  Check,
  CheckSquare,
  Square,
  Flame,
  Play,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  Tag
} from "lucide-react";
import type { Task, PriorityType, TrashItem } from "../types";
import TaskCalendar from "./TaskCalendar";

interface TasksViewProps {
  tasks: Task[];
  onAddTask: (task: Task) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onStartFocusSession: (task: Task) => void;
  onAddToTrash?: (item: TrashItem) => void;
  onUpdatePriority?: (id: string, priority: PriorityType) => void;
}

export default function TasksView({
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onStartFocusSession,
  onAddToTrash,
  onUpdatePriority
}: TasksViewProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("大学");
  const [priority, setPriority] = useState<PriorityType>("medium");
  const [deadline, setDeadline] = useState(() => {
    const d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  });
  
  // Custom categories list state
  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem("todone_custom_categories");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse custom categories:", e);
      }
    }
    return ["大学", "サークル", "就活"];
  });

  const [newCatName, setNewCatName] = useState("");
  const [showAddCatInput, setShowAddCatInput] = useState(false);

  // Filters state
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all"); // "all" | "active" | "completed"

  // Calendar visibility toggle
  const [showCalendar, setShowCalendar] = useState(true);

  // Category addition handler
  const handleAddCategorySubmit = () => {
    const val = newCatName.trim();
    if (val) {
      const updated = categories.includes(val) ? categories : [...categories, val];
      setCategories(updated);
      localStorage.setItem("todone_custom_categories", JSON.stringify(updated));
      setCategory(val);
      setNewCatName("");
      setShowAddCatInput(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: title.trim(),
      category: category === "add_new" ? (categories[0] || "大学") : category,
      priority,
      duration: null,
      deadline,
      completed: false
    };

    onAddTask(newTask);
    setTitle("");
  };

  const getPriorityScore = (p: PriorityType) => {
    if (p === 'high') return 3;
    return 1;
  };

  // Filter & Sort tasks
  const processedTasks = tasks
    .filter((task) => {
      const matchCat = filterCategory === "all" || task.category === filterCategory;
      const matchStatus = 
        filterStatus === "all" ? true :
        filterStatus === "active" ? !task.completed :
        filterStatus === "completed" ? task.completed : true;
      return matchCat && matchStatus;
    })
    .sort((a, b) => {
      const scoreA = getPriorityScore(a.priority);
      const scoreB = getPriorityScore(b.priority);
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

  // Inline Priority Toggle for existing task
  const handleTogglePriority = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextPriority: PriorityType = task.priority === "high" ? "medium" : "high";
    if (onUpdatePriority) {
      onUpdatePriority(task.id, nextPriority);
    } else {
      task.priority = nextPriority;
      // Trigger local rerender by updating categories state or task reference
      setCategories([...categories]);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8faf7] p-4 md:p-8 space-y-6 text-slate-700 font-sans">
      
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="font-sans font-black text-2xl md:text-3xl text-slate-800 tracking-tight flex items-center gap-2.5">
            <span>📝</span>
            <span>Personal Planner & Tasks</span>
          </h1>
          <p className="text-slate-500 text-xs md:text-sm font-semibold mt-1">
            手帳スタイルの個人タスク管理とスケジュールカレンダー
          </p>
        </div>

        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer self-start md:self-auto"
        >
          <CalendarIcon className="w-4 h-4 text-cobalt" />
          <span>{showCalendar ? "カレンダーを閉じる" : "カレンダーを表示"}</span>
          {showCalendar ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Integrated Calendar View */}
      {showCalendar && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 md:p-6 shadow-xs animate-fade-in space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-sans font-bold text-slate-800 text-sm md:text-base flex items-center gap-2">
              <CalendarIcon className="w-4.5 h-4.5 text-cobalt" />
              <span>月間タスクカレンダー</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-bold">日付ごとの締切タスクが同期されます</span>
          </div>
          <TaskCalendar tasks={tasks} onToggleTask={onToggleTask} />
        </div>
      )}

      {/* 2-Column Split: Form (Left) & Notebook Task List (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">
        
        {/* Left side: Add Task Form */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs lg:col-span-1 space-y-4">
          <h2 className="font-sans font-extrabold text-slate-800 text-base md:text-lg border-b border-slate-100 pb-3 flex items-center gap-2">
            <Plus className="w-5 h-5 text-cobalt" />
            <span>タスクを新規登録</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">タスク名 <span className="text-rose-500">*</span></label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: マクロ経済学 レポート提出"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs md:text-sm font-semibold text-slate-700 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-cobalt transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">カテゴリー</label>
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === "add_new") {
                      setShowAddCatInput(true);
                      setNewCatName("");
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="add_new" className="text-cobalt font-bold">＋カテゴリーをカスタマイズ追加</option>
                </select>

                {/* Custom Category Input Inline Form */}
                {showAddCatInput && (
                  <div className="mt-2.5 p-2 bg-slate-50 border border-cobalt/30 rounded-xl space-y-2 animate-fade-in">
                    <input
                      type="text"
                      placeholder="新しいカテゴリー名 (例: 旅行)"
                      value={newCatName}
                      autoFocus
                      onChange={(e) => setNewCatName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCategorySubmit();
                        }
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold focus:outline-hidden"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowAddCatInput(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs px-2 font-bold"
                      >
                        ×
                      </button>
                      <button
                        type="button"
                        onClick={handleAddCategorySubmit}
                        className="bg-cobalt text-white text-xs px-3 py-1 rounded-lg font-bold shadow-xs cursor-pointer"
                      >
                        追加
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">優先度</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
                >
                  <option value="high">最重要 (赤)</option>
                  <option value="medium">通常</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">締切日時</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs md:text-sm font-semibold text-slate-700 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-cobalt"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-cobalt hover:bg-cobalt/95 text-white font-bold py-3 rounded-xl text-xs md:text-sm shadow-md shadow-cobalt/15 transition-all cursor-pointer mt-2"
            >
              タスクを追加する
            </button>
          </form>
        </div>

        {/* Right side: Notebook Grid Lined Task Management Area */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Controls Bar: Category Filter & Status Filter Side by Side */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm">
            <div className="flex flex-wrap items-center gap-3">
              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-600 focus:outline-hidden cursor-pointer text-xs"
                >
                  <option value="all">すべてのカテゴリー</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter (Next to Category Filter) */}
              <div className="flex items-center gap-1.5">
                <ListFilter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-600 focus:outline-hidden cursor-pointer text-xs"
                >
                  <option value="all">すべてのタスク</option>
                  <option value="active">未完了のみ</option>
                  <option value="completed">完了したタスクのみ</option>
                </select>
              </div>
            </div>

            <span className="text-[10px] text-slate-400 font-bold">
              全 {processedTasks.length}件のタスク
            </span>
          </div>

          {/* Notebook Lined Paper Task Container */}
          <div className="bg-white rounded-2xl border border-slate-250 p-5 md:p-6 shadow-sm space-y-3 relative overflow-hidden bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:24px_24px]">
            <div className="flex items-center justify-between border-b-2 border-slate-300 pb-2 mb-4 bg-white/90 p-2 rounded-lg">
              <span className="font-sans font-black text-slate-800 text-sm tracking-wider uppercase flex items-center gap-2">
                <span>📖</span>
                <span>My Notebook Planner</span>
              </span>
              <span className="text-[10px] text-slate-400 font-extrabold">クリックで優先度変更 / 集中タイマー起動</span>
            </div>

            {processedTasks.length === 0 ? (
              <div className="bg-white/95 rounded-xl border border-slate-200 p-8 text-center space-y-2">
                <p className="font-bold text-slate-600 text-xs md:text-sm">該当するタスクはありません</p>
                <p className="text-slate-400 text-xs">左側のフォームから新しいタスクを追加してください</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {processedTasks.map((task) => {
                  const isMust = task.priority === "high";

                  return (
                    <div
                      key={task.id}
                      className={`rounded-xl border p-3.5 md:p-4 flex items-center justify-between gap-3.5 transition-all bg-white/95 shadow-xs hover:shadow-md ${
                        task.completed 
                          ? "border-slate-200 opacity-70 bg-slate-50/80" 
                          : isMust
                            ? "border-rose-200 bg-rose-50/30"
                            : "border-slate-200 hover:border-cobalt/40"
                      }`}
                    >
                      {/* Notebook Square Checkbox & Title */}
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => onToggleTask(task.id)}
                          className="text-slate-600 hover:text-cobalt transition-colors cursor-pointer shrink-0"
                          title={task.completed ? "未完了に戻す" : "完了にする"}
                        >
                          {task.completed ? (
                            <CheckSquare className="w-5 h-5 text-cobalt fill-cobalt/10 stroke-[2.5]" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400 stroke-[2]" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <span className={`font-sans font-extrabold text-xs md:text-sm text-slate-800 block truncate ${
                            task.completed ? "line-through text-slate-400" : ""
                          }`}>
                            {task.title}
                          </span>
                          
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-500 font-semibold">
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200/60">
                              {task.category}
                            </span>
                            
                            {/* Interactive Priority Switcher Button */}
                            <button
                              type="button"
                              onClick={(e) => handleTogglePriority(task, e)}
                              title="クリックで優先度を変更"
                              className={`px-2 py-0.5 rounded-md border font-extrabold transition-all cursor-pointer ${
                                isMust
                                  ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100"
                                  : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                              }`}
                            >
                              {isMust ? "最重要 (赤)" : "通常"}
                            </button>

                            <span className="flex items-center gap-1 text-slate-400">
                              <CalendarIcon className="w-3 h-3 text-slate-400" />
                              締切: {task.deadline.replace("T", " ")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions: Start Focus & Delete */}
                      <div className="flex items-center gap-2 shrink-0">
                        {!task.completed && (
                          <button
                            onClick={() => onStartFocusSession(task)}
                            className="bg-cobalt hover:bg-cobalt/95 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Focus</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            if (onAddToTrash) {
                              onAddToTrash({
                                id: `trash-task-${Date.now()}`,
                                type: "individual_task",
                                title: task.title,
                                deletedAt: new Date().toLocaleString("ja-JP"),
                                originalData: task
                              });
                            }
                            onDeleteTask(task.id);
                          }}
                          title="削除（ゴミ箱へ移動）"
                          className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
