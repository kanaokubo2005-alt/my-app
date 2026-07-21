import React, { useState } from "react";
import { 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon, 
  Filter, 
  ListFilter, 
  CheckSquare,
  Square,
  Play
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
  const [filterStatus, setFilterStatus] = useState("all");

  // Tab state within Personal Tasks page: "list" vs "calendar" (Clear File Index style)
  const [personalSubTab, setPersonalSubTab] = useState<"list" | "calendar">("list");

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
    if (p === 'medium') return 2;
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

  // Priority Cycle: high -> medium -> low -> high
  const handleTogglePriority = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextPriority: PriorityType = 
      task.priority === "high" ? "medium" : 
      task.priority === "medium" ? "low" : "high";

    if (onUpdatePriority) {
      onUpdatePriority(task.id, nextPriority);
    } else {
      task.priority = nextPriority;
      setCategories([...categories]);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-notebook-pattern p-4 md:p-8 space-y-6 text-[#22303C]">
      
      {/* View Header with Required Subtitle */}
      <div className="border-b border-[#D5CFB9] pb-4">
        <h1 className="font-brand-serif font-black text-2xl md:text-4xl text-[#244053] tracking-tight flex items-center gap-2">
          <span>個人タスク</span>
        </h1>
        <p className="text-[#61727F] text-xs md:text-sm font-semibold mt-1">
          手帳スタイルの個人タスク管理とスケジュールカレンダー
        </p>
      </div>

      {/* Index Tabs Switcher for Personal Page: 「NO. 1 タスク一覧」 vs 「NO. 2 カレンダー」 */}
      <div className="flex items-center gap-2 border-b border-[#D5CFB9] pb-0">
        <button
          onClick={() => setPersonalSubTab("list")}
          className={`px-5 py-2.5 rounded-t-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer border-t border-x ${
            personalSubTab === "list"
              ? "bg-[#244053] text-white border-[#244053] shadow-md"
              : "bg-[#EAE6DF] text-[#4A5D6B] border-[#D5CFB9] hover:bg-[#DFD9CE]"
          }`}
        >
          <span className="font-brand-serif font-black text-xs opacity-75">NO. 1</span>
          <span>タスク一覧</span>
        </button>

        <button
          onClick={() => setPersonalSubTab("calendar")}
          className={`px-5 py-2.5 rounded-t-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer border-t border-x ${
            personalSubTab === "calendar"
              ? "bg-[#345B73] text-white border-[#345B73] shadow-md"
              : "bg-[#EAE6DF] text-[#4A5D6B] border-[#D5CFB9] hover:bg-[#DFD9CE]"
          }`}
        >
          <span className="font-brand-serif font-black text-xs opacity-75">NO. 2</span>
          <span>スケジュールカレンダー</span>
        </button>
      </div>

      {/* View Content based on Personal Index Tab */}
      {personalSubTab === "calendar" ? (
        <div className="bg-[#F4F1EA] rounded-2xl border border-[#D5CFB9] p-4 md:p-6 shadow-sm animate-fade-in space-y-4">
          <div className="flex items-center justify-between border-b border-[#D5CFB9] pb-3">
            <h3 className="font-brand-serif font-bold text-[#244053] text-base md:text-lg flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#345B73]" />
              <span>月間スケジュールカレンダー</span>
            </h3>
            <span className="text-xs text-[#61727F] font-bold">日付ごとに締め切りのタスクが表示されます</span>
          </div>
          <TaskCalendar tasks={tasks} onToggleTask={onToggleTask} />
        </div>
      ) : (
        /* 2-Column Split: Form (Left) & Notebook Task List (Right) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">
          
          {/* Left side: Add Task Form */}
          <div className="bg-[#F4F1EA] rounded-2xl border border-[#D5CFB9] p-6 shadow-sm lg:col-span-1 space-y-4">
            <h2 className="font-brand-serif font-bold text-[#244053] text-lg border-b border-[#D5CFB9] pb-3 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#345B73]" />
              <span>タスクの新規作成</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#4A5D6B] mb-1.5">タスク名 <span className="text-[#C24D38]">*</span></label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: レポート提出"
                  required
                  className="w-full bg-white border border-[#D5CFB9] rounded-xl px-4 py-2.5 text-xs md:text-sm font-semibold text-[#22303C] focus:outline-hidden focus:ring-1 focus:ring-[#345B73]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#4A5D6B] mb-1.5">カテゴリー</label>
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
                    className="w-full bg-white border border-[#D5CFB9] rounded-xl px-3 py-2 text-xs md:text-sm font-semibold text-[#22303C] focus:outline-hidden cursor-pointer"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="add_new" className="text-[#345B73] font-bold">＋カテゴリー追加</option>
                  </select>

                  {/* Custom Category Input Form */}
                  {showAddCatInput && (
                    <div className="mt-2.5 p-2 bg-white border border-[#345B73]/40 rounded-xl space-y-2 animate-fade-in">
                      <input
                        type="text"
                        placeholder="新カテゴリー名"
                        value={newCatName}
                        autoFocus
                        onChange={(e) => setNewCatName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCategorySubmit();
                          }
                        }}
                        className="w-full bg-[#F4F1EA] border border-[#D5CFB9] rounded-lg px-2.5 py-1.5 text-xs text-[#22303C] font-bold focus:outline-hidden"
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
                          className="bg-[#345B73] text-white text-xs px-3 py-1 rounded-lg font-bold shadow-xs cursor-pointer"
                        >
                          追加
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A5D6B] mb-1.5">優先度 (3段階)</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as PriorityType)}
                    className="w-full bg-white border border-[#D5CFB9] rounded-xl px-3 py-2 text-xs md:text-sm font-semibold text-[#22303C] focus:outline-hidden cursor-pointer"
                  >
                    <option value="high">最重要 (赤)</option>
                    <option value="medium">重要 (黄)</option>
                    <option value="low">通常</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A5D6B] mb-1.5">締切日時</label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  required
                  className="w-full bg-white border border-[#D5CFB9] rounded-xl px-4 py-2.5 text-xs md:text-sm font-semibold text-[#22303C] focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#244053] hover:bg-[#1A3141] text-white font-bold py-3 rounded-xl text-xs md:text-sm shadow-md transition-all cursor-pointer mt-2"
              >
                タスクを追加する
              </button>
            </form>
          </div>

          {/* Right side: Notebook Grid Lined Task Area */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Controls Bar: Category Filter & Status Filter Side by Side */}
            <div className="bg-[#F4F1EA] rounded-2xl border border-[#D5CFB9] p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm">
              <div className="flex flex-wrap items-center gap-3">
                {/* Category Filter */}
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-[#5F7A6E]" />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-white border border-[#D5CFB9] rounded-lg px-2.5 py-1.5 font-bold text-[#22303C] focus:outline-hidden cursor-pointer text-xs"
                  >
                    <option value="all">すべてのカテゴリー</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5">
                  <ListFilter className="w-3.5 h-3.5 text-[#5F7A6E]" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-white border border-[#D5CFB9] rounded-lg px-2.5 py-1.5 font-bold text-[#22303C] focus:outline-hidden cursor-pointer text-xs"
                  >
                    <option value="all">すべてのタスク</option>
                    <option value="active">未完了のみ</option>
                    <option value="completed">完了したタスクのみ</option>
                  </select>
                </div>
              </div>

              <span className="text-[#61727F] text-xs font-bold">
                {processedTasks.length}件のタスク
              </span>
            </div>

            {/* Notebook Task Container */}
            <div className="bg-[#F4F1EA] rounded-2xl border border-[#D5CFB9] p-5 md:p-6 shadow-sm space-y-3 relative overflow-hidden bg-notebook-pattern">
              <div className="flex items-center justify-between border-b-2 border-[#D5CFB9] pb-2 mb-4">
                <span className="font-brand-serif font-black text-[#244053] text-sm md:text-base tracking-wider uppercase flex items-center gap-2">
                  <span>📖</span>
                  <span>My Notebook Tasks</span>
                </span>
                <span className="text-[10px] text-[#61727F] font-bold">クリックで優先度変更 / 集中タイマー</span>
              </div>

              {processedTasks.length === 0 ? (
                <div className="bg-white/80 rounded-xl border border-[#D5CFB9] p-8 text-center space-y-2">
                  <p className="font-bold text-[#4A5D6B] text-xs md:text-sm">該当するタスクはありません</p>
                  <p className="text-[#61727F] text-xs">新しいタスクを追加してください</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {processedTasks.map((task) => {
                    const isHigh = task.priority === "high";
                    const isMedium = task.priority === "medium";

                    return (
                      <div
                        key={task.id}
                        className={`rounded-xl border p-3.5 md:p-4 flex items-center justify-between gap-3.5 transition-all bg-white/90 shadow-xs hover:shadow-md ${
                          task.completed 
                            ? "border-[#D5CFB9] opacity-60 bg-slate-50/80" 
                            : isHigh
                              ? "border-[#C24D38]/50 bg-rose-50/40"
                              : isMedium
                                ? "border-[#C49A45]/50 bg-amber-50/40"
                                : "border-[#D5CFB9]"
                        }`}
                      >
                        {/* Square Checkbox & Title */}
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            onClick={() => onToggleTask(task.id)}
                            className="text-[#244053] hover:text-[#345B73] transition-colors cursor-pointer shrink-0"
                            title={task.completed ? "未完了に戻す" : "完了にする"}
                          >
                            {task.completed ? (
                              <CheckSquare className="w-5 h-5 text-[#345B73] fill-[#345B73]/10 stroke-[2.5]" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400 stroke-[2]" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <span className={`font-semibold text-xs md:text-sm text-[#22303C] block truncate ${
                              task.completed ? "line-through text-slate-400" : ""
                            }`}>
                              {task.title}
                            </span>
                            
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-[#61727F] font-semibold">
                              <span className="bg-[#EAE6DF] text-[#4A5D6B] px-2 py-0.5 rounded-md border border-[#D5CFB9]">
                                {task.category}
                              </span>
                              
                              {/* 3-Tier Interactive Priority Switcher Button */}
                              <button
                                type="button"
                                onClick={(e) => handleTogglePriority(task, e)}
                                title="クリックで優先度を3段階（最重要/重要/通常）切り替え"
                                className={`px-2 py-0.5 rounded-md border font-extrabold transition-all cursor-pointer ${
                                  isHigh
                                    ? "bg-[#C24D38] text-white border-[#A63C29]"
                                    : isMedium
                                      ? "bg-[#C49A45] text-white border-[#A88033]"
                                      : "bg-[#EAE6DF] text-[#61727F] border-[#D5CFB9]"
                                }`}
                              >
                                {isHigh ? "最重要" : isMedium ? "重要" : "通常"}
                              </button>

                              <span className="flex items-center gap-1 text-[#61727F]">
                                <CalendarIcon className="w-3 h-3 text-[#5F7A6E]" />
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
                              className="bg-[#345B73] hover:bg-[#244053] text-white font-bold px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
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
                            className="p-1.5 text-slate-300 hover:text-[#C24D38] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
      )}

    </div>
  );
}
