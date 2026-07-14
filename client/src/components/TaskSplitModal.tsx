import { useState, useEffect } from "react";
import { X, Scissors, Loader2, Plus, CheckSquare, Sparkles } from "lucide-react";
import type { Task } from "../types";
import { getFirebaseToken } from "../lib/firebase";

interface TaskSplitModalProps {
  task: Task;
  onClose: () => void;
  onAddSubtasksAsTasks: (subtaskTitles: string[]) => void;
}

export default function TaskSplitModal({ task, onClose, onAddSubtasksAsTasks }: TaskSplitModalProps) {
  const [steps, setSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSplitSteps = async () => {
      setLoading(true);
      try {
        const token = await getFirebaseToken();
        const response = await fetch("/api/split-task", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ taskTitle: task.title, category: task.category })
        });
        if (response.ok) {
          const data = await response.json();
          setSteps(data.steps || []);
        } else {
          throw new Error("Failed to split task");
        }
      } catch (e) {
        console.error("Failed to split task:", e);
        // Fallback steps
        setSteps([
          "資料・参考文献・教科書をデスクに準備する (5分)",
          "全体の章構成（イントロ、本論、結論）の骨組みを作る (15分)",
          "最初のパラグラフ（導入部）を書き上げる (20分)",
          "全体を見直し、誤字脱字の修正と参考文献を記載する (10分)"
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchSplitSteps();
  }, [task]);

  const handleAddAsTasks = () => {
    onAddSubtasksAsTasks(steps);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 border border-slate-100 shadow-2xl relative overflow-hidden space-y-6">
        {/* Background Visual Gradient */}
        <div className="absolute right-0 top-0 w-32 h-32 bg-cobalt-light/10 rounded-full blur-2xl -z-10" />

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3">
          <div className="p-2 bg-cobalt/10 text-cobalt rounded-xl shrink-0">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-sans font-bold text-slate-800 text-base md:text-lg">
              AI タスク分割コーチ
            </h2>
            <p className="text-slate-400 text-xs font-semibold mt-1">
              重い課題「{task.title}」を小さなサブステップに分割します
            </p>
          </div>
        </div>

        {/* Content Panel */}
        <div className="bg-slate-50 border border-slate-100/50 rounded-2xl p-5 min-h-[180px] flex flex-col justify-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center text-center gap-3 py-6">
              <Loader2 className="w-7 h-7 text-cobalt animate-spin" />
              <span className="text-xs font-bold text-slate-500">AIが最適な分割ステップを生成中...</span>
            </div>
          ) : (
            <div className="space-y-3.5">
              <span className="text-[10px] text-cobalt font-extrabold flex items-center gap-1.5 uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Proposed Action Steps
              </span>
              
              <div className="space-y-2.5">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs md:text-sm text-slate-600">
                    <span className="w-5.5 h-5.5 rounded-lg bg-white border border-slate-100 text-cobalt font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="leading-normal font-medium pt-0.5">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Control Footer */}
        {!loading && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleAddAsTasks}
              className="flex-1 bg-cobalt hover:bg-cobalt/95 text-white font-bold py-3 px-4 rounded-xl text-xs md:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-cobalt/10 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>これらのステップを単独タスクとして追加</span>
            </button>
            <button
              onClick={onClose}
              className="sm:w-32 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 px-4 rounded-xl text-xs md:text-sm transition-all cursor-pointer"
            >
              閉じる
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
