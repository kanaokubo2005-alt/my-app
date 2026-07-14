import React, { useState, useRef, useEffect } from "react";
import type { DragEvent } from "react";
import { 
  Users, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  FileText, 
  FileDown, 
  PlusCircle, 
  Share2, 
  Sparkles, 
  Send, 
  Upload, 
  Paperclip, 
  Link as LinkIcon, 
  MessageSquare,
  ChevronRight,
  Shield,
  UserCheck,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Calendar,
  Clock,
  Check,
  Edit2,
  FileImage,
  Layers,
  HelpCircle
} from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
  activeTask: string;
  status: "active" | "away" | "completed";
}

interface SharedFile {
  id: string;
  name: string;
  size: string;
  type: string; // pdf, pptx, docx, png, jpg, excel
  uploadedBy: string;
  associatedTask: string;
  uploadedAt: string;
  previewUrl?: string; // image previews
}

interface SharedNote {
  id: string;
  title: string;
  content: string;
  author: string;
  timestamp: string;
}

interface TeamTask {
  id: string;
  title: string;
  assignedTo: string; // Member Name
  priority: "low" | "medium" | "high" | "must"; // 低/中/高/必須
  progress: number; // 0 to 100
  description: string; // rich text description
  recurrence: "none" | "daily" | "biweekly" | "weekly-days" | "yearly";
  recurrenceDays?: string[]; // e.g. ["月", "水"]
  attachments: { name: string; type: string; url?: string }[];
  links: { label: string; url: string }[];
}

interface Team {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  members: TeamMember[];
  sharedFiles: SharedFile[];
  sharedNotes: SharedNote[];
  tasks: TeamTask[];
}

const INITIAL_TEAMS: Team[] = [];
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" ? "http://localhost:8888" : "";

