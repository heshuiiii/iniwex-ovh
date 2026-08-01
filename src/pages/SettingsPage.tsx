import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAPI } from "@/context/APIContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { CacheManager } from "@/components/CacheManager";
import { useIsMobile } from "@/hooks/use-mobile";
import { getApiSecretKey, setApiSecretKey } from "@/utils/apiClient";
import { api } from "@/utils/apiClient";
import { X, AlertCircle, FileText, CheckCircle, AlertTriangle } from "lucide-react";

const SettingsPage = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { 
    tgToken,
    tgChatId,
    proxy1: ctxProxy1,
    proxy2: ctxProxy2,
    defaultRetryInterval: ctxDefaultRetry,
    isLoading,
    checkAuthentication,
    refreshSettings,
  } = useAPI();

  const [formValues, setFormValues] = useState({
    apiSecretKey: "",
    tgToken: "",
    tgChatId: "",
    sshKey: "",
    proxy1: "",
    proxy2: "",
    defaultRetryInterval: "30",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showValues, setShowValues] = useState({
    apiSecretKey: false,
    tgToken: false
  });

  // 代理连通性测试相关状态
  const [testingProxy, setTestingProxy] = useState<{ [key: string]: boolean }>({});
  const [proxyTestResult, setProxyTestResult] = useState<{ [key: string]: { success: boolean; message: string; ip?: string; location?: string } }>({});

  const testProxyConnection = async (key: 'proxy1' | 'proxy2') => {
    const val = formValues[key]?.trim();
    if (!val) {
      toast.warning(`请先输入 ${key === 'proxy1' ? '代理 1' : '代理 2'} 地址`);
      return;
    }
    setTestingProxy(prev => ({ ...prev, [key]: true }));
    setProxyTestResult(prev => ({ ...prev, [key]: undefined as any }));

    try {
      const resp = await api.post('/test-proxy', { proxy: val });
      const data = resp.data;
      if (data.status === 'success') {
        setProxyTestResult(prev => ({
          ...prev,
          [key]: {
            success: true,
            message: data.message,
            ip: data.ip,
            location: data.location
          }
        }));
        toast.success(`${key === 'proxy1' ? '代理 1' : '代理 2'} 连通测试成功！IP: ${data.ip}`);
      } else {
        setProxyTestResult(prev => ({
          ...prev,
          [key]: {
            success: false,
            message: data.message || '测试失败'
          }
        }));
        toast.error(data.message || '代理连通测试失败');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || '代理连通测试失败';
      setProxyTestResult(prev => ({
        ...prev,
        [key]: {
          success: false,
          message: msg
        }
      }));
      toast.error(msg);
    } finally {
      setTestingProxy(prev => ({ ...prev, [key]: false }));
    }
  };
  
  // Telegram Webhook 相关状态
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookInfo, setWebhookInfo] = useState<any>(null);
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const [isLoadingWebhookInfo, setIsLoadingWebhookInfo] = useState(false);
  const [showErrorHistoryDialog, setShowErrorHistoryDialog] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);
  const [ovhAuthValid, setOvhAuthValid] = useState<boolean | null>(null);

  useEffect(() => {
    setFormValues(prev => ({
      ...prev,
      apiSecretKey: getApiSecretKey() || "",
      tgToken: tgToken || "",
      tgChatId: tgChatId || ""
    }));
  }, [tgToken, tgChatId]);

  // 加载后端设置
  useEffect(() => {
    (async () => {
      try {
        const resp = await api.get('/settings');
        const cfg = resp.data || {};
        setFormValues(prev => ({
          ...prev,
          sshKey: cfg.sshKey || "",
          proxy1: cfg.proxy1 || "",
          proxy2: cfg.proxy2 || "",
          tgToken: cfg.tgToken || prev.tgToken || "",
          tgChatId: cfg.tgChatId || prev.tgChatId || "",
          defaultRetryInterval: cfg.defaultRetryInterval ? String(cfg.defaultRetryInterval) : "30",
        }));
      } catch {}
    })();
  }, []);

  // 加载 Webhook 信息（可选功能，失败不显示错误）
  const loadWebhookInfo = async () => {
    if (!tgToken) {
      // 没有token时，不尝试加载
      setIsLoadingWebhookInfo(false);
      return;
    }
    
    setIsLoadingWebhookInfo(true);
    try {
      const response = await api.get('/telegram/get-webhook-info');
      const data = response.data;
      if (data.success && data.webhook_info) {
        setWebhookInfo(data.webhook_info);
        if (data.webhook_info.url) {
          setWebhookUrl(data.webhook_info.url.replace('/api/telegram/webhook', ''));
        }
      }
    } catch (error: any) {
      // 静默失败，webhook是可选的
      console.log('Webhook 功能未配置或不可用（这是可选的）');
      setWebhookInfo(null);
    } finally {
      setIsLoadingWebhookInfo(false);
    }
  };

  // 自动检测 Webhook URL（使用当前页面的域名）
  const autoDetectWebhookUrl = () => {
    const currentUrl = window.location.origin;
    setWebhookUrl(currentUrl);
  };

  // 设置 Webhook
  const handleSetWebhook = async () => {
    if (!tgToken) {
      toast.error('请先配置 Telegram Bot Token');
      return;
    }
    
    if (!webhookUrl.trim()) {
      toast.error('请输入 Webhook URL');
      return;
    }

    if (!webhookUrl.startsWith('https://')) {
      toast.error('Webhook URL 必须为 HTTPS，例如：https://your-domain.com');
      return;
    }

    setIsSettingWebhook(true);
    try {
      const response = await api.post('/telegram/set-webhook', {
        webhook_url: webhookUrl
      });
      
      const data = response.data;
      
      if (data.success) {
        toast.success('Webhook 设置成功！');
        setWebhookInfo(data.webhook_info);
        // 重新加载信息
        await loadWebhookInfo();
      } else {
        toast.error(data.error || '设置失败');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || '未知错误';
      toast.error('设置失败：' + errorMsg);
    } finally {
      setIsSettingWebhook(false);
    }
  };

  // 组件加载时获取 Webhook 信息
  useEffect(() => {
    if (tgToken) {
      loadWebhookInfo();
      autoDetectWebhookUrl();
    }
  }, [tgToken]);

  // 计算错误信息辅助函数
  const getErrorInfo = () => {
    if (!webhookInfo?.last_error_date) return null;
    
    const errorDate = new Date(webhookInfo.last_error_date * 1000);
    const now = new Date();
    const msSinceError = now.getTime() - errorDate.getTime();
    const hoursSinceError = msSinceError / (1000 * 60 * 60);
    const daysSinceError = msSinceError / (1000 * 60 * 60 * 24);
    const isRecentError = hoursSinceError < 24;
    
    const formatRelativeTime = () => {
      if (hoursSinceError < 1) {
        const minutes = Math.floor(msSinceError / (1000 * 60));
        return `${minutes}分钟前`;
      } else if (hoursSinceError < 24) {
        return `${Math.floor(hoursSinceError)}小时前`;
      } else if (daysSinceError < 7) {
        return `${Math.floor(daysSinceError)}天前`;
      } else {
        return errorDate.toLocaleDateString('zh-CN');
      }
    };
    
    return {
      errorDate,
      isRecentError,
      formatRelativeTime,
      hoursSinceError,
      daysSinceError
    };
  };

  useEffect(() => {
    (async () => {
      try {
        const key = getApiSecretKey();
        if (!key) {
          setApiKeyValid(false);
        } else {
          await api.get('/settings');
          setApiKeyValid(true);
        }
      } catch {
        setApiKeyValid(false);
      }
    })();
  }, []);

  

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value
    });
  };

  // Toggle password visibility
  const toggleShowValue = (field: keyof typeof showValues) => {
    setShowValues({
      ...showValues,
      [field]: !showValues[field]
    });
  };

  // Save settings
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate API Secret Key
    if (!formValues.apiSecretKey) {
      toast.error("请设置访问密码");
      return;
    }
    
    setIsSaving(true);
    try {
      // 1. 先保存访问密码到 localStorage（这个总是要保存的）
      setApiSecretKey(formValues.apiSecretKey);
      
      // 等待一下确保 localStorage 写入完成
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        const retryVal = parseInt(formValues.defaultRetryInterval) || 30;
        await api.post('/settings', {
          tgToken: formValues.tgToken || undefined,
          tgChatId: formValues.tgChatId || undefined,
          sshKey: formValues.sshKey || undefined,
          proxy1: formValues.proxy1 || "",
          proxy2: formValues.proxy2 || "",
          defaultRetryInterval: retryVal,
        });
        // 立即同步代理和间隔到全局 context，无需刷新页面
        await refreshSettings();
        toast.success("系统配置与代理设置已保存");
      } catch (err) {
        toast.error("保存代理与系统配置失败");
      }
      setTimeout(() => { window.location.reload(); }, 800);
      // 无论是否有OVH配置，确保SSH设置已同步保存
      try {
        await api.post('/settings', {
          sshKey: formValues.sshKey || undefined
        });
      } catch {}
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("保存设置失败");
      setIsSaving(false);
    }
  };

  

  return (
    <div className="space-y-4 sm:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold mb-1 cyber-glow-text`}>设置</h1>
        <p className="text-cyber-muted text-sm mb-4 sm:mb-6">配置访问密码和通知设置</p>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin w-10 h-10 border-4 border-cyber-accent border-t-transparent rounded-full"></div>
          <span className="ml-3 text-cyber-muted">加载中...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="cyber-panel p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* 访问密码 */}
              <div>
                <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold mb-3 sm:mb-4`}>🔐 访问密码</h2>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                  <p className="text-xs text-yellow-300">
                    ⚠️ 此密码用于保护前后端通信和面板访问，需要与后端配置保持一致。请妥善保管，不要泄露！
                  </p>
                </div>
                
                <div>
                  <label className="block text-cyber-muted mb-1 text-xs sm:text-sm">
                    访问密码 <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showValues.apiSecretKey ? "text" : "password"}
                      name="apiSecretKey"
                      value={formValues.apiSecretKey}
                      onChange={handleChange}
                      className="cyber-input w-full pr-10 text-sm"
                      placeholder="输入访问密码（在Docker设置的environment或后端.env文件中的API_SECRET_KEY）"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowValue("apiSecretKey")}
                      className="absolute inset-y-0 right-0 px-3 text-cyber-muted hover:text-cyber-accent"
                    >
                      {showValues.apiSecretKey ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                          <line x1="1" y1="1" x2="23" y2="23"></line>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="text-xs text-cyan-400 mt-2 space-y-1">
                    <p>💡 请在Docker的 <code className="bg-cyan-500/20 px-1 py-0.5 rounded">environment</code> 参数或 <code className="bg-cyan-500/20 px-1 py-0.5 rounded">backend/.env</code> 文件中查找 <code className="bg-cyan-500/20 px-1 py-0.5 rounded">API_SECRET_KEY</code> 的值并复制到此处</p>
                    <p className="text-purple-300">
                      <strong>双重用途：</strong>① 前后端通信安全验证  ② 面板访问密码
                    </p>
                    <p className="text-yellow-300">
                      ⚡ <strong>非首次配置？</strong>只需填写访问密码并保存，即可快速解锁进入面板（其他字段无需填写）
                    </p>
                  </div>
                </div>
              </div>
              
              

              {/* SSH 公钥（全局） */}
              <div className="cyber-grid-line pt-4">
                <h2 className="text-xl font-bold mb-4">全局 SSH公钥 (可选)</h2>
                <p className="text-xs text-cyber-muted mb-2">为所有账户的Linux系统安装统一预置SSH免密登录公钥</p>
                <textarea
                  name="sshKey"
                  value={formValues.sshKey}
                  onChange={handleChange}
                  placeholder="ssh-rsa 或 ssh-ed25519 公钥行（完整）"
                  className="cyber-input w-full h-24"
                />
                <p className="text-xs text-cyan-400 mt-1">Windows 模板不适用 SSH 公钥（会被忽略）</p>
              </div>

              {/* SOCKS5 下单代理设置 */}
              <div className="cyber-grid-line pt-4">
                <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <span>🌐</span> 指定下单 SOCKS5 代理 (最多2个)
                </h2>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  OVH 下单时会检查 IP 归属。代理仅在触发下单时使用，API 监控时不消耗代理流量。
                  <br />
                  <span className="text-sky-600 font-medium">💡 格式说明：</span>支持 <code className="bg-slate-100 text-sky-700 px-1 py-0.5 rounded">socks5://user:pass@ip:port</code> 或 <code className="bg-slate-100 text-sky-700 px-1 py-0.5 rounded">socks5://ip:1080</code>。如果填入包含 root 密码的地址，请确保 VPS 已搭建 SOCKS5 服务或完成了端口转发。
                </p>

                <div className="space-y-4">
                  {/* 代理 1 */}
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-slate-700 text-xs sm:text-sm font-semibold">
                        代理 1 (Proxy 1)
                      </label>
                      <button
                        type="button"
                        onClick={() => testProxyConnection('proxy1')}
                        disabled={testingProxy['proxy1'] || !formValues.proxy1.trim()}
                        className="px-3 py-1 text-xs rounded bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors shadow-sm disabled:opacity-40 flex items-center gap-1"
                      >
                        {testingProxy['proxy1'] ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            测试中...
                          </>
                        ) : (
                          <>⚡ 测试连通</>
                        )}
                      </button>
                    </div>
                    <input
                      type="text"
                      name="proxy1"
                      value={formValues.proxy1}
                      onChange={handleChange}
                      placeholder="socks5://user:password@103.97.200.12:1080 或 socks5://103.97.200.12:1080"
                      className="cyber-input w-full text-sm font-mono"
                    />
                    {proxyTestResult['proxy1'] && (
                      <div className={`mt-2 p-2.5 rounded text-xs leading-relaxed ${
                        proxyTestResult['proxy1'].success 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                        <div className="font-semibold flex items-center gap-1">
                          {proxyTestResult['proxy1'].success ? '✅' : '❌'} {proxyTestResult['proxy1'].message}
                        </div>
                        {proxyTestResult['proxy1'].ip && (
                          <div className="mt-1 font-mono text-[11px] text-emerald-700">
                            📍 出站 IP: {proxyTestResult['proxy1'].ip} ({proxyTestResult['proxy1'].location})
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 代理 2 */}
                  <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-slate-700 text-xs sm:text-sm font-semibold">
                        代理 2 (Proxy 2)
                      </label>
                      <button
                        type="button"
                        onClick={() => testProxyConnection('proxy2')}
                        disabled={testingProxy['proxy2'] || !formValues.proxy2.trim()}
                        className="px-3 py-1 text-xs rounded bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors shadow-sm disabled:opacity-40 flex items-center gap-1"
                      >
                        {testingProxy['proxy2'] ? (
                          <>
                            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            测试中...
                          </>
                        ) : (
                          <>⚡ 测试连通</>
                        )}
                      </button>
                    </div>
                    <input
                      type="text"
                      name="proxy2"
                      value={formValues.proxy2}
                      onChange={handleChange}
                      placeholder="socks5://user:password@5.6.7.8:1080 或 socks5://5.6.7.8:1080"
                      className="cyber-input w-full text-sm font-mono"
                    />
                    {proxyTestResult['proxy2'] && (
                      <div className={`mt-2 p-2.5 rounded text-xs leading-relaxed ${
                        proxyTestResult['proxy2'].success 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                        <div className="font-semibold flex items-center gap-1">
                          {proxyTestResult['proxy2'].success ? '✅' : '❌'} {proxyTestResult['proxy2'].message}
                        </div>
                        {proxyTestResult['proxy2'].ip && (
                          <div className="mt-1 font-mono text-[11px] text-emerald-700">
                            📍 出站 IP: {proxyTestResult['proxy2'].ip} ({proxyTestResult['proxy2'].location})
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 全局默认等待时间 */}
              <div className="cyber-grid-line pt-4">
                <h2 className="text-xl font-bold mb-2">⏱️ 全局默认检测间隔 (秒)</h2>
                <p className="text-xs text-cyber-muted mb-4">
                  抢购队列新任务的默认重试间隔秒数。建议 ≥ 15 秒，过小会触发 OVH API 限速。
                </p>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    name="defaultRetryInterval"
                    value={formValues.defaultRetryInterval}
                    onChange={handleChange}
                    min={5}
                    max={3600}
                    step={1}
                    className="cyber-input w-48 text-sm font-mono"
                    placeholder="默认: 30"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-cyber-muted">
                      当前: <span className="text-cyan-400 font-mono font-semibold">{formValues.defaultRetryInterval} 秒</span>
                      {Number(formValues.defaultRetryInterval) < 15 && (
                        <span className="ml-2 text-yellow-400">⚠️ 建议 ≥ 15 秒</span>
                      )}
                    </span>
                    <div className="flex gap-2">
                      {[15, 30, 60].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setFormValues(prev => ({ ...prev, defaultRetryInterval: String(v) }))}
                          className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                            Number(formValues.defaultRetryInterval) === v
                              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                              : 'border-slate-600/50 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400'
                          }`}
                        >
                          {v}s
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="cyber-grid-line pt-4">
                <h2 className="text-xl font-bold mb-4">📱 Telegram 通知设置 (可选)</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-cyber-muted mb-1">
                      Telegram Bot Token
                    </label>
                    <div className="relative">
                      <input
                        type={showValues.tgToken ? "text" : "password"}
                        name="tgToken"
                        value={formValues.tgToken}
                        onChange={handleChange}
                        className="cyber-input w-full pr-10"
                        placeholder="123456789:ABCDEFGH..."
                      />
                      <button
                        type="button"
                        onClick={() => toggleShowValue("tgToken")}
                        className="absolute inset-y-0 right-0 px-3 text-cyber-muted hover:text-cyber-accent"
                      >
                        {showValues.tgToken ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-cyber-muted mb-1">
                      Telegram Chat ID
                    </label>
                    <input
                      type="text"
                      name="tgChatId"
                      value={formValues.tgChatId}
                      onChange={handleChange}
                      className="cyber-input w-full"
                      placeholder="-100123456789"
                    />
                  </div>

                  {/* Telegram Webhook 设置 */}
                  <div className="cyber-grid-line pt-4 mt-4">
                    <h3 className="text-lg font-semibold mb-3">📱 Telegram Webhook 设置 (可选)</h3>
                    <p className="text-xs text-cyber-muted mb-4">
                      设置 Webhook 后，当服务器有货时可以在 Telegram 中直接点击按钮加入抢购队列
                    </p>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-cyber-muted mb-1 text-sm">
                          Webhook URL（自动检测当前域名，可手动修改）
                        </label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            className="cyber-input flex-1 min-w-0"
                            placeholder="https://your-domain.com"
                          />
                          <button
                            type="button"
                            onClick={autoDetectWebhookUrl}
                            className="cyber-button px-3 sm:px-4 whitespace-nowrap flex-shrink-0 text-xs sm:text-sm"
                            title="自动检测当前域名"
                          >
                            自动检测
                          </button>
                        </div>
                        <p className="text-xs text-cyber-muted mt-1 break-words">
                          完整 URL 将自动添加：{webhookUrl || 'https://your-domain.com'}/api/telegram/webhook
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={handleSetWebhook}
                          disabled={isSettingWebhook || !tgToken}
                          className="cyber-button flex-1 text-xs sm:text-sm"
                        >
                          {isSettingWebhook ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              设置中...
                            </span>
                          ) : (
                            '设置 Webhook'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={loadWebhookInfo}
                          disabled={isLoadingWebhookInfo || !tgToken}
                          className="cyber-button px-3 sm:px-4 flex-shrink-0 text-xs sm:text-sm"
                          title="刷新状态"
                        >
                          {isLoadingWebhookInfo ? (
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            '刷新'
                          )}
                        </button>
                      </div>

                      {/* 显示 Webhook 状态 */}
                      {webhookInfo && (
                        <div className="bg-gradient-to-br from-cyber-dark/50 to-cyber-dark/30 border border-cyber-accent/20 rounded-lg p-3 sm:p-4 space-y-3">
                          <div className="flex items-center justify-between pb-3 border-b border-cyber-accent/10">
                            <span className="text-xs sm:text-sm text-cyber-muted font-medium">当前状态</span>
                            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${
                              webhookInfo.url 
                                ? 'bg-green-500/20 border border-green-500/40' 
                                : 'bg-yellow-500/20 border border-yellow-500/40'
                            }`}>
                              {webhookInfo.url ? (
                                <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                              )}
                              <span className={`text-xs sm:text-sm font-medium ${
                                webhookInfo.url ? 'text-green-400' : 'text-yellow-400'
                              }`}>
                                {webhookInfo.url ? '已设置' : '未设置'}
                              </span>
                            </div>
                          </div>
                          
                          {webhookInfo.url && (
                            <>
                              <div>
                                <span className="text-xs text-cyber-muted block mb-1.5 font-medium">Webhook URL</span>
                                <code className="text-xs sm:text-sm bg-cyber-dark/80 p-2 rounded border border-cyber-accent/10 block break-all font-mono leading-relaxed">
                                  {webhookInfo.url}
                                </code>
                              </div>
                              
                              {webhookInfo.pending_update_count !== undefined && (
                                <div className="flex items-center justify-between p-2 bg-cyber-dark/30 rounded border border-cyber-accent/10">
                                  <span className="text-xs text-cyber-muted">待处理更新</span>
                                  <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                                    webhookInfo.pending_update_count === 0
                                      ? 'bg-green-500/20 text-green-400'
                                      : 'bg-yellow-500/20 text-yellow-400'
                                  }`}>
                                    {webhookInfo.pending_update_count}
                                  </span>
                                </div>
                              )}
                              
                              {webhookInfo.last_error_date && (() => {
                                const errorInfo = getErrorInfo();
                                if (!errorInfo) return null;
                                
                                return (
                                  <button
                                    type="button"
                                    onClick={() => setShowErrorHistoryDialog(true)}
                                    className={`w-full mt-2 border rounded-lg p-3 transition-all text-left hover:opacity-80 ${
                                      errorInfo.isRecentError
                                        ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/15'
                                        : 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/15'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <div className="flex items-center gap-1.5">
                                        <FileText className={`w-3.5 h-3.5 ${
                                          errorInfo.isRecentError ? 'text-red-400' : 'text-yellow-400'
                                        }`} />
                                        <span className={`text-xs font-semibold ${
                                          errorInfo.isRecentError ? 'text-red-400' : 'text-yellow-400'
                                        }`}>
                                          {errorInfo.isRecentError ? '⚠️ 最后错误' : '📋 历史错误'}
                                        </span>
                                      </div>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                        errorInfo.isRecentError
                                          ? 'bg-red-500/20 text-red-300'
                                          : 'bg-yellow-500/20 text-yellow-300'
                                      }`}>
                                        {errorInfo.formatRelativeTime()}
                                      </span>
                                    </div>
                                    <div className="text-xs text-cyber-muted mt-1">
                                      点击查看详细信息
                                    </div>
                                  </button>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      )}

                      {!tgToken && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
                          <p className="text-xs text-yellow-300">
                            ⚠️ 请先配置 Telegram Bot Token 才能设置 Webhook（此功能为可选）
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="cyber-button px-6"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-cyber-text" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      保存中...
                    </span>
                  ) : "保存设置"}
                </button>
              </div>
            </form>
          </div>
          
          <div>
            <div className="cyber-panel p-6">
              <h2 className="text-lg font-bold mb-4">连接状态</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${apiKeyValid ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className={`${apiKeyValid ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'} text-sm`}>访问密码</span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">{apiKeyValid === null ? '检测中...' : apiKeyValid ? '✅ 已通过' : '❌ 未设置或不匹配'}</span>
                </div>
                
                
                <div className="cyber-grid-line pt-4">
                  <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-sky-700 font-bold mb-1.5">🔐 快速解锁提示</p>
                    <p className="text-xs text-sky-800 leading-relaxed">
                      如果您已完成初次配置，本页面还可作为<strong>面板解锁功能</strong>使用。只需输入 <strong>访问密码</strong>（其他字段可不填），点击保存即可进入面板。
                    </p>
                  </div>
                  
                </div>
              </div>
            </div>
            
            {/* 缓存管理器 */}
            <div className="mt-6">
              <CacheManager />
            </div>

          </div>
        </div>
      )}

      {/* 错误历史模态框 */}
      {createPortal(
        <AnimatePresence>
          {showErrorHistoryDialog && webhookInfo?.last_error_date && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowErrorHistoryDialog(false)}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-auto"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="cyber-card max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto relative"
              >
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-cyber-accent/20">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-xl font-semibold text-cyber-text">
                      {(() => {
                        const errorInfo = getErrorInfo();
                        return errorInfo?.isRecentError ? '最后错误' : '历史错误';
                      })()}
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowErrorHistoryDialog(false)}
                    className="p-2 hover:bg-cyber-grid/50 rounded-lg transition-colors text-cyber-muted hover:text-cyber-text"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {(() => {
                    const errorInfo = getErrorInfo();
                    if (!errorInfo) return null;
                    
                    const hasNoPendingUpdates = webhookInfo.pending_update_count === 0;
                    
                    return (
                      <div className={`border rounded-lg p-4 transition-all ${
                        errorInfo.isRecentError 
                          ? 'bg-red-500/10 border-red-500/30' 
                          : 'bg-yellow-500/10 border-yellow-500/30'
                      }`}>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-semibold ${
                              errorInfo.isRecentError ? 'text-red-400' : 'text-yellow-400'
                            }`}>
                              {errorInfo.isRecentError ? '⚠️' : '📋'} {errorInfo.isRecentError ? '最后错误' : '历史错误'}
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            errorInfo.isRecentError 
                              ? 'bg-red-500/20 text-red-300' 
                              : 'bg-yellow-500/20 text-yellow-300'
                          }`}>
                            {errorInfo.formatRelativeTime()}
                          </span>
                        </div>
                        
                        <div className={`text-sm font-mono mb-3 ${
                          errorInfo.isRecentError ? 'text-red-300/80' : 'text-yellow-300/80'
                        }`}>
                          {errorInfo.errorDate.toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false
                          })}
                        </div>
                        
                        {webhookInfo.last_error_message && (
                          <div className={`text-sm leading-relaxed break-words p-3 rounded bg-black/20 mb-3 ${
                            errorInfo.isRecentError ? 'text-red-200' : 'text-yellow-200'
                          }`}>
                            {webhookInfo.last_error_message}
                          </div>
                        )}
                        
                        {!errorInfo.isRecentError && hasNoPendingUpdates && (
                          <div className="text-sm text-green-300/90 pt-3 border-t border-yellow-500/20 flex items-start gap-2">
                            <span className="text-base">💡</span>
                            <span>待处理更新为 0，Webhook 可能已恢复正常。如需清除此错误记录，请重新设置 Webhook。</span>
                          </div>
                        )}
                        
                        {errorInfo.isRecentError && (
                          <div className="text-sm text-red-300/80 pt-3 border-t border-red-500/20 flex items-start gap-2">
                            <span className="text-base">🔍</span>
                            <span>这是最近的错误，请检查 Webhook 配置和服务器状态。</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default SettingsPage;
  
