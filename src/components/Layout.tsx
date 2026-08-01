import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "./Sidebar";
import { useAPI } from "@/context/APIContext";
import { useTheme } from "@/context/ThemeContext";
import APINotice from "./APINotice";
import { Sun, Moon } from "lucide-react";

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useIsMobile();
  const { isAuthenticated, isLoading } = useAPI();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  
  // 监听触摸事件以实现从左向右划出侧边栏
  useEffect(() => {
    if (isMobile) {
      const handleTouchStart = (e: TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
      };
      
      const handleTouchEnd = (e: TouchEvent) => {
        touchEndX.current = e.changedTouches[0].clientX;
        const distance = touchEndX.current - touchStartX.current;
        
        if (touchStartX.current < 20 && distance > 30 && !sidebarOpen) {
          setSidebarOpen(true);
        }
        
        if (distance < -50 && sidebarOpen) {
          setSidebarOpen(false);
        }
      };
      
      document.addEventListener('touchstart', handleTouchStart);
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isMobile, sidebarOpen]);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-200" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}>
      {/* 顶部彩条 */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-500 via-cyan-400 to-violet-500 animate-gradient-x z-50"></div>

      <div className="flex-1 flex relative">
        {/* 桌面侧边栏 */}
        <div className="hidden lg:block fixed inset-y-0 left-0 z-40">
          <Sidebar onToggle={toggleSidebar} isOpen={true} />
        </div>

        {/* 移动端侧边栏 */}
        <AnimatePresence mode="wait">
          {isMobile && sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black z-30"
                onClick={() => setSidebarOpen(false)}
                style={{ pointerEvents: 'auto' }}
              />

              <motion.div
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="fixed inset-y-0 left-0 z-40"
              >
                <Sidebar onToggle={toggleSidebar} isOpen={sidebarOpen} />

                <button
                  onClick={() => setSidebarOpen(false)}
                  className="absolute top-4 right-4 w-8 h-8 bg-slate-800 border border-slate-600 rounded-md flex items-center justify-center text-slate-200 hover:bg-slate-700 transition-colors"
                  aria-label="关闭侧边栏"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* 移动端呼出侧边栏按钮 */}
        {isMobile && !sidebarOpen && (
          <div
            onClick={toggleSidebar}
            className="fixed left-0 top-1/3 z-40 cursor-pointer"
          >
            <div className="flex items-center">
              <div className="h-14 w-5 bg-white dark:bg-slate-800 border border-l-0 border-slate-300 dark:border-slate-700 rounded-r-md flex items-center justify-center shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-sky-500">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* 右上角固定主题快速切换悬浮胶囊 */}
        <div className="fixed top-3 right-4 z-40 flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs shadow-md backdrop-blur-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title={theme === 'light' ? '切换到夜间模式' : '切换到日间模式'}
          >
            {theme === 'light' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />
                <span>日间</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-sky-400" />
                <span>夜间</span>
              </>
            )}
          </button>
        </div>

        {/* 主内容区 */}
        <main
          className={`flex-1 py-6 px-4 sm:px-6 transition-all duration-300 ${
            !isMobile ? "lg:ml-72" : "ml-0"
          } relative min-h-screen`}
          style={{ backgroundColor: 'var(--bg-page)' }}
        >
          {/* 内容区左侧分割线 */}
          {!isMobile && (
            <div className="fixed left-72 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-800/80 z-30 pointer-events-none" />
          )}

          {!isLoading && !isAuthenticated && <APINotice />}

          <div className="container mx-auto max-w-7xl pt-1">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