export default function TeamSpaceView() {
  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  
  // Selected Team ID (null means List View of all teams)
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

  // Active Team object
  const currentTeam = teams.find(t => t.id === activeTeamId);

  // Currently selected team task in Detail Panel (defaults to the first task if not chosen)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const activeTask = currentTeam?.tasks.find(t => t.id === selectedTaskId) || currentTeam?.tasks[0];

  // Modals visibility
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [showDetailEditor, setShowDetailEditor] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/teams`)
      .then(res => res.json())
      .then(data => {
        setTeams(data);
        if (data.length > 0) {
          setActiveTeamId(data[0].id);
          if (data[0].tasks.length > 0) {
            setSelectedTaskId(data[0].tasks[0].id);
          }
        }
      })
      .catch(err => console.error("Error loading teams:", err));
  }, []);

  // New Team Form States
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");

  // New Note (Memo) Form States
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;

    const newNote = {
      id: `note-${Date.now()}`,
      title: newNoteTitle.trim(),
      content: newNoteContent.trim(),
      author: "大久保 佳奈",
      timestamp: "今日 " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setTeams(prev => prev.map(t => {
      if (t.id === activeTeamId) {
        return {
          ...t,
          sharedNotes: [newNote, ...t.sharedNotes]
        };
      }
      return t;
    }));

    setNewNoteTitle("");
    setNewNoteContent("");
    setShowAddNote(false);
  };

  // New Member Form States
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const [newMemberTask, setNewMemberTask] = useState("");

  // Command Center Form States (タスク共有コマンド)
  const [cmdTaskTitle, setCmdTaskTitle] = useState("");
  const [cmdAssignee, setCmdAssignee] = useState("");
  const [cmdPriority, setCmdPriority] = useState<"low" | "medium" | "high" | "must">("medium");
  const [cmdRecurrence, setCmdRecurrence] = useState<"none" | "daily" | "biweekly" | "weekly-days" | "yearly">("none");
  const [cmdRecurrenceDays, setCmdRecurrenceDays] = useState<string[]>([]);
  const [cmdDescription, setCmdDescription] = useState("");
  const [cmdLinkVal, setCmdLinkVal] = useState("");
  const [cmdLinkLabel, setCmdLinkLabel] = useState("");
  const [attachedFileName, setAttachedFileName] = useState("");
  const [attachedFileType, setAttachedFileType] = useState("pdf");
  const [attachedFileSize, setAttachedFileSize] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const daysOfWeek = ["月", "火", "水", "木", "金", "土", "日"];

  // Handle Drag-and-Drop events
  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setAttachedFileName(file.name);
      setAttachedFileSize((file.size / (1024 * 1024)).toFixed(1) + " MB");
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      setAttachedFileType(ext);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachedFileName(file.name);
      setAttachedFileSize((file.size / (1024 * 1024)).toFixed(1) + " MB");
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      setAttachedFileType(ext);
    }
  };

  const toggleDaySelection = (day: string) => {
    if (cmdRecurrenceDays.includes(day)) {
      setCmdRecurrenceDays(prev => prev.filter(d => d !== day));
    } else {
      setCmdRecurrenceDays(prev => [...prev, day]);
    }
  };

  // Create team action
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTeamName.trim(),
          description: newTeamDesc.trim() || "学生メンバーの共同作業タスク・情報管理スペース"
        })
      });
      if (res.ok) {
        const createdTeam = await res.json();
        setTeams(prev => [...prev, createdTeam]);
        setActiveTeamId(createdTeam.id);
        if (createdTeam.tasks.length > 0) {
          setSelectedTaskId(createdTeam.tasks[0].id);
        }
        setNewTeamName("");
        setNewTeamDesc("");
        setShowAddTeam(false);
      }
    } catch (err) {
      console.error("Error creating team:", err);
    }
  };

  // Add Member to Current Active Team
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeamId || !newMemberName.trim() || !newMemberRole.trim()) return;

    const colors = ["bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-rose-500", "bg-cyan-500", "bg-pink-500"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    try {
      const res = await fetch(`${API_BASE}/api/teams/${activeTeamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newMemberName.trim(),
          role: newMemberRole.trim(),
          avatarColor: randomColor,
          activeTask: newMemberTask.trim() || "未アサインのタスク",
          status: "active"
        })
      });
      if (res.ok) {
        const createdMember = await res.json();
        setTeams(prev => prev.map(t => {
          if (t.id === activeTeamId) {
            return {
              ...t,
              memberCount: t.memberCount + 1,
              members: [...t.members, createdMember]
            };
          }
          return t;
        }));
        setNewMemberName("");
        setNewMemberRole("");
        setNewMemberTask("");
        setShowAddMember(false);
      }
    } catch (err) {
      console.error("Error adding member:", err);
    }
  };

  // Run the "タスク共有コマンド" (Command Run) to post everything to detail fields
  const handleShareTaskCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeamId) return;

    if (!cmdTaskTitle.trim()) {
      alert("タスク名を入力してください。");
      return;
    }

    const assignedMember = cmdAssignee || "大久保 佳奈";

    // 1. Build team task attachment list if any
    const newAttachments: { name: string; type: string; url?: string }[] = [];
    let fileAttachmentPayload = null;
    if (attachedFileName) {
      const isImg = ["png", "jpg", "jpeg", "gif"].includes(attachedFileType);
      newAttachments.push({
        name: attachedFileName,
        type: isImg ? "image" : attachedFileType,
        url: isImg ? "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=300&q=80" : undefined
      });
      fileAttachmentPayload = {
        name: attachedFileName,
        size: attachedFileSize || "1.5 MB",
        type: attachedFileType,
        previewUrl: isImg ? "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=300&q=80" : undefined
      };
    }

    // 2. Build task links list if any
    const newLinks: { label: string; url: string }[] = [];
    if (cmdLinkVal.trim()) {
      newLinks.push({
        label: cmdLinkLabel.trim() || "参考リンク",
        url: cmdLinkVal.trim()
      });
    }

    let noteAttachmentPayload = null;
    if (cmdDescription.trim()) {
      noteAttachmentPayload = {
        title: `${cmdTaskTitle.trim()} のメモ`,
        content: cmdDescription.trim()
      };
    }

    try {
      const res = await fetch(`${API_BASE}/api/teams/${activeTeamId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: cmdTaskTitle.trim(),
          assignedTo: assignedMember,
          description: cmdDescription.trim() || "添付資料および指示に準拠した共同進行タスク。",
          recurrence: cmdRecurrence,
          recurrenceDays: cmdRecurrence === "weekly-days" ? cmdRecurrenceDays : undefined,
          attachments: newAttachments,
          links: newLinks,
          fileAttachment: fileAttachmentPayload,
          noteAttachment: noteAttachmentPayload
        })
      });

      if (res.ok) {
        const data = await res.json();
        const createdTask = data.task;
        const createdFile = data.file;
        const createdNote = data.note;

        setTeams(prev => prev.map(t => {
          if (t.id === activeTeamId) {
            const nextFiles = [...t.sharedFiles];
            if (createdFile) nextFiles.unshift(createdFile);
            
            const nextNotes = [...t.sharedNotes];
            if (createdNote) nextNotes.unshift(createdNote);

            const updatedMembers = t.members.map(m => {
              if (m.name === assignedMember) {
                return { ...m, activeTask: cmdTaskTitle.trim() };
              }
              return m;
            });

            return {
              ...t,
              members: updatedMembers,
              tasks: [createdTask, ...t.tasks],
              sharedFiles: nextFiles,
              sharedNotes: nextNotes
            };
          }
          return t;
        }));

        setSelectedTaskId(createdTask.id);

        // Reset Form fields
        setCmdTaskTitle("");
        setCmdAssignee("");
        setCmdPriority("medium");
        setCmdRecurrence("none");
        setCmdRecurrenceDays([]);
        setCmdDescription("");
        setCmdLinkVal("");
        setCmdLinkLabel("");
        setAttachedFileName("");
        setAttachedFileSize("");
        setAttachedFileType("pdf");

        alert("タスク共有コマンドが正常に実行されました！詳細フィールド・ファイルハブに即座に同期されました。");
      }
    } catch (err) {
      console.error("Error sharing task:", err);
    }
  };

  // Modify individual active task progress slider or priority on the fly
  const handleTaskProgressChange = async (taskId: string, newProg: number) => {
    if (!activeTeamId) return;

    try {
      const res = await fetch(`${API_BASE}/api/teams/${activeTeamId}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress: newProg })
      });
      if (res.ok) {
        const updatedTask = await res.json();
        setTeams(prev => prev.map(t => {
          if (t.id === activeTeamId) {
            return {
              ...t,
              tasks: t.tasks.map(tsk => tsk.id === taskId ? updatedTask : tsk)
            };
          }
          return t;
        }));
      }
    } catch (err) {
      console.error("Error updating progress:", err);
    }
  };

  const handleTaskPriorityChange = (taskId: string, newPrio: "low" | "medium" | "high" | "must") => {
    if (!activeTeamId) return;
    setTeams(prev => prev.map(t => {
      if (t.id === activeTeamId) {
        return {
          ...t,
          tasks: t.tasks.map(tsk => tsk.id === taskId ? { ...tsk, priority: newPrio } : tsk)
        };
      }
      return t;
    }));
  };

  const handleTaskRecurrenceChange = (taskId: string, newRec: any) => {
    if (!activeTeamId) return;
    setTeams(prev => prev.map(t => {
      if (t.id === activeTeamId) {
        return {
          ...t,
          tasks: t.tasks.map(tsk => tsk.id === taskId ? { ...tsk, recurrence: newRec } : tsk)
        };
      }
      return t;
    }));
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!activeTeamId) return;
    if (window.confirm("この共有タスクを削除しますか？")) {
      try {
        const res = await fetch(`${API_BASE}/api/teams/${activeTeamId}/tasks/${taskId}`, {
          method: "DELETE"
        });
        if (res.ok) {
          setTeams(prev => prev.map(t => {
            if (t.id === activeTeamId) {
              return {
                ...t,
                tasks: t.tasks.filter(tsk => tsk.id !== taskId)
              };
            }
            return t;
          }));
          if (selectedTaskId === taskId) {
            setSelectedTaskId(null);
          }
        }
      } catch (err) {
        console.error("Error deleting team task:", err);
      }
    }
  };

  const handleDeleteMember = (memberId: string) => {
    if (!activeTeamId) return;
    if (window.confirm("このメンバーをチームから削除しますか？")) {
      setTeams(prev => prev.map(t => {
        if (t.id === activeTeamId) {
          return {
            ...t,
            members: t.members.filter(m => m.id !== memberId),
            memberCount: Math.max(1, t.memberCount - 1)
          };
        }
        return t;
      }));
    }
  };

  // Helper styles for priority
  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "must":
        return { text: "必須 (MUST)", bg: "bg-indigo-600/10 text-indigo-700 border-indigo-200" };
      case "high":
        return { text: "重要 (HIGH)", bg: "bg-rose-100 text-rose-700 border-rose-200" };
      case "medium":
        return { text: "普通 (MID)", bg: "bg-amber-100 text-amber-700 border-amber-200" };
      case "low":
        return { text: "低 (LOW)", bg: "bg-emerald-100 text-emerald-700 border-emerald-200" };
      default:
        return { text: "未設定", bg: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  };

  const getRecurrenceText = (rec: string, days?: string[]) => {
    switch (rec) {
      case "daily": return "🔁 毎日繰り返し";
      case "biweekly": return "🔁 隔週繰り返し";
      case "weekly-days": return `🔁 毎週指定曜日 (${days?.join(", ") || "未指定"})`;
      case "yearly": return "🔁 毎年(年次)繰り返し";
      default: return "単発タスク (繰り返しなし)";
    }
  };

  // RENDER TEAMS LIST VIEW (Initial View)
  if (!activeTeamId || !currentTeam) {
    return (
      <div className="flex-1 overflow-y-auto bg-slate-bg p-4 md:p-8 space-y-8 animate-fade-in text-slate-700 font-sans">
        
        {/* Banner with brand style */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="font-sans font-black text-2xl md:text-3xl text-slate-800 tracking-tight flex items-center gap-2">
              <Users className="w-8 h-8 text-cobalt shrink-0" />
              <span>Team Space</span>
            </h1>
            <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">
              大学のゼミ・サークル・実行委員メンバーとアカウント・資料・タスク進捗状況をリアルタイム共有
            </p>
          </div>

          <button
            onClick={() => setShowAddTeam(true)}
            className="bg-cobalt hover:bg-cobalt/95 text-white font-bold px-4 py-2.5 rounded-xl text-xs md:text-sm flex items-center gap-2 shadow-md shadow-cobalt/15 transition-all self-start md:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>新しいチームを結成</span>
          </button>
        </div>



        {/* Teams Listing Grid */}
        <div className="space-y-4">
          <h2 className="font-sans font-bold text-slate-800 text-sm md:text-base">所属している共同スペース一覧</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {teams.map((team) => (
              <div 
                key={team.id}
                onClick={() => {
                  setActiveTeamId(team.id);
                  if (team.tasks.length > 0) {
                    setSelectedTaskId(team.tasks[0].id);
                  }
                }}
                className="bg-white rounded-2xl border border-slate-100 hover:border-cobalt/35 p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group cursor-pointer"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full">
                      学内チーム
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                      同期中
                    </span>
                  </div>

                  <h3 className="font-sans font-extrabold text-lg text-slate-800 leading-snug group-hover:text-cobalt transition-colors">
                    {team.name}
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed font-medium line-clamp-2">
                    {team.description}
                  </p>
                </div>

                {/* Team metadata statistics */}
                <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1 text-slate-500">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>メンバー: <strong className="text-slate-700">{team.members.length}人</strong></span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span>ファイル・メモ: <strong className="text-slate-700">{team.sharedFiles.length + team.sharedNotes.length}件</strong></span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500">
                    <CheckCircle2 className="w-4 h-4 text-slate-400" />
                    <span>進行タスク: <strong className="text-slate-700">{team.tasks.length}個</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {/* Overlapping member initials preview */}
                  <div className="flex -space-x-2">
                    {team.members.slice(0, 3).map((m, idx) => (
                      <div 
                        key={m.id}
                        className={`w-7 h-7 rounded-full text-[10px] text-white flex items-center justify-center font-bold border-2 border-white shadow-2xs ${m.avatarColor}`}
                        title={m.name}
                      >
                        {m.name.slice(0, 1)}
                      </div>
                    ))}
                    {team.members.length > 3 && (
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 text-[9px] flex items-center justify-center font-bold border-2 border-white">
                        +{team.members.length - 3}
                      </div>
                    )}
                  </div>

                  <span className="text-xs font-bold text-cobalt group-hover:underline flex items-center gap-1">
                    <span>共同スペースを表示 ➔</span>
                  </span>
                </div>
              </div>
            ))}

            {/* Create team fast card */}
            <div 
              onClick={() => setShowAddTeam(true)}
              className="bg-slate-50/50 hover:bg-slate-50 border-2 border-dashed border-slate-200 hover:border-cobalt/40 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3 cursor-pointer transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-white border border-slate-100 text-slate-400 group-hover:text-cobalt flex items-center justify-center shadow-2xs transition-colors">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <p className="font-extrabold text-sm text-slate-700">新しいチーム共同スペースを結成</p>
                <p className="text-[10px] text-slate-400 mt-1">別の講義グループや、委員会、サークルを追加して管理します</p>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL: ADD TEAM DIALOG */}
        {showAddTeam && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 w-full max-w-md shadow-xl space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-sans font-bold text-slate-800 text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-cobalt" />
                  <span>新しい共同チーム・グループを結成</span>
                </h3>
                <button 
                  onClick={() => setShowAddTeam(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  キャンセル
                </button>
              </div>

              <form onSubmit={handleCreateTeam} className="space-y-4 text-xs md:text-sm">
                <div>
                  <label className="block text-slate-500 font-bold mb-1.5">チーム・グループ名</label>
                  <input 
                    type="text" 
                    required
                    placeholder="例: 民法ゼミグループB"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-cobalt"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1.5">チーム説明</label>
                  <textarea 
                    rows={3}
                    placeholder="例: ゼミ合同発表に向けたプレゼン資料作成と参考文献リサーチ"
                    value={newTeamDesc}
                    onChange={(e) => setNewTeamDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-cobalt"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-cobalt hover:bg-cobalt/95 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-cobalt/10 cursor-pointer"
                >
                  チームを作成する
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // RENDER DETAILED TEAM SPACE (2-column layout requested to prevent endless scrolling!)
  return (
    <div className="flex-1 overflow-y-auto bg-slate-bg p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in text-slate-700 font-sans">
      
      {/* Detail Header with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1.5">
          <button 
            onClick={() => setActiveTeamId(null)}
            className="flex items-center gap-1 text-slate-400 hover:text-cobalt text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← チーム一覧に戻る</span>
          </button>
          
          <div className="flex items-center gap-3">
            <h1 className="font-sans font-black text-xl md:text-2xl text-slate-800 tracking-tight">
              {currentTeam.name}
            </h1>
            <span className="inline-block bg-cobalt/10 text-cobalt text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0">
              アクティブ共有
            </span>
          </div>
          <p className="text-slate-500 text-xs font-semibold max-w-2xl">{currentTeam.description}</p>
        </div>

        {/* Action Header Items */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 bg-white border border-slate-150 px-3 py-1.5 rounded-xl shadow-2xs">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-xs text-slate-600 font-bold">メンバー連携: {currentTeam.members.length}名</span>
          </div>

          <button 
            onClick={() => setShowAddMember(true)}
            className="bg-cobalt hover:bg-cobalt/95 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>メンバー招待</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 items-start">
        
        {/* ==================== LEFT COLUMN ==================== */}
        <div className="space-y-6">
          
          {/* Section A & E: Side-by-Side layout for 進行タスク状況 & ゼミ・グループ共同メモノート */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            
            {/* Left part: 進行タスク状況の表示 (Narrower, taking 2 cols) */}
            <div className="md:col-span-2 bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-cobalt" />
                  <h3 className="font-sans font-extrabold text-slate-800 text-xs md:text-sm">メンバー進行状況</h3>
                </div>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {currentTeam.members.map((member) => (
                  <div 
                    key={member.id}
                    className="p-2 rounded-xl border border-slate-100 bg-slate-50/30 flex items-center justify-between gap-2 text-[11px]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative shrink-0">
                        <div className={`w-7 h-7 rounded-lg ${member.avatarColor} text-white flex items-center justify-center font-bold text-[10px] shadow-3xs`}>
                          {member.name.slice(0, 2)}
                        </div>
                        <span className={`absolute bottom-[-1px] right-[-1px] w-2 h-2 rounded-full ring-2 ring-white ${
                          member.status === "active" ? "bg-emerald-500" : member.status === "away" ? "bg-amber-500" : "bg-slate-400"
                        }`} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-sans font-black text-slate-800 text-[11px] truncate">{member.name}</span>
                          <span className="text-[8px] text-slate-400 bg-white border border-slate-100 px-1 rounded shrink-0">
                            {member.role.slice(0, 8)}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[10px] truncate max-w-[120px]">
                          {member.activeTask}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {member.name !== "大久保 佳奈" && (
                        <button
                          onClick={() => handleDeleteMember(member.id)}
                          className="p-1 text-slate-300 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                          title="メンバーを削除"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right part: ゼミ・グループ共同メモノート (Bringer of notes to the right, taking 3 cols) */}
            <div className="md:col-span-3 bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-cobalt shrink-0" />
                  <h3 className="font-sans font-extrabold text-slate-800 text-xs md:text-sm">
                    共同メモ ({currentTeam.sharedNotes.length}件)
                  </h3>
                </div>

                <button
                  onClick={() => setShowAddNote(!showAddNote)}
                  className="bg-cobalt hover:bg-cobalt/95 text-white font-bold px-2 py-1 rounded-lg text-[10px] flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                >
                  <PlusCircle className="w-3 h-3" />
                  <span>メモを追加</span>
                </button>
              </div>

              {/* Inline Add Note Form */}
              {showAddNote && (
                <form onSubmit={handleAddNote} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-fade-in text-xs">
                  <div>
                    <input 
                      type="text" 
                      required
                      placeholder="メモの件名 (例: レポートの進め方)"
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 text-xs focus:outline-hidden focus:ring-1 focus:ring-cobalt font-bold"
                    />
                  </div>
                  <div>
                    <textarea 
                      rows={2}
                      required
                      placeholder="内容を記入してください"
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 text-xs focus:outline-hidden focus:ring-1 focus:ring-cobalt"
                    />
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <button 
                      type="button" 
                      onClick={() => setShowAddNote(false)}
                      className="text-slate-400 hover:text-slate-600 px-2 py-1 text-[10px]"
                    >
                      キャンセル
                    </button>
                    <button 
                      type="submit"
                      className="bg-cobalt text-white px-3 py-1 rounded-lg font-bold text-[10px]"
                    >
                      保存する
                    </button>
                  </div>
                </form>
              )}

              {currentTeam.sharedNotes.length === 0 ? (
                <div className="py-6 text-center bg-slate-50 border border-slate-100 rounded-xl flex flex-col items-center justify-center gap-1.5 flex-1">
                  <MessageSquare className="w-4 h-4 text-slate-300" />
                  <p className="text-slate-400 text-[10px] italic">共同メモはありません。</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 flex-1 mt-2">
                  {currentTeam.sharedNotes.map((note) => (
                    <div key={note.id} className="p-2 bg-yellow-50/40 border border-yellow-100 rounded-xl space-y-1 text-[11px] relative">
                      <div className="flex items-center justify-between gap-2 border-b border-yellow-100/30 pb-0.5">
                        <span className="font-sans font-bold text-amber-900 truncate">{note.title}</span>
                        <span className="text-[8px] text-slate-400 font-bold shrink-0">{note.timestamp}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed font-semibold break-words">
                        {note.content}
                      </p>
                      <div className="text-[8px] text-slate-400 text-right font-bold">
                        作成者: <span className="text-amber-800 bg-amber-50 px-1 rounded">{note.author}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section B: Collaborative Task List & Detail Editor */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-4.5 h-4.5 text-cobalt" />
                  <h3 className="font-sans font-extrabold text-slate-800 text-sm md:text-base">チームの共有タスク一覧</h3>
                </div>
                <p className="text-slate-400 text-[10px] font-semibold mt-0.5">タスクを選択して、詳細フィールドの確認と更新を行います</p>
              </div>
              <button 
                onClick={() => setShowDetailEditor(!showDetailEditor)}
                className="text-[10px] bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg px-2.5 py-1.5 font-bold text-slate-600 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
              >
                {showDetailEditor ? "詳細非表示 ✕" : "詳細表示 👁️"}
              </button>
            </div>

            {/* Task Card Stack */}
            <div className="space-y-2.5">
              {currentTeam.tasks.length === 0 ? (
                <div className="py-6 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <p className="text-xs text-slate-400 italic">登録タスクがありません。右のコマンドで共有してください。</p>
                </div>
              ) : (
                currentTeam.tasks.map((task) => {
                  const isSelected = task.id === selectedTaskId || (selectedTaskId === null && task.id === currentTeam.tasks[0]?.id);
                  const pBadge = getPriorityBadge(task.priority);
                  return (
                    <div 
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer text-xs space-y-2.5 relative ${
                        isSelected 
                          ? "bg-cobalt/5 border-cobalt shadow-2xs" 
                          : "bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300 border-slate-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <h4 className="font-sans font-bold text-slate-800 leading-tight truncate">
                            {task.title}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold">
                            担当: {task.assignedTo}{task.recurrence !== "none" ? " • 🔁" : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTask(task.id);
                            }}
                            className="p-1 text-slate-300 hover:text-rose-500 rounded-md hover:bg-slate-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Progress line and Slider preview */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-slate-150 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-cobalt transition-all duration-300"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 shrink-0">{task.progress}%</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ================== DETAILED FIELDS PANEL ================== */}
            {activeTask && showDetailEditor && (
              <div className="border-t border-slate-150 pt-4 mt-2 space-y-4 animate-fade-in bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-cobalt uppercase tracking-widest flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    詳細フィールド (詳細エディタ)
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                    <Clock className="w-3 h-3" />
                    最終更新: たった今
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Title and Assignee */}
                  <div>
                    <h4 className="font-sans font-extrabold text-slate-800 text-sm leading-tight">
                      {activeTask.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1">
                      共同スペースアサインメンバー: <strong>{activeTask.assignedTo}</strong>
                    </p>
                  </div>

                  {/* Description: Rich Text Description (Support markup content rendering) */}
                  <div className="space-y-1 bg-white border border-slate-100 p-3 rounded-lg">
                    <span className="block text-[9px] text-slate-400 font-extrabold uppercase">リッチテキスト説明文</span>
                    <p className="text-slate-600 leading-relaxed font-semibold whitespace-pre-wrap text-xs">
                      {activeTask.description}
                    </p>
                  </div>

                  {/* 1. Recurrence Display (emoji only) */}
                  {activeTask.recurrence !== "none" && (
                    <div className="flex items-center gap-2 bg-white border border-slate-100 p-2.5 rounded-lg">
                      <span className="text-sm select-none">🔁</span>
                    </div>
                  )}

                  {/* 2. Progress Slider (Priority removed) */}
                  <div className="space-y-1.5 bg-white border border-slate-100 p-2.5 rounded-lg">
                    <span className="block text-[9px] text-slate-400 font-extrabold uppercase">進捗度調整スライダー</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="5"
                        value={activeTask.progress}
                        onChange={(e) => handleTaskProgressChange(activeTask.id, Number(e.target.value))}
                        className="w-full accent-cobalt cursor-pointer"
                      />
                      <input 
                        type="number" 
                        min="0" 
                        max="100"
                        value={activeTask.progress}
                        onChange={(e) => handleTaskProgressChange(activeTask.id, Math.min(100, Math.max(0, Number(e.target.value))))}
                        className="w-10 bg-slate-50 border border-slate-150 rounded text-center font-black text-[10px] text-slate-700 focus:outline-hidden"
                      />
                      <span className="text-[10px] font-bold text-slate-400">%</span>
                    </div>
                  </div>

                  {/* 3. Reference Links */}
                  {activeTask.links.length > 0 && (
                    <div className="space-y-1.5 bg-white border border-slate-100 p-3 rounded-lg">
                      <span className="block text-[9px] text-slate-400 font-extrabold uppercase">参照用関連リンク</span>
                      <div className="space-y-1">
                        {activeTask.links.map((lnk, idx) => (
                          <a 
                            key={idx}
                            href={lnk.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cobalt hover:underline font-extrabold text-[11px] flex items-center gap-1"
                          >
                            <LinkIcon className="w-3.5 h-3.5" />
                            <span>{lnk.label}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-slate-300" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. Rich attachments with IMAGE PREVIEW support */}
                  {activeTask.attachments.length > 0 && (
                    <div className="space-y-2 bg-white border border-slate-100 p-3 rounded-lg">
                      <span className="block text-[9px] text-slate-400 font-extrabold uppercase">添付資料 ({activeTask.attachments.length}件)</span>
                      
                      <div className="space-y-2">
                        {activeTask.attachments.map((file, idx) => {
                          const isImage = file.type === "image" || ["png", "jpg", "jpeg", "gif"].includes(file.type || "");
                          return (
                            <div key={idx} className="space-y-1.5">
                              <div className="p-2 bg-slate-50 border border-slate-100 rounded-md flex items-center justify-between text-[11px]">
                                <span className="font-bold text-slate-600 flex items-center gap-1">
                                  {isImage ? <FileImage className="w-3.5 h-3.5 text-rose-500" /> : <FileText className="w-3.5 h-3.5 text-cobalt" />}
                                  {file.name}
                                </span>
                                {file.url && (
                                  <a 
                                    href={file.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-cobalt hover:underline font-bold"
                                  >
                                    開く ➔
                                  </a>
                                )}
                              </div>

                              {/* IMAGE PREVIEW: Direct visual thumbnail in detail panels */}
                              {isImage && file.url && (
                                <div className="border border-slate-150 rounded-lg overflow-hidden bg-slate-100 max-h-32 flex items-center justify-center">
                                  <img 
                                    src={file.url} 
                                    alt="添付画像プレビュー" 
                                    className="w-full h-auto max-h-28 object-contain"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ==================== RIGHT COLUMN ==================== */}
        <div className="space-y-6">
          
          {/* Section C: Task Sharing Command Center (Command Run Form) */}
          <div className="bg-gradient-to-br from-white to-slate-50/50 border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-sans font-black text-slate-800 text-sm md:text-base flex items-center gap-2">
                <Share2 className="w-4.5 h-4.5 text-cobalt shrink-0" />
                <span>タスクの共有 コマンド実行 (Command Hub)</span>
              </h3>
              <p className="text-slate-400 text-[10px] font-bold mt-0.5">
                作成したメモやPDF、アップロードしたファイル、画像、繰り返しルールをメンバーと共同共有・同期します
              </p>
            </div>

            <form onSubmit={handleShareTaskCommand} className="space-y-3.5 text-xs">
              
              {/* Task Title Input */}
              <div>
                <label className="block text-slate-500 font-extrabold mb-1 uppercase tracking-wider">1. タスク件名 (新規登録件名)</label>
                <input 
                  type="text"
                  required
                  placeholder="例: 第3章 判例まとめ草案"
                  value={cmdTaskTitle}
                  onChange={(e) => setCmdTaskTitle(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-cobalt font-semibold placeholder:text-slate-400"
                />
              </div>

              {/* Assign To Member */}
              <div>
                <label className="block text-slate-500 font-extrabold mb-1 uppercase tracking-wider">担当メンバー</label>
                <select
                  value={cmdAssignee}
                  onChange={(e) => setCmdAssignee(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 font-bold text-slate-600 focus:outline-hidden cursor-pointer"
                >
                  <option value="">大久保 佳奈 (You)</option>
                  {currentTeam.members.filter(m => m.name !== "大久保 佳奈").map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Flexible Recurrence Rules (RRule equivalent) */}
              <div className="space-y-2 bg-slate-50 border border-slate-150 p-3 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-500 font-extrabold uppercase tracking-wider">2. 繰り返し設定 (柔軟なRRule)</label>
                  <span className="text-[9px] bg-cobalt/10 text-cobalt px-2 rounded-full font-bold">RRule自動計算</span>
                </div>
                
                <select
                  value={cmdRecurrence}
                  onChange={(e) => setCmdRecurrence(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-600 focus:outline-hidden cursor-pointer text-xs"
                >
                  <option value="none">繰り返しなし (単発)</option>
                  <option value="daily">毎日繰り返し (日次)</option>
                  <option value="biweekly">2週間ごと (隔週)</option>
                  <option value="weekly-days">指定曜日のみ繰り返し (毎週曜日指定)</option>
                  <option value="yearly">毎年1回 (年次繰り返し)</option>
                </select>

                {/* Day Selectors for weekly-days */}
                {cmdRecurrence === "weekly-days" && (
                  <div className="space-y-1.5 pt-1 animate-fade-in">
                    <p className="text-[9px] text-slate-400 font-extrabold">対象の曜日を選択してください：</p>
                    <div className="flex flex-wrap gap-1.5">
                      {daysOfWeek.map((day) => {
                        const active = cmdRecurrenceDays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDaySelection(day)}
                            className={`w-6.5 h-6.5 rounded-lg border text-[10px] font-black transition-all cursor-pointer ${
                              active 
                                ? "bg-cobalt border-cobalt text-white shadow-3xs" 
                                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Description / Note content */}
              <div>
                <label className="block text-slate-500 font-extrabold mb-1 uppercase tracking-wider">3. 進捗レポート / 共同メモノート内容</label>
                <textarea 
                  rows={2}
                  placeholder="メンバーと共有・編集するレポート内容、指示文を入力してください（マークダウン調対応）"
                  value={cmdDescription}
                  onChange={(e) => setCmdDescription(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-cobalt placeholder:text-slate-400 font-semibold"
                />
              </div>

              {/* Reference Link Option */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]">参考リンクURL</label>
                  <input 
                    type="url"
                    placeholder="https://..."
                    value={cmdLinkVal}
                    onChange={(e) => setCmdLinkVal(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1 uppercase tracking-wider text-[9px]">リンク表示名</label>
                  <input 
                    type="text"
                    placeholder="例: 文献データベース"
                    value={cmdLinkLabel}
                    onChange={(e) => setCmdLinkLabel(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* File Attachment Drag-and-Drop (Command upload) */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-extrabold uppercase tracking-wider">4. 共有ファイルのアップロード (PDF・画像・その他)</label>
                
                <div 
                  className={`border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    dragActive 
                      ? "border-cobalt bg-cobalt/5 scale-[0.99]" 
                      : attachedFileName 
                        ? "border-emerald-400 bg-emerald-50/10" 
                        : "border-slate-250 hover:border-slate-350 bg-white"
                  }`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    onChange={handleFileSelect}
                    className="hidden" 
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.png,.jpeg"
                  />
                  
                  {attachedFileName ? (
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
                      <div className="text-left">
                        <p className="font-bold text-xs max-w-xs truncate">{attachedFileName}</p>
                        <p className="text-[9px] text-slate-400 font-semibold">{attachedFileSize}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-0.5">
                      <Upload className="w-5 h-5 text-slate-400 mx-auto" />
                      <p className="font-bold text-slate-600 text-[11px]">ドラッグ＆ドロップ、またはクリックして添付</p>
                      <p className="text-[9px] text-slate-400 font-bold">PDF, Office, 画像 (自動プレビュー)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Run Command Button */}
              <button
                type="submit"
                className="w-full bg-cobalt hover:bg-cobalt/95 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-cobalt/10 hover:shadow-lg cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>タスクの共有を実行 (Command Run)</span>
              </button>
            </form>
          </div>

          {/* Section D: Shared Document Hub */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="border-b border-slate-50 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Paperclip className="w-4.5 h-4.5 text-cobalt shrink-0" />
                <h3 className="font-sans font-extrabold text-slate-800 text-sm md:text-base">
                  共有資料 & PDFハブ ({currentTeam.sharedFiles.length}件)
                </h3>
              </div>
              <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold">
                一斉閲覧可
              </span>
            </div>

            {currentTeam.sharedFiles.length === 0 ? (
              <div className="py-6 text-center bg-slate-50 border border-slate-100 rounded-xl flex flex-col items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-slate-300" />
                <p className="text-slate-400 text-xs italic">共有ファイルはまだありません。</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {currentTeam.sharedFiles.map((file) => {
                  const isImg = ["png", "jpg", "jpeg", "gif"].includes(file.type);
                  return (
                    <div 
                      key={file.id}
                      className="p-2.5 bg-slate-50/80 border border-slate-100 rounded-xl flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 border ${
                          isImg 
                            ? "bg-rose-50 text-rose-500 border-rose-100" 
                            : file.type === "pdf"
                              ? "bg-red-50 text-red-500 border-red-100"
                              : "bg-cobalt/5 text-cobalt border-cobalt/10"
                        }`}>
                          {isImg ? <FileImage className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <span className="block font-sans font-bold text-slate-700 leading-tight truncate">{file.name}</span>
                          <span className="block text-[9px] text-slate-400 mt-0.5 font-bold">
                            {file.size} • アサイン: {file.associatedTask.slice(0, 16)}...
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={() => alert(`${file.name} のダウンロードを開始しました`)}
                        className="p-1 text-slate-400 hover:text-cobalt rounded-md hover:bg-white border hover:border-slate-200 shrink-0 transition-all cursor-pointer"
                        title="ダウンロード"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>



        </div>

      </div>

      {/* MODAL: ADD MEMBER DIALOG */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 w-full max-w-md shadow-xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-sans font-bold text-slate-800 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-cobalt" />
                <span>新しいメンバーを招待・追加</span>
              </h3>
              <button 
                onClick={() => setShowAddMember(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                キャンセル
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4 text-xs md:text-sm">
              <div>
                <label className="block text-slate-500 font-bold mb-1.5">メンバー名</label>
                <input 
                  type="text" 
                  required
                  placeholder="例: 加藤 美咲"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-cobalt"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1.5">役割・ロール</label>
                <input 
                  type="text" 
                  required
                  placeholder="例: リサーチ、スライド作成担当"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-cobalt"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1.5">現在のタスク</label>
                <input 
                  type="text" 
                  placeholder="例: レポート第1章の草案執筆"
                  value={newMemberTask}
                  onChange={(e) => setNewMemberTask(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-cobalt"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-cobalt hover:bg-cobalt/95 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-cobalt/10 cursor-pointer"
              >
                メンバーを追加する
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
