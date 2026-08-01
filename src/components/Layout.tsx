import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "./Sidebar";
import { useAPI } from "@/context/APIContext";
import APINotice from "./APINotice";

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const isMobile = useIsMobile();
  const { isAuthenticated, isLoading } = useAPI();
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
        
        // 如果从屏幕左边缘开始向右划动超过30px，打开侧边栏
        if (touchStartX.current < 20 && distance > 30 && !sidebarOpen) {
          setSidebarOpen(true);
        }
        
        // 如果侧边栏打开，从右向左划动超过50px，关闭侧边栏
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
    // 仅在移动端时关闭边栏，桌面端始终保持显示
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  useEffect(() => {
    // 移动端切换页面时关闭侧边栏
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      {/* 顶部渐变彩条 */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-500 via-cyan-400 to-violet-500 animate-gradient-x z-50"></div>

      <div className="flex-1 flex relative">
        {/* 桌面端始终显示侧边栏（深色） */}
        <div className={`hidden lg:block fixed inset-y-0 left-0 z-40`}>
          <Sidebar onToggle={toggleSidebar} isOpen={true} />
        </div>

        {/* 移动端可滑出的侧边栏 */}
        <AnimatePresence mode="wait">
          {isMobile && sidebarOpen && (
            <>
              {/* 背景遮罩 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black z-30"
                onClick={() => setSidebarOpen(false)}
                style={{ pointerEvents: 'auto' }}
              />

              {/* 侧边栏 */}
              <motion.div
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="fixed inset-y-0 left-0 z-40"
              >
                <Sidebar onToggle={toggleSidebar} isOpen={sidebarOpen} />

                {/* 关闭按钮 */}
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

        {/* 移动端贴边呼出按钮 */}
        {isMobile && !sidebarOpen && (
          <div
            onClick={toggleSidebar}
            className="fixed right-0 top-1/3 z-40 cursor-pointer"
          >
            <div className="flex items-center">
              <div className="h-16 w-4 bg-white border border-l-0 border-slate-300 rounded-r-md flex items-center justify-center shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-500">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </div>
              <div className="h-20 w-1 bg-sky-500 rounded-r-sm shadow-[0_0_8px_rgba(14,165,233,0.5)]"></div>
            </div>
          </div>
        )}

        {/* 主内容区 — 浅色白底 */}
        <main
          className={`flex-1 py-6 px-4 sm:px-6 transition-all duration-300 ${
            !isMobile ? "lg:ml-72" : "ml-0"
          } relative bg-slate-50 min-h-screen`}
        >
          {/* 内容区顶部装饰线 */}
          {!isMobile && (
            <div className="fixed left-72 top-0 bottom-0 w-px bg-gradient-to-b from-sky-200 via-slate-200 to-sky-200 z-30 pointer-events-none" />
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
