import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/utils/apiClient';
import { toast } from 'sonner';

// 创建一个事件总线，用于在API认证状态变化时通知其他组件
export const apiEvents = {
  onAuthChanged: (callback: (isAuthenticated: boolean) => void) => {
    window.addEventListener('api-auth-changed', ((e: CustomEvent) => callback(e.detail)) as EventListener);
    return () => window.removeEventListener('api-auth-changed', ((e: CustomEvent) => callback(e.detail)) as EventListener);
  },
  emitAuthChanged: (isAuthenticated: boolean) => {
    window.dispatchEvent(new CustomEvent('api-auth-changed', { detail: isAuthenticated }));
  }
};

// Define API Context structure
interface APIContextType {
  appKey: string;
  appSecret: string;
  consumerKey: string;
  endpoint: string;
  tgToken: string;
  tgChatId: string;
  iam: string;
  zone: string;
  proxy1: string;
  proxy2: string;
  defaultRetryInterval: number;
  isLoading: boolean;
  isAuthenticated: boolean;
  setAPIKeys: (keys: APIKeysType) => Promise<void>;
  checkAuthentication: () => Promise<boolean>;
  accounts: any[];
  currentAccountId: string;
  setCurrentAccount: (id: string) => Promise<void>;
  refreshAccounts: () => Promise<void>;
  accountStatuses: Record<string, { valid: boolean; error?: string }>;
  refreshAccountStatuses: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

interface APIKeysType {
  appKey: string;
  appSecret: string;
  consumerKey: string;
  endpoint?: string;
  tgToken?: string;
  tgChatId?: string;
  iam?: string;
  zone?: string;
  proxy1?: string;
  proxy2?: string;
  defaultRetryInterval?: number;
}

// Create the API Context
const APIContext = createContext<APIContextType | undefined>(undefined);

// Context Provider Component
export const API_Provider = ({ children }: { children: ReactNode }) => {
  const [appKey, setAppKey] = useState<string>('');
  const [appSecret, setAppSecret] = useState<string>('');
  const [consumerKey, setConsumerKey] = useState<string>('');
  const [endpoint, setEndpoint] = useState<string>('ovh-eu');
  const [tgToken, setTgToken] = useState<string>('');
  const [tgChatId, setTgChatId] = useState<string>('');
  const [iam, setIam] = useState<string>('go-ovh-ie');
  const [zone, setZone] = useState<string>('IE');
  const [proxy1, setProxy1] = useState<string>('');
  const [proxy2, setProxy2] = useState<string>('');
  const [defaultRetryInterval, setDefaultRetryInterval] = useState<number>(30);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [currentAccountId, setCurrentAccountIdState] = useState<string>('');
  const [accountStatuses, setAccountStatuses] = useState<Record<string, { valid: boolean; error?: string }>>({});

  // 加载后端设置（含代理和默认间隔）
  const loadSettings = async () => {
    try {
      const apiKey = localStorage.getItem('api_secret_key');
      if (!apiKey) {
        console.log('未设置 API 安全密钥，跳过配置加载');
        setIsLoading(false);
        return;
      }

      const response = await api.get(`/settings`);
      const data = response.data;

      // 始终加载 Telegram 设置
      setTgToken(data?.tgToken || '');
      setTgChatId(data?.tgChatId || '');

      // 加载代理设置（全局复用）
      setProxy1(data?.proxy1 || '');
      setProxy2(data?.proxy2 || '');

      // 加载全局默认重试间隔
      if (data?.defaultRetryInterval && Number(data.defaultRetryInterval) > 0) {
        setDefaultRetryInterval(Number(data.defaultRetryInterval));
      }

      // 仅当存在全局（旧）OVH设置时才填充这些字段
      if (data && data.appKey) {
        setAppKey(data.appKey);
        setAppSecret(data.appSecret);
        setConsumerKey(data.consumerKey);
        setEndpoint(data.endpoint || 'ovh-eu');
        setIam(data.iam || 'go-ovh-ie');
        setZone(data.zone || 'IE');

        setIsAuthenticated(true);
        apiEvents.emitAuthChanged(true);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
      setIsAuthenticated(false);
      apiEvents.emitAuthChanged(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Load API keys from backend on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // 供外部调用：刷新设置（例如保存后立即同步代理/间隔到 context）
  const refreshSettings = async (): Promise<void> => {
    await loadSettings();
  };

  const refreshAccountStatuses = async (): Promise<void> => {
    try {
      const res = await api.get('/accounts/status');
      const arr: any[] = res.data?.accounts || [];
      const map: Record<string, { valid: boolean; error?: string }> = {};
      for (const it of arr) {
        if (it && it.id) map[it.id] = { valid: !!it.valid, error: it.error };
      }
      if (arr.length === 0 && accounts.length > 0) {
        for (const acc of accounts) {
          map[acc.id] = { valid: false, error: '状态不可用' };
        }
      }
      setAccountStatuses(map);
    } catch (e: any) {
      const map: Record<string, { valid: boolean; error?: string }> = {};
      for (const acc of accounts) {
        map[acc.id] = { valid: false, error: e?.response?.data?.error || e?.message || '检查失败' };
      }
      setAccountStatuses(map);
    }
  };

  const refreshAccounts = async (): Promise<void> => {
    try {
      const res = await api.get('/accounts');
      const list = res.data?.accounts || [];
      setAccounts(list);
      const local = localStorage.getItem('current_account_id');
      const useId = local || (list.length > 0 ? list[0].id : '');
      if (useId) {
        setCurrentAccountIdState(useId);
        localStorage.setItem('current_account_id', useId);
        try { await checkAuthentication(); } catch {}
      }
      try { await refreshAccountStatuses(); } catch {}
    } catch (e: any) {
      setAccounts([]);
      const msg = e?.response?.data?.error || '无法获取账户列表，请先在“系统设置”配置访问密钥';
      try { (window as any).console?.warn(msg); } catch {}
    }
  };

  useEffect(() => {
    refreshAccounts();
  }, []);

  useEffect(() => {
    if (accounts && accounts.length > 0) {
      (async () => { try { await refreshAccountStatuses(); } catch {} })();
    }
  }, [accounts.map(a => a.id).join('|')]);

  // Save API keys to backend
  const setAPIKeys = async (keys: APIKeysType): Promise<void> => {
    setIsLoading(true);
    try {
      await api.post(`/settings`, {
        appKey: keys.appKey,
        appSecret: keys.appSecret,
        consumerKey: keys.consumerKey,
        endpoint: keys.endpoint || 'ovh-eu',
        tgToken: keys.tgToken || '',
        tgChatId: keys.tgChatId || '',
        iam: keys.iam || 'go-ovh-ie',
        zone: keys.zone || 'IE',
        proxy1: keys.proxy1 || '',
        proxy2: keys.proxy2 || '',
        defaultRetryInterval: keys.defaultRetryInterval || 30
      });
      
      setAppKey(keys.appKey);
      setAppSecret(keys.appSecret);
      setConsumerKey(keys.consumerKey);
      setEndpoint(keys.endpoint || 'ovh-eu');
      setTgToken(keys.tgToken || '');
      setTgChatId(keys.tgChatId || '');
      setIam(keys.iam || 'go-ovh-ie');
      setZone(keys.zone || 'IE');
      setProxy1(keys.proxy1 || '');
      setProxy2(keys.proxy2 || '');
      setDefaultRetryInterval(keys.defaultRetryInterval || 30);
      
      setIsAuthenticated(true);
      apiEvents.emitAuthChanged(true);
      toast.success('API设置已保存');
    } catch (error) {
      console.error('Failed to save API keys:', error);
      toast.error('保存API设置失败');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Check authentication status with backend
  const checkAuthentication = async (): Promise<boolean> => {
    try {
      const response = await api.post(`/verify-auth`, {
        appKey,
        appSecret,
        consumerKey,
        endpoint
      });
      
      const isValid = response.data.valid;
      setIsAuthenticated(isValid);
      apiEvents.emitAuthChanged(isValid);
      return isValid;
    } catch (error) {
      console.error('Authentication check failed:', error);
      setIsAuthenticated(false);
      apiEvents.emitAuthChanged(false);
      return false;
    }
  };

  const setCurrentAccount = async (id: string): Promise<void> => {
    setCurrentAccountIdState(id);
    localStorage.setItem('current_account_id', id);
    try {
      const ok = await checkAuthentication();
      if (ok) {
        toast.success('账户已切换');
      } else {
        toast.warning('账户切换后认证失败');
      }
    } catch {
      toast.error('账户切换失败');
    }
  };

  const value = {
    appKey,
    appSecret,
    consumerKey,
    endpoint,
    tgToken,
    tgChatId,
    iam,
    zone,
    proxy1,
    proxy2,
    defaultRetryInterval,
    isLoading,
    isAuthenticated,
    setAPIKeys,
    checkAuthentication,
    accounts,
    currentAccountId,
    setCurrentAccount,
    refreshAccounts,
    accountStatuses,
    refreshAccountStatuses,
    refreshSettings,
  };

  return <APIContext.Provider value={value}>{children}</APIContext.Provider>;
};

  // Custom hook to use the API context
  export const useAPI = (): APIContextType => {
    const context = useContext(APIContext);
    if (context === undefined) {
      throw new Error('useAPI must be used within an APIProvider');
    }
    return context;
  };
