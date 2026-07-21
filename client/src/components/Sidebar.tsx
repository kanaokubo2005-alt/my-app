import React from "react";
import { 
  CheckSquare, 
  X,
  GraduationCap,
  Users,
  Trash2,
  User as UserIcon
} from "lucide-react";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  user?: any;
  onOpenTrash?: () => void;
  trashCount?: number;
  onOpenProfile?: () => void;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  isOpen,
  setIsOpen,
  user,
  onOpenTrash,
  trashCount,
  onOpenProfile
}: SidebarProps) {
  const displayName = user?.name || "ゲストユーザー";
  const userEmail = user?.username ? `@${user.username}` : "未ログイン";
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(part => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "G";
  };
  const initials = getInitials(displayName);

  const menuItems = [
    { 
      id: "tasks", 
      no: "1", 
      label: "個人タスク", 
      icon: CheckSquare, 
      activeTabClass: "bg-[#244053] text-white shadow-md border-l-4 border-[#C24D38]",
      inactiveTabClass: "bg-[#EAE6DF] text-[#4A5D6B] hover:bg-[#DFD9CE] border-l-2 border-slate-300"
    },
    { 
      id: "team", 
      no: "2", 
      label: "チームスペース", 
      icon: Users, 
      activeTabClass: "bg-[#345B73] text-white shadow-md border-l-4 border-[#C49A45]",
      inactiveTabClass: "bg-[#EAE6DF] text-[#4A5D6B] hover:bg-[#DFD9CE] border-l-2 border-slate-300"
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside 
        className={`fixed inset-y-0 left-0 w-64 bg-[#EBE7DF] border-r border-[#D5CFB9] flex flex-col justify-between p-5 z-50 transition-transform duration-300 ease-out lg:static lg:translate-x-0 bg-notebook-pattern ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col gap-6">
          {/* Header & Brand Logo */}
          <div className="flex items-center justify-between border-b border-[#D8D2BE] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#244053] flex items-center justify-center text-white shadow-md">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="font-brand-serif font-black text-xl tracking-tight text-[#22303C]">ToDone</span>
                <span className="block text-[9px] text-[#345B73] font-bold tracking-widest uppercase">Personal Planner</span>
              </div>
            </div>
            
            {/* Mobile close button */}
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 lg:hidden rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Menu (Clear File Binder Index Tabs) */}
          <nav className="flex flex-col gap-3">
            {menuItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-l-2xl rounded-r-md transition-all duration-200 text-left relative overflow-hidden group cursor-pointer ${
                    isActive ? item.activeTabClass : item.inactiveTabClass
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-[8px] font-bold tracking-widest uppercase opacity-75">NO.</span>
                      <span className="font-brand-serif font-black text-base leading-none">{item.no}</span>
                    </div>
                    <span className="font-bold text-sm tracking-wide">{item.label}</span>
                  </div>
                </button>
              );
            })}

            <button
              onClick={() => {
                if (onOpenTrash) onOpenTrash();
                setIsOpen(false);
              }}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-xs font-bold text-[#4A5D6B] hover:bg-white hover:text-slate-800 border border-[#D5CFB9] transition-all cursor-pointer text-left mt-3 bg-[#F4F1EA]"
            >
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-4 h-4 text-[#5F7A6E]" />
                <span>ゴミ箱・復元</span>
              </div>
              {trashCount && trashCount > 0 ? (
                <span className="bg-[#C24D38] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {trashCount}
                </span>
              ) : null}
            </button>
          </nav>
        </div>

        {/* Bottom User Profile Card */}
        <button
          onClick={() => {
            if (onOpenProfile) onOpenProfile();
          }}
          className="pt-3 border-t border-[#D5CFB9] flex items-center justify-between p-2 rounded-xl hover:bg-white/60 transition-all cursor-pointer text-left w-full group"
          title="自分のアカウント情報を表示"
        >
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full bg-[#244053] text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
              {initials}
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs md:text-sm text-[#22303C] block truncate max-w-[120px]">{displayName}</span>
              <span className="text-[10px] text-[#61727F] block truncate max-w-[120px]">{userEmail}</span>
            </div>
          </div>
          <UserIcon className="w-4 h-4 text-slate-400 group-hover:text-[#244053] transition-colors" />
        </button>
      </aside>
    </>
  );
}
