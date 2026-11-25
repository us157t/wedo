
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Download,
  Home,
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  FileSpreadsheet,
  X,
  RefreshCw,
  BarChart3
} from "lucide-react";
import Link from 'next/link';

interface BatchItem {
  id: string;
  batchId: string;
  orderName: string;
  subPort: string;
  total: number;
  totalSuccess: number;
  cmccArrival: number;
  cmccFailed: number;
  cuccArrival: number;
  cuccFailed: number;
  ctccArrival: number;
  ctccFailed: number;
  cmccSuccessRate: string;
  cuccSuccessRate: string;
  ctccSuccessRate: string;
  sendTime: string;
  arrivalRate: string;
  isHighlighted?: boolean;
}

interface BatchApiResponse {
  success: boolean;
  data: BatchItem[];
  total: number;
  page: number;
  pageSize: number;
  error?: string;
}

const PAGE_SIZE = 50;

const columns = [
  { key: "batchId", label: "批次ID" },
  { key: "orderName", label: "工单名" },
  // { key: "subPort", label: "子端口" },
  { key: "total", label: "总数" },
  { key: "totalSuccess", label: "总成功" },
  { key: "cmccArrival", label: "移动到达" },
  { key: "cmccFailed", label: "移动未到" },
  { key: "cuccArrival", label: "联通到达" },
  { key: "cuccFailed", label: "联通未到" },
  { key: "ctccArrival", label: "电信到达" },
  { key: "ctccFailed", label: "电信未到" },
  { key: "cmccSuccessRate", label: "移动成功率" },
  { key: "cuccSuccessRate", label: "联通成功率" },
  { key: "ctccSuccessRate", label: "电信成功率" },
  { key: "sendTime", label: "发送时间" },
  { key: "arrivalRate", label: "到达率" },
] as const;

// 获取 30 天前的日期字符串 (YYYY-MM-DD)
const getThirtyDaysAgoStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const minDate = getThirtyDaysAgoStr();
const today = getTodayStr();

