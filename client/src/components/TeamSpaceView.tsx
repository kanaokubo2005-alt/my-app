import React, { useState, useRef, useEffect } from "react";
import type { DragEvent } from "react";
import { 
  Users, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  FileText, 
  Share2, 
  Upload, 
  Paperclip, 
  Link as LinkIcon, 
  MessageSquare,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Folder,
  File,
  ArrowLeft,
  Calendar,
  Check,
  FileImage,
  Layers,
  AlertCircle,
  X,
  UserCheck,
  PlusCircle,
  Clock,
  Sparkles,
  Info,
  Edit2,
  MoveRight
} from "lucide-react";
import type { TrashItem } from "../types";

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
  type: string;
  uploadedBy: string;
  associatedTask: string;
  uploadedAt: string;
  previewUrl?: string;
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
  assignedTo: string;
  folderName?: string | null;
  priority: "low" | "medium" | "high" | "must";
  progress: number;
  description: string;
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

interface TeamSpaceViewProps {
  onAddToTrash?: (item: TrashItem) => void;
}

export default function TeamSpaceView({ onAddToTrash }: TeamSpaceViewProps) {
  const getAuthHeaders = (extra: Record<string, string> = {}) => {
    const token = localStorage.getItem("todone_user_token");
    return {
      ...extra,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

  // Deduplicated teams array to prevent duplicate cards
  const uniqueTeams = teams.reduce((acc, t) => {
    if (!acc.some(item => item.id === t.id)) {
      acc.push(t);
    }
    return acc;
  }, [] as Team[]);

  const currentTeam = uniqueTeams.find(t => t.id === activeTeamId);

  // Folders state per workspace - Default to EMPTY [] (No preset folders)
  const [customFoldersMap, setCustomFoldersMap] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem("todone_custom_folders");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return {};
  });

  const activeFolders = activeTeamId ? (customFoldersMap[activeTeamId] || []) : [];

  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState("");
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

  // Task Details Modal State
  const [selectedTaskModal, setSelectedTaskModal] = useState<TeamTask | null>(null);

  // Member Details Modal State
  const [selectedMemberModal, setSelectedMemberModal] = useState<TeamMember | null>(null);

  // Toggle folder accordion
  const toggleFolderOpen = (folderName: string) => {
    setOpenFolders(prev => ({ ...prev, [folderName]: prev[folderName] === false }));
  };

  // Modals visibility
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  // Load teams from backend API
  useEffect(() => {
    fetch(`${API_BASE}/api/teams`, {
      headers: getAuthHeaders()
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTeams(data);
          if (data.length > 0) {
            setActiveTeamId(data[0].id);
          }
        }
      })
      .catch(err => console.error("Error loading teams:", err));
  }, []);

  // Delete Workspace / Team
  const handleDeleteTeam = async (teamId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const teamToDelete = teams.find(t => t.id === teamId);
    if (!window.confirm("この共有スペース（ワークスペース）を削除しますか？\n所属メンバーや共有ファイル・タスクも削除されます。")) return;

    try {
      const res = await fetch(`${API_BASE}/api/teams/${teamId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (res.ok) {
        if (teamToDelete && onAddToTrash) {
          onAddToTrash({
            id: `trash-team-${Date.now()}`,
            type: "team_task",
            title: `[ワークスペース] ${teamToDelete.name}`,
            deletedAt: new Date().toLocaleString("ja-JP"),
            originalData: teamToDelete
          });
        }
        setTeams(prev => prev.filter(t => t.id !== teamId));
        if (activeTeamId === teamId) {
          setActiveTeamId(null);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "ワークスペースの削除に失敗しました。");
      }
    } catch (err) {
      console.error("Error deleting workspace:", err);
      alert("ワークスペース削除中にエラーが発生しました。");
    }
  };

  // New Team Form States
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || isCreatingTeam) return;

    setIsCreatingTeam(true);
    try {
      const res = await fetch(`${API_BASE}/api/teams`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          name: newTeamName.trim(),
          description: newTeamDesc.trim() || "共同作業タスク・情報管理スペース"
        })
      });
      if (res.ok) {
        const createdTeam = await res.json();
        setTeams(prev => {
          const filtered = prev.filter(t => t.id !== createdTeam.id);
          return [...filtered, createdTeam];
        });
        setActiveTeamId(createdTeam.id);
        setNewTeamName("");
        setNewTeamDesc("");
        setShowAddTeam(false);
      } else {
        alert("ワークスペースの作成に失敗しました。");
      }
    } catch (err) {
      console.error("Error creating team:", err);
    } finally {
      setIsCreatingTeam(false);
    }
  };

  // Create New Folder
  const handleAddFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newFolderNameInput.trim();
    if (!val || !activeTeamId) return;

    const currentFolders = customFoldersMap[activeTeamId] || [];
    if (!currentFolders.includes(val)) {
      const updated = [...currentFolders, val];
      const newMap = { ...customFoldersMap, [activeTeamId]: updated };
      setCustomFoldersMap(newMap);
      localStorage.setItem("todone_custom_folders", JSON.stringify(newMap));
      setCmdFolderName(val);
    }
    setNewFolderNameInput("");
    setShowAddFolderModal(false);
  };

  // Delete Folder (tasks inside move to unclassified without being lost)
  const handleDeleteFolder = (folderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeTeamId) return;
    if (window.confirm(`「${folderName}」フォルダを削除しますか？\n※フォルダ内のタスクは「未分類タスク」に移動し消去されません。`)) {
      const currentFolders = customFoldersMap[activeTeamId] || [];
      const updatedFolders = currentFolders.filter(f => f !== folderName);
      const newMap = { ...customFoldersMap, [activeTeamId]: updatedFolders };
      setCustomFoldersMap(newMap);
      localStorage.setItem("todone_custom_folders", JSON.stringify(newMap));

      // Move tasks in this folder to folderName = null
      if (currentTeam) {
        currentTeam.tasks.forEach(async (task) => {
          if (task.folderName === folderName) {
            try {
              await fetch(`${API_BASE}/api/teams/${activeTeamId}/tasks/${task.id}`, {
                method: "PUT",
                headers: getAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ folderName: null })
              });
            } catch (err) {
              console.error(err);
            }
          }
        });

        setTeams(prev => prev.map(t => {
          if (t.id === activeTeamId) {
            return {
              ...t,
              tasks: t.tasks.map(task => task.folderName === folderName ? { ...task, folderName: null } : task)
            };
          }
          return t;
        }));
      }

      if (onAddToTrash) {
        onAddToTrash({
          id: `trash-folder-${Date.now()}`,
          type: "folder",
          title: `[フォルダ] ${folderName}`,
          deletedAt: new Date().toLocaleString("ja-JP"),
          originalData: { folderName, teamId: activeTeamId }
        });
      }
    }
  };

  // Move Task to Folder (Drag and Drop / Select)
  const moveTaskToFolder = async (taskId: string, targetFolderName: string | null) => {
    if (!activeTeamId) return;

    setTeams(prev => prev.map(t => {
      if (t.id === activeTeamId) {
        return {
          ...t,
          tasks: t.tasks.map(task => task.id === taskId ? { ...task, folderName: targetFolderName } : task)
        };
      }
      return t;
    }));

    if (selectedTaskModal && selectedTaskModal.id === taskId) {
      setSelectedTaskModal(prev => prev ? { ...prev, folderName: targetFolderName } : null);
    }

    try {
      await fetch(`${API_BASE}/api/teams/${activeTeamId}/tasks/${taskId}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ folderName: targetFolderName })
      });
    } catch (err) {
      console.error("Error moving task to folder:", err);
    }
  };

  // Update Task Assignee
  const updateTaskAssignee = async (taskId: string, newAssignee: string) => {
    if (!activeTeamId) return;

    setTeams(prev => prev.map(t => {
      if (t.id === activeTeamId) {
        return {
          ...t,
          tasks: t.tasks.map(task => task.id === taskId ? { ...task, assignedTo: newAssignee } : task)
        };
      }
      return t;
    }));

    if (selectedTaskModal && selectedTaskModal.id === taskId) {
      setSelectedTaskModal(prev => prev ? { ...prev, assignedTo: newAssignee } : null);
    }

    try {
      await fetch(`${API_BASE}/api/teams/${activeTeamId}/tasks/${taskId}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ assignedTo: newAssignee })
      });
    } catch (err) {
      console.error("Error updating assignee:", err);
    }
  };

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
  const [newMemberUserId, setNewMemberUserId] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const [newMemberTask, setNewMemberTask] = useState("");

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeamId || !newMemberUserId.trim() || !newMemberRole.trim()) return;

    const colors = ["bg-emerald-500", "bg-amber-500", "bg-purple-500", "bg-rose-500", "bg-cyan-500", "bg-pink-500"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    try {
      const res = await fetch(`${API_BASE}/api/teams/${activeTeamId}/members`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          userId: newMemberUserId.trim(),
          role: newMemberRole.trim(),
          avatarColor: randomColor,
          activeTask: newMemberTask.trim() || "未アサインのタスク",
          status: "active"
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTeams(prev => prev.map(t => {
          if (t.id === activeTeamId) {
            return {
              ...t,
              memberCount: t.memberCount + 1,
              members: [...t.members, data]
            };
          }
          return t;
        }));
        setNewMemberUserId("");
        setNewMemberRole("");
        setNewMemberTask("");
        setShowAddMember(false);
      } else {
        alert(`${data.error || "指定されたユーザーIDが見つかりませんでした。"} 有効なIDを入力し直してください。`);
        setNewMemberUserId("");
      }
    } catch (err) {
      console.error("Error adding member:", err);
      alert("メンバー追加エラーが発生しました。");
    }
  };

  // Sleek Task Creation Form States (Icon-driven, optional sections)
  const [cmdTaskTitle, setCmdTaskTitle] = useState("");
  const [cmdFolderName, setCmdFolderName] = useState("");
  const [cmdAssignee, setCmdAssignee] = useState("");
  const [cmdPriority, setCmdPriority] = useState<"medium" | "high">("medium");

  // Optional toggles
  const [showOptDesc, setShowOptDesc] = useState(false);
  const [showOptLink, setShowOptLink] = useState(false);
  const [showOptFile, setShowOptFile] = useState(false);

  const [cmdDescription, setCmdDescription] = useState("");
  const [cmdLinkVal, setCmdLinkVal] = useState("");
  const [cmdLinkLabel, setCmdLinkLabel] = useState("");
  const [attachedFileName, setAttachedFileName] = useState("");
  const [attachedFileType, setAttachedFileType] = useState("pdf");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachedFileName(file.name);
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      setAttachedFileType(ext);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeamId || !cmdTaskTitle.trim()) return;

    const newTaskPayload = {
      title: cmdTaskTitle.trim(),
      assignedTo: cmdAssignee || "大久保 佳奈",
      folderName: cmdFolderName || null,
      priority: cmdPriority,
      description: cmdDescription.trim(),
      recurrence: "none",
      attachments: attachedFileName ? [{
        name: attachedFileName,
        type: attachedFileType,
        url: "#"
      }] : [],
      links: cmdLinkVal.trim() ? [{
        label: cmdLinkLabel.trim() || "参考リンク",
        url: cmdLinkVal.trim()
      }] : [],
      fileAttachment: attachedFileName ? {
        name: attachedFileName,
        size: "1.5 MB",
        type: attachedFileType
      } : null
    };

    try {
      const res = await fetch(`${API_BASE}/api/teams/${activeTeamId}/tasks`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(newTaskPayload)
      });

      if (res.ok) {
        const data = await res.json();
        setTeams(prev => prev.map(t => {
          if (t.id === activeTeamId) {
            return {
              ...t,
              tasks: [data.task, ...t.tasks],
              sharedFiles: data.file ? [data.file, ...t.sharedFiles] : t.sharedFiles
            };
          }
          return t;
        }));

        // Clear Form
        setCmdTaskTitle("");
        setCmdFolderName("");
        setCmdDescription("");
        setCmdLinkVal("");
        setCmdLinkLabel("");
        setAttachedFileName("");
        setShowOptDesc(false);
        setShowOptLink(false);
        setShowOptFile(false);
      }
    } catch (err) {
      console.error("Error creating team task:", err);
    }
  };

  const handleToggleTaskProgress = async (taskId: string, currentProgress: number) => {
    if (!activeTeamId) return;
    const newProgress = currentProgress >= 100 ? 0 : 100;

    try {
      const res = await fetch(`${API_BASE}/api/teams/${activeTeamId}/tasks/${taskId}`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ progress: newProgress })
      });

      if (res.ok) {
        setTeams(prev => prev.map(t => {
          if (t.id === activeTeamId) {
            return {
              ...t,
              tasks: t.tasks.map(task => task.id === taskId ? { ...task, progress: newProgress } : task)
            };
          }
          return t;
        }));
      }
    } catch (err) {
      console.error("Error toggling task progress:", err);
    }
  };

  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeTeamId) return;
    const taskToDelete = currentTeam?.tasks.find(t => t.id === taskId);

    if (window.confirm("この共有タスクを削除しますか？\n（ゴミ箱へ移動し復元できます）")) {
      try {
        const res = await fetch(`${API_BASE}/api/teams/${activeTeamId}/tasks/${taskId}`, {
          method: "DELETE",
          headers: getAuthHeaders()
        });

        if (res.ok) {
          if (taskToDelete && onAddToTrash) {
            onAddToTrash({
              id: `trash-team-task-${Date.now()}`,
              type: "team_task",
              title: taskToDelete.title,
              deletedAt: new Date().toLocaleString("ja-JP"),
              originalData: { ...taskToDelete, teamId: activeTeamId }
            });
          }

          setTeams(prev => prev.map(t => {
            if (t.id === activeTeamId) {
              return {
                ...t,
                tasks: t.tasks.filter(task => task.id !== taskId)
              };
            }
            return t;
          }));

          if (selectedTaskModal?.id === taskId) {
            setSelectedTaskModal(null);
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

  // Deduplicate Members (remove duplicate "kana" if "大久保 佳奈" exists)
  const getUniqueMembers = (members: TeamMember[]) => {
    const hasKanaKanji = members.some(m => m.name === "大久保 佳奈");
    return members.filter(m => !(hasKanaKanji && (m.name.toLowerCase() === "kana" || m.name.toLowerCase() === "kanaokubo")));
  };

  // RENDER TEAMS LIST VIEW (Initial View)
  if (!activeTeamId || !currentTeam) {
    return (
      <div className="flex-1 overflow-y-auto bg-notebook-pattern p-4 md:p-8 space-y-8 animate-fade-in text-[#22303C] font-sans">
        
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E0DACB] pb-5">
          <div>
            <h1 className="font-sans font-black text-2xl md:text-3xl text-[#244053] tracking-tight flex items-center gap-2">
              <Users className="w-8 h-8 text-[#345B73] shrink-0" />
              <span>チームスペース</span>
            </h1>
          </div>

          <button
            onClick={() => setShowAddTeam(true)}
            className="bg-[#244053] hover:bg-[#1A3141] text-white font-bold px-4 py-2.5 rounded-lg text-xs md:text-sm flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>新しいワークスペースを作成</span>
          </button>
        </div>

        {/* Teams Listing Grid */}
        <div className="space-y-4">
          <h2 className="font-sans font-bold text-[#22303C] text-sm md:text-base">所属している共有ワークスペース一覧</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {uniqueTeams.map((team) => (
              <div 
                key={team.id}
                onClick={() => {
                  setActiveTeamId(team.id);
                }}
                className="bg-[#FAF8F5] bg-notebook-pattern rounded-lg border border-[#E0DACB] hover:border-[#345B73] p-6 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-4 group cursor-pointer"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full">
                      学内チーム
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        同期中
                      </span>
                      {/* Delete Workspace Button */}
                      <button
                        onClick={(e) => handleDeleteTeam(team.id, e)}
                        title="ワークスペースを削除"
                        className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
                    <span>メンバー: <strong className="text-slate-700">{getUniqueMembers(team.members).length}人</strong></span>
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
                  <div className="flex -space-x-2">
                    {getUniqueMembers(team.members).slice(0, 3).map((m) => (
                      <div 
                        key={m.id}
                        className={`w-7 h-7 rounded-full text-[10px] text-white flex items-center justify-center font-bold border-2 border-white shadow-2xs ${m.avatarColor}`}
                        title={m.name}
                      >
                        {m.name.slice(0, 1)}
                      </div>
                    ))}
                    {getUniqueMembers(team.members).length > 3 && (
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 text-[9px] flex items-center justify-center font-bold border-2 border-white">
                        +{getUniqueMembers(team.members).length - 3}
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
                <p className="font-extrabold text-sm text-slate-700">新しい共有ワークスペースを作成</p>
                <p className="text-[10px] text-slate-400 mt-1">ゼミ、サークル、委員会等のグループを追加します</p>
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
                  <span>新しい共有ワークスペースを作成</span>
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
                  <label className="block text-slate-500 font-bold mb-1.5">ワークスペース名</label>
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
                  <label className="block text-slate-500 font-bold mb-1.5">説明・概要（任意）</label>
                  <textarea 
                    rows={2}
                    placeholder="例: 憲法演習課題とレジュメ共有用"
                    value={newTeamDesc}
                    onChange={(e) => setNewTeamDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-cobalt"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddTeam(false)}
                    className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-50 font-bold text-xs"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingTeam}
                    className="bg-cobalt hover:bg-cobalt/95 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-md shadow-cobalt/15 disabled:opacity-50 cursor-pointer"
                  >
                    {isCreatingTeam ? "作成中..." : "作成する"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const teamMembers = getUniqueMembers(currentTeam.members);
  const standaloneTasks = currentTeam.tasks.filter(t => !t.folderName);

  return (
    <div className="flex-1 overflow-y-auto bg-notebook-pattern p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in text-[#22303C] font-sans">
      
      {/* Top Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E0DACB] pb-5">
        <div className="space-y-1.5">
          <button 
            onClick={() => setActiveTeamId(null)}
            className="flex items-center gap-1 text-[#61727F] hover:text-[#244053] text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>← ワークスペース一覧に戻る</span>
          </button>
          
          <div className="flex items-center gap-3">
            <h1 className="font-sans font-black text-xl md:text-2xl text-[#244053] tracking-tight">
              {currentTeam.name}
            </h1>
            <span className="inline-block bg-[#345B73]/10 text-[#345B73] text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0">
              共有スペース
            </span>
          </div>
          <p className="text-[#61727F] text-xs font-semibold max-w-2xl">{currentTeam.description}</p>
        </div>

        {/* Action Header Buttons & Compact Edge Members */}
        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {/* Edge Members Avatars */}
          <div className="flex items-center gap-2 bg-[#FAF8F5] bg-notebook-pattern border border-[#E0DACB] px-3 py-1.5 rounded-lg shadow-2xs">
            <div className="flex -space-x-1.5">
              {teamMembers.map((m) => (
                <div 
                  key={m.id}
                  onClick={() => setSelectedMemberModal(m)}
                  className={`w-7 h-7 rounded-full text-[10px] text-white flex items-center justify-center font-bold border-2 border-white shadow-2xs cursor-pointer hover:scale-110 transition-transform ${m.avatarColor}`}
                  title={`クリックで${m.name}の詳細を表示`}
                >
                  {m.name.slice(0, 1)}
                </div>
              ))}
            </div>
            <span className="text-xs font-bold text-[#22303C]">{teamMembers.length}名</span>
            <button
              onClick={() => setShowAddMember(true)}
              className="ml-1 text-[10px] text-[#345B73] hover:underline font-bold cursor-pointer"
            >
              ＋招待
            </button>
          </div>

          {/* Delete Workspace Button */}
          <button
            onClick={() => handleDeleteTeam(currentTeam.id)}
            className="flex items-center gap-1 text-[#61727F] hover:text-[#C24D38] hover:bg-rose-50 border border-[#E0DACB] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
            title="この共有スペースを削除"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>削除</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
        
        {/* LEFT COLUMN: Folders & Tasks Display (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Folders & Tasks Header */}
          <div className="bg-[#FAF8F5] bg-notebook-pattern border border-[#E0DACB] rounded-lg p-4 md:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E0DACB] pb-3">
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-[#345B73]" />
                <div>
                  <h3 className="font-sans font-bold text-[#22303C] text-sm md:text-base">ファイル・フォルダ & 共有タスク</h3>
                </div>
              </div>

              {/* Add Folder Button */}
              <button 
                onClick={() => setShowAddFolderModal(true)}
                className="bg-[#F0EDE4] hover:bg-[#EBE7DF] text-[#22303C] font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 border border-[#E0DACB]"
              >
                <FolderPlus className="w-3.5 h-3.5 text-[#345B73]" />
                <span>＋ ファイルを作成</span>
              </button>
            </div>

            {/* Folder Cards & Accordions with Drag and Drop Support */}
            {activeFolders.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500">📁 フォルダで分類されたタスク</h4>
                {activeFolders.map((folderName) => {
                  const folderTasks = currentTeam.tasks.filter(t => t.folderName === folderName);
                  const isOpen = openFolders[folderName] !== false;

                  return (
                    <div 
                      key={folderName} 
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const taskId = e.dataTransfer.getData("taskId");
                        if (taskId) {
                          moveTaskToFolder(taskId, folderName);
                        }
                      }}
                      className="border border-slate-200/80 rounded-xl bg-slate-50/40 overflow-hidden group transition-all"
                    >
                      {/* Folder Title Bar */}
                      <div 
                        onClick={() => toggleFolderOpen(folderName)}
                        className="p-3 bg-white hover:bg-slate-50/80 border-b border-slate-150 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                          <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                          <span className="font-sans font-bold text-xs md:text-sm text-slate-800">{folderName}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                            {folderTasks.length}件のタスク
                          </span>
                        </div>

                        {/* Folder Delete Button */}
                        <button
                          onClick={(e) => handleDeleteFolder(folderName, e)}
                          title="フォルダを削除（タスクは未分類に保存されます）"
                          className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Folder Content Tasks */}
                      {isOpen && (
                        <div className="p-3 space-y-2">
                          {folderTasks.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic py-2 text-center border-2 border-dashed border-slate-200/60 rounded-lg">
                              ここにタスクをドラッグ＆ドロップして格納できます
                            </p>
                          ) : (
                            folderTasks.map((task) => {
                              const isMust = task.priority === "must" || task.priority === "high";
                              return (
                                <div 
                                  key={task.id}
                                  draggable
                                  onDragStart={(e) => e.dataTransfer.setData("taskId", task.id)}
                                  onClick={() => setSelectedTaskModal(task)}
                                  className={`p-3 rounded-xl border bg-white transition-all cursor-grab active:cursor-grabbing text-xs flex items-center justify-between gap-3 ${
                                    selectedTaskModal?.id === task.id ? "border-cobalt ring-1 ring-cobalt/20 shadow-xs" : "border-slate-100 hover:border-slate-200"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleTaskProgress(task.id, task.progress);
                                      }}
                                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 cursor-pointer ${
                                        task.progress >= 100 ? "bg-cobalt border-cobalt text-white" : "border-slate-300 bg-white"
                                      }`}
                                    >
                                      {task.progress >= 100 && <Check className="w-3 h-3 stroke-[3]" />}
                                    </button>
                                    <span className={`font-bold truncate ${task.progress >= 100 ? "line-through text-slate-400" : "text-slate-700"}`}>
                                      {task.title}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {isMust && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100 font-extrabold">
                                        最重要
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-400 font-medium">👤 {task.assignedTo}</span>
                                    <button
                                      onClick={(e) => handleDeleteTask(task.id, e)}
                                      className="text-slate-300 hover:text-rose-500 p-1 rounded transition-colors cursor-pointer"
                                      title="削除"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Standalone Unclassified Tasks */}
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const taskId = e.dataTransfer.getData("taskId");
                if (taskId) {
                  moveTaskToFolder(taskId, null);
                }
              }}
              className="space-y-3 pt-2"
            >
              <h4 className="text-xs font-bold text-slate-500">📄 未分類タスク</h4>
              <div className="space-y-2">
                {standaloneTasks.length === 0 ? (
                  <div className="p-4 text-center border border-dashed border-slate-200 rounded-xl">
                    <p className="text-xs text-slate-400 italic">未分類タスクはありません。</p>
                  </div>
                ) : (
                  standaloneTasks.map((task) => {
                    const isMust = task.priority === "must" || task.priority === "high";
                    return (
                      <div 
                        key={task.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData("taskId", task.id)}
                        onClick={() => setSelectedTaskModal(task)}
                        className={`p-3.5 rounded-xl border bg-white transition-all cursor-grab active:cursor-grabbing text-xs flex items-center justify-between gap-3 ${
                          selectedTaskModal?.id === task.id ? "border-cobalt ring-1 ring-cobalt/20 shadow-xs" : "border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTaskProgress(task.id, task.progress);
                            }}
                            className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 cursor-pointer ${
                              task.progress >= 100 ? "bg-cobalt border-cobalt text-white" : "border-slate-300 bg-white"
                            }`}
                          >
                            {task.progress >= 100 && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>
                          <span className={`font-bold truncate ${task.progress >= 100 ? "line-through text-slate-400" : "text-slate-700"}`}>
                            {task.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isMust && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100 font-extrabold">
                              最重要
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-medium">👤 {task.assignedTo}</span>
                          <button
                            onClick={(e) => handleDeleteTask(task.id, e)}
                            className="text-slate-300 hover:text-rose-500 p-1 rounded transition-colors cursor-pointer"
                            title="削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Shared Notes / Memos Section */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cobalt shrink-0" />
                <h3 className="font-sans font-extrabold text-slate-800 text-xs md:text-sm">
                  共同メモ・掲示板 ({currentTeam.sharedNotes.length}件)
                </h3>
              </div>
              <button
                onClick={() => setShowAddNote(!showAddNote)}
                className="bg-cobalt hover:bg-cobalt/95 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <PlusCircle className="w-3 h-3" />
                <span>メモを追加</span>
              </button>
            </div>

            {showAddNote && (
              <form onSubmit={handleAddNote} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-fade-in text-xs">
                <input 
                  type="text" 
                  required
                  placeholder="件名を入力..."
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 text-xs focus:outline-hidden font-bold"
                />
                <textarea 
                  rows={2}
                  required
                  placeholder="内容を入力..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 text-xs focus:outline-hidden"
                />
                <div className="flex justify-end gap-1.5">
                  <button type="button" onClick={() => setShowAddNote(false)} className="text-slate-400 text-[10px] px-2">キャンセル</button>
                  <button type="submit" className="bg-cobalt text-white px-3 py-1 rounded-lg font-bold text-[10px]">保存</button>
                </div>
              </form>
            )}

            {currentTeam.sharedNotes.length === 0 ? (
              <p className="text-slate-400 text-xs italic py-2 text-center">共同メモはまだありません。</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentTeam.sharedNotes.map((note) => (
                  <div key={note.id} className="p-3 bg-amber-50/40 border border-amber-100 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between border-b border-amber-100/50 pb-1">
                      <span className="font-bold text-amber-900 truncate">{note.title}</span>
                      <span className="text-[9px] text-slate-400">{note.timestamp}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] font-medium leading-relaxed">{note.content}</p>
                    <span className="text-[9px] text-amber-800 font-bold block text-right">by {note.author}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Clean & Icon-driven Task Creation Form (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-sans font-bold text-[#22303C] text-sm md:text-base flex items-center gap-2">
                <Share2 className="w-4.5 h-4.5 text-[#345B73] shrink-0" />
                <span>➕ 共有タスクを登録</span>
              </h3>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              
              {/* Task Title (Required) */}
              <div>
                <label className="block text-slate-600 font-bold mb-1">タスク名 <span className="text-rose-500">*</span></label>
                <input 
                  type="text"
                  required
                  placeholder="例: 判例の要約資料を作成する"
                  value={cmdTaskTitle}
                  onChange={(e) => setCmdTaskTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-700 font-semibold focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-cobalt"
                />
              </div>

              {/* Folder & Assignee Selection Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">📁 収納ファイル</label>
                  <select
                    value={cmdFolderName}
                    onChange={(e) => setCmdFolderName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-bold text-slate-700 focus:outline-hidden cursor-pointer text-xs"
                  >
                    <option value="">なし（未分類タスク）</option>
                    {activeFolders.map(f => (
                      <option key={f} value={f}>📁 {f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">👤 担当メンバー</label>
                  <select
                    value={cmdAssignee}
                    onChange={(e) => setCmdAssignee(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-bold text-slate-700 focus:outline-hidden cursor-pointer text-xs"
                  >
                    <option value="大久保 佳奈">大久保 佳奈 (You)</option>
                    {teamMembers.filter(m => m.name !== "大久保 佳奈").map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Priority Select */}
              <div>
                <label className="block text-slate-600 font-bold mb-1">🚦 優先度</label>
                <select
                  value={cmdPriority}
                  onChange={(e) => setCmdPriority(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 font-bold text-slate-700 focus:outline-hidden cursor-pointer text-xs"
                >
                  <option value="high">最重要 (赤)</option>
                  <option value="medium">通常</option>
                </select>
              </div>

              {/* Optional Toggles with Icons */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-[10px] text-slate-400 font-bold block">オプション設定（必要な項目のみ追加）:</span>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOptDesc(!showOptDesc)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      showOptDesc ? "bg-cobalt text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>メモ・説明</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowOptLink(!showOptLink)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      showOptLink ? "bg-cobalt text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>参考リンク</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowOptFile(!showOptFile)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      showOptFile ? "bg-cobalt text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>ファイル添付</span>
                  </button>
                </div>
              </div>

              {/* Optional Section 1: Notes / Description */}
              {showOptDesc && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 animate-fade-in">
                  <label className="block text-[10px] text-slate-500 font-bold">📄 メモ・補足説明</label>
                  <textarea 
                    rows={2}
                    placeholder="メンバーへの伝達事項など..."
                    value={cmdDescription}
                    onChange={(e) => setCmdDescription(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden"
                  />
                </div>
              )}

              {/* Optional Section 2: Reference Link */}
              {showOptLink && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-fade-in">
                  <label className="block text-[10px] text-slate-500 font-bold">🔗 参考リンク</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="url"
                      placeholder="https://..."
                      value={cmdLinkVal}
                      onChange={(e) => setCmdLinkVal(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs focus:outline-hidden"
                    />
                    <input 
                      type="text"
                      placeholder="リンク名 (例: データベース)"
                      value={cmdLinkLabel}
                      onChange={(e) => setCmdLinkLabel(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* Optional Section 3: File Attachment */}
              {showOptFile && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-fade-in">
                  <label className="block text-[10px] text-slate-500 font-bold">📎 共有ファイル選択</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 bg-white p-3 rounded-lg text-center cursor-pointer hover:border-cobalt transition-colors"
                  >
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      onChange={handleFileSelect}
                      className="hidden" 
                    />
                    <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                    <span className="text-xs text-slate-600 font-bold block">
                      {attachedFileName ? `選択中: ${attachedFileName}` : "クリックしてファイルを選択"}
                    </span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-cobalt hover:bg-cobalt/95 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-cobalt/15 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>共有タスクを登録する</span>
              </button>
            </form>
          </div>

        </div>

      </div>

      {/* MODAL: TASK DETAILS & EDITING DIALOG */}
      {selectedTaskModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 w-full max-w-lg shadow-xl space-y-5 animate-fade-in text-xs md:text-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-cobalt" />
                <h3 className="font-sans font-bold text-slate-800 text-base">タスクの詳細と変更</h3>
              </div>
              <button onClick={() => setSelectedTaskModal(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 font-bold text-[10px] uppercase mb-1">タスク名</label>
                <span className="font-extrabold text-base text-slate-800 block">{selectedTaskModal.title}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                <div>
                  <label className="block text-slate-500 font-bold mb-1 text-xs">👤 担当メンバーの変更</label>
                  <select
                    value={selectedTaskModal.assignedTo}
                    onChange={(e) => updateTaskAssignee(selectedTaskModal.id, e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-700 text-xs cursor-pointer"
                  >
                    <option value="大久保 佳奈">大久保 佳奈 (You)</option>
                    {teamMembers.filter(m => m.name !== "大久保 佳奈").map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1 text-xs">📁 収納フォルダの変更</label>
                  <select
                    value={selectedTaskModal.folderName || ""}
                    onChange={(e) => moveTaskToFolder(selectedTaskModal.id, e.target.value || null)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-700 text-xs cursor-pointer"
                  >
                    <option value="">未分類タスク</option>
                    {activeFolders.map(f => (
                      <option key={f} value={f}>📁 {f}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedTaskModal.description && (
                <div>
                  <label className="block text-slate-400 font-bold text-[10px] uppercase mb-1">メモ・詳細説明</label>
                  <p className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-slate-700 text-xs leading-relaxed font-medium">
                    {selectedTaskModal.description}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                onClick={(e) => {
                  handleDeleteTask(selectedTaskModal.id, e);
                }}
                className="text-rose-500 hover:bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer"
              >
                タスクを削除
              </button>
              <button 
                onClick={() => setSelectedTaskModal(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-5 py-2 rounded-xl text-xs cursor-pointer"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD MEMBER DIALOG */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 w-full max-w-md shadow-xl space-y-4 animate-fade-in text-xs md:text-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-sans font-bold text-slate-800 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-cobalt" />
                <span>メンバーを共有スペースに追加</span>
              </h3>
              <button onClick={() => setShowAddMember(false)} className="text-slate-400 font-bold">キャンセル</button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-slate-500 font-bold mb-1">ユーザーID <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="例: user1234"
                  value={newMemberUserId}
                  onChange={(e) => setNewMemberUserId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-bold mb-1">役割・担当 <span className="text-rose-500">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="例: 発表・レジュメ担当"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddMember(false)} className="px-4 py-2 rounded-xl text-slate-500 font-bold">キャンセル</button>
                <button type="submit" className="bg-cobalt text-white font-bold px-5 py-2 rounded-xl shadow-md">招待・追加する</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD FOLDER DIALOG */}
      {showAddFolderModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 w-full max-w-sm shadow-xl space-y-4 animate-fade-in text-xs md:text-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-sans font-bold text-slate-800 text-base flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-cobalt" />
                <span>新しいファイル・フォルダを作成</span>
              </h3>
              <button onClick={() => setShowAddFolderModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleAddFolder} className="space-y-4">
              <div>
                <label className="block text-slate-500 font-bold mb-1.5">ファイル/フォルダ名</label>
                <input 
                  type="text" 
                  required
                  autoFocus
                  placeholder="例: 第1章 判例まとめ"
                  value={newFolderNameInput}
                  onChange={(e) => setNewFolderNameInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-cobalt"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddFolderModal(false)} className="px-4 py-2 rounded-xl text-slate-500 font-bold">キャンセル</button>
                <button type="submit" className="bg-cobalt text-white font-bold px-5 py-2 rounded-xl shadow-md cursor-pointer">作成する</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: MEMBER DETAILS */}
      {selectedMemberModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#F4F1EA] rounded-2xl border border-[#D5CFB9] p-6 w-full max-w-sm shadow-xl space-y-4 text-[#22303C] animate-fade-in">
            <div className="flex items-center justify-between border-b border-[#D5CFB9] pb-3">
              <h3 className="font-brand-serif font-bold text-base text-[#244053]">メンバー詳細情報</h3>
              <button onClick={() => setSelectedMemberModal(null)} className="text-slate-400 font-bold hover:text-slate-600 cursor-pointer">✕</button>
            </div>
            
            <div className="flex items-center gap-3.5 pt-1">
              <div className={`w-12 h-12 rounded-full text-white font-bold flex items-center justify-center text-lg shadow-sm ${selectedMemberModal.avatarColor}`}>
                {selectedMemberModal.name.slice(0, 1)}
              </div>
              <div>
                <h4 className="font-bold text-base text-[#22303C]">{selectedMemberModal.name}</h4>
                <span className="text-xs text-[#345B73] font-bold bg-[#EAE6DF] px-2 py-0.5 rounded border border-[#D5CFB9] inline-block mt-0.5">
                  {selectedMemberModal.role}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-[#61727F] bg-white/90 p-3.5 rounded-xl border border-[#D5CFB9]">
              <div><span className="font-bold text-[#4A5D6B]">担当中タスク:</span> {selectedMemberModal.activeTask || "未割り当て"}</div>
              <div><span className="font-bold text-[#4A5D6B]">ステータス:</span> {selectedMemberModal.status === "active" ? "🟢 オンライン (アクティブ)" : "⚪ オフライン"}</div>
            </div>

            <button 
              onClick={() => setSelectedMemberModal(null)} 
              className="w-full bg-[#244053] hover:bg-[#1A3141] text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-colors cursor-pointer"
            >
              閉じる
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
