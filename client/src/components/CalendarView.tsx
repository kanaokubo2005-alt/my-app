import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Check, Sparkles, Plus, Trash2, Edit, X, Loader2 } from "lucide-react";
import type { Task } from "../types";
import type { CalendarEvent } from "../lib/firebase";
import { getFirebaseToken } from "../lib/firebase";

type Holiday = { name: string };

const formatLocalDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const nthWeekday = (year: number, month: number, weekday: number, occurrence: number) => {
  const first = new Date(year, month, 1);
  return 1 + ((weekday - first.getDay() + 7) % 7) + (occurrence - 1) * 7;
};

/** Japanese national holidays for the modern calendar (including substitute and citizens' holidays). */
const getJapaneseHolidays = (year: number): Map<string, Holiday> => {
  const holidays = new Map<string, Holiday>();
  const add = (month: number, day: number, name: string) => holidays.set(formatLocalDate(new Date(year, month, day)), { name });
  add(0, 1, "元日");
  add(0, nthWeekday(year, 0, 1, 2), "成人の日");
  add(1, 11, "建国記念の日");
  if (year >= 2020) add(1, 23, "天皇誕生日");
  add(2, Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4)), "春分の日");
  add(3, 29, "昭和の日");
  add(4, 3, "憲法記念日");
  add(4, 4, "みどりの日");
  add(4, 5, "こどもの日");
  add(6, nthWeekday(year, 6, 1, 3), "海の日");
  add(7, 11, "山の日");
  add(8, nthWeekday(year, 8, 1, 3), "敬老の日");
  add(8, Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4)), "秋分の日");
  add(9, nthWeekday(year, 9, 1, 2), "スポーツの日");
  add(10, 3, "文化の日");
  add(10, 23, "勤労感謝の日");

  // A Sunday holiday is observed on the next non-holiday weekday.
  [...holidays.keys()].forEach((dateKey) => {
    const date = new Date(`${dateKey}T00:00:00`);
    if (date.getDay() !== 0) return;
    do date.setDate(date.getDate() + 1); while (holidays.has(formatLocalDate(date)));
    holidays.set(formatLocalDate(date), { name: "振替休日" });
  });
  // A weekday between two holidays becomes a citizens' holiday.
  for (let date = new Date(year, 0, 2); date.getFullYear() === year; date.setDate(date.getDate() + 1)) {
    const previous = new Date(date); previous.setDate(previous.getDate() - 1);
    const next = new Date(date); next.setDate(next.getDate() + 1);
    if (date.getDay() !== 0 && holidays.has(formatLocalDate(previous)) && holidays.has(formatLocalDate(next))) {
      holidays.set(formatLocalDate(date), { name: "国民の休日" });
    }
  }
  return holidays;
};

const parseCalendarDate = (value?: string) => {
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
};

interface CalendarViewProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  calendarEvents: CalendarEvent[];
  onStartFocusSession?: (task: Task) => void;
  onRefreshCalendar?: () => void;
  onGoogleSync?: () => Promise<void>;
}

