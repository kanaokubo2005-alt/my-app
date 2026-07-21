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
  Play,
  CheckCircle2,
  X
} from "lucide-react";
import type { Task, PriorityType, TrashItem } from "../types";

interface TasksViewProps {
  tasks: Task[];
  onAddTask: (task: Task) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onStartFocusSession: (task: Task) => void;
  onAddToTrash?: (item: TrashItem) => void;
}

export default function TasksView({
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onStartFocusSession,
  onAddToTrash
}: TasksViewProps) {
  const [showCompletedModal, setShowCompletedModal] = useState(false);
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
      case "high": return "bg-rose-50 border border-rose-100 text-rose-600 font-extrabold";
      case "medium":
      default: return "bg-amber-50 border border-amber-100 text-amber-600 font-bold";
    }
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

        {/* Button to show completed tasks modal */}
        <button
          onClick={() => setShowCompletedModal(true)}
          className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs transition-all shadow-2xs cursor-pointer shrink-0"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>完了したタスクを表示 ({tasks.filter(t => t.completed).length}件)</span>
        </button>
      </div>

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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-500">カテゴリー</label>
                  {!showAddCatInput && (
                    <button
                      type="button"
                      onClick={() => setShowAddCatInput(true)}
                      className="text-[10px] text-cobalt font-bold hover:underline cursor-pointer"
                    >
                      ＋追加
                    </button>
                  )}
                </div>
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
                      autoFocus
                      onChange={(e) => setNewCatName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          const val = newCatName.trim();
                          if (val) {
                            const updated = categories.includes(val) ? categories : [...categories, val];
                            setCategories(updated);
                            localStorage.setItem("todone_custom_categories", JSON.stringify(updated));
                            setCategory(val);
                            setNewCatName("");
                            setShowAddCatInput(false);
                          }
                        }
                      }}
                      className="flex-1 bg-white border border-cobalt/40 rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden text-slate-700 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = newCatName.trim();
                        if (val) {
                          const updated = categories.includes(val) ? categories : [...categories, val];
                          setCategories(updated);
                          localStorage.setItem("todone_custom_categories", JSON.stringify(updated));
                          setCategory(val);
                          setNewCatName("");
                          setShowAddCatInput(false);
                        }
                      }}
                      className="bg-cobalt text-white text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-cobalt/90 cursor-pointer shrink-0"
                    >
                      追加
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddCatInput(false)}
                      className="border border-slate-200 text-slate-500 text-xs px-2.5 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer shrink-0"
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
                  <option value="high">最重要 (赤)</option>
                  <option value="medium">通常</option>
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

            <button
              onClick={() => setShowCompletedModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl font-bold hover:bg-emerald-100 transition-colors cursor-pointer text-xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>完了したタスクを表示 ({tasks.filter(t => t.completed).length}件)</span>
            </button>
          </div>

          {/* List display */}
          <div className="space-y-3">
            {processedTasks.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center space-y-2">
                <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="font-semibold text-slate-700 text-sm">該当するタスクはありません</p>
                <p className="text-slate-400 text-xs">新しいタスクを追加してください</p>
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
                        {task.priority === "high" && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-rose-50 text-rose-600 border border-rose-100 font-extrabold">
                            最重要
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

      {/* Completed Tasks Modal */}
      {showCompletedModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-2xl flex flex-col max-h-[85vh] animate-fade-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 rounded-xl text-emerald-500">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-slate-800 text-base">完了したタスク一覧</h3>
                  <p className="text-slate-400 text-[11px] font-medium">これまでに達成された学習の成果です</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCompletedModal(false)}
                className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {tasks.filter(t => t.completed).length === 0 ? (
                <div className="text-center py-16 space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-500">完了したタスクはまだありません</p>
                  <p className="text-xs text-slate-400">タスクに取り組み完了させると、ここに成果が蓄積されます！</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.filter(t => t.completed).map((task) => (
                    <div 
                      key={task.id}
                      className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-between gap-4 hover:border-slate-200 transition-all"
                    >
                      <div className="min-w-0 space-y-1">
                        <span className="font-semibold text-xs md:text-sm text-slate-700 block truncate line-through opacity-70">
                          {task.title}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-medium">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                            {task.category}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${getPriorityBadgeClass(task.priority)}`}>
                            {task.priority === "high" ? "最重要" : "重要"}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-3 h-3 text-slate-300" />
                            締切: {task.deadline}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => onToggleTask(task.id)}
                          className="flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold px-2.5 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer shadow-3xs"
                          title="タスクを未完了に戻す"
                        >
                          <RotateCcw className="w-3 h-3 text-cobalt" />
                          <span>未完了に戻す</span>
                        </button>
                        <button
                          onClick={() => onDeleteTask(task.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="タスクを削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-end">
              <button 
                onClick={() => setShowCompletedModal(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
