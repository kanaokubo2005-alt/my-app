import { 
  LayoutDashboard, 
  CheckSquare, 
  BarChart3, 
  Settings as SettingsIcon, 
  Menu, 
  X,
  GraduationCap,
  Users,
  Trash2
} from "lucide-react";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  user?: any;
  onOpenTrash?: () => void;
  trashCount?: number;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  isOpen,
  setIsOpen,
  user,
  onOpenTrash,
  trashCount
}: SidebarProps) {
  const displayName = user?.name || "ゲスト";
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
      no: "NO. 1", 
      label: "個人タスク (手帳)", 
      icon: CheckSquare, 
      activeBg: "bg-[#728578] text-white shadow-md border-r-4 border-[#4f5f54]",
      inactiveBg: "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 border-r-2 border-slate-300"
    },
    { 
      id: "team", 
      no: "NO. 2", 
      label: "共有スペース (チーム)", 
      icon: Users, 
      activeBg: "bg-[#455c58] text-white shadow-md border-r-4 border-[#2b3c39]",
      inactiveBg: "bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 border-r-2 border-slate-300"
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
        className={`fixed inset-y-0 left-0 w-64 bg-[#f2f4f2] border-r border-slate-200/80 flex flex-col justify-between p-5 z-50 transition-transform duration-300 ease-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col gap-6">
          {/* Header & Logo */}
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cobalt flex items-center justify-center text-white shadow-md shadow-cobalt/20">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="font-sans font-black text-lg tracking-tight text-slate-800">ToDone</span>
                <span className="block text-[10px] text-cobalt font-extrabold tracking-widest uppercase">Personal Planner</span>
              </div>
            </div>
            
            {/* Mobile close button */}
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 lg:hidden rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Clear File Tab Navigation Index */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-extrabold tracking-widest uppercase block mb-2 px-1">
              📁 クリアファイル見出し (INDEX)
            </span>

            <nav className="flex flex-col gap-2.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between px-4 py-3 rounded-l-2xl rounded-r-md transition-all duration-200 text-left relative overflow-hidden group cursor-pointer ${
                      isActive ? item.activeBg : item.inactiveBg
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black tracking-widest uppercase opacity-80 bg-black/10 px-1.5 py-0.5 rounded">
                        {item.no}
                      </span>
                      <span className="font-bold text-xs md:text-sm tracking-wide">{item.label}</span>
                    </div>
                    <Icon className="w-4 h-4 opacity-75 group-hover:scale-110 transition-transform" />
                  </button>
                );
              })}

              <button
                onClick={() => {
                  if (onOpenTrash) onOpenTrash();
                  setIsOpen(false);
                }}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-white hover:text-slate-800 border border-slate-200/60 transition-all cursor-pointer text-left mt-2 bg-white/50"
              >
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-4 h-4 text-slate-400" />
                  <span>ゴミ箱・復元</span>
                </div>
                {trashCount && trashCount > 0 ? (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {trashCount}
                  </span>
                ) : null}
              </button>
            </nav>
          </div>
        </div>

        {/* User Profile & Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between p-2 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full bg-cobalt-light/10 text-cobalt border border-cobalt-light/20 flex items-center justify-center font-bold text-sm">
              {initials}
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="min-w-0">
              <span className="font-sans font-semibold text-sm text-slate-800 block truncate max-w-[120px]">{displayName}</span>
              <span className="text-xs text-slate-400 block truncate max-w-[120px]">{userEmail}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
