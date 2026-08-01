
import { useState, useEffect, useRef } from "react";
import { api } from "@/utils/apiClient";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/components/ToastContainer";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "INFO" | "WARNING" | "ERROR" | "DEBUG";
  message: string;
  source: string;
}

const LogsPage = () => {
  const isMobile = useIsMobile();
  const { showConfirm } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); // 区分初始加载和刷新
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Fetch logs
  const fetchLogs = async (isRefresh = false) => {
    // 如果是刷新，只设置刷新状态，不改变加载状态
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const response = await api.get(`/logs`);
      setLogs(response.data);
    } catch (error) {
      console.error("Error fetching logs:", error);
      if (!isLoading && !isRefresh) {
        // Only show error toast if not initial loading or refresh
        toast.error("获取日志失败");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Clear logs
  const clearLogs = async () => {
    const confirmed = await showConfirm({
      title: '确认清空',
      message: '确定要清空所有日志吗？\n此操作不可撤销。',
      confirmText: '确认清空',
      cancelText: '取消'
    });
    
    if (!confirmed) {
      return;
    }
    
    try {
      await api.delete(`/logs`);
      toast.success("已清空日志");
      fetchLogs(true);
    } catch (error) {
      console.error("Error clearing logs:", error);
      toast.error("清空日志失败");
    }
  };

  // Scroll to bottom of logs
  const scrollToBottom = () => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Initial fetch and auto-refresh setup
  useEffect(() => {
    fetchLogs();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => fetchLogs(true), 5000); // 自动刷新使用刷新模式
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  // Apply filters
  useEffect(() => {
    if (logs.length === 0) return;
    
    let filtered = [...logs];
    
    // Apply level filter
    if (filterLevel !== "all") {
      filtered = filtered.filter(log => log.level === filterLevel);
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        log => 
          log.message.toLowerCase().includes(term) ||
          log.source.toLowerCase().includes(term)
      );
    }
    
    setFilteredLogs(filtered);
  }, [logs, filterLevel, searchTerm]);

  // Scroll to bottom when logs update
  useEffect(() => {
    if (autoRefresh && !searchTerm && filterLevel === "all") {
      scrollToBottom();
    }
  }, [filteredLogs, autoRefresh, searchTerm, filterLevel]);

  // Get background color based on log level
  const getLogLevelStyle = (level: string) => {
    switch (level) {
      case "ERROR":
        return "bg-red-500/20 text-red-400 border border-red-500/40 font-bold";
      case "WARNING":
        return "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold";
      case "INFO":
        return "bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold";
      case "DEBUG":
        return "bg-purple-500/20 text-purple-300 border border-purple-500/40";
      default:
        return "bg-slate-800 text-slate-400 border border-slate-700";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0 max-w-full overflow-x-hidden">
      <div>
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold mb-1 cyber-glow-text`}>详细日志</h1>
        <p className="text-slate-500 text-sm mb-4 sm:mb-6">实时系统调试与核心动作日志流</p>
      </div>

      {/* Filters and controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <input
              type="text"
              placeholder={isMobile ? "搜索..." : "搜索日志内容..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="cyber-input pl-9 w-full text-sm"
            />
          </div>
          
          <div>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="cyber-input w-full text-sm font-medium"
            >
              <option value="all">所有级别 (ALL)</option>
              <option value="INFO">INFO (信息)</option>
              <option value="WARNING">WARNING (警告)</option>
              <option value="ERROR">ERROR (错误)</option>
              <option value="DEBUG">DEBUG (调试)</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between sm:col-span-2 lg:col-span-1 gap-1.5 sm:gap-2">
            <div className="flex items-center flex-shrink-0">
              <label className="cursor-pointer flex items-center space-x-1 sm:space-x-2 text-slate-700 font-medium hover:text-sky-600 transition-colors text-xs sm:text-sm whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={() => setAutoRefresh(!autoRefresh)}
                  className="form-checkbox cyber-input h-3.5 w-3.5 sm:h-4 sm:w-4"
                />
                <span className="hidden sm:inline">自动刷新 (5s)</span>
                <span className="sm:hidden">自动</span>
              </label>
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => fetchLogs(true)}
                className="cyber-button text-xs flex items-center justify-center gap-1 px-2.5 sm:px-3 min-w-[60px] sm:min-w-0"
                title="刷新日志"
                disabled={isLoading || isRefreshing}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`flex-shrink-0 ${isRefreshing ? 'animate-spin' : ''}`}>
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <polyline points="23 20 23 14 17 14"></polyline>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                </svg>
                <span className="whitespace-nowrap min-w-[2.5rem]">刷新</span>
              </button>
              
              <button
                onClick={clearLogs}
                className="px-3 py-1.5 text-xs rounded-md border border-red-300 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white hover:border-red-600 font-semibold flex items-center justify-center gap-1 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={isLoading || logs.length === 0}
                title="清空日志"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span className="whitespace-nowrap">清空</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Logs display — 专业的深色终端控制台视图 */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl max-w-full font-mono text-xs">
        <div className="flex justify-between items-center px-4 py-3 border-b border-slate-800 bg-slate-900/90 text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
            <h2 className="font-semibold text-xs sm:text-sm text-slate-200 ml-2">💻 系统实时日志控制台</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sky-400 font-semibold text-xs">
              共 {filteredLogs.length} 条记录
            </div>
            {logs.length > 0 && !isMobile && (
              <div className="text-[10px] text-slate-400">
                最新: {new Date(logs[logs.length - 1]?.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
        
        {/* 只在首次加载时显示加载状态 */}
        {isLoading && logs.length === 0 ? (
          <div className="p-6 animate-pulse space-y-3 bg-slate-950">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-5 bg-slate-800/60 rounded"></div>
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center bg-slate-950">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 mx-auto mb-4">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <p className="text-slate-400 text-sm">暂无日志记录</p>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-280px)] sm:max-h-[calc(100vh-260px)] overflow-y-auto overflow-x-auto p-2 bg-slate-950 space-y-1">
            {/* 桌面端头部 */}
            {!isMobile && filteredLogs.length > 0 && (
              <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 px-3 py-2 text-[11px] font-semibold text-slate-400 flex items-center gap-2">
                <div className="w-10 text-right">#</div>
                <div className="w-36">时间</div>
                <div className="w-16 text-center">级别</div>
                <div className="w-24">来源</div>
                <div className="flex-1">调试详细消息</div>
              </div>
            )}
            
            <div className="space-y-1">
              {filteredLogs.map((log, index) => (
                <div
                  key={log.id}
                  className="px-3 py-2 rounded hover:bg-slate-900/80 transition-colors border border-transparent hover:border-slate-800"
                >
                  {isMobile ? (
                    /* 移动端卡片 */
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-mono text-[10px]">
                            #{filteredLogs.length - index}
                          </span>
                          <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] ${getLogLevelStyle(log.level)}`}>
                            {log.level}
                          </span>
                        </div>
                        <div className="text-slate-400 font-mono text-[10px]">
                          {new Date(log.timestamp).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                          }).replace(/\//g, '-')}
                        </div>
                      </div>
                      <div className="text-sky-400 font-mono text-[11px]">
                        [{log.source}]
                      </div>
                      <div className="text-slate-100 text-xs leading-relaxed break-all font-mono">
                        {log.message}
                      </div>
                    </div>
                  ) : (
                    /* 桌面端单行 */
                    <div className="flex items-start gap-2 text-xs font-mono min-w-0">
                      <div className="w-10 text-slate-500 text-right flex-shrink-0">
                        #{filteredLogs.length - index}
                      </div>
                      <div className="w-36 text-slate-400 flex-shrink-0">
                        {new Date(log.timestamp).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false
                        }).replace(/\//g, '-')}
                      </div>
                      <div className="w-16 flex-shrink-0">
                        <span className={`inline-flex items-center justify-center w-full px-1.5 py-0.5 rounded text-[10px] ${getLogLevelStyle(log.level)}`}>
                          {log.level}
                        </span>
                      </div>
                      <div className="w-24 text-sky-400 font-semibold truncate flex-shrink-0" title={log.source}>
                        [{log.source}]
                      </div>
                      <div className="flex-1 text-slate-100 leading-relaxed break-all whitespace-pre-wrap min-w-0">
                        {log.message}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsPage;
