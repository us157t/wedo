'use client';

import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, BarChart3, ArrowLeft } from 'lucide-react';

// 获取本地今日日期字符串 (YYYY-MM-DD)
const getTodayStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 获取 30 天前的日期字符串 (YYYY-MM-DD)
const getThirtyDaysAgoStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function SmsSummaryPage() {
  // 1. 初始化时给空字符串，避免 Next.js 服务端渲染时间不一致报错（Hydration Error）
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minDate, setMinDate] = useState('');
  const [maxDate, setMaxDate] = useState('');
  
  const [orderName, setOrderName] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(false);

  // 2. 页面在客户端挂载后，安全地赋予“今天”及“30天前”的范围限制
  useEffect(() => {
    const today = getTodayStr();
    const thirtyAgo = getThirtyDaysAgoStr();
    setStartDate(today);
    setEndDate(today);
    setMinDate(thirtyAgo);
    setMaxDate(today);

    // 默认加载今天的聚合数据
    fetchData(1, today, today, '');
  }, []);

  const fetchData = async (targetPage = page, start = startDate, end = endDate, name = orderName) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        startDate: start,
        endDate: end,
        orderName: name,
        page: String(targetPage),
        pageSize: String(pageSize),
      });
      const res = await fetch(`/api/summary?${query.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setTotal(json.total);
        setPage(json.page);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    const today = getTodayStr();
    setStartDate(today);
    setEndDate(today);
    setOrderName('');
    fetchData(1, today, today, '');
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen text-slate-800">
      {/* 顶部导航与标题 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#009688]/10 text-[#009688] rounded-lg">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">短信工单汇总报表</h1>
            <p className="text-xs text-slate-500">按工单名称聚合统计总发送量与运营商到达率（仅支持查询最近 30 天）</p>
          </div>
        </div>
        <a href="/" className="text-sm text-[#009688] hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> 返回明细查询
        </a>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-600">开始时间</label>
          <input
            type="date"
            min={minDate}
            max={maxDate}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-10 bg-slate-50/50 border border-slate-200 rounded-lg px-3.5 text-sm w-44 outline-none focus:border-[#009688]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-600">结束时间</label>
          <input
            type="date"
            min={minDate}
            max={maxDate}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-10 bg-slate-50/50 border border-slate-200 rounded-lg px-3.5 text-sm w-44 outline-none focus:border-[#009688]"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-600">工单名称关键字</label>
          <input
            type="text"
            placeholder="如 TMFS_SLEEPING"
            value={orderName}
            onChange={(e) => setOrderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchData(1)}
            className="h-10 bg-slate-50/50 border border-slate-200 rounded-lg px-3.5 text-sm w-56 outline-none focus:border-[#009688]"
          />
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchData(1)}
            disabled={loading}
            className="h-10 bg-[#009688] hover:bg-[#00796b] text-white px-5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>统计查询</span>
          </button>
          <button
            onClick={handleReset}
            disabled={loading}
            className="h-10 border border-slate-200 bg-white hover:bg-slate-50 px-4 rounded-lg text-sm font-medium text-slate-600 transition-all flex items-center justify-center cursor-pointer"
          >
            重置
          </button>
        </div>
      </div>

      {/* 聚合表格展示 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 text-sm font-medium text-slate-600">
          共聚合了 <span className="text-[#009688] font-bold">{total}</span> 个不同的工单主题
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-100">
                <th className="p-3 pl-4">工单名称</th>
                <th className="p-3 text-center">合并批次数</th>
                <th className="p-3 text-right">总发送量</th>
                <th className="p-3 text-right">成功到达数</th>
                <th className="p-3 text-right">移动到达</th>
                <th className="p-3 text-right">移动未到</th>
                <th className="p-3 text-right">联通到达</th>
                <th className="p-3 text-right">联通未到</th>
                <th className="p-3 text-right">电信到达</th>
                <th className="p-3 text-right">电信未到</th>
                <th className="p-3 text-center">总到达率</th>
                <th className="p-3 text-center">移动到达率</th>
                <th className="p-3 text-center">联通到达率</th>
                <th className="p-3 text-center">电信到达率</th>
                <th className="p-3">首次发送时间</th>
                <th className="p-3">末次发送时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">正在聚合计算中...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400">暂无符合条件的聚合数据</td>
                </tr>
              ) : (
                data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 pl-4 font-medium text-slate-900 max-w-xs truncate" title={row.orderName}>
                      {row.orderName}
                    </td>
                    <td className="p-3 text-center font-semibold text-slate-600">{row.batchCount}</td>
                    <td className="p-3 text-right font-semibold">{row.totalNum.toLocaleString()}</td>
                    <td className="p-3 text-right text-emerald-600 font-semibold">{row.totalSuccess.toLocaleString()}</td>
                    <td className="p-3 text-right">{Number(row.cmccArrival || 0).toLocaleString()}</td>
                    <td className="p-3 text-right text-red-500">{Number(row.cmccFailed || 0).toLocaleString()}</td>
                    <td className="p-3 text-right">{Number(row.cuccArrival || 0).toLocaleString()}</td>
                    <td className="p-3 text-right text-red-500">{Number(row.cuccFailed || 0).toLocaleString()}</td>
                    <td className="p-3 text-right">{Number(row.ctccArrival || 0).toLocaleString()}</td>
                    <td className="p-3 text-right text-red-500">{Number(row.ctccFailed || 0).toLocaleString()}</td>
                    <td className="p-3 text-center font-bold text-[#009688]">{row.arrivalRate}</td>
                    <td className="p-3 text-center">{row.cmccRate}</td>
                    <td className="p-3 text-center">{row.cuccRate}</td>
                    <td className="p-3 text-center">{row.ctccRate}</td>
                    <td className="p-3 text-xs text-slate-500">{row.firstSendTime}</td>
                    <td className="p-3 text-xs text-slate-500">{row.lastSendTime}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* 分页控制 */}
        {total > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              共 <span className="font-medium text-slate-800">{total.toLocaleString()}</span> 个工单，
              每页 {pageSize} 条，
              第 <span className="font-medium text-slate-800">{page}</span> /{" "}
              <span className="font-medium text-slate-800">
                {Math.max(1, Math.ceil(total / pageSize))}
              </span>{" "}
              页
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchData(page - 1)}
                disabled={page <= 1 || loading}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                上一页
              </button>
              <button
                type="button"
                onClick={() => fetchData(page + 1)}
                disabled={page >= Math.ceil(total / pageSize) || loading}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}