export default function SmsBatchQueryPage() {
  // 筛选条件
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [orderName, setOrderName] = useState("");
  const [port, setPort] = useState("");

  // 表格数据
  const [data, setData] = useState<BatchItem[]>([]);
  const [total, setTotal] = useState(0);

  // 分页
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(PAGE_SIZE);
  const [jumpPage, setJumpPage] = useState("1");

  // 请求状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // 请求后端数据
  const fetchBatches = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          startDate,
          endDate,
          orderName: orderName.trim(),
          port: port.trim(),
        });

        const response = await fetch(`/api/batches?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`请求失败，HTTP ${response.status}`);
        }

        const result: BatchApiResponse = await response.json();

        if (!result.success) {
          throw new Error(result.error || "查询失败");
        }

        setData(Array.isArray(result.data) ? result.data : []);
        setTotal(Number(result.total) || 0);
        setCurrentPage(Number(result.page) || page);
        setJumpPage(String(Number(result.page) || page));
      } catch (err) {
        console.error("批次查询异常：", err);
        setError(
          err instanceof Error ? err.message : "网络请求异常，请稍后重试"
        );
        setData([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate, orderName, port, pageSize]
  );

  // 页面首次打开，自动查询第一页
  // useEffect(() => {
  //   fetchBatches(1);
  // }, [fetchBatches]);
  useEffect(() => {
    const today = getTodayStr();
    setStartDate(today);
    setEndDate(today);
  const timer = setTimeout(() => {
    fetchBatches(1);
  }, 0);

  return () => clearTimeout(timer);
}, []);

  // 查询
  const handleSearch = () => {
    fetchBatches(1);
  };

  // 重置筛选
  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setOrderName("");
    setPort("");
  };

  // 翻页
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || loading) return;
    fetchBatches(page);
  };

  // 跳转指定页
  const handleJumpPage = () => {
    const page = Number(jumpPage);

    if (!Number.isInteger(page) || page < 1 || page > totalPages) {
      alert(`请输入 1 到 ${totalPages} 之间的页码`);
      return;
    }

    handlePageChange(page);
  };

  // 导出当前页 CSV
  const handleExport = () => {
    if (data.length === 0) {
      alert("当前没有可导出的数据");
      return;
    }

    const header = columns.map((col) => col.label);

    const rows = data.map((item) =>
      columns.map((col) => {
        const value = item[col.key];
        const text = String(value ?? "");
        return `"${text.replace(/"/g, '""')}"`;
      })
    );

    const csvContent = [
      header.map((value) => `"${value}"`).join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\r\n");

    // 加 BOM，避免 Excel 打开中文乱码
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `短信批次报告_第${currentPage}页.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // 生成页码
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = new Set<number>([1, totalPages]);

    for (
      let page = Math.max(2, currentPage - 1);
      page <= Math.min(totalPages - 1, currentPage + 1);
      page++
    ) {
      pages.add(page);
    }

    return Array.from(pages).sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  const formatNumber = (value: number) => {
    return Number(value || 0).toLocaleString("zh-CN");
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-slate-700 text-sm font-sans flex flex-col">
      {/* 顶部导航 */}
      <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <div className="flex items-center text-slate-500 hover:text-slate-800 cursor-pointer">
            <Home className="w-3.5 h-3.5 mr-1" />
            <span>首页</span>
          </div>

          <ChevronRight className="w-3 h-3 text-slate-400" />

          <div className="flex items-center bg-slate-100 border border-slate-200 text-slate-700 px-2.5 py-1 rounded gap-1.5">
            <span>短信批次报告</span>
            <X className="w-3 h-3 cursor-pointer hover:text-red-500" />
          </div>

          <Link 
            href="/summary"
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3.5 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#009688]" />
            <span>工单汇总报表</span>
          </Link>
        </div>

        <div className="text-slate-500"></div>
      </header>

      {/* 页面主体 */}
      <main className="p-5 flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-medium text-slate-800">
            短信工单批次查询
          </h1>

          <div className="text-xs text-slate-400">
            
          </div>
        </div>

        {/* 筛选条件 */}
        <div className="bg-white p-4 rounded border border-slate-200 mb-4 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">开始时间</label>
            <input
              type="date"
              min={minDate}
              max={today}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm w-52 outline-none focus:border-[#009688]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">结束时间</label>
            <input
              type="date"
              min={minDate}
              max={today}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm w-52 outline-none focus:border-[#009688]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">工单名称</label>
            <input
              type="text"
              placeholder="请输入工单名称"
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm w-44 outline-none focus:border-[#009688]"
            />
          </div>

          {/* <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">端口号</label>
            <input
              type="text"
              placeholder="请输入端口号"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="border border-slate-300 rounded px-3 py-1.5 text-sm w-36 outline-none focus:border-[#009688]"
            />
          </div> */}

          <div className="flex items-end gap-2">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-[#009688] hover:bg-[#00897b] disabled:opacity-60 text-white px-4 py-2 rounded transition-colors flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>查询</span>
            </button>

            <button
              onClick={handleReset}
              disabled={loading}
              className="border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded text-slate-600"
            >
              重置
            </button>
          </div>
        </div>

        {/* 表格工具栏 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              disabled={data.length === 0 || loading}
              className="bg-[#009688] hover:bg-[#00897b] disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出当前页</span>
            </button>

            <span className="text-xs text-slate-400">
              当前显示 {data.length} 条，共 {formatNumber(total)} 条
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <button
              title="表格视图"
              className="p-1 hover:bg-slate-200 rounded"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            <button
              title="导出 CSV"
              onClick={handleExport}
              className="p-1 hover:bg-slate-200 rounded"
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-3 px-4 py-3 rounded border border-red-200 bg-red-50 text-red-600 flex items-center justify-between">
            <span>查询失败：{error}</span>
            <button
              onClick={() => fetchBatches(currentPage)}
              className="underline hover:text-red-800"
            >
              重试
            </button>
          </div>
        )}

        {/* 数据表格 */}
        <div className="bg-white border border-slate-200 rounded shadow-sm overflow-x-auto flex-1 min-h-[300px] relative">
          <table className="w-full text-center border-collapse whitespace-nowrap">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium text-xs">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="py-3 px-3 border-r border-slate-200 last:border-r-0"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={16} className="py-16 text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      正在加载数据...
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-16 text-slate-400">
                    {error ? "数据加载失败" : "暂无数据"}
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      item.isHighlighted
                        ? "outline outline-2 outline-red-500 relative bg-red-50/10"
                        : ""
                    }`}
                  >
                    <td className="py-2.5 px-3 border-r border-slate-100 text-slate-500">
                      {item.batchId}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 text-blue-600 hover:underline cursor-pointer">
                      {item.orderName}
                    </td>

                    {/* <td className="py-2.5 px-3 border-r border-slate-100">
                      {item.subPort}
                    </td> */}

                    <td className="py-2.5 px-3 border-r border-slate-100 font-medium">
                      {formatNumber(item.total)}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 text-slate-600">
                      {formatNumber(item.totalSuccess)}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100">
                      {formatNumber(item.cmccArrival)}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 text-red-500">
                      {formatNumber(item.cmccFailed)}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100">
                      {formatNumber(item.cuccArrival)}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 text-red-500">
                      {formatNumber(item.cuccFailed)}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100">
                      {formatNumber(item.ctccArrival)}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 text-red-500">
                      {formatNumber(item.ctccFailed)}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100">
                      {item.cmccSuccessRate}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100">
                      {item.cuccSuccessRate}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100">
                      {item.ctccSuccessRate}
                    </td>

                    <td className="py-2.5 px-3 border-r border-slate-100 text-slate-500">
                      {item.sendTime}
                    </td>

                    <td className="py-2.5 px-3 text-slate-700 font-medium">
                      {item.arrivalRate}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="bg-white border-x border-b border-slate-200 px-4 py-3 rounded-b flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            共 <span className="font-medium">{formatNumber(total)}</span> 条，
            每页 {pageSize} 条，
            第 {currentPage} / {totalPages} 页
          </div>

          <div className="flex items-center flex-wrap gap-1.5">
            {/* 上一页 */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              className="p-1.5 rounded border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title="上一页"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* 页码 */}
            {pageNumbers.map((page, index) => {
              const previousPage = pageNumbers[index - 1];

              return (
                <React.Fragment key={page}>
                  {previousPage && page - previousPage > 1 && (
                    <span className="px-1 text-slate-400">...</span>
                  )}

                  <button
                    onClick={() => handlePageChange(page)}
                    disabled={loading}
                    className={`px-3 py-1.5 rounded border ${
                      currentPage === page
                        ? "bg-[#009688] text-white border-[#009688] font-medium"
                        : "border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              );
            })}

            {/* 下一页 */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              className="p-1.5 rounded border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title="下一页"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* 跳页 */}
            <div className="flex items-center gap-1 ml-2">
              <span>到第</span>

              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpPage}
                onChange={(e) => setJumpPage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJumpPage()}
                className="w-14 border border-slate-300 rounded text-center py-1 outline-none focus:border-[#009688]"
              />

              <span>页</span>

              <button
                onClick={handleJumpPage}
                disabled={loading}
                className="border border-slate-300 rounded px-2.5 py-1 hover:bg-slate-100 disabled:opacity-50"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}