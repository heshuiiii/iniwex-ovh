import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RefreshCw, Search, Database, Filter, Download, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import apiClient from '@/utils/apiClient';
import { useIsMobile } from '@/hooks/use-mobile';
import { OVH_DATACENTERS } from '@/config/ovhConstants';

/**
 * OVH 数据中心可用性查询页面
 * 直接调用 OVH 公开 API（无需认证）
 * 根据后端配置的 endpoint 自动选择对应的区域 API：
 * - EU: https://eu.api.ovh.com/v1/dedicated/server/datacenter/availabilities
 * - US: https://api.us.ovhcloud.com/v1/dedicated/server/datacenter/availabilities
 * - CA: https://ca.api.ovh.com/v1/dedicated/server/datacenter/availabilities
 */

interface DatacenterInfo {
  datacenter: string;
  availability: string;
}

interface AvailabilityItem {
  fqn: string;
  memory: string;
  planCode: string;
  server: string;
  storage: string;
  systemStorage?: string;
  datacenters: DatacenterInfo[];
}

const OVHAvailabilityPage = () => {
  const isMobile = useIsMobile();
  const [availabilities, setAvailabilities] = useState<AvailabilityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false); // 区分初始加载和刷新
  const [isConfigLoading, setIsConfigLoading] = useState(true); // 配置加载状态
  const [endpoint, setEndpoint] = useState<string>('');
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('');
  // 使用ref保存上一次的数据，防止刷新时短暂显示"暂无数据"
  const prevAvailabilitiesRef = useRef<AvailabilityItem[]>([]);
  
  // 搜索和过滤
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterDatacenter, setFilterDatacenter] = useState('all');
  const [filterAvailability, setFilterAvailability] = useState('all');
  const [filterMemory, setFilterMemory] = useState('all');
  
  // 排序
  const [sortBy, setSortBy] = useState<'planCode' | 'memory' | 'availability'>('planCode');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // 分页
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = isMobile ? 20 : 50;
  
  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // 搜索时重置页码
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // 过滤条件改变时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDatacenter, filterAvailability, filterMemory, sortBy, sortOrder]);

  // 根据 endpoint 获取对应的 API 基础地址
  const getApiBaseUrl = (endpoint: string): string => {
    switch (endpoint) {
      case 'ovh-us':
        return 'https://api.us.ovhcloud.com';
      case 'ovh-ca':
        return 'https://ca.api.ovh.com';
      case 'ovh-eu':
      default:
        return 'https://eu.api.ovh.com';
    }
  };

  // 获取所有可用性数据
  const fetchAvailabilities = useCallback(async (isRefresh = false) => {
    if (!apiBaseUrl) return;
    
    // 如果是刷新且有数据，只设置刷新状态，保留旧数据
    const hasExistingData = prevAvailabilitiesRef.current.length > 0;
    if (isRefresh && hasExistingData) {
      setIsRefreshing(true);
      // 刷新时不清空数据，保持旧数据可见
    } else {
      setIsLoading(true);
    }
    try {
      const apiUrl = `${apiBaseUrl}/v1/dedicated/server/datacenter/availabilities`;
      // 只在非刷新时显示提示，避免频繁提示
      if (!isRefresh) {
        toast.info('正在从 OVH 公开 API 获取数据...', { duration: 2000 });
      }
      
      console.log(`正在从 ${apiUrl} 获取数据...`);
      
      // 直接调用 OVH 公开 API（无需认证）
      const response = await axios.get(apiUrl, {
        timeout: 30000
      });
      
      console.log('OVH API 返回数据:', response.data);
      // 先更新状态，确保数据立即可用
      const newData = Array.isArray(response.data) ? response.data : [];
      
      // 保存到ref，用于渲染时的备用检查
      prevAvailabilitiesRef.current = newData;
      
      // 更新数据状态（React会自动批处理状态更新）
      setAvailabilities(newData);
      
      // 只在非刷新时显示成功提示，避免频繁提示
      if (!isRefresh && newData.length > 0) {
        toast.success(`成功获取 ${newData.length} 条可用性记录`);
      } else if (isRefresh && newData.length > 0 && hasExistingData) {
        // 刷新成功但静默更新，不显示提示
      }
    } catch (error: any) {
      console.error('获取 OVH 数据失败:', error);
      
      let errorMessage = '获取数据失败';
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = '请求超时，请重试';
      } else if (error.message) {
        errorMessage = `获取数据失败: ${error.message}`;
      }
      
      toast.error(errorMessage);
    } finally {
      // 确保加载状态在最后更新
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [apiBaseUrl]);

  // 获取 endpoint 配置
  const fetchEndpointConfig = useCallback(async () => {
    setIsConfigLoading(true);
    try {
      const response = await apiClient.get('/endpoint-config');
      const configEndpoint = response.data.endpoint || 'ovh-eu';
      setEndpoint(configEndpoint);
      const baseUrl = getApiBaseUrl(configEndpoint);
      setApiBaseUrl(baseUrl);
      console.log(`✅ 使用 OVH API: ${configEndpoint} - ${baseUrl}`);
    } catch (error) {
      console.error('获取 endpoint 配置失败，使用默认值 ovh-eu:', error);
      setEndpoint('ovh-eu');
      setApiBaseUrl('https://eu.api.ovh.com');
      toast.error('获取区域配置失败，使用默认欧洲区域');
    } finally {
      setIsConfigLoading(false);
    }
  }, []);

  // 初始加载：先获取 endpoint 配置，再获取数据
  useEffect(() => {
    fetchEndpointConfig();
  }, [fetchEndpointConfig]);

  // 当 apiBaseUrl 改变时，获取数据
  useEffect(() => {
    if (apiBaseUrl) {
      fetchAvailabilities();
    }
  }, [apiBaseUrl, fetchAvailabilities]);

  // 使用useMemo优化过滤和排序
  const filteredData = useMemo(() => {
    let filtered = [...availabilities];
    
    // 搜索过滤（使用防抖后的搜索词）
    if (debouncedSearch) {
      const term = debouncedSearch.toLowerCase();
      filtered = filtered.filter(item =>
        item.planCode.toLowerCase().includes(term) ||
        item.server.toLowerCase().includes(term) ||
        item.fqn.toLowerCase().includes(term) ||
        item.memory.toLowerCase().includes(term) ||
        item.storage.toLowerCase().includes(term)
      );
    }
    
    // 数据中心过滤
    if (filterDatacenter !== 'all') {
      filtered = filtered.filter(item =>
        item.datacenters.some(dc => dc.datacenter.toLowerCase() === filterDatacenter.toLowerCase())
      );
    }
    
    // 可用性状态过滤
    if (filterAvailability !== 'all') {
      filtered = filtered.filter(item => {
        if (filterAvailability === 'available') {
          return item.datacenters.some(dc => 
            dc.availability !== 'unavailable' && dc.availability !== 'unknown'
          );
        } else if (filterAvailability === 'unavailable') {
          return item.datacenters.every(dc => 
            dc.availability === 'unavailable' || dc.availability === 'unknown'
          );
        } else if (filterAvailability === '1h') {
          return item.datacenters.some(dc => 
            dc.availability === '1H-low' || dc.availability === '1H-high'
          );
        }
        return true;
      });
    }
    
    // 内存过滤
    if (filterMemory !== 'all') {
      filtered = filtered.filter(item => {
        const memMatch = item.memory.match(/(\d+)g/i);
        if (memMatch) {
          const memSize = parseInt(memMatch[1]);
          switch (filterMemory) {
            case '<=128': return memSize <= 128;
            case '256': return memSize >= 128 && memSize <= 256;
            case '512': return memSize >= 256 && memSize <= 512;
            case '>=1024': return memSize >= 1024;
            default: return true;
          }
        }
        return true;
      });
    }
    
    // 排序
    filtered.sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'planCode':
          compareValue = a.planCode.localeCompare(b.planCode);
          break;
        case 'memory':
          const aMemMatch = a.memory.match(/(\d+)g/i);
          const bMemMatch = b.memory.match(/(\d+)g/i);
          const aMem = aMemMatch ? parseInt(aMemMatch[1]) : 0;
          const bMem = bMemMatch ? parseInt(bMemMatch[1]) : 0;
          compareValue = aMem - bMem;
          break;
        case 'availability':
          const aAvail = a.datacenters.filter(dc => 
            dc.availability !== 'unavailable' && dc.availability !== 'unknown'
          ).length;
          const bAvail = b.datacenters.filter(dc => 
            dc.availability !== 'unavailable' && dc.availability !== 'unknown'
          ).length;
          compareValue = aAvail - bAvail;
          break;
      }
      
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
    
    return filtered;
  }, [availabilities, debouncedSearch, filterDatacenter, filterAvailability, filterMemory, sortBy, sortOrder]);
  
  // 分页数据
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // 导出数据为 JSON
  const exportData = () => {
    const dataStr = JSON.stringify(filteredData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ovh-availability-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('数据已导出');
  };

  // 统计信息
  const stats = {
    total: filteredData.length,
    available: filteredData.filter(item => 
      item.datacenters.some(dc => 
        dc.availability !== 'unavailable' && dc.availability !== 'unknown'
      )
    ).length,
    oneHour: filteredData.filter(item => 
      item.datacenters.some(dc => 
        dc.availability === '1H-low' || dc.availability === '1H-high'
      )
    ).length,
  };

  // 获取可用性状态的显示信息（高对比度亮彩样式）
  const getAvailabilityInfo = (availability: string) => {
    switch (availability) {
      case '1H-low':
        return { text: '1小时(低库存)', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300' };
      case '1H-high':
        return { text: '1小时(高库存)', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300' };
      case '72H':
        return { text: '72小时内', color: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-300' };
      case '480H':
        return { text: '480小时内', color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-300' };
      case 'unavailable':
        return { text: '缺货', color: 'text-rose-600', bg: 'bg-rose-50/80', border: 'border-rose-200' };
      case 'unknown':
        return { text: '未知', color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200' };
      default:
        return { text: availability, color: 'text-sky-800', bg: 'bg-sky-50', border: 'border-sky-200' };
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-extrabold mb-1 text-slate-900`}>OVH 实时可用性</h1>
            <p className="text-slate-800 font-bold text-sm">直接查询 OVH 公开 API（无需认证）</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={exportData}
              disabled={filteredData.length === 0}
              className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 font-bold text-xs sm:text-sm shadow-xs hover:bg-sky-50 hover:border-sky-500 hover:text-sky-800 transition-all flex items-center gap-1.5 disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5 text-slate-700" />
              {!isMobile && '导出JSON'}
            </button>
            <button
              onClick={() => fetchAvailabilities(true)}
              disabled={isLoading || isRefreshing}
              className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 font-bold text-xs sm:text-sm shadow-xs hover:bg-sky-50 hover:border-sky-500 hover:text-sky-800 transition-all flex items-center gap-1.5 disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-700 flex-shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="min-w-[2.5rem]">刷新</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* API 信息 */}
      {endpoint && (
        <div className="bg-white border border-sky-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-sky-600 mt-0.5" />
            <div className="flex-1">
              <>
                <h3 className="font-extrabold text-sky-900 text-base mb-2 flex items-center gap-2">
                  OVH 公开 API
                  <span className="text-xs px-2 py-0.5 rounded bg-sky-100 border border-sky-300 text-sky-900 font-bold">
                    {endpoint === 'ovh-us' ? '🇺🇸 美国' : endpoint === 'ovh-ca' ? '🇨🇦 加拿大' : '🇪🇺 欧洲'}
                  </span>
                </h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-slate-900 font-bold min-w-[60px]">端点：</span>
                    <code className="text-sky-900 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded text-xs font-mono font-bold break-all">
                      {apiBaseUrl}/v1/dedicated/server/datacenter/availabilities
                    </code>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-slate-900 font-bold min-w-[60px]">区域：</span>
                    <span className="text-slate-900 font-bold">
                      {endpoint === 'ovh-us' ? '美国 (US)' : endpoint === 'ovh-ca' ? '加拿大 (CA)' : '欧洲 (EU)'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-slate-900 font-bold min-w-[60px]">说明：</span>
                    <span className="text-slate-900 font-bold">
                      此 API 无需认证，实时返回所有 OVH 专用服务器在各数据中心的库存状态
                    </span>
                  </div>
                </div>
              </>
            </div>
          </div>
        </div>
      )}

      {/* 统计卡片 */}
      {availabilities.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-xs sm:text-sm mb-1">
              <Database className="w-3.5 h-3.5 text-sky-600" />
              <span className="hidden sm:inline">总记录数</span>
              <span className="sm:hidden">总数</span>
            </div>
            <div className="text-xl sm:text-3xl font-extrabold text-sky-700">{stats.total}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-xs sm:text-sm mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">有货服务器</span>
              <span className="sm:hidden">有货</span>
            </div>
            <div className="text-xl sm:text-3xl font-extrabold text-emerald-700">{stats.available}</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-xs sm:text-sm mb-1">
              <Filter className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">1小时内</span>
              <span className="sm:hidden">1H内</span>
            </div>
            <div className="text-xl sm:text-3xl font-extrabold text-amber-700">{stats.oneHour}</div>
          </div>
        </div>
      )}

      {/* 搜索和过滤器 */}
      {availabilities.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
            {/* 搜索框 */}
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
              <input
                type="text"
                placeholder={isMobile ? "搜索..." : "搜索服务器、内存、存储..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold placeholder:text-slate-400 placeholder:font-normal text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            
            {/* 数据中心过滤 */}
            <select
              value={filterDatacenter}
              onChange={(e) => setFilterDatacenter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-sm outline-none focus:border-sky-500"
            >
              <option value="all">所有数据中心</option>
              <optgroup label="🇪🇺 欧洲">
                <option value="rbx">RBX - 法国鲁贝</option>
                <option value="sbg">SBG - 法国斯特拉斯堡</option>
                <option value="gra">GRA - 法国格拉沃利纳</option>
                <option value="waw">WAW - 波兰华沙</option>
                <option value="fra">FRA - 德国法兰克福</option>
                <option value="lon">LON - 英国伦敦</option>
              </optgroup>
              <optgroup label="🇺🇸 美国">
                <option value="hil">HIL - 美国俄勒冈州</option>
                <option value="vin">VIN - 美国弗吉尼亚州</option>
              </optgroup>
              <optgroup label="🇨🇦 加拿大">
                <option value="bhs">BHS - 加拿大蒙特利尔</option>
              </optgroup>
              <optgroup label="🌏 亚太">
                <option value="sgp">SGP - 新加坡</option>
                <option value="syd">SYD - 澳大利亚悉尼</option>
                <option value="ynm">YNM - 印度孟买</option>
              </optgroup>
            </select>
            
            {/* 可用性过滤 */}
            <select
              value={filterAvailability}
              onChange={(e) => setFilterAvailability(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-sm outline-none focus:border-sky-500"
            >
              <option value="all">所有状态</option>
              <option value="available">有货</option>
              <option value="1h">1小时内</option>
              <option value="unavailable">无货</option>
            </select>
            
            {/* 内存过滤 */}
            <select
              value={filterMemory}
              onChange={(e) => setFilterMemory(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-sm outline-none focus:border-sky-500"
            >
              <option value="all">所有内存</option>
              <option value="<=128">≤ 128GB</option>
              <option value="256">128GB - 256GB</option>
              <option value="512">256GB - 512GB</option>
              <option value=">=1024">≥ 1TB</option>
            </select>
          </div>
          
          {/* 排序选项 */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-900 font-bold">排序：</span>
            <button
              onClick={() => {
                if (sortBy === 'planCode') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('planCode');
                  setSortOrder('asc');
                }
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${sortBy === 'planCode' ? 'bg-sky-600 border-sky-600 text-white shadow-xs' : 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50'}`}
            >
              型号 {sortBy === 'planCode' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => {
                if (sortBy === 'memory') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('memory');
                  setSortOrder('asc');
                }
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${sortBy === 'memory' ? 'bg-sky-600 border-sky-600 text-white shadow-xs' : 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50'}`}
            >
              内存 {sortBy === 'memory' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => {
                if (sortBy === 'availability') {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy('availability');
                  setSortOrder('desc');
                }
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${sortBy === 'availability' ? 'bg-sky-600 border-sky-600 text-white shadow-xs' : 'bg-white border-slate-300 text-slate-900 hover:bg-slate-50'}`}
            >
              可用性 {sortBy === 'availability' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>
      )}

      {/* 数据列表 */}
      {filteredData.length === 0 && availabilities.length > 0 ? (
        // 有数据但过滤后为空，显示"没有匹配的结果"
        <div className="cyber-panel p-8 text-center backdrop-blur-0 overflow-visible">
          <Filter className="w-16 h-16 text-cyber-muted mx-auto mb-4 opacity-50" />
          <p className="text-cyber-muted mb-2">没有匹配的结果</p>
          <p className="text-sm text-slate-500">尝试修改搜索或过滤条件</p>
        </div>
      ) : filteredData.length > 0 ? (
        // 有数据时显示列表
        <>
          <div className="space-y-2 sm:space-y-3">
            {paginatedData.map((item, index) => (
              <div
                key={item.fqn || index}
                className="cyber-panel p-3 sm:p-4 hover:border-cyber-accent/50 transition-colors backdrop-blur-0 overflow-visible"
              >
              <div className="mb-2 sm:mb-3">
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-xl font-extrabold text-sky-700 tracking-tight truncate">{item.planCode}</h3>
                    <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-0.5 line-clamp-1">{item.server}</p>
                  </div>
                  {!isMobile && (
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md shadow-2xs break-all">
                        {item.fqn}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-2 rounded-md">
                    <span className="text-slate-500 font-semibold flex-shrink-0">内存:</span>
                    <span className="text-slate-900 font-bold font-mono truncate">{item.memory}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-2 rounded-md">
                    <span className="text-slate-500 font-semibold flex-shrink-0">存储:</span>
                    <span className="text-slate-900 font-bold font-mono truncate">{item.storage}</span>
                  </div>
                  {item.systemStorage && (
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-2 rounded-md">
                      <span className="text-slate-500 font-semibold flex-shrink-0">系统盘:</span>
                      <span className="text-slate-900 font-bold font-mono truncate">{item.systemStorage}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="border-t border-slate-200 pt-3 mt-3">
                <h4 className="text-xs font-bold text-slate-700 mb-2.5 flex items-center justify-between">
                  <span>数据中心可用性 ({item.datacenters.length} 个)</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                  {item.datacenters.map((dc) => {
                    const availInfo = getAvailabilityInfo(dc.availability);
                    const dcCodeLower = dc.datacenter.toLowerCase();
                    const dcObj = OVH_DATACENTERS.find(d => d.code === dcCodeLower);
                    
                    return (
                      <div
                        key={dc.datacenter}
                        className={`${availInfo.bg} ${availInfo.border} border rounded-lg p-2 flex flex-col justify-between text-left shadow-sm transition-all`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <div className="flex items-center gap-1">
                            <span className="text-sm">{dcObj?.flag || '🌐'}</span>
                            <span className="font-extrabold font-mono text-xs text-slate-800">{dc.datacenter.toUpperCase()}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${availInfo.bg} ${availInfo.border} ${availInfo.color}`}>
                            {availInfo.text}
                          </span>
                        </div>
                        <div className="text-[11px] font-medium text-slate-600 truncate">
                          {dcObj ? `${dcObj.region} · ${dcObj.name}` : dc.datacenter}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            ))}
          </div>
          
          {/* 分页控件 */}
          {totalPages > 1 && (
            <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 mt-3 sm:mt-4 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                <div className="text-xs sm:text-sm font-bold text-slate-800">
                  {isMobile ? (
                    <>{currentPage}/{totalPages}</>
                  ) : (
                    <>显示 {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredData.length)} / 共 {filteredData.length} 条</>
                  )}
                </div>
                
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {!isMobile && (
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-xs hover:bg-sky-50 shadow-xs disabled:opacity-40"
                    >
                      首页
                    </button>
                  )}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold hover:bg-sky-50 shadow-xs disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-800" />
                  </button>
                  
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-300 rounded-lg text-xs sm:text-sm font-bold">
                    <span className="text-sky-700">{currentPage}</span>
                    <span className="text-slate-600">/</span>
                    <span className="text-slate-800">{totalPages}</span>
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold hover:bg-sky-50 shadow-xs disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-800" />
                  </button>
                  
                  {!isMobile && (
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-xs hover:bg-sky-50 shadow-xs disabled:opacity-40"
                    >
                      末页
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};

export default OVHAvailabilityPage;