export default function CalendarView({ 
  tasks, 
  onToggleTask, 
  calendarEvents,
  onStartFocusSession,
  onRefreshCalendar,
  onGoogleSync
}: CalendarViewProps) {
  // Dynamically initialized to the current date
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月"
  ];

  // Days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // First day of month index (0: Sunday, 6: Saturday)
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Prev month padding days
  const prevDaysInMonth = new Date(year, month, 0).getDate();



  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const isToday = (dayNum: number, isCurrentMonth: boolean) => {
    const today = new Date();
    return isCurrentMonth && year === today.getFullYear() && month === today.getMonth() && dayNum === today.getDate();
  };

  // Format date string helper
  const getDateStr = (dayNum: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return "";
    const mStr = String(month + 1).padStart(2, "0");
    const dStr = String(dayNum).padStart(2, "0");
    return `${year}-${mStr}-${dStr}`;
  };

  // Get tasks due on a specific date
  const getTasksForDate = (dayNum: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return [];
    const dateStr = getDateStr(dayNum, isCurrentMonth);
    return tasks.filter(task => task.deadline.startsWith(dateStr));
  };

  // Get Google Calendar events on a specific date
  const getEventsForDate = (dayNum: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return [];
    const dayStart = new Date(year, month, dayNum);
    const dayEnd = new Date(year, month, dayNum + 1);
    return calendarEvents.filter(event => {
      const start = parseCalendarDate(event.start?.dateTime || event.start?.date);
      const end = parseCalendarDate(event.end?.dateTime || event.end?.date);
      return !!start && !!end && start < dayEnd && end > dayStart;
    }).sort((a, b) => (a.start?.dateTime || a.start?.date || "").localeCompare(b.start?.dateTime || b.start?.date || ""));
  };

  const eventColorClasses = [
    "bg-blue-100 text-blue-800 border-blue-200",
    "bg-violet-100 text-violet-800 border-violet-200",
    "bg-emerald-100 text-emerald-800 border-emerald-200",
    "bg-rose-100 text-rose-800 border-rose-200",
    "bg-amber-100 text-amber-800 border-amber-200",
    "bg-cyan-100 text-cyan-800 border-cyan-200",
  ];

  const getEventColorClass = (event: CalendarEvent) => {
    const key = event.id || event.summary || "event";
    const hash = Array.from(key).reduce((total, char) => total + char.charCodeAt(0), 0);
    return eventColorClasses[hash % eventColorClasses.length];
  };

  const getEventTimeLabel = (event: CalendarEvent) => {
    if (!event.start?.dateTime) return "終日";
    return new Date(event.start.dateTime).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEventLabelForDay = (event: CalendarEvent, day: number) => {
    const start = parseCalendarDate(event.start?.dateTime || event.start?.date);
    return start && start.getFullYear() === year && start.getMonth() === month && start.getDate() === day
      ? getEventTimeLabel(event)
      : "継続";
  };

  const holidays = getJapaneseHolidays(year);

  const getPriorityDotColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-rose-500";
      case "medium": return "bg-amber-500";
      case "low": return "bg-emerald-500";
      default: return "bg-slate-400";
    }
  };

  // Google Calendar official colors mapping
  const getGoogleColor = (colorId?: string) => {
    switch (colorId) {
      case "1": // Lavender
        return { style: { backgroundColor: "#e8f0fe", color: "#1a73e8", borderColor: "#dadce0" } };
      case "2": // Sage (Mint)
        return { style: { backgroundColor: "#e6f4ea", color: "#137333", borderColor: "#ceead6" } };
      case "3": // Grape (Purple)
        return { style: { backgroundColor: "#f3e8fd", color: "#9333ea", borderColor: "#f3e8fd" } };
      case "4": // Flamingo (Pink/Coral)
        return { style: { backgroundColor: "#fce8e6", color: "#c5221f", borderColor: "#fad2cf" } };
      case "5": // Banana (Yellow)
        return { style: { backgroundColor: "#fef7e0", color: "#b06000", borderColor: "#feebc8" } };
      case "6": // Tangerine (Orange)
        return { style: { backgroundColor: "#feefe3", color: "#e28743", borderColor: "#ffe3d1" } };
      case "7": // Peacock (Turquoise)
        return { style: { backgroundColor: "#e4f7fb", color: "#007b83", borderColor: "#c2eff7" } };
      case "8": // Graphite (Gray)
        return { style: { backgroundColor: "#f1f3f4", color: "#3c4043", borderColor: "#e8eaed" } };
      case "9": // Blueberry (Blue)
        return { style: { backgroundColor: "#e8f0fe", color: "#1a73e8", borderColor: "#d2e3fc" } };
      case "10": // Basil (Green)
        return { style: { backgroundColor: "#e6f4ea", color: "#137333", borderColor: "#ceead6" } };
      case "11": // Tomato (Red)
        return { style: { backgroundColor: "#fce8e6", color: "#c5221f", borderColor: "#fad2cf" } };
      default: // Default (ToDone Cobalt Blue Theme)
        return { style: { backgroundColor: "rgba(26, 82, 230, 0.05)", color: "#1a52e6", borderColor: "rgba(26, 82, 230, 0.1)" } };
    }
  };

  interface VisualEvent {
    event: CalendarEvent;
    startCol: number;
    span: number;
    track: number;
  }

  const getWeekVisualEvents = (week: Date[]): VisualEvent[] => {
    const weekStart = new Date(week[0].getFullYear(), week[0].getMonth(), week[0].getDate());
    const weekEnd = new Date(week[6].getFullYear(), week[6].getMonth(), week[6].getDate(), 23, 59, 59);

    const overlapping = calendarEvents.filter(event => {
      if (!event.start || !event.end) return false;
      const s = parseCalendarDate(event.start.dateTime || event.start.date);
      const e = parseCalendarDate(event.end.dateTime || event.end.date);
      if (!s || !e) return false;
      const adjustedE = event.end.date ? new Date(e.getTime() - 1) : e;
      return s <= weekEnd && adjustedE >= weekStart;
    });

    overlapping.sort((a, b) => {
      const sA = parseCalendarDate(a.start.dateTime || a.start.date)?.getTime() || 0;
      const eA = parseCalendarDate(a.end.dateTime || a.end.date)?.getTime() || 0;
      const sB = parseCalendarDate(b.start.dateTime || b.start.date)?.getTime() || 0;
      const eB = parseCalendarDate(b.end.dateTime || b.end.date)?.getTime() || 0;
      const durA = eA - sA;
      const durB = eB - sB;

      if (durB !== durA) return durB - durA;
      return sA - sB;
    });

    const visualEvents: VisualEvent[] = [];
    const occupiedTracks: boolean[][] = [];

    for (const event of overlapping) {
      const s = parseCalendarDate(event.start.dateTime || event.start.date)!;
      const e = parseCalendarDate(event.end.dateTime || event.end.date)!;
      const adjustedE = event.end.date ? new Date(e.getTime() - 1) : e;

      let startCol = 0;
      for (let i = 0; i < 7; i++) {
        const dayEnd = new Date(week[i].getFullYear(), week[i].getMonth(), week[i].getDate(), 23, 59, 59);
        if (s <= dayEnd) {
          startCol = i;
          break;
        }
      }

      let endCol = 6;
      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(week[i].getFullYear(), week[i].getMonth(), week[i].getDate());
        if (adjustedE >= dayStart) {
          endCol = i;
          break;
        }
      }

      const span = endCol - startCol + 1;

      let track = 0;
      while (true) {
        if (!occupiedTracks[track]) {
          occupiedTracks[track] = new Array(7).fill(false);
        }

        let isAvailable = true;
        for (let col = startCol; col <= endCol; col++) {
          if (occupiedTracks[track][col]) {
            isAvailable = false;
            break;
          }
        }

        if (isAvailable) {
          for (let col = startCol; col <= endCol; col++) {
            occupiedTracks[track][col] = true;
          }
          break;
        }
        track++;
      }

      visualEvents.push({ event, startCol, span, track });
    }

    return visualEvents;
  };

  const calendarDays: Array<{ date: Date; isCurrentMonth: boolean; dayNumber: number }> = [];

  // Prev month padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevDaysInMonth - i);
    calendarDays.push({ date: d, isCurrentMonth: false, dayNumber: prevDaysInMonth - i });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    calendarDays.push({ date: d, isCurrentMonth: true, dayNumber: i });
  }

  // Next month padding days
  const totalSlots = 42;
  const nextMonthDaysCount = totalSlots - calendarDays.length;
  for (let i = 1; i <= nextMonthDaysCount; i++) {
    const d = new Date(year, month + 1, i);
    calendarDays.push({ date: d, isCurrentMonth: false, dayNumber: i });
  }

  // Group into 6 weeks
  const weeks: Array<Array<{ date: Date; isCurrentMonth: boolean; dayNumber: number }>> = [];
  for (let i = 0; i < totalSlots; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  // Currently selected day details (defaults to today)
  const [selectedDay, setSelectedDay] = useState<number | null>(() => new Date().getDate());
  const selectedDayTasks = selectedDay !== null ? getTasksForDate(selectedDay, true) : [];
  const selectedDayEvents = selectedDay !== null ? getEventsForDate(selectedDay, true) : [];

  // Modals & Form states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");

  const handleGoogleSyncLink = async () => {
    setLoading(true);
    try {
      if (onGoogleSync) await onGoogleSync();
    } catch (err) {
      console.error(err);
      alert("連携中にエラーが発生しました。ポップアップがブロックされていないかご確認ください。");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    const defaultDate = getDateStr(selectedDay || new Date().getDate(), true);
    setFormTitle("");
    setFormDescription("");
    setFormStart(`${defaultDate}T00:00`);
    setFormEnd(`${defaultDate}T23:59`);
    setIsAddModalOpen(true);
  };

  const openEditModal = (event: CalendarEvent) => {
    const sTime = event.start?.dateTime ? new Date(event.start.dateTime) : new Date();
    const eTime = event.end?.dateTime ? new Date(event.end.dateTime) : new Date();
    
    // Format to YYYY-MM-DDTHH:MM local format
    const formatToLocalISO = (d: Date) => {
      const tzOffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    };

    setSelectedEvent(event);
    setFormTitle(event.summary || "");
    setFormDescription(event.description || "");
    setFormStart(formatToLocalISO(sTime));
    setFormEnd(formatToLocalISO(eTime));
    setIsEditModalOpen(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return alert("タイトルを入力してください");
    setLoading(true);
    try {
      const firebaseToken = await getFirebaseToken();
      if (!firebaseToken) return;

      const googleToken = localStorage.getItem("todone_google_token");
      const response = await fetch("/api/calendar/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
          ...(googleToken ? { "X-Google-Token": googleToken } : {})
        },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          start: formStart,
          end: formEnd
        })
      });

      if (response.ok) {
        setIsAddModalOpen(false);
        if (onRefreshCalendar) onRefreshCalendar();
      } else {
        const err = await response.json();
        alert(`追加失敗: ${err.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      alert("追加中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !formTitle.trim()) return;
    setLoading(true);
    try {
      const firebaseToken = await getFirebaseToken();
      if (!firebaseToken) return;

      const googleToken = localStorage.getItem("todone_google_token");
      const response = await fetch(`/api/calendar/events/${selectedEvent.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${firebaseToken}`,
          ...(googleToken ? { "X-Google-Token": googleToken } : {})
        },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          start: formStart,
          end: formEnd
        })
      });

      if (response.ok) {
        setIsEditModalOpen(false);
        if (onRefreshCalendar) onRefreshCalendar();
      } else {
        const err = await response.json();
        alert(`更新失敗: ${err.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      alert("更新中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    if (!confirm("この予定を削除しますか？")) return;
    setLoading(true);
    try {
      const firebaseToken = await getFirebaseToken();
      if (!firebaseToken) return;

      const googleToken = localStorage.getItem("todone_google_token");
      const response = await fetch(`/api/calendar/events/${selectedEvent.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${firebaseToken}`,
          ...(googleToken ? { "X-Google-Token": googleToken } : {})
        }
      });

      if (response.ok) {
        setIsEditModalOpen(false);
        if (onRefreshCalendar) onRefreshCalendar();
      } else {
        alert("削除に失敗しました。");
      }
    } catch (err) {
      console.error(err);
      alert("削除中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-bg p-4 md:p-8 space-y-6 animate-fade-in">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-sans font-bold text-2xl md:text-3xl text-slate-800 tracking-tight">📅 Calendar & Schedule</h1>
          <p className="text-slate-400 text-xs md:text-sm font-medium mt-1">
            Google カレンダーの予定とタスクの締切を同時に可視化
          </p>
        </div>

        {/* Google Sync Button */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button 
            onClick={handleGoogleSyncLink}
            disabled={loading}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-2xs hover:shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 text-cobalt animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            )}
            <span>Googleカレンダー連携</span>
          </button>

          {/* Month Selector Controls */}
          <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-4 py-2 shadow-xs shrink-0">
            <button 
              onClick={handlePrevMonth}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-sans font-bold text-slate-700 text-sm min-w-24 text-center">
              {year}年 {monthNames[month]}
            </span>
            <button 
              onClick={handleNextMonth}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 1. Schedule & Tasks List ABOVE the calendar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="border-b border-slate-50 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-cobalt animate-pulse" />
            <h2 className="font-sans font-extrabold text-slate-800 text-sm md:text-base">
              {selectedDay}日の予定 & タスク (選択中の日付)
            </h2>
          </div>
          <span className="text-[11px] font-bold text-cobalt bg-cobalt/5 px-3 py-1 rounded-full border border-cobalt/10">
            {year}年{month + 1}月{selectedDay}日
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Google Calendar Events */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-50">
              <h3 className="text-xs font-bold text-cobalt flex items-center gap-1.5">
                <span className="w-1.5 h-3.5 bg-cobalt rounded-full inline-block"></span>
                Google カレンダーの予定 ({selectedDayEvents.length}件)
              </h3>
              <button
                onClick={openAddModal}
                className="text-[10px] font-bold text-cobalt bg-cobalt/5 hover:bg-cobalt/10 px-2 py-1 rounded-lg border border-cobalt/10 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>予定追加</span>
              </button>
            </div>
            
            {selectedDayEvents.length === 0 ? (
              <p className="text-slate-400 text-xs py-4 pl-1 italic">カレンダーの予定はありません。</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                {selectedDayEvents.map((event) => {
                  let timeStr = "終日";
                  if (event.start?.dateTime) {
                    const s = new Date(event.start.dateTime);
                    const e = new Date(event.end?.dateTime || "");
                    const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                    timeStr = `${formatTime(s)}〜${formatTime(e)}`;
                  }
                  return (
                    <button 
                      key={event.id} 
                      onClick={() => openEditModal(event)}
                      className="p-2.5 rounded-xl border border-cobalt bg-cobalt text-white flex flex-col gap-1 hover:bg-cobalt/90 transition-colors text-left w-full cursor-pointer shadow-2xs"
                    >
                      <span className="text-xs font-bold text-white leading-tight truncate">{event.summary || "予定"}</span>
                      <span className="text-[10px] text-blue-100 font-medium flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-blue-200" />
                        {timeStr}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Tasks Due */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-amber-600 flex items-center gap-1.5 pb-1 border-b border-slate-50">
              <span className="w-1.5 h-3.5 bg-amber-500 rounded-full inline-block"></span>
              締切のタスク ({selectedDayTasks.length}件)
            </h3>

            {selectedDayTasks.length === 0 ? (
              <p className="text-slate-400 text-xs py-4 pl-1 italic">締切を迎えるタスクはありません。</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                {selectedDayTasks.map((task) => (
                  <div 
                    key={task.id}
                    className={`p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-start gap-2 transition-all hover:bg-slate-50 group ${
                      task.completed ? "opacity-60" : ""
                    }`}
                  >
                    <button
                      onClick={() => onToggleTask(task.id)}
                      className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors cursor-pointer ${
                        task.completed 
                          ? "bg-cobalt border-cobalt text-white" 
                          : "border-slate-300 hover:border-cobalt bg-white"
                      }`}
                    >
                      {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <span className={`block font-sans font-bold text-xs text-slate-700 leading-tight truncate ${
                        task.completed ? "line-through text-slate-400" : ""
                      }`}>
                        {task.title}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1 text-[9px] text-slate-400 font-semibold">
                        <span className="bg-white px-1.5 py-0.2 border border-slate-100 rounded text-slate-500 font-medium scale-90 origin-left">
                          {task.category}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-white scale-90 origin-left ${
                          task.priority === "high" ? "bg-rose-500" : task.priority === "medium" ? "bg-amber-500" : "bg-emerald-500"
                        }`}>
                          {task.priority.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Focus button */}
                    {!task.completed && onStartFocusSession && (
                      <button
                        onClick={() => onStartFocusSession(task)}
                        className="p-1 rounded-lg hover:bg-white text-cobalt transition-colors shrink-0 self-center"
                        title="フォーカス開始"
                      >
                        <Clock className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Monthly Grid Board */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
        {/* Weekday titles */}
        <div className="grid grid-cols-7 gap-1 text-center mb-3">
          {["日", "月", "火", "水", "木", "金", "土"].map((d, idx) => (
            <span 
              key={d} 
              className={`text-xs font-extrabold py-0.5 ${
                idx === 0 ? "text-rose-500" : idx === 6 ? "text-cobalt" : "text-slate-400"
              }`}
            >
              {d}
            </span>
          ))}
        </div>

        {/* Days Grid - rendering week by week to layer spanning event bars */}
        <div className="space-y-1.5">
          {weeks.map((week, weekIdx) => {
            const weekVisEvents = getWeekVisualEvents(week.map(d => d.date));
            
            // Calculate more count per day in the week for track >= 3
            const moreCounts = new Array(7).fill(0);
            for (const vis of weekVisEvents) {
              if (vis.track >= 3) {
                const sCol = Math.max(0, vis.startCol);
                const eCol = Math.min(6, vis.startCol + vis.span - 1);
                for (let col = sCol; col <= eCol; col++) {
                  moreCounts[col]++;
                }
              }
            }

            const trackOffset = 20;
            const weekHeightClass = "h-[62px] md:h-[72px] min-h-[62px] md:min-h-[72px]";

            return (
              <div key={`week-${weekIdx}`} className={`relative w-full ${weekHeightClass}`}>
                {/* 1. Background day cells grid (shorter height) */}
                <div className="grid grid-cols-7 gap-1.5 absolute inset-0 w-full h-full">
                  {week.map((dayObj, colIdx) => {
                    const dayTasks = getTasksForDate(dayObj.dayNumber, dayObj.isCurrentMonth);
                    const isCurrentToday = dayObj.isCurrentMonth && 
                      new Date().getFullYear() === year && 
                      new Date().getMonth() === month && 
                      dayObj.dayNumber === new Date().getDate();
                    const isDaySelected = selectedDay === dayObj.dayNumber && dayObj.isCurrentMonth;
                    const dateStr = dayObj.isCurrentMonth 
                      ? `${year}-${String(month + 1).padStart(2, "0")}-${String(dayObj.dayNumber).padStart(2, "0")}`
                      : "";
                    const holiday = dayObj.isCurrentMonth ? holidays.get(dateStr) : null;
                    const hasTasks = dayTasks.length > 0;

                    return (
                      <div
                        key={`cell-${colIdx}`}
                        onClick={() => {
                          if (dayObj.isCurrentMonth) {
                            setSelectedDay(dayObj.dayNumber);
                          }
                        }}
                        className={`p-1 border rounded-lg flex flex-col justify-between transition-all relative text-left cursor-pointer ${
                          !dayObj.isCurrentMonth 
                            ? "bg-slate-50/20 border-slate-50 opacity-30 text-slate-300 pointer-events-none" 
                            : isDaySelected 
                              ? "border-cobalt bg-cobalt/5 shadow-xs" 
                              : isCurrentToday
                                ? "border-cobalt/30 bg-slate-50"
                                : "border-slate-100 hover:border-slate-200 bg-white"
                        }`}
                      >
                        {/* Day Cell Top Row: Day Number and Holiday (horizontal), with Tasks dots on the right */}
                        <div className="flex items-center justify-between w-full z-20 pointer-events-none">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span 
                              className={`w-5 h-5 rounded-md text-[10px] md:text-xs font-extrabold flex items-center justify-center shrink-0 transition-all ${
                                isCurrentToday 
                                  ? "bg-cobalt text-white shadow-xs" 
                                  : holiday
                                    ? "text-rose-600 font-extrabold"
                                    : isDaySelected 
                                      ? "text-cobalt font-extrabold" 
                                      : "text-slate-600 font-semibold"
                              }`}
                            >
                              {dayObj.dayNumber}
                            </span>
                            {holiday && (
                              <span className="truncate text-[7px] md:text-[8px] font-extrabold text-rose-600 max-w-[32px] sm:max-w-[48px] md:max-w-[70px] inline-block" title={holiday.name}>
                                {holiday.name}
                              </span>
                            )}
                          </div>

                          {/* Tasks: Dot list at top right */}
                          {hasTasks && (
                            <div className="flex gap-0.5 items-center">
                              {dayTasks.slice(0, 3).map((task) => (
                                <div 
                                  key={task.id} 
                                  title={`${task.title} (タスク)`}
                                  className={`w-1 h-1 rounded-full ${getPriorityDotColor(task.priority)}`} 
                                />
                              ))}
                              {dayTasks.length > 3 && (
                                <span className="text-[6px] text-slate-400 font-bold leading-none">+{dayTasks.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* More counts link label at the bottom of the cell if there are >3 event tracks */}
                        {dayObj.isCurrentMonth && moreCounts[colIdx] > 0 && (
                          <div className="w-full text-right text-[7px] md:text-[8px] font-extrabold text-slate-400 pb-0.5 z-20 pointer-events-none">
                            他 {moreCounts[colIdx]} 件
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 2. Absolute overlay grid for calendar event bars */}
                <div className="absolute inset-x-0 bottom-1 top-6 pointer-events-none w-full h-full">
                  {weekVisEvents
                    .filter(vis => vis.track < 3)
                    .map(vis => {
                      const topPosition = (vis.track * 10) + 12; // height for up to 3 bars
                      return (
                        <button
                          key={vis.event.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(vis.event);
                          }}
                          style={{
                            left: `calc(${vis.startCol * 100 / 7}% + 3px)`,
                            width: `calc(${vis.span * 100 / 7}% - 6px)`,
                            top: `${topPosition}px`,
                            backgroundColor: "#0047AB",
                            color: "#ffffff",
                            borderColor: "#0047AB",
                          }}
                          title={vis.event.summary || "予定"}
                          className="absolute h-2 text-[6.5px] md:text-[7.5px] leading-none font-bold rounded-xs px-1 border border-cobalt bg-cobalt text-white truncate text-left z-10 hover:brightness-95 transition-all cursor-pointer flex items-center pointer-events-auto shadow-2xs"
                        >
                          {vis.event.summary || "予定"}
                        </button>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- ADD EVENT MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateEvent} className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-100 shadow-2xl space-y-4 relative">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-sans font-bold text-slate-800 text-base md:text-lg flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-cobalt" />
              <span>予定を登録</span>
            </h2>
            <div className="space-y-3 text-xs md:text-sm">
              <div className="space-y-1">
                <label className="font-bold text-slate-600">タイトル</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required placeholder="講義発表、アルバイトなど" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-cobalt focus:bg-white outline-hidden" />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-600">説明</label>
                <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="詳細内容など" rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-cobalt focus:bg-white outline-hidden resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">開始日時</label>
                  <input type="datetime-local" value={formStart} onChange={(e) => setFormStart(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-cobalt focus:bg-white outline-hidden" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">終了日時</label>
                  <input type="datetime-local" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-cobalt focus:bg-white outline-hidden" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className="flex-1 bg-cobalt text-white font-bold py-2.5 rounded-xl text-xs md:text-sm shadow-md hover:bg-cobalt/95 transition-all cursor-pointer flex items-center justify-center gap-1.5">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>追加する</span>
              </button>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 px-4 rounded-xl text-xs md:text-sm transition-all cursor-pointer">
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- EDIT EVENT MODAL --- */}
      {isEditModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleUpdateEvent} className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-100 shadow-2xl space-y-4 relative">
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="absolute right-4 top-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="font-sans font-bold text-slate-800 text-base md:text-lg flex items-center gap-2">
              <Edit className="w-5 h-5 text-cobalt" />
              <span>予定を編集・削除</span>
            </h2>
            <div className="space-y-3 text-xs md:text-sm">
              <div className="space-y-1">
                <label className="font-bold text-slate-600">タイトル</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-cobalt focus:bg-white outline-hidden" />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-600">説明</label>
                <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-cobalt focus:bg-white outline-hidden resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">開始日時</label>
                  <input type="datetime-local" value={formStart} onChange={(e) => setFormStart(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-cobalt focus:bg-white outline-hidden" />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">終了日時</label>
                  <input type="datetime-local" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-cobalt focus:bg-white outline-hidden" />
                </div>
              </div>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button type="submit" disabled={loading} className="flex-1 bg-cobalt text-white font-bold py-2.5 rounded-xl text-xs md:text-sm shadow-md hover:bg-cobalt/95 transition-all cursor-pointer flex items-center justify-center gap-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>更新する</span>
              </button>
              <button type="button" onClick={handleDeleteEvent} disabled={loading} className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 px-3.5 rounded-xl text-xs md:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-1">
                <Trash2 className="w-4 h-4" />
                <span>削除</span>
              </button>
              <button type="button" onClick={() => setIsEditModalOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 px-3 rounded-xl text-xs md:text-sm transition-all cursor-pointer">
                閉じる
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
