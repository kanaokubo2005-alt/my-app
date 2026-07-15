import { 
  Flame, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Check, 
  Play,
  ArrowUpCircle,
  ArrowRightCircle,
  ArrowDownCircle
} from "lucide-react";
import type { Task, PriorityType } from "../types";

interface PriorityViewProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onStartFocusSession: (task: Task) => void;
}

export default function PriorityView({ tasks, onToggleTask, onStartFocusSession }: PriorityViewProps) {
  
  const getTasksByPriority = (prio: PriorityType) => {
    return tasks.filter(task => task.priority === prio);
  };

  const highTasks = getTasksByPriority("high");
  const mediumTasks = getTasksByPriority("medium");
  const lowTasks = getTasksByPriority("low");

  const renderTaskCard = (task: Task) => {
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
              {task.deadline}
            </span>

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
    <div className="flex-1 overflow-y-auto bg-slate-bg p-4 md:p-8 space-y-8">
      {/* View Header */}
      <div>
        <h1 className="font-sans font-bold text-2xl md:text-3xl text-slate-800 tracking-tight">⭐ Priority Lanes</h1>
        <p className="text-slate-400 text-xs md:text-sm font-medium mt-1">
          重要度ごとにタスクをレーン分けし、何から着手すべきかをビジュアル管理します
        </p>
      </div>

      {/* Kanban lanes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* High Priority Lane */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-4 h-full min-h-[500px]">
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
              highTasks.map(renderTaskCard)
            )}
          </div>
        </div>

        {/* Medium Priority Lane */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-4 h-full min-h-[500px]">
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
              mediumTasks.map(renderTaskCard)
            )}
          </div>
        </div>

        {/* Low Priority Lane */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-4 h-full min-h-[500px]">
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
              lowTasks.map(renderTaskCard)
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
