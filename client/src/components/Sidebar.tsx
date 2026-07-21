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
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "team", label: "Team Space", icon: Users },
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
        className={`fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-100 flex flex-col justify-between p-6 z-50 transition-transform duration-300 ease-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col gap-8">
          {/* Header & Logo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cobalt flex items-center justify-center text-white shadow-md shadow-cobalt/20">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="font-sans font-bold text-lg tracking-tight text-slate-800">ToDone</span>
                <span className="block text-[10px] text-cobalt font-medium tracking-widest uppercase">For Students</span>
              </div>
            </div>
            
            {/* Mobile close button */}
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 lg:hidden rounded-lg hover:bg-slate-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="flex flex-col gap-1.5">
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
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 text-left ${
                    isActive 
                      ? "bg-cobalt/5 text-cobalt border border-cobalt/10 shadow-xs" 
                      : "text-muted-text hover:bg-slate-50 hover:text-dark-text"
                  }`}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? "scale-105" : ""}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <button
              onClick={() => {
                if (onOpenTrash) onOpenTrash();
                setIsOpen(false);
              }}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <Trash2 className="w-5 h-5 text-slate-400" />
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
