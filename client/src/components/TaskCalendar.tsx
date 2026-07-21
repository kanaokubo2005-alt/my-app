import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Task } from "../types";

interface TaskCalendarProps {
  tasks: Task[];
  onToggleTask?: (id: string) => void;
}

// Japanese Public Holidays dictionary
const getJapaneseHoliday = (monthNum: number, dayNum: number): string | null => {
  const mm = String(monthNum).padStart(2, "0");
  const dd = String(dayNum).padStart(2, "0");
  const key = `${mm}-${dd}`;

  const holidays: Record<string, string> = {
    "01-01": "元日",
    "01-12": "成人の日",
    "02-11": "建国記念の日",
    "02-23": "天皇誕生日",
    "03-20": "春分の日",
    "04-29": "昭和の日",
    "05-03": "憲法記念日",
    "05-04": "みどりの日",
    "05-05": "こどもの日",
    "07-20": "海の日",
    "08-11": "山の日",
    "09-21": "敬老の日",
    "09-23": "秋分の日",
    "10-12": "スポーツの日",
    "11-03": "文化の日",
    "11-23": "勤労感謝の日",
    "12-31": "大晦日"
  };

  return holidays[key] || null;
};

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
    return tasks.filter(task => task.deadline.startsWith(dateStr));
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
    if (completed) return "bg-slate-200 text-slate-500 line-through";
    switch (priority) {
      case "high": return "bg-[#C24D38] text-white font-bold";
      case "medium": return "bg-[#C49A45] text-white font-bold";
      case "low":
      default: return "bg-[#345B73] text-white font-semibold";
    }
  };

  // Generate grid cells
  const calendarCells = [];

  // 1. Previous month trailing days
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

  // 3. Next month leading days (fill remaining to reach a multiple of 7)
  const remainingCells = 42 - calendarCells.length;
  if (remainingCells < 7) {
    for (let i = 1; i <= remainingCells; i++) {
      calendarCells.push({
        dayNum: i,
        isCurrentMonth: false,
      });
    }
  }

  return (
    <div className="bg-[#FAF8F5] bg-notebook-pattern border border-[#E0DACB] rounded-lg p-4 md:p-5 shadow-xs space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between border-b border-[#E0DACB] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-base md:text-lg font-sans font-black text-[#244053]">
            {year}年 {monthNames[month]}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-md border border-[#E0DACB] bg-[#F4F1EA] hover:bg-[#EBE7DF] transition-colors text-[#22303C] cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-md border border-[#E0DACB] bg-[#F4F1EA] hover:bg-[#EBE7DF] transition-colors text-[#22303C] cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] md:text-xs font-bold text-[#61727F]">
        <div className="text-[#C24D38] py-1">日</div>
        <div className="py-1">月</div>
        <div className="py-1">火</div>
        <div className="py-1">水</div>
        <div className="py-1">木</div>
        <div className="py-1">金</div>
        <div className="text-[#345B73] py-1">土</div>
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {calendarCells.map((cell, index) => {
          const dayTasks = getTasksForDate(cell.dayNum, cell.isCurrentMonth);
          const cellIsToday = isToday(cell.dayNum, cell.isCurrentMonth);
          const holidayName = cell.isCurrentMonth ? getJapaneseHoliday(month + 1, cell.dayNum) : null;
          const isSunday = index % 7 === 0;

          return (
            <div
              key={index}
              className={`min-h-[76px] md:min-h-[88px] p-1.5 border rounded-md flex flex-col justify-between transition-all bg-notebook-pattern ${
                cell.isCurrentMonth
                  ? holidayName || isSunday
                    ? "bg-[#FAF8F5] border-[#E0DACB]"
                    : "bg-[#FAF8F5] border-[#E0DACB]"
                  : "bg-slate-100/40 border-[#E0DACB]/40 text-slate-300 opacity-50"
              } ${
                cellIsToday 
                  ? "ring-2 ring-[#345B73] border-transparent" 
                  : "hover:border-[#345B73]"
              }`}
            >
              {/* Day Number & Holiday Name */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] md:text-xs font-bold ${
                      cellIsToday
                        ? "bg-[#244053] text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        : holidayName || isSunday
                        ? "text-[#C24D38]"
                        : cell.isCurrentMonth
                        ? "text-[#22303C]"
                        : "text-slate-300"
                    }`}
                  >
                    {cell.dayNum}
                  </span>
                  {dayTasks.length > 0 && cell.isCurrentMonth && (
                    <span className="text-[9px] font-bold text-[#345B73] bg-[#EAE6DF] px-1 rounded-xs border border-[#D5CFB9]">
                      {dayTasks.length}件
                    </span>
                  )}
                </div>

                {/* Holiday Label in Red */}
                {holidayName && cell.isCurrentMonth && (
                  <span className="text-[8px] font-bold text-[#C24D38] truncate block mt-0.5">
                    {holidayName}
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
                      className={`w-full text-left truncate text-[9px] md:text-[10px] px-1 py-0.5 rounded-xs transition-all cursor-pointer ${getPriorityBgColor(
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
