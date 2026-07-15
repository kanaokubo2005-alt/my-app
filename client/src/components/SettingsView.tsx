import React, { useState } from "react";
import type { FormEvent } from "react";
import { 
  User, 
  Key, 
  FileCode, 
  RefreshCw, 
  Settings, 
  ShieldAlert, 
  GraduationCap,
  Check
} from "lucide-react";

interface SettingsViewProps {
  onResetTasks: () => void;
  user: any;
  onLogout: () => void;
  theme: string;
  setTheme: (theme: string) => void;
}

export default function SettingsView({ 
  onResetTasks,
  user,
  onLogout,
  theme,
  setTheme
}: SettingsViewProps) {
  const [name, setName] = useState(user?.name || "");
  const [major, setMajor] = useState("情報理工学部 3年");
  const [email, setEmail] = useState(user?.username ? `@${user.username}` : "guest");

  const handleSaveProfile = (e: FormEvent) => {
    e.preventDefault();
    alert("プロフィール設定が更新されました！（デモモード）");
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-bg p-4 md:p-8 space-y-8 animate-fade-in">
      {/* View Header */}
      <div>
        <h1 className="font-sans font-bold text-2xl md:text-3xl text-slate-800 tracking-tight">⚙ Settings</h1>
        <p className="text-slate-400 text-xs md:text-sm font-semibold mt-1">
          各種プロフィールの設定とテーマの変更
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 1. Account Settings */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-50 pb-3 flex items-center gap-2 text-slate-800">
            <User className="w-5 h-5 text-cobalt" />
            <h2 className="font-sans font-bold text-sm md:text-base">学生アカウント設定</h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs md:text-sm">
            <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="w-12 h-12 rounded-xl bg-cobalt text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                {name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block font-sans font-bold text-slate-700 truncate">{name}</span>
                <span className="text-[11px] text-slate-400 block truncate">ユーザーID: {user?.id} • ユーザー名: @{user?.username}</span>
              </div>
              <button 
                type="button"
                onClick={onLogout}
                className="text-xs bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-500 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                ログアウト
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">氏名</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-700 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-cobalt transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">学部・学科 / 学年</label>
                <input 
                  type="text" 
                  value={major} 
                  onChange={(e) => setMajor(e.target.value)}
                  placeholder="例: 法学部 2年"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-700 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-cobalt transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">連絡用メールアドレス</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-700 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-cobalt transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-cobalt hover:bg-cobalt/95 text-white font-semibold px-5 py-2.5 rounded-xl text-xs md:text-sm shadow-md shadow-cobalt/10 hover:shadow-lg transition-all cursor-pointer"
            >
              変更を保存する
            </button>
          </form>
        </div>



        {/* 4. System & Data Reset */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-50 pb-3 flex items-center gap-2 text-slate-800">
            <Settings className="w-5 h-5 text-cobalt" />
            <h2 className="font-sans font-bold text-sm md:text-base">システム・データ管理</h2>
          </div>

          <div className="space-y-4 text-xs md:text-sm">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="block font-bold text-slate-700">システム初期化</span>
                <span className="text-[10px] text-slate-400">タスクや設定を完全に初期状態にリセットします</span>
              </div>
              <button
                onClick={() => {
                  if (window.confirm("すべてのタスクと設定をリセットしますか？")) {
                    onResetTasks();
                    alert("初期データにリセットされました。");
                  }
                }}
                className="flex items-center gap-1.5 border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>データリセット</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
