import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Task } from "../types";

interface TaskCalendarProps {
  tasks: Task[];
  onToggleTask?: (id: string) => void;
}

export default function TaskCalendar({ tasks, onToggleTask }: TaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月"
  ];

  // Days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // First day of current month (0: Sunday, 6: Saturday)
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Trailing days from previous month
  const prevDaysInMonth = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Helper to format date string to "YYYY-MM-DD"
  const getLocalDateString = (d: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return "";
    const mStr = String(month + 1).padStart(2, "0");
    const dStr = String(d).padStart(2, "0");
    return `${year}-${mStr}-${dStr}`;
  };

  // Filter tasks due on a specific local date
  const getTasksForDate = (dayNum: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return [];
    const dateStr = getLocalDateString(dayNum, true);
    return tasks.filter(task => {
      // Handles both "YYYY-MM-DD" and full ISO strings
      return task.deadline.startsWith(dateStr);
    });
  };

  const isToday = (dayNum: number, isCurrentMonth: boolean) => {
    const today = new Date();
    return (
      isCurrentMonth &&
      year === today.getFullYear() &&
      month === today.getMonth() &&
      dayNum === today.getDate()
    );
  };

  const getPriorityBgColor = (priority: string, completed: boolean) => {
    if (completed) {
      return "bg-slate-100 text-slate-400 line-through opacity-70";
    }
    switch (priority) {
      case "high":
      case "must":
        return "bg-rose-500 text-white font-semibold";
      case "medium":
      default:
        return "bg-amber-400 text-slate-900 font-semibold";
    }
  };

  // Generate calendar grid array
  const calendarCells = [];

  // 1. Prev month padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarCells.push({
      dayNum: prevDaysInMonth - i,
      isCurrentMonth: false,
    });
  }

  // 2. Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({
      dayNum: i,
      isCurrentMonth: true,
    });
  }

  // 3. Next month padding days to complete grid (multiples of 7)
  const remainingCells = 7 - (calendarCells.length % 7);
  if (remainingCells < 7) {
    for (let i = 1; i <= remainingCells; i++) {
      calendarCells.push({
        dayNum: i,
        isCurrentMonth: false,
      });
    }
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm md:text-base font-sans font-extrabold text-slate-800">
            {year}年 {monthNames[month]}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors text-slate-500 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors text-slate-500 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] md:text-xs font-bold text-slate-400">
        <div className="text-rose-500 py-1">日</div>
        <div className="py-1">月</div>
        <div className="py-1">火</div>
        <div className="py-1">水</div>
        <div className="py-1">木</div>
        <div className="py-1">金</div>
        <div className="text-cobalt py-1">土</div>
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {calendarCells.map((cell, index) => {
          const dayTasks = getTasksForDate(cell.dayNum, cell.isCurrentMonth);
          const cellIsToday = isToday(cell.dayNum, cell.isCurrentMonth);

          return (
            <div
              key={index}
              className={`min-h-[72px] md:min-h-[84px] p-1.5 border rounded-xl flex flex-col justify-between transition-all ${
                cell.isCurrentMonth
                  ? "bg-white border-slate-100"
                  : "bg-slate-50/50 border-slate-50 text-slate-300"
              } ${
                cellIsToday 
                  ? "ring-2 ring-cobalt border-transparent shadow-xs" 
                  : "hover:border-slate-200"
              }`}
            >
              {/* Day Number */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] md:text-xs font-extrabold ${
                    cellIsToday
                      ? "bg-cobalt text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      : cell.isCurrentMonth
                      ? "text-slate-700"
                      : "text-slate-300"
                  }`}
                >
                  {cell.dayNum}
                </span>
                {dayTasks.length > 0 && cell.isCurrentMonth && (
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1 rounded-sm">
                    {dayTasks.length}件
                  </span>
                )}
              </div>

              {/* Tasks List inside Day */}
              <div className="mt-1 flex-1 flex flex-col gap-1 overflow-hidden">
                {cell.isCurrentMonth &&
                  dayTasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => onToggleTask && onToggleTask(task.id)}
                      title={`${task.title} (ステータス: ${task.completed ? "完了" : "未完了"})`}
                      className={`w-full text-left truncate text-[9px] md:text-[10px] px-1 py-0.5 rounded-sm transition-all cursor-pointer ${getPriorityBgColor(
                        task.priority,
                        task.completed
                      )}`}
                    >
                      {task.title}
                    </button>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
