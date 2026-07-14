import { useState } from "react";
import { BarChart3, Clock, Target, Award, PieChart, CheckCircle2, TrendingUp, X, RotateCcw, AlertCircle, Calendar } from "lucide-react";
import type { Task } from "../types";

interface AnalyticsViewProps {
  tasks: Task[];
  onToggleTask?: (id: string) => void;
}

export default function AnalyticsView({ tasks, onToggleTask }: AnalyticsViewProps) {
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  
  const totalTasks = tasks.length;
  const completedTasksList = tasks.filter(t => t.completed);
  const completedTasks = completedTasksList.length;
  const activeTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Group by category
  const categories = Array.from(new Set(tasks.map(t => t.category)));
  const categoryStats = categories.map(cat => {
    const catTasks = tasks.filter(t => t.category === cat);
    const catCompleted = catTasks.filter(t => t.completed).length;
    return {
      name: cat,
      total: catTasks.length,
      completed: catCompleted,
      percentage: catTasks.length > 0 ? Math.round((catCompleted / catTasks.length) * 100) : 0
    };
  }).sort((a, b) => b.total - a.total);

  // Focus hour calculation
  const totalFocusMinutes = completedTasksList.reduce((acc, t) => acc + (t.duration ?? 0), 0);
  const totalFocusHours = (totalFocusMinutes / 60).toFixed(1);

  // Priority Stats
  const getPrioCount = (prio: "high" | "medium" | "low") => {
    return tasks.filter(t => t.priority === prio).length;
  };
  const getPrioCompletedCount = (prio: "high" | "medium" | "low") => {
    return tasks.filter(t => t.priority === prio && t.completed).length;
  };

  const getPriorityBadgeClass = (p: string) => {
    switch (p) {
      case "high": return "bg-rose-50 border border-rose-100 text-rose-600";
      case "medium": return "bg-amber-50 border border-amber-100 text-amber-600";
      case "low": return "bg-emerald-50 border border-emerald-100 text-emerald-600";
      default: return "bg-slate-50 border border-slate-100 text-slate-600";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-bg p-4 md:p-8 space-y-8">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 id="analytics-header" className="font-sans font-bold text-2xl md:text-3xl text-slate-800 tracking-tight">📊 Study Analytics</h1>
          <p className="text-slate-400 text-xs md:text-sm font-medium mt-1">
            タスク消化率や学習フォーカス時間の可視化データ
          </p>
        </div>

        {/* Toggle Completed Tasks Button */}
        <button
          id="btn-show-completed"
          onClick={() => setShowCompletedModal(true)}
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 font-bold px-4.5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-2xs hover:shadow-xs transition-all cursor-pointer self-start sm:self-center"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>完了したタスクを表示 ({completedTasks}件)</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        
        {/* Completion rate Circular Widget */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col items-center justify-center text-center gap-4">
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">タスク消化率</span>
          
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* SVG circular track */}
            <svg className="w-full h-full transform -rotate-90">
              <circle 
                cx="56" 
                cy="56" 
                r="46" 
                className="stroke-slate-100 fill-none" 
                strokeWidth="8"
              />
              <circle 
                cx="56" 
                cy="56" 
                r="46" 
                className="stroke-cobalt fill-none transition-all duration-1000 ease-out" 
                strokeWidth="8"
                strokeDasharray="289"
                strokeDashoffset={289 - (289 * completionRate) / 100}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute font-sans font-bold text-slate-800 text-2xl">{completionRate}%</span>
          </div>

          <div className="text-xs text-slate-400 font-medium">
            <span className="font-bold text-slate-700">{completedTasks}</span> / {totalTasks} 件完了
          </div>
        </div>

        {/* Total Focus Hours */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">総フォーカス時間</span>
            <span className="p-1.5 bg-amber-50 text-amber-500 rounded-lg"><Clock className="w-4 h-4" /></span>
          </div>
          <div className="my-4">
            <span className="font-sans font-bold text-slate-800 text-3xl md:text-4xl">{totalFocusHours}</span>
            <span className="text-slate-400 text-xs font-semibold ml-1">時間</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
            完了したタスクの予定所要時間から、実際に集中した総時間を算出しています。
          </p>
        </div>

        {/* Active Tasks */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">残りのタスク数</span>
            <span className="p-1.5 bg-cobalt/5 text-cobalt rounded-lg"><Target className="w-4 h-4" /></span>
          </div>
          <div className="my-4">
            <span className="font-sans font-bold text-slate-800 text-3xl md:text-4xl">{activeTasks}</span>
            <span className="text-slate-400 text-xs font-semibold ml-1">件</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
            計画的にスケジュールを進めて、締切前の徹夜を防ぎましょう！
          </p>
        </div>

        {/* Daily streak */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">継続学習日数</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-500 rounded-lg"><TrendingUp className="w-4 h-4" /></span>
          </div>
          <div className="my-4">
            <span className="font-sans font-bold text-slate-800 text-3xl md:text-4xl">5</span>
            <span className="text-slate-400 text-xs font-semibold ml-1">日連続</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
            素晴らしい継続力です！この調子で今週もタスクを達成していきましょう。
          </p>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Category distribution bars */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-50 pb-3">
            <h2 className="font-sans font-bold text-slate-800 text-sm md:text-base flex items-center gap-2">
              <PieChart className="w-5 h-5 text-cobalt" />
              <span>カテゴリー別分析</span>
            </h2>
          </div>

          <div className="space-y-4">
            {categoryStats.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-10">データがありません</p>
            ) : (
              categoryStats.map(stat => (
                <div key={stat.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700">{stat.name}</span>
                    <span className="text-slate-400">
                      {stat.completed} / {stat.total} 件完了 ({stat.percentage}%)
                    </span>
                  </div>
                  {/* Progress bar container */}
                  <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                    <div 
                      className="bg-cobalt h-full rounded-full transition-all duration-1000"
                      style={{ width: `${stat.total > 0 ? (stat.total / totalTasks) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Priority Analysis Cards */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-50 pb-3">
            <h2 className="font-sans font-bold text-slate-800 text-sm md:text-base flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cobalt" />
              <span>優先度別の完了率</span>
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* High */}
            <div className="bg-rose-50/30 border border-rose-100/30 rounded-xl p-4 text-center space-y-2">
              <span className="block text-[11px] font-bold text-rose-600">High</span>
              <span className="block font-sans font-extrabold text-slate-700 text-lg md:text-xl">
                {getPrioCompletedCount("high")} / {getPrioCount("high")}
              </span>
              <span className="block text-[10px] text-slate-400">件 完了</span>
            </div>

            {/* Medium */}
            <div className="bg-amber-50/30 border border-amber-100/30 rounded-xl p-4 text-center space-y-2">
              <span className="block text-[11px] font-bold text-amber-600">Medium</span>
              <span className="block font-sans font-extrabold text-slate-700 text-lg md:text-xl">
                {getPrioCompletedCount("medium")} / {getPrioCount("medium")}
              </span>
              <span className="block text-[10px] text-slate-400">件 完了</span>
            </div>

            {/* Low */}
            <div className="bg-emerald-50/30 border border-emerald-100/30 rounded-xl p-4 text-center space-y-2">
              <span className="block text-[11px] font-bold text-emerald-600">Low</span>
              <span className="block font-sans font-extrabold text-slate-700 text-lg md:text-xl">
                {getPrioCompletedCount("low")} / {getPrioCount("low")}
              </span>
              <span className="block text-[10px] text-slate-400">件 完了</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500 leading-normal">
            💡 <span className="font-bold text-slate-700">アドバイス:</span> High優先度のタスク消化率は重要です。最優先で完了させることで、週全体のストレス値を大幅に下げることができます。
          </div>
        </div>

      </div>

      {/* Completed Tasks Viewer Modal */}
      {showCompletedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4" id="completed-tasks-modal">
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
              {completedTasksList.length === 0 ? (
                <div className="text-center py-16 space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-500">完了したタスクはまだありません</p>
                  <p className="text-xs text-slate-400">タスクに取り組み完了させると、ここに成果が蓄積されます！</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedTasksList.map((task) => (
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
                          <span className={`px-1.5 py-0.5 rounded ${getPriorityBadgeClass(task.priority)}`}>
                            {task.priority.toUpperCase()}
                          </span>
                          {task.duration !== null && (
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3 h-3 text-slate-300" />
                              {task.duration}分
                            </span>
                          )}
                          <span className="flex items-center gap-0.5">
                            <Calendar className="w-3 h-3 text-slate-300" />
                            締切: {task.deadline}
                          </span>
                        </div>
                      </div>

                      {/* Action (Undo) */}
                      {onToggleTask && (
                        <button
                          onClick={() => onToggleTask(task.id)}
                          className="flex items-center gap-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold px-2.5 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer shadow-3xs"
                          title="タスクを未完了に戻す"
                        >
                          <RotateCcw className="w-3 h-3 text-cobalt" />
                          <span>未完了に戻す</span>
                        </button>
                      )}
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
