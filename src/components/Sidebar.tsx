import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAPI } from "@/context/APIContext";
import { useTheme } from "@/context/ThemeContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useState } from "react";
import { api } from "@/utils/apiClient";
import { Sun, Moon } from "lucide-react";

interface SidebarProps {
  onToggle: () => void;
  isOpen: boolean;
}

const Sidebar = ({ onToggle, isOpen }: SidebarProps) => {
  const location = useLocation();
  const { isAuthenticated, accounts, currentAccountId, setCurrentAccount } = useAPI();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const currentZone = (accounts.find((acc: any) => acc?.id === currentAccountId)?.zone) || '';
  const [appVersion, setAppVersion] = useState<string>('-');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await api.get('/version');
        const v = (r as any)?.data?.version;
        if (mounted && typeof v === 'string' && v) setAppVersion(v);
      } catch {
        // 不显示构建版本，保持'-'
      }
    })();
    return () => { mounted = false; };
  }, []);
  
  const menuItems = [
    { path: "/", icon: "bar-chart-2", label: "仪表盘" },
    { path: "/servers", icon: "server", label: "服务器列表" },
    { path: "/availability", icon: "database", label: "实时可用性" },
    { path: "/queue", icon: "clipboard-list", label: "抢购队列" },
    { path: "/monitor", icon: "bell", label: "服务器监控" },
    { path: "/vps-monitor", icon: "cloud", label: "VPS补货通知" },
    { path: "/server-control", icon: "terminal", label: "服务器控制" },
    { path: "/account-management", icon: "user", label: "账户信息" },
    { path: "/api-accounts", icon: "settings", label: "API账户管理" },
    { path: "/history", icon: "clock", label: "抢购历史" },
    { path: "/logs", icon: "file-text", label: "详细日志" },
    { path: "/settings", icon: "settings", label: "系统设置" },
  ];

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="w-72 h-full flex flex-col shadow-2xl transition-colors border-r border-slate-800/60" style={{ backgroundColor: 'var(--bg-sidebar)' }}>
      {/* 头部 Branding */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-3">
          <motion.div
            initial={{ rotate: -10 }}
            animate={{ rotate: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center bg-sky-500/10 p-2 rounded-xl border border-sky-400/30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-sky-400">
              <path d="M12 22s8-4 8-10V4l-8-2-8 2v8c0 6 8 10 8 10z"></path>
              <circle cx="12" cy="8" r="2" />
            </svg>
          </motion.div>
          <div>
            <h1 className="text-xl font-bold tracking-wide text-sky-400">幻影狙击手</h1>
            <div className="text-xs text-slate-400 font-semibold">OVH 服务器自动抢购平台</div>
          </div>
        </Link>
      </div>

      {/* 菜单列表 */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
        {menuItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-3.5 py-2.5 rounded-xl transition-all relative font-bold text-sm text-decoration-none ${
                active 
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-xs' 
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
              onClick={isMobile ? onToggle : undefined}
            >
              {active && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute left-0 w-1.5 h-6 bg-sky-400 rounded-full"
                  style={{ boxShadow: '0 0 10px rgba(56,189,248,0.8)' }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                className="mr-3 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {item.icon === "bar-chart-2" && (<><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></>)}
                {item.icon === "server" && (<><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></>)}
                {item.icon === "database" && (<><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></>)}
                {item.icon === "clipboard-list" && (<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 12h6"></path><path d="M9 16h6"></path><path d="M9 8h6"></path></>)}
                {item.icon === "clock" && (<><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></>)}
                {item.icon === "file-text" && (<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></>)}
                {item.icon === "bell" && (<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></>)}
                {item.icon === "cloud" && (<><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></>)}
                {item.icon === "terminal" && (<><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></>)}
                {item.icon === "user" && (<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></>)}
                {item.icon === "settings" && (<><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></>)}
              </svg>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* 底部功能栏与主题切换 */}
      <div className="border-t border-white/10 p-4 space-y-3 bg-black/20">
        {/* 日间/夜间主题切换 Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-slate-200 transition-all font-bold text-xs"
        >
          <span className="flex items-center gap-2">
            {theme === 'light' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span>日间模式 (Light)</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-sky-400" />
                <span>夜间模式 (Dark)</span>
              </>
            )}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/20 text-sky-300 border border-sky-400/30">
            切换
          </span>
        </button>

        {/* 账户与连接状态 */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-bold">
            <div className={`flex items-center ${isAuthenticated ? 'text-emerald-400' : 'text-slate-400'}`}>
              <span className={`w-2.5 h-2.5 rounded-full mr-2 ${isAuthenticated ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`}></span>
              <span>{isAuthenticated ? 'API已连接' : 'API未连接'}</span>
            </div>
            <div className="flex items-center gap-2">
              {currentZone && (
                <span className="px-2 py-0.5 text-[10px] rounded-md bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  {currentZone}
                </span>
              )}
              <span className="text-xs text-slate-400">{appVersion}</span>
            </div>
          </div>
          <div>
            <select
              className="w-full text-xs bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-slate-200 font-bold outline-none focus:border-sky-400"
              value={currentAccountId || ''}
              onChange={(e) => setCurrentAccount(e.target.value)}
            >
              {accounts.map((acc: any) => (
                <option key={acc.id} value={acc.id} className="bg-slate-900 text-slate-100">{acc.alias || acc.id}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
