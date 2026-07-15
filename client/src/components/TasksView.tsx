import React, { useState } from "react";
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  AlertCircle, 
  Filter, 
  ListFilter, 
  RotateCcw, 
  Check,
  ArrowUpCircle,
  ArrowRightCircle,
  ArrowDownCircle,
  Flame,
  Play
} from "lucide-react";
import type { Task, PriorityType } from "../types";

interface TasksViewProps {
  tasks: Task[];
  onAddTask: (task: Task) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onStartFocusSession: (task: Task) => void;
}

export default function TasksView({
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onStartFocusSession
}: TasksViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<"list" | "priority">("list");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("大学");
  const [priority, setPriority] = useState<PriorityType>("medium");
  const [deadline, setDeadline] = useState(() => {
    const d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
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

  // Filtering state (priority and status filters removed as requested)
  const [filterCategory, setFilterCategory] = useState("all");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: title.trim(),
      category,
      priority,
      duration: null, // Time duration input is removed
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

  // Process tasks: sorted strictly by priority score then deadline by default
  const processedTasks = tasks
    .filter((task) => {
      return filterCategory === "all" || task.category === filterCategory;
    })
    .sort((a, b) => {
      const scoreA = getPriorityScore(a.priority);
      const scoreB = getPriorityScore(b.priority);
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

  const getPriorityBadgeClass = (p: string) => {
    switch (p) {
      case "high": return "bg-rose-50 border border-rose-100 text-rose-600";
      case "medium": return "bg-amber-50 border border-amber-100 text-amber-600";
      case "low": return "bg-emerald-50 border border-emerald-100 text-emerald-600";
      default: return "bg-slate-50 border border-slate-100 text-slate-600";
    }
  };

  const getTasksByPriority = (prio: PriorityType) => {
    return tasks.filter(task => task.priority === prio);
  };

  const highTasks = getTasksByPriority("high");
  const mediumTasks = getTasksByPriority("medium");
  const lowTasks = getTasksByPriority("low");

  const renderPriorityTaskCard = (task: Task) => {
    return (
      <div 
        key={task.id}
        className={`bg-white rounded-xl border border-slate-100 p-4 shadow-xs flex flex-col justify-between gap-3 group transition-all hover:shadow-md hover:border-slate-200/60 ${
          task.completed ? "opacity-50 bg-slate-50/50 border-slate-100" : ""
        }`}
      >
        <div className="flex items-start gap-2.5 justify-between">
          <div className="flex items-start gap-2.5 min-w-0">
            <button
              onClick={() => onToggleTask(task.id)}
              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-colors ${
                task.completed 
                  ? "bg-cobalt border-cobalt text-white" 
                  : "border-slate-200 hover:border-cobalt bg-white"
              }`}
            >
              {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </button>

            <div className="min-w-0">
              <span className={`block font-sans font-bold text-xs md:text-sm text-slate-700 leading-tight truncate ${
                task.completed ? "line-through text-slate-400" : ""
              }`}>
                {task.title}
              </span>
              <span className="inline-block mt-1.5 text-[10px] bg-slate-50 px-2 py-0.5 rounded text-slate-400 font-medium">
                {task.category}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-50 pt-2.5 text-[10px] text-slate-400 font-medium">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-0.5">
              <Calendar className="w-3 h-3 text-slate-300" />
              {task.deadline.replace("T", " ")}
            </span>
            {task.duration !== null && (
              <span className="flex items-center gap-0.5">
                <Clock className="w-3 h-3 text-slate-300" />
                {task.duration}分
              </span>
            )}
          </div>

          {!task.completed && (
            <button
              onClick={() => onStartFocusSession(task)}
              className="text-cobalt hover:text-cobalt-light flex items-center gap-0.5 font-bold transition-colors cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Start</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-bg p-4 md:p-8 space-y-6">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-sans font-bold text-2xl md:text-3xl text-slate-800 tracking-tight">📝 Tasks Management</h1>
          <p className="text-slate-400 text-xs md:text-sm font-medium mt-1">
            日々のすべての予定をここで一元管理・新規登録できます
          </p>
        </div>

        {/* Tab Selectors */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1 shrink-0 border border-slate-200/50">
          <button
            onClick={() => setActiveSubTab("list")}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeSubTab === "list" 
                ? "bg-white text-cobalt shadow-xs" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            リスト表示
          </button>
          <button
            onClick={() => setActiveSubTab("priority")}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeSubTab === "priority" 
                ? "bg-white text-cobalt shadow-xs" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            優先度カンバン
          </button>
        </div>
      </div>

      {activeSubTab === "priority" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          {/* High Priority Lane */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-4 h-full min-h-[500px] shadow-2xs">
            <div className="flex items-center justify-between border-b border-rose-100/50 pb-3">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-rose-500" />
                <span className="font-sans font-bold text-slate-700 text-sm">High Priority</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-bold">
                {highTasks.length}
              </span>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-1">
              {highTasks.length === 0 ? (
                <div className="text-center py-10 bg-white border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                  現在、High優先度のタスクはありません。
                </div>
              ) : (
                highTasks.map(renderPriorityTaskCard)
              )}
            </div>
          </div>

          {/* Medium Priority Lane */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-4 h-full min-h-[500px] shadow-2xs">
            <div className="flex items-center justify-between border-b border-amber-100/50 pb-3">
              <div className="flex items-center gap-2">
                <ArrowRightCircle className="w-5 h-5 text-amber-500" />
                <span className="font-sans font-bold text-slate-700 text-sm">Medium Priority</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-amber-600 text-[10px] font-bold">
                {mediumTasks.length}
              </span>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-1">
              {mediumTasks.length === 0 ? (
                <div className="text-center py-10 bg-white border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                  現在、Medium優先度のタスクはありません。
                </div>
              ) : (
                mediumTasks.map(renderPriorityTaskCard)
              )}
            </div>
          </div>

          {/* Low Priority Lane */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-4 h-full min-h-[500px] shadow-2xs">
            <div className="flex items-center justify-between border-b border-emerald-100/50 pb-3">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-emerald-500" />
                <span className="font-sans font-bold text-slate-700 text-sm">Low Priority</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-bold">
                {lowTasks.length}
              </span>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-1">
              {lowTasks.length === 0 ? (
                <div className="text-center py-10 bg-white border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                  現在、Low優先度のタスクはありません。
                </div>
              ) : (
                lowTasks.map(renderPriorityTaskCard)
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left side: Add Task Form */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs lg:col-span-1">
          <h2 className="font-sans font-bold text-slate-800 text-base md:text-lg mb-5 flex items-center gap-2">
            <Plus className="w-5 h-5 text-cobalt" />
            <span>タスクを新規登録</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">タスク名</label>
              <input
                type="text"
                placeholder="例: 憲法レポートを作成する"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-hidden focus:ring-1 focus:ring-cobalt focus:bg-white text-slate-700 placeholder:text-slate-400 transition-all"
              />
            </div>

             <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">カテゴリー</label>
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === "add_new") {
                      setShowAddCatInput(true);
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs md:text-sm focus:outline-hidden focus:ring-1 focus:ring-cobalt focus:bg-white text-slate-700 transition-all"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="add_new" className="text-cobalt font-bold">＋カテゴリーをカスタマイズ追加</option>
                </select>
                {showAddCatInput && (
                  <div className="mt-2 flex gap-1.5 animate-fade-in">
                    <input
                      type="text"
                      placeholder="新しいカテゴリ名"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = newCatName.trim();
                        if (val && !categories.includes(val)) {
                          const updated = [...categories, val];
                          setCategories(updated);
                          localStorage.setItem("todone_custom_categories", JSON.stringify(updated));
                          setCategory(val);
                        }
                        setNewCatName("");
                        setShowAddCatInput(false);
                      }}
                      className="bg-cobalt text-white text-xs px-2.5 py-1.5 rounded-lg font-bold hover:bg-cobalt/90 cursor-pointer"
                    >
                      追加
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddCatInput(false)}
                      className="border border-slate-200 text-slate-500 text-xs px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">優先度</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityType)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs md:text-sm focus:outline-hidden focus:ring-1 focus:ring-cobalt focus:bg-white text-slate-700 transition-all"
                >
                  <option value="high">High (赤)</option>
                  <option value="medium">Medium (オレンジ)</option>
                  <option value="low">Low (緑)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">締切日時</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs md:text-sm focus:outline-hidden focus:ring-1 focus:ring-cobalt focus:bg-white text-slate-700 transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-cobalt hover:bg-cobalt/95 text-white font-semibold py-3 rounded-xl text-sm shadow-md shadow-cobalt/10 hover:shadow-lg hover:shadow-cobalt/20 transition-all cursor-pointer mt-2"
            >
              タスクを追加する
            </button>
          </form>
        </div>

        {/* Right side: Task filter control & task list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm">
            <div className="flex flex-wrap items-center gap-3">
              {/* Category Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 font-medium text-slate-600 focus:outline-hidden cursor-pointer"
                >
                  <option value="all">すべてのカテゴリー</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* List display */}
          <div className="space-y-3">
            {processedTasks.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400">
                <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-sm">タスクが見つかりませんでした。</p>
                <p className="text-xs mt-1">条件を変更するか、左側のフォームからタスクを追加してください。</p>
              </div>
            ) : (
              processedTasks.map((task) => (
                <div
                  key={task.id}
                  className={`rounded-2xl border p-4 flex items-center justify-between gap-4 shadow-xs hover:shadow-md transition-all group ${
                    task.completed 
                      ? "bg-slate-100 border-slate-200 opacity-80" 
                      : task.priority === "high"
                        ? "bg-rose-50/80 border-rose-200"
                        : "bg-white border-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <button
                      onClick={() => onToggleTask(task.id)}
                      className={`w-5.5 h-5.5 rounded-lg border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                        task.completed 
                          ? "bg-cobalt border-cobalt text-white" 
                          : "border-slate-200 hover:border-cobalt"
                      }`}
                    >
                      {task.completed && (
                        <svg className="w-3.5 h-3.5 stroke-[3] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    <div className="min-w-0">
                      <span className={`font-sans font-bold text-sm text-slate-700 block truncate ${
                        task.completed ? "line-through text-slate-400" : ""
                      }`}>
                        {task.title}
                      </span>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-medium">
                        <span className="bg-slate-200/60 px-1.5 py-0.5 rounded-md text-slate-500">
                          {task.category}
                        </span>
                        {task.priority !== "high" && (
                          <span className={`px-1.5 py-0.5 rounded-md ${getPriorityBadgeClass(task.priority)}`}>
                            {task.priority.toUpperCase()}
                          </span>
                        )}
                        {task.priority === "high" && (
                          <span className="bg-rose-600/10 text-rose-600 px-1.5 py-0.5 rounded-md font-bold">
                            重要
                          </span>
                        )}
                        {task.duration !== null && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3 text-slate-300" />
                            {task.duration}分
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <Calendar className="w-3 h-3 text-slate-300" />
                          締切: {task.deadline.replace("T", " ")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      title="削除"
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
