import { useState, useEffect } from "react";
import { Play, Pause, X, CheckCircle2, Award, Zap, Smile } from "lucide-react";
import type { Task } from "../types";

interface FocusSessionProps {
  task: Task;
  onClose: () => void;
  onCompleteTask: (id: string) => void;
}

export default function FocusSession({
  task,
  onClose,
  onCompleteTask,
}: FocusSessionProps) {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes pomodoro by default
  const [isActive, setIsActive] = useState(true);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    let interval: any = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !isFinished) {
      setIsActive(false);
      setIsFinished(true);
      // Play a subtle notification or auto-complete if needed
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft, isFinished]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleToggle = () => {
    setIsActive(!isActive);
  };

  const handleFinishEarly = () => {
    setIsFinished(true);
    setIsActive(false);
  };

  const handleCompleteAndExit = () => {
    onCompleteTask(task.id);
    onClose();
  };

  const percentage = (timeLeft / (25 * 60)) * 100;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 border border-slate-100 shadow-2xl relative overflow-hidden text-center space-y-6">
        {/* Background visual accents */}
        <div className="absolute right-0 top-0 w-32 h-32 bg-cobalt-light/10 rounded-full blur-2xl -z-10" />
        <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -z-10" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {!isFinished ? (
          <>
            <div className="space-y-1">
              <span className="text-[10px] bg-cobalt/10 text-cobalt font-extrabold px-2.5 py-1 rounded-full uppercase tracking-widest">
                Focus Session Active
              </span>
              <h2 className="font-sans font-bold text-slate-800 text-lg md:text-xl mt-2 line-clamp-1">
                {task.title}
              </h2>
              <p className="text-slate-400 text-xs font-semibold">
                {task.category} • 目標: 25分集中
              </p>
            </div>

            {/* Timer circle visualization */}
            <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  className="stroke-slate-100 fill-none"
                  strokeWidth="8"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  className="stroke-cobalt fill-none transition-all duration-300"
                  strokeWidth="8"
                  strokeDasharray="502"
                  strokeDashoffset={502 - (502 * percentage) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute space-y-1">
                <span className="font-sans font-black text-slate-800 text-3xl md:text-4xl tracking-tight">
                  {formatTime(timeLeft)}
                </span>
                <span className="block text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {isActive ? "Focusing..." : "Paused"}
                </span>
              </div>
            </div>

            {/* Control Actions */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleToggle}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs md:text-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    : "bg-cobalt text-white shadow-md shadow-cobalt/20 hover:bg-cobalt/95"
                }`}
              >
                {isActive ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                <span>{isActive ? "Pause" : "Resume"}</span>
              </button>

              <button
                onClick={handleFinishEarly}
                className="px-6 py-2.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 rounded-xl font-bold text-xs md:text-sm transition-all cursor-pointer"
              >
                Finish Early
              </button>
            </div>
          </>
        ) : (
          <div className="py-6 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
              <Award className="w-8 h-8 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h2 className="font-sans font-extrabold text-slate-800 text-xl">
                お疲れ様でした！🎉
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto">
                「{task.title}
                」のフォーカスセッションが完了しました。集中できましたか？素晴らしい成果です！
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={handleCompleteAndExit}
                className="w-full bg-cobalt hover:bg-cobalt/95 text-white font-bold py-3 rounded-xl text-sm shadow-md shadow-cobalt/10 hover:shadow-lg transition-all cursor-pointer"
              >
                タスクを「完了」にしてセッションを閉じる
              </button>
              <button
                onClick={onClose}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
              >
                完了にせずセッションを閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
