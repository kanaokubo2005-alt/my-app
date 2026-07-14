import { useState, useEffect } from "react";
import { 
  Search, 
  Plus, 
  Play, 
  Clock, 
  Check, 
  Zap, 
  Calendar, 
  Flame, 
  Award,
  AlertCircle,
  Trash2,
  ListPlus,
  Bell,
  LogOut,
  User as UserIcon,
  Info
} from "lucide-react";
import type { Task } from "../types";
import type { CalendarEvent } from "../lib/firebase";

interface DashboardProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onAddTaskClick: () => void;
  onStartFocusSession: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  calendarEvents: CalendarEvent[];
  user: any;
  onLogout: () => void;
}

export default function Dashboard({
  tasks,
  onToggleTask,
  onAddTaskClick,
  onStartFocusSession,
  onDeleteTask,
  searchQuery,
  setSearchQuery,
  calendarEvents,
  user,
  onLogout
}: DashboardProps) {
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Get current greeting based on hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    const userName = user?.displayName || "ゲスト";
    if (hour < 12) return `おはようございます、${userName}さん`;
    if (hour < 18) return `こんにちは、${userName}さん`;
    return `こんばんは、${userName}さん`;
  };

  // Get formatted Japanese date
  const getFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      weekday: 'long' 
    };
    return new Date().toLocaleDateString('ja-JP', options);
  };


  // Filter tasks based on search query
  const filteredTasks = tasks.filter(task => 
    !task.completed && (
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Stats calculation
  const todayTasksCount = tasks.filter(t => {
    // Treat high priority or today deadline as today tasks
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return t.deadline.startsWith(todayStr) || t.priority === 'high';
  }).length;
  
  const completedCount = tasks.filter(t => t.completed).length;
  
  const upcomingDeadlinesCount = tasks.filter(t => {
    if (t.completed) return false;
    const diff = new Date(t.deadline).getTime() - new Date().getTime();
    return diff > 0 && diff < (3 * 24 * 60 * 60 * 1000); // 3 days
  }).length;

  const totalFocusTime = tasks
    .filter(t => t.completed)
    .reduce((acc, t) => acc + (t.duration ?? 0), 0);

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-rose-50 border border-rose-100 text-rose-500 font-bold";
      case "medium":
        return "bg-amber-50 border border-amber-100 text-amber-500 font-bold";
      case "low":
        return "bg-emerald-50 border border-emerald-100 text-emerald-500 font-bold";
      default:
        return "bg-slate-50 border border-slate-100 text-slate-500 font-semibold";
    }
  };

  // Get dynamic notifications list for display
  const getDynamicNotifications = () => {
    const list = [];
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    // 1. Task due tomorrow (24h before deadline)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    
    const tasksDueTomorrow = tasks.filter(t => !t.completed && t.deadline.startsWith(tomorrowStr));
    tasksDueTomorrow.forEach(t => {
      list.push({
        id: `due-${t.id}`,
        title: "締切24時間前！",
        message: `課題「${t.title}」の提出締切が24時間以内に迫っています。`,
        type: "alert",
        time: "1日前"
      });
    });

    // 2. Upcoming events (5 minutes before starting - simulated from today's timeline)
    const todayEvents = getTodayTimelineEvents();
    if (todayEvents.length > 0) {
      list.push({
        id: "start-5m",
        title: "開始予定5分前",
        message: `次の予定「${todayEvents[0].summary}」がまもなく開始されます。準備しましょう。`,
        type: "event",
        time: "5分前"
      });
    }

    // 3. Nothing completed yet today nudge
    const completedToday = tasks.filter(t => t.completed).length;

    if (completedToday === 0 && tasks.filter(t => !t.completed).length > 0) {
      list.push({
        id: "nothing-done-nudge",
        title: "本日のアドバイス",
        message: "今日まだ何も終わっていません。まずは5分間だけ「Focus Session」を始めてみませんか？",
        type: "nudge",
        time: "朝"
      });
    }

    return list;
  };

  // Get simulated or Google Calendar events for Today
  const getTodayTimelineEvents = () => {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const events = calendarEvents.filter(event => {
      const startVal = event.start?.dateTime || event.start?.date || "";
      return startVal.startsWith(todayStr);
    });

    if (events.length > 0) {
      return events.map(e => {
        let timeLabel = "終日";
        let startHour = 9;
        if (e.start?.dateTime) {
          const s = new Date(e.start.dateTime);
          const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          timeLabel = `${formatTime(s)}〜${formatTime(new Date(e.end?.dateTime || ""))}`;
          startHour = s.getHours();
        }
        return {
          id: e.id,
          summary: e.summary || "予定",
          time: timeLabel,
          hour: startHour,
          type: e.summary?.includes("アルバイト") ? "job" : e.summary?.includes("研究室") ? "lab" : "class"
        };
      });
    }

    // Default Fallback Mock Schedule
    return [
      {
        id: "mock-1",
        summary: "憲法講義 (法学講義)",
        time: "9:00〜10:30",
        hour: 9,
        type: "class"
      },
      {
        id: "mock-2",
        summary: "ゼミ研究室発表準備",
        time: "13:00〜15:00",
        hour: 13,
        type: "lab"
      },
      {
        id: "mock-3",
        summary: "居酒屋アルバイト",
        time: "18:00〜22:00",
        hour: 18,
        type: "job"
      }
    ];
  };

  const todayEvents = getTodayTimelineEvents();
  const notificationsList = getDynamicNotifications();

  return (
    <div className="flex-1 overflow-y-auto bg-slate-bg p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in relative">
      
      {/* 1. Header Row (Greeting, Search Bar, Notifications, Profile) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="font-sans font-bold text-2xl md:text-3xl text-slate-800 leading-tight">
            {getGreeting()}
          </h1>
          <p className="text-slate-400 text-xs md:text-sm font-semibold mt-1">
            {getFormattedDate()}
          </p>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          {/* Dedicated Start Focus Session button */}
          <button
            onClick={() => {
              const activeTask = tasks.find(t => !t.completed) || tasks[0];
              if (activeTask) {
                onStartFocusSession(activeTask);
              } else {
                alert("タスクが登録されていません。まずは新しく追加してください。");
              }
            }}
            className="bg-emerald-500 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/10 hover:scale-[1.01]"
          >
            <Clock className="w-4 h-4 animate-pulse" />
            <span>Start Focus Session</span>
          </button>

          {/* Search bar */}
          <div className="relative flex-1 md:flex-none">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="タスクやカテゴリーを検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-xs md:text-sm w-full md:w-60 focus:outline-hidden focus:ring-1 focus:ring-cobalt focus:border-cobalt transition-all text-slate-700 placeholder:text-slate-400 shadow-2xs"
            />
          </div>

          {/* Notification Button */}
          <div className="relative">
            <button
              onClick={() => {
                setNotificationOpen(!notificationOpen);
                setProfileOpen(false);
              }}
              className={`p-2.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 text-slate-500 transition-colors cursor-pointer relative shadow-2xs`}
              title="通知"
            >
              <Bell className="w-4.5 h-4.5" />
              {notificationsList.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {notificationOpen && (
              <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
                  <span className="font-sans font-bold text-xs text-slate-800 uppercase tracking-wider">お知らせ通知</span>
                  <span className="text-[10px] bg-cobalt/10 text-cobalt font-bold px-2 py-0.5 rounded-full">
                    {notificationsList.length}件
                  </span>
                </div>
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {notificationsList.length === 0 ? (
                    <p className="text-slate-400 text-xs py-4 text-center">現在、新しい通知はありません。</p>
                  ) : (
                    notificationsList.map((notif) => (
                      <div key={notif.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2.5">
                        <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
                          notif.type === "alert" ? "text-rose-500" : notif.type === "event" ? "text-cobalt" : "text-amber-500"
                        }`} />
                        <div className="text-xs">
                          <p className="font-bold text-slate-800">{notif.title}</p>
                          <p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">{notif.message}</p>
                          <span className="text-[9px] text-slate-400 block mt-1 font-semibold">{notif.time}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotificationOpen(false);
              }}
              className="w-10 h-10 rounded-xl bg-cobalt/10 text-cobalt border border-slate-100 flex items-center justify-center font-bold text-sm shadow-2xs hover:bg-cobalt/15 transition-colors cursor-pointer"
            >
              {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : "G"}
            </button>

            {/* Profile actions dropdown */}
            {profileOpen && (
              <div className="absolute right-0 mt-2.5 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-4 space-y-3 text-xs">
                <div className="border-b border-slate-50 pb-2">
                  <span className="block font-bold text-slate-800">{user?.displayName || "ゲスト"}</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">{user?.email || "guest@todone.app"}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-slate-600 font-medium">
                    <UserIcon className="w-4 h-4" />
                    <span>マイアカウント</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-slate-600 font-medium">
                    <Calendar className="w-4 h-4" />
                    <span className="text-emerald-600 font-bold">Google連携中</span>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 p-2 border-t border-slate-50 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors text-left font-bold cursor-pointer mt-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>ログアウト</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. TASK LIST AT THE TOP OF THE PAGE (タスク一覧がページのトップに来るように) */}
      <div className="space-y-4 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-sans font-bold text-slate-800 text-lg flex items-center gap-2">
              <Check className="w-5 h-5 text-cobalt stroke-[2.5]" />
              <span>タスク一覧</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-semibold">
              {filteredTasks.length}件
            </span>
          </div>
          
          <button 
            onClick={onAddTaskClick}
            className="bg-cobalt hover:bg-cobalt/95 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
          >
            新規作成 <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.length === 0 ? (
            <div className="col-span-full py-10 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2">
              <ListPlus className="w-7 h-7 text-slate-300" />
              <p className="text-slate-400 text-xs font-medium">一致するタスクはありません。</p>
              <button 
                onClick={onAddTaskClick}
                className="text-[11px] text-cobalt hover:underline font-bold mt-1 cursor-pointer"
              >
                新しいタスクを追加
              </button>
            </div>
          ) : (
            filteredTasks.slice(0, 4).map((task) => (
              <div 
                key={task.id}
                className={`rounded-xl border transition-all p-3.5 flex flex-col justify-between gap-2.5 shadow-2xs hover:shadow-xs hover:border-slate-200 group ${
                  task.completed 
                    ? "opacity-60 border-slate-100 bg-slate-50/50" 
                    : task.priority === "high"
                      ? "bg-rose-50/80 border-rose-100 shadow-xs shadow-rose-500/5"
                      : "bg-white border-slate-100"
                }`}
              >
                <div className="flex items-start gap-2.5 justify-between">
                  {/* Left: Checkbox + Title */}
                  <div className="flex items-start gap-2.5 min-w-0">
                    <button
                      onClick={() => onToggleTask(task.id)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        task.completed 
                          ? "bg-cobalt border-cobalt text-white" 
                          : "border-slate-200 hover:border-cobalt bg-white"
                      }`}
                    >
                      {task.completed && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>

                    <div className="min-w-0">
                      <span className={`font-sans font-bold text-xs md:text-sm text-slate-700 block tracking-tight leading-tight group-hover:text-slate-900 ${
                        task.completed ? "line-through text-slate-400" : ""
                      }`}>
                        {task.title}
                      </span>
                      
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[9px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.2 rounded">
                          {task.category}
                        </span>
                        
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${getPriorityBadgeClass(task.priority)}`}>
                          {task.priority.toUpperCase()}
                        </span>

                        {task.duration !== null && (
                          <span className="text-[9px] text-slate-400 font-semibold flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {task.duration}分
                          </span>
                        )}

                        {/* Emergency Countdown / Urgent Badge */}
                        {!task.completed && (() => {
                          const deadlineDate = new Date(task.deadline);
                          const now = new Date();
                          const diffTime = deadlineDate.getTime() - now.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          
                          if (diffDays <= 0) {
                            return (
                              <span className="bg-rose-500 text-white font-extrabold px-1.5 py-0.2 rounded text-[8px] animate-pulse shrink-0 flex items-center gap-0.5">
                                <AlertCircle className="w-2 h-2" />
                                <span>期限超過 / 今日締切！</span>
                              </span>
                            );
                          } else if (diffDays === 1) {
                            return (
                              <span className="bg-rose-600 text-white font-extrabold px-1.5 py-0.2 rounded text-[8px] animate-pulse shrink-0 flex items-center gap-0.5">
                                <AlertCircle className="w-2.5 h-2.5 animate-spin" />
                                <span>24H未満！</span>
                              </span>
                            );
                          } else if (diffDays <= 3) {
                            return (
                              <span className="bg-amber-500 text-white font-extrabold px-1.5 py-0.2 rounded text-[8px] shrink-0 flex items-center gap-0.5">
                                <AlertCircle className="w-2 h-2" />
                                <span>あと {diffDays}日</span>
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      title="タスクを削除"
                      className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Bottom row */}
                <div className="flex items-center justify-between border-t border-slate-50 pt-2 text-[10px] text-slate-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    締切: {task.deadline}
                  </span>

                  {!task.completed && (
                    <button
                      onClick={() => onStartFocusSession(task)}
                      className="text-cobalt hover:text-cobalt-light flex items-center gap-0.5 font-bold transition-colors cursor-pointer"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>Focus</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {filteredTasks.length > 4 && (
          <div className="text-center pt-1 border-t border-slate-50">
            <button 
              onClick={onAddTaskClick}
              className="text-[11px] font-bold text-cobalt hover:underline cursor-pointer"
            >
              すべてのタスクを表示 ({filteredTasks.length}件中4件を表示中)
            </button>
          </div>
        )}
      </div>

      {/* 3. Stats Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Tasks */}
        <div className="bg-white border border-slate-100 rounded-2xl p-3 md:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="w-9 h-9 rounded-xl bg-cobalt/10 text-cobalt flex items-center justify-center shrink-0">
            <Zap className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="block text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Today's Tasks</span>
            <span className="font-sans font-bold text-slate-800 text-sm md:text-base">{todayTasksCount}</span>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white border border-slate-100 rounded-2xl p-3 md:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Award className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="block text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Completed</span>
            <span className="font-sans font-bold text-slate-800 text-sm md:text-base">{completedCount}</span>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white border border-slate-100 rounded-2xl p-3 md:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="block text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Deadlines (3d)</span>
            <span className="font-sans font-bold text-slate-800 text-sm md:text-base">{upcomingDeadlinesCount}</span>
          </div>
        </div>

        {/* Focus Time */}
        <div className="bg-white border border-slate-100 rounded-2xl p-3 md:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
            <Flame className="w-4.5 h-4.5" />
          </div>
          <div>
            <span className="block text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Focus Time</span>
            <span className="font-sans font-bold text-slate-800 text-sm md:text-base">{totalFocusTime}分</span>
          </div>
        </div>
      </div>

      {/* 4. Today's Schedule Timeline */}
      <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-sans font-bold text-slate-800 text-sm md:text-base">Today's Schedule</h2>
            <span className="text-[9px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1 scale-95">
              <Calendar className="w-2.5 h-2.5" />
              <span>Google Calendar</span>
            </span>
          </div>


          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              {todayEvents.slice(0, 3).map((event) => {
                let badgeClass = "bg-cobalt/10 text-cobalt border-cobalt/15";
                let dotClass = "bg-cobalt";
                
                if (event.type === "job") {
                  badgeClass = "bg-amber-50 text-amber-600 border-amber-100";
                  dotClass = "bg-amber-500";
                } else if (event.type === "lab") {
                  badgeClass = "bg-purple-50 text-purple-600 border-purple-100";
                  dotClass = "bg-purple-500";
                }

                return (
                  <div key={event.id} className="relative pl-6 group flex gap-2">
                    {/* Circle marker */}
                    <div className={`absolute left-0.5 top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${dotClass} ring-1 ring-slate-100 shadow-2xs z-10 transition-transform group-hover:scale-110`} />
                    
                    <div className="flex-1 space-y-0.5 bg-slate-50/50 hover:bg-slate-50 rounded-lg p-2.5 border border-slate-100/50 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold text-slate-400">{event.time}</span>
                        <span className={`text-[8px] font-bold px-1 py-0.2 rounded border uppercase ${badgeClass}`}>
                          {event.type === "job" ? "バイト" : event.type === "lab" ? "研究室" : "授業"}
                        </span>
                      </div>
                      <h4 className="font-sans font-bold text-[11px] text-slate-700 leading-snug truncate group-hover:text-cobalt transition-colors">
                        {event.summary}
                      </h4>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="text-[9px] text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-100/60 flex items-start gap-1">
              <Info className="w-3 h-3 text-cobalt shrink-0 mt-0.5" />
              <span>Google Calendarから予定を同期し、空き時間を自動算出します。</span>
            </div>
          </div>
        </div>
      </div>
  );
}
