"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell,
} from "recharts";
import {
  fetchSalesData,
  fetchConversionData,
  fetchRentalConversionData,
  fetchProductData,
  fetchContractData,
} from "./actions";

type Row = Record<string, unknown>;
type GroupBy = "상세" | "렌탈사" | "카테고리";
type Tab = "sales" | "conversion" | "products" | "contracts";

const COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];

function fmt(n: unknown) {
  if (typeof n !== "number") return "-";
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`;
  return n.toLocaleString();
}

function sortWeeks(weeks: string[]) {
  return [...weeks].sort((a, b) => {
    const p = (s: string) => { const m = s.match(/(\d+)월\s*(\d+)주차/); return m ? +m[1] * 10 + +m[2] : 0; };
    return p(a) - p(b);
  });
}

function aggregateRanking(rows: Row[], key: string): Row[] {
  const map = new Map<string, { orders: number; revenue: number; ci: number }>();
  for (const r of rows) {
    const k = (r[key] as string) ?? "(없음)";
    const p = map.get(k) ?? { orders: 0, revenue: 0, ci: 0 };
    map.set(k, { orders: p.orders + (+r["주문건수"]! || 0), revenue: p.revenue + (+r["매출"]! || 0), ci: p.ci + (+r["공헌이익"]! || 0) });
  }
  return [...map.entries()]
    .map(([k, v]) => ({ [key]: k, 주문건수: v.orders, 매출: v.revenue, 공헌이익: v.ci, 공헌이익률: v.revenue > 0 ? Math.round(v.ci / v.revenue * 1000) / 10 : 0 }))
    .sort((a, b) => (b["주문건수"] as number) - (a["주문건수"] as number));
}

function aggregatePivotByCategory(pivotRows: Row[]): Row[] {
  const map = new Map<string, Map<string, { count: number; revenue: number }>>();
  for (const r of pivotRows) {
    const week = r["주차명"] as string, cat = r["카테고리"] as string;
    if (!map.has(week)) map.set(week, new Map());
    const wm = map.get(week)!;
    const p = wm.get(cat) ?? { count: 0, revenue: 0 };
    wm.set(cat, { count: p.count + (+r["건수"]! || 0), revenue: p.revenue + (+r["매출"]! || 0) });
  }
  const result: Row[] = [];
  for (const [week, wm] of map) for (const [cat, v] of wm) result.push({ 주차명: week, 카테고리: cat, 주문건수: v.count, 매출: v.revenue });
  return result;
}

// ─── 공통 차트 ─────────────────────────────────────────────────────────────

function TrendLine({ rows, groupKey, valueKey, label }: { rows: Row[]; groupKey: string; valueKey: string; label: string }) {
  const groups = useMemo(() => [...new Set(rows.map((r) => r[groupKey] as string))].slice(0, 10), [rows, groupKey]);
  const weeks = useMemo(() => sortWeeks([...new Set(rows.map((r) => r["주차명"] as string))]), [rows]);
  const chartData = weeks.map((w) => {
    const obj: Row = { 주차명: w };
    for (const g of groups) { const row = rows.find((r) => r["주차명"] === w && r[groupKey] === g); obj[g] = row ? row[valueKey] : 0; }
    return obj;
  });
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="주차명" tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <YAxis tickFormatter={fmt} tick={{ fill: "#9ca3af", fontSize: 11 }} width={60} />
        <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} labelStyle={{ color: "#fff" }} formatter={(v: unknown) => [fmt(v), label]} />
        <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
        {groups.map((g, i) => <Line key={g} type="monotone" dataKey={g} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} />)}
      </LineChart>
    </ResponsiveContainer>
  );
}

function StackedBar({ rows, groupKey, valueKey, label }: { rows: Row[]; groupKey: string; valueKey: string; label: string }) {
  const groups = useMemo(() => [...new Set(rows.map((r) => r[groupKey] as string))].slice(0, 10), [rows, groupKey]);
  const weeks = useMemo(() => sortWeeks([...new Set(rows.map((r) => r["주차명"] as string))]), [rows]);
  const chartData = weeks.map((w) => {
    const obj: Row = { 주차명: w };
    for (const g of groups) { const row = rows.find((r) => r["주차명"] === w && r[groupKey] === g); obj[g] = row ? row[valueKey] : 0; }
    return obj;
  });
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="주차명" tick={{ fill: "#9ca3af", fontSize: 11 }} />
        <YAxis tickFormatter={fmt} tick={{ fill: "#9ca3af", fontSize: 11 }} width={60} />
        <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} labelStyle={{ color: "#fff" }} formatter={(v: unknown) => [fmt(v), label]} />
        <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
        {groups.map((g, i) => <Bar key={g} dataKey={g} stackId="a" fill={COLORS[i % COLORS.length]} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── 판매 현황 탭 ──────────────────────────────────────────────────────────

function GroupByToggle({ value, onChange }: { value: GroupBy; onChange: (v: GroupBy) => void }) {
  const opts: { key: GroupBy; label: string }[] = [{ key: "상세", label: "상세" }, { key: "렌탈사", label: "렌탈사별" }, { key: "카테고리", label: "카테고리별" }];
  return (
    <div className="flex gap-1 bg-gray-900 p-1 rounded-lg">
      {opts.map((o) => (
        <button key={o.key} onClick={() => onChange(o.key)} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${value === o.key ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}>{o.label}</button>
      ))}
    </div>
  );
}

function SalesTable({ rows, groupBy }: { rows: Row[]; groupBy: GroupBy }) {
  if (!rows.length) return <p className="text-gray-400 text-sm">데이터 없음</p>;
  const total = { orders: rows.reduce((s, r) => s + (+r["주문건수"]! || 0), 0), revenue: rows.reduce((s, r) => s + (+r["매출"]! || 0), 0), ci: rows.reduce((s, r) => s + (+r["공헌이익"]! || 0), 0) };

  if (groupBy === "상세") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-700 text-gray-400 text-xs">
            <th className="text-left py-2 pr-3">렌탈사</th><th className="text-left py-2 pr-3">카테고리</th>
            <th className="text-left py-2 pr-3">상품명</th><th className="text-right py-2 pr-3">주문건수</th>
            <th className="text-right py-2 pr-3">매출</th><th className="text-right py-2">공헌이익률</th>
          </tr></thead>
          <tbody>{rows.slice(0, 50).map((r, i) => (
            <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/40">
              <td className="py-2 pr-3 font-medium text-white whitespace-nowrap">{r["렌탈사"] as string}</td>
              <td className="py-2 pr-3 text-gray-300 whitespace-nowrap">{r["카테고리"] as string}</td>
              <td className="py-2 pr-3 text-gray-400 max-w-xs truncate">{r["상품명"] as string}</td>
              <td className="py-2 pr-3 text-right text-white">{(r["주문건수"] as number)?.toLocaleString()}</td>
              <td className="py-2 pr-3 text-right text-white">{fmt(r["매출"])}</td>
              <td className="py-2 text-right text-emerald-400">{r["공헌이익률"] as number}%</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    );
  }

  const key = groupBy === "렌탈사" ? "렌탈사" : "카테고리";
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-gray-700 text-gray-400 text-xs">
          <th className="text-left py-2 pr-3">{key}</th>
          <th className="text-right py-2 pr-3">주문건수</th><th className="text-right py-2 pr-3">점유율</th>
          <th className="text-right py-2 pr-3">매출</th><th className="text-right py-2 pr-3">매출 점유율</th>
          <th className="text-right py-2 pr-3">공헌이익</th><th className="text-right py-2">공헌이익률</th>
        </tr></thead>
        <tbody>{rows.map((r, i) => {
          const os = total.orders > 0 ? ((+r["주문건수"]! / total.orders) * 100).toFixed(1) : "0";
          const rs = total.revenue > 0 ? ((+r["매출"]! / total.revenue) * 100).toFixed(1) : "0";
          return (
            <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/40">
              <td className="py-2.5 pr-3 font-medium text-white whitespace-nowrap">
                <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {r[key] as string}
              </td>
              <td className="py-2.5 pr-3 text-right text-white">{(+r["주문건수"]!).toLocaleString()}</td>
              <td className="py-2.5 pr-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="w-16 bg-gray-700 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{ width: `${os}%`, backgroundColor: COLORS[i % COLORS.length] }} /></div>
                  <span className="text-gray-400 w-10 text-right">{os}%</span>
                </div>
              </td>
              <td className="py-2.5 pr-3 text-right text-white">{fmt(r["매출"])}</td>
              <td className="py-2.5 pr-3 text-right text-gray-400">{rs}%</td>
              <td className="py-2.5 pr-3 text-right text-white">{fmt(r["공헌이익"])}</td>
              <td className="py-2.5 text-right text-emerald-400">{r["공헌이익률"] as number}%</td>
            </tr>
          );
        })}</tbody>
        <tfoot><tr className="border-t border-gray-600 font-semibold text-gray-300">
          <td className="py-2.5 pr-3">합계</td>
          <td className="py-2.5 pr-3 text-right text-white">{total.orders.toLocaleString()}</td>
          <td className="py-2.5 pr-3 text-right text-gray-500">100%</td>
          <td className="py-2.5 pr-3 text-right text-white">{fmt(total.revenue)}</td>
          <td className="py-2.5 pr-3 text-right text-gray-500">100%</td>
          <td className="py-2.5 pr-3 text-right text-white">{fmt(total.ci)}</td>
          <td className="py-2.5 text-right text-emerald-400">{total.revenue > 0 ? ((total.ci / total.revenue) * 100).toFixed(1) : "-"}%</td>
        </tr></tfoot>
      </table>
    </div>
  );
}

function SummaryCards({ ranking, prevRanking }: { ranking: Row[]; prevRanking?: Row[] }) {
  const sum = (rows: Row[], key: string) => rows.reduce((s, r) => s + (+r[key]! || 0), 0);
  const t = { o: sum(ranking, "주문건수"), rev: sum(ranking, "매출"), ci: sum(ranking, "공헌이익") };
  const p = prevRanking ? { o: sum(prevRanking, "주문건수"), rev: sum(prevRanking, "매출"), ci: sum(prevRanking, "공헌이익") } : null;

  const Diff = ({ curr, prev }: { curr: number; prev: number }) => {
    if (!prev) return null;
    const val = ((curr - prev) / prev) * 100;
    return (
      <p className="text-xs mt-0.5">
        {Math.abs(val) < 0.05 ? (
          <span className="text-gray-500">±0%</span>
        ) : val > 0 ? (
          <span className="text-emerald-400">▲{val.toFixed(1)}%</span>
        ) : (
          <span className="text-red-400">▼{Math.abs(val).toFixed(1)}%</span>
        )}
        <span className="text-gray-600 ml-1">vs 이전</span>
      </p>
    );
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div className="bg-gray-800 rounded-xl p-4">
        <p className="text-gray-400 text-xs mb-1">총 주문건수</p>
        <p className="text-xl font-bold text-blue-400">{t.o.toLocaleString()}건</p>
        {p && <Diff curr={t.o} prev={p.o} />}
      </div>
      <div className="bg-gray-800 rounded-xl p-4">
        <p className="text-gray-400 text-xs mb-1">총 매출</p>
        <p className="text-xl font-bold text-amber-400">{fmt(t.rev)}</p>
        {p && <Diff curr={t.rev} prev={p.rev} />}
      </div>
      <div className="bg-gray-800 rounded-xl p-4">
        <p className="text-gray-400 text-xs mb-1">총 공헌이익</p>
        <p className="text-xl font-bold text-emerald-400">{fmt(t.ci)}</p>
        {p && <Diff curr={t.ci} prev={p.ci} />}
      </div>
      <div className="bg-gray-800 rounded-xl p-4">
        <p className="text-gray-400 text-xs mb-1">공헌이익률</p>
        <p className="text-xl font-bold text-purple-400">{t.rev > 0 ? ((t.ci / t.rev) * 100).toFixed(1) + "%" : "-"}</p>
        {p && p.rev > 0 && (
          <Diff curr={t.rev > 0 ? (t.ci / t.rev) * 100 : 0} prev={p.rev > 0 ? (p.ci / p.rev) * 100 : 0} />
        )}
      </div>
    </div>
  );
}

// ─── 전환율 탭 ─────────────────────────────────────────────────────────────

type ConvView = "카테고리" | "렌탈사";

function ConvRateCell({ rate }: { rate: number }) {
  const color = rate >= 10 ? "text-emerald-400" : rate >= 5 ? "text-amber-400" : "text-red-400";
  return <span className={`font-semibold ${color}`}>{rate}%</span>;
}

function ConversionTab({
  data,
  rentalData,
  isRentalLoading,
}: {
  data: { weekly: Row[]; byCategory: Row[] };
  rentalData: { byRental: Row[]; rentalWeekly: Row[] } | null;
  isRentalLoading: boolean;
}) {
  const [view, setView] = useState<ConvView>("카테고리");
  const [selectedRental, setSelectedRental] = useState<string | null>(null);

  // 전체 요약 (요청 기준 - PROP_REQ weekly 데이터)
  const totalReq  = data.weekly.reduce((s, r) => s + (+r["총요청"]!  || 0), 0);
  const totalConf = data.weekly.reduce((s, r) => s + (+r["확정"]!   || 0), 0);
  const totalFail = data.weekly.reduce((s, r) => s + (+r["실패"]!   || 0), 0);

  // 주차별 전체 추이 차트 데이터
  const weeks = sortWeeks([...new Set(data.weekly.map((r) => r["주차명"] as string))]);
  const trendData = weeks.map((w) => {
    const r = data.weekly.find((x) => x["주차명"] === w) ?? {};
    return { 주차명: w, 전환율: r["전환율"] ?? 0, 총요청: r["총요청"] ?? 0, 확정: r["확정"] ?? 0 };
  });

  // 렌탈사별 주차 전환율 추이 (선택된 렌탈사)
  const rentalWeeklyRows = rentalData?.rentalWeekly ?? [];
  const rentalWeeks = sortWeeks([...new Set(rentalWeeklyRows.map((r) => r["주차명"] as string))]);
  const rentalNames = [...new Set(rentalWeeklyRows.map((r) => r["렌탈사"] as string))];
  const rentalTrendData = rentalWeeks.map((w) => {
    const obj: Row = { 주차명: w };
    for (const name of rentalNames) {
      const row = rentalWeeklyRows.find((r) => r["주차명"] === w && r["렌탈사"] === name);
      obj[name] = row ? row["전환율"] : null;
    }
    return obj;
  });

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "기간 총 요청", value: totalReq.toLocaleString() + "건", color: "text-blue-400" },
          { label: "확정 건수",    value: totalConf.toLocaleString() + "건", color: "text-emerald-400" },
          { label: "실패 건수",    value: totalFail.toLocaleString() + "건", color: "text-red-400" },
          { label: "평균 전환율",  value: totalReq > 0 ? (totalConf / totalReq * 100).toFixed(1) + "%" : "-", color: "text-purple-400" },
        ].map((c) => (
          <div key={c.label} className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">{c.label}</p>
            <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* 주차별 전체 추이 차트 (항상 표시) */}
      <div className="bg-gray-800 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">주차별 전체 전환율 추이</h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="주차명" tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <YAxis yAxisId="rate" tickFormatter={(v) => `${v}%`} tick={{ fill: "#9ca3af", fontSize: 11 }} width={45} domain={[0, 30]} />
            <YAxis yAxisId="cnt" orientation="right" tickFormatter={(v) => v.toLocaleString()} tick={{ fill: "#9ca3af", fontSize: 11 }} width={55} />
            <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} labelStyle={{ color: "#fff" }} />
            <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
            <Bar yAxisId="cnt" dataKey="총요청" fill="#374151" name="총요청" />
            <Bar yAxisId="cnt" dataKey="확정" fill="#10b981" name="확정" />
            <Line yAxisId="rate" type="monotone" dataKey="전환율" stroke="#f59e0b" strokeWidth={2} dot={false} name="전환율(%)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 카테고리 / 렌탈사 토글 */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300">상세 분석</h2>
        <div className="flex gap-1 bg-gray-800 p-1 rounded-lg">
          {(["카테고리", "렌탈사"] as ConvView[]).map((v) => (
            <button key={v} onClick={() => { setView(v); setSelectedRental(null); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === v ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}>
              {v}별
            </button>
          ))}
        </div>
      </div>

      {/* ── 카테고리별 뷰 ── */}
      {view === "카테고리" && (
        <div className="bg-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">카테고리별 전환율</h2>
          {data.byCategory.length ? (
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-700 text-gray-400 text-xs">
                <th className="text-left py-2 pr-3">카테고리</th>
                <th className="text-right py-2 pr-3">총요청</th>
                <th className="text-right py-2 pr-3">확정</th>
                <th className="text-right py-2 pr-3">실패</th>
                <th className="text-right py-2 pr-3">진행중</th>
                <th className="text-right py-2">전환율</th>
              </tr></thead>
              <tbody>{data.byCategory.map((r, i) => (
                <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/40">
                  <td className="py-2 pr-3 text-white font-medium">{r["카테고리"] as string}</td>
                  <td className="py-2 pr-3 text-right text-gray-300">{(+r["총요청"]!).toLocaleString()}</td>
                  <td className="py-2 pr-3 text-right text-emerald-400">{(+r["확정"]!).toLocaleString()}</td>
                  <td className="py-2 pr-3 text-right text-red-400">{(+r["실패"]!).toLocaleString()}</td>
                  <td className="py-2 pr-3 text-right text-gray-400">{(+r["진행중"]!).toLocaleString()}</td>
                  <td className="py-2 text-right"><ConvRateCell rate={+r["전환율"]!} /></td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p className="text-gray-500 text-sm">데이터 없음</p>}
        </div>
      )}

      {/* ── 렌탈사별 뷰 ── */}
      {view === "렌탈사" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 렌탈사 순위 테이블 */}
          <div className="bg-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-300">렌탈사별 전환율 순위</h2>
              {isRentalLoading && (
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className="inline-block w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  집계 중...
                </span>
              )}
            </div>
            {isRentalLoading && !rentalData ? (
              <div className="flex items-center justify-center h-40 text-gray-500">
                <div className="text-center">
                  <div className="inline-block w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-xs">렌탈사별 전환율 집계 중 (1~2분 소요)</p>
                </div>
              </div>
            ) : rentalData && rentalData.byRental.length > 0 ? (
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-700 text-gray-400 text-xs">
                  <th className="text-left py-2 pr-3">렌탈사</th>
                  <th className="text-right py-2 pr-3">청약수</th>
                  <th className="text-right py-2 pr-3">확정</th>
                  <th className="text-right py-2 pr-3 w-32">전환율</th>
                </tr></thead>
                <tbody>{[...rentalData.byRental].sort((a, b) => +b["전환율"]! - +a["전환율"]!).map((r, i) => (
                  <tr key={i}
                    onClick={() => setSelectedRental(r["렌탈사"] === selectedRental ? null : r["렌탈사"] as string)}
                    className={`border-b border-gray-800 cursor-pointer transition-colors ${r["렌탈사"] === selectedRental ? "bg-indigo-900/30" : "hover:bg-gray-800/40"}`}>
                    <td className="py-2.5 pr-3 font-medium text-white whitespace-nowrap">
                      {r["렌탈사"] === selectedRental && <span className="text-indigo-400 mr-1">▶</span>}
                      {r["렌탈사"] as string}
                    </td>
                    <td className="py-2.5 pr-3 text-right text-gray-300">{(+r["청약수"]!).toLocaleString()}</td>
                    <td className="py-2.5 pr-3 text-right text-emerald-400">{(+r["확정수"]!).toLocaleString()}</td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-700 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${Math.min(+r["전환율"]! * 5, 100)}%` }} />
                        </div>
                        <ConvRateCell rate={+r["전환율"]!} />
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            ) : !isRentalLoading ? (
              <p className="text-gray-500 text-sm">조회 버튼을 누르면 렌탈사별 전환율을 집계합니다</p>
            ) : null}
          </div>

          {/* 선택된 렌탈사 주차별 전환율 추이 */}
          <div className="bg-gray-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">
              {selectedRental ? `${selectedRental} — 주차별 전환율 추이` : "렌탈사를 클릭하면 주차별 추이가 표시됩니다"}
            </h2>
            {selectedRental ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={rentalTrendData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="주차명" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fill: "#9ca3af", fontSize: 11 }} width={45} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }}
                    labelStyle={{ color: "#fff" }}
                    formatter={(v: unknown) => [`${v}%`, "전환율"]}
                  />
                  <Line
                    type="monotone"
                    dataKey={selectedRental}
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ fill: "#6366f1", r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-52 text-gray-600">
                <p className="text-sm">← 좌측 테이블에서 렌탈사를 선택하세요</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 상품 등록 탭 ──────────────────────────────────────────────────────────

type ProductView = "카테고리" | "렌탈사";

function StatusBar({ act, actS, ina }: { act: number; actS: number; ina: number }) {
  const total = act + actS + ina || 1;
  const actPct = (act / total) * 100;
  const actSPct = (actS / total) * 100;
  const inaPct = (ina / total) * 100;
  return (
    <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-gray-700">
      <div className="bg-emerald-500 h-full" style={{ width: `${actPct}%` }} />
      <div className="bg-amber-400 h-full" style={{ width: `${actSPct}%` }} />
      <div className="bg-red-500 h-full" style={{ width: `${inaPct}%` }} />
    </div>
  );
}

function ProductsTab({ data }: { data: { byCategory: Row[]; monthly: Row[]; byRentalDetail: Row[]; byRentalSummary: Row[] } }) {
  const [view, setView] = useState<ProductView>("카테고리");

  // ── 카테고리 뷰 데이터 ───────────────────────────────
  const months = [...new Set(data.monthly.map((r) => r["월"] as string))].sort();
  const catForChart = [...new Set(data.monthly.map((r) => r["카테고리"] as string))].slice(0, 8);
  const monthlyChart = months.map((m) => {
    const obj: Row = { 월: m };
    for (const c of catForChart) { const row = data.monthly.find((r) => r["월"] === m && r["카테고리"] === c); obj[c] = row ? row["등록수"] : 0; }
    return obj;
  });

  // ── 렌탈사 뷰 데이터 ───────────────────────────────
  const [selectedRental, setSelectedRental] = useState<string | null>(null);
  const rentalList = data.byRentalSummary;
  const rentalDetail = selectedRental
    ? data.byRentalDetail.filter((r) => r["렌탈사"] === selectedRental)
    : [];

  // 렌탈사별 bar chart 데이터
  const rentalBarData = rentalList.map((r) => ({
    렌탈사: r["렌탈사"] as string,
    판매중: +r["판매중"]! || 0,
    일부판매: +r["일부판매"]! || 0,
    비판매: +r["비판매"]! || 0,
  }));

  // ── 전체 요약 수치 ───────────────────────────────────
  const src = view === "카테고리" ? data.byCategory : data.byRentalSummary;
  const total = {
    act:  src.reduce((s, r) => s + (+r["판매중"]! || 0), 0),
    actS: src.reduce((s, r) => s + (+r["일부판매"]! || 0), 0),
    ina:  src.reduce((s, r) => s + (+r["비판매"]! || 0), 0),
  };
  const grandTotal = total.act + total.actS + total.ina;

  return (
    <div className="space-y-4">
      {/* 요약 카드 + 뷰 토글 */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
          {[
            { label: "전체 옵션", value: grandTotal.toLocaleString() + "개", color: "text-blue-400" },
            { label: "판매중 (ACT)", value: total.act.toLocaleString() + "개", color: "text-emerald-400" },
            { label: "일부판매 (ACT_S)", value: total.actS.toLocaleString() + "개", color: "text-amber-400" },
            { label: "비판매 (INA)", value: total.ina.toLocaleString() + "개", color: "text-red-400" },
          ].map((c) => (
            <div key={c.label} className="bg-gray-800 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-1">{c.label}</p>
              <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>
        {/* 뷰 토글 */}
        <div className="flex gap-1 bg-gray-800 p-1 rounded-lg self-start mt-1">
          {(["카테고리", "렌탈사"] as ProductView[]).map((v) => (
            <button key={v} onClick={() => { setView(v); setSelectedRental(null); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === v ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}>
              {v}별
            </button>
          ))}
        </div>
      </div>

      {/* ── 카테고리별 뷰 ── */}
      {view === "카테고리" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">카테고리별 상품 등록 현황</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-700 text-gray-400 text-xs">
                  <th className="text-left py-2 pr-3">카테고리</th>
                  <th className="text-right py-2 pr-3 text-emerald-400">판매중</th>
                  <th className="text-right py-2 pr-3 text-amber-400">일부판매</th>
                  <th className="text-right py-2 pr-3 text-red-400">비판매</th>
                  <th className="text-right py-2 w-28">활성률</th>
                </tr></thead>
                <tbody>{data.byCategory.map((r, i) => {
                  const tot = (+r["전체"]! || 1);
                  const activeRate = (((+r["판매중"]! || 0) + (+r["일부판매"]! || 0)) / tot * 100).toFixed(0);
                  return (
                    <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/40">
                      <td className="py-2 pr-3 text-white font-medium">{r["카테고리"] as string}</td>
                      <td className="py-2 pr-3 text-right text-emerald-400">{(+r["판매중"]!).toLocaleString()}</td>
                      <td className="py-2 pr-3 text-right text-amber-400">{(+r["일부판매"]!).toLocaleString()}</td>
                      <td className="py-2 pr-3 text-right text-red-400">{(+r["비판매"]!).toLocaleString()}</td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 bg-gray-700 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${activeRate}%` }} />
                          </div>
                          <span className="text-gray-300 w-8 text-right">{activeRate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">월별 신규 상품 등록 추이</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="월" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} labelStyle={{ color: "#fff" }} />
                <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
                {catForChart.map((c, i) => <Bar key={c} dataKey={c} stackId="a" fill={COLORS[i % COLORS.length]} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── 렌탈사별 뷰 ── */}
      {view === "렌탈사" && (
        <div className="space-y-4">
          {/* 렌탈사별 bar chart */}
          <div className="bg-gray-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">렌탈사별 등록 상품 현황 (클릭 시 카테고리 상세)</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={rentalBarData} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}
                onClick={(e) => { if (e?.activeLabel) setSelectedRental(e.activeLabel === selectedRental ? null : e.activeLabel as string); }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="렌탈사" tick={{ fill: "#9ca3af", fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} labelStyle={{ color: "#fff" }} />
                <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
                <Bar dataKey="판매중" stackId="a" fill="#10b981" />
                <Bar dataKey="일부판매" stackId="a" fill="#f59e0b" />
                <Bar dataKey="비판매" stackId="a" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 렌탈사별 요약 테이블 */}
            <div className="bg-gray-800 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">렌탈사별 요약</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-gray-700 text-gray-400 text-xs">
                    <th className="text-left py-2 pr-3">렌탈사</th>
                    <th className="text-right py-2 pr-2 text-emerald-400">판매중</th>
                    <th className="text-right py-2 pr-2 text-red-400">비판매</th>
                    <th className="text-right py-2 pr-2">상품수</th>
                    <th className="text-right py-2 w-28">판매중 비율</th>
                  </tr></thead>
                  <tbody>{rentalList.map((r, i) => (
                    <tr key={i}
                      onClick={() => setSelectedRental(r["렌탈사"] === selectedRental ? null : r["렌탈사"] as string)}
                      className={`border-b border-gray-800 cursor-pointer transition-colors ${r["렌탈사"] === selectedRental ? "bg-indigo-900/30" : "hover:bg-gray-800/40"}`}>
                      <td className="py-2 pr-3 font-medium text-white whitespace-nowrap">
                        {r["렌탈사"] === selectedRental && <span className="text-indigo-400 mr-1">▶</span>}
                        {r["렌탈사"] as string}
                      </td>
                      <td className="py-2 pr-2 text-right text-emerald-400">{(+r["판매중"]!).toLocaleString()}</td>
                      <td className="py-2 pr-2 text-right text-red-400">{(+r["비판매"]!).toLocaleString()}</td>
                      <td className="py-2 pr-2 text-right text-gray-300">{(+r["전체상품수"]!).toLocaleString()}</td>
                      <td className="py-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <StatusBar act={+r["판매중"]! || 0} actS={+r["일부판매"]! || 0} ina={+r["비판매"]! || 0} />
                          <span className="text-gray-300 w-8 text-right">{r["활성률"] as number}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>

            {/* 선택된 렌탈사의 카테고리 상세 */}
            <div className="bg-gray-800 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-4">
                {selectedRental ? `${selectedRental} — 카테고리별 상세` : "렌탈사를 클릭하면 카테고리 상세가 표시됩니다"}
              </h2>
              {selectedRental && rentalDetail.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-gray-700 text-gray-400 text-xs">
                      <th className="text-left py-2 pr-3">카테고리</th>
                      <th className="text-right py-2 pr-2 text-emerald-400">판매중</th>
                      <th className="text-right py-2 pr-2 text-amber-400">일부판매</th>
                      <th className="text-right py-2 pr-2 text-red-400">비판매</th>
                      <th className="text-right py-2 w-28">비율</th>
                    </tr></thead>
                    <tbody>{rentalDetail.map((r, i) => (
                      <tr key={i} className="border-b border-gray-800">
                        <td className="py-2 pr-3 text-white">{r["카테고리"] as string}</td>
                        <td className="py-2 pr-2 text-right text-emerald-400">{(+r["판매중"]!).toLocaleString()}</td>
                        <td className="py-2 pr-2 text-right text-amber-400">{(+r["일부판매"]!).toLocaleString()}</td>
                        <td className="py-2 pr-2 text-right text-red-400">{(+r["비판매"]!).toLocaleString()}</td>
                        <td className="py-2 text-right">
                          <StatusBar act={+r["판매중"]! || 0} actS={+r["일부판매"]! || 0} ina={+r["비판매"]! || 0} />
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-gray-600">
                  <p className="text-sm">← 좌측 테이블에서 렌탈사를 선택하세요</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 계약 단가·기간 탭 ─────────────────────────────────────────────────────

function ContractsTab({ data }: { data: { avgPrice: Row[]; termDist: Row[] } }) {
  const categories = [...new Set(data.termDist.map((r) => r["카테고리"] as string))];
  const periods = [...new Set(data.termDist.map((r) => String(r["계약기간_개월"])))].sort((a, b) => +a - +b);

  const periodChart = categories.slice(0, 8).map((cat) => {
    const obj: Row = { 카테고리: cat };
    for (const p of periods) {
      const row = data.termDist.find((r) => r["카테고리"] === cat && String(r["계약기간_개월"]) === p);
      obj[`${p}개월`] = row ? row["건수"] : 0;
    }
    return obj;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 렌탈사×카테고리 평균 단가 */}
        <div className="bg-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">렌탈사×카테고리 평균 월 매출</h2>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-800">
                <tr className="border-b border-gray-700 text-gray-400 text-xs">
                  <th className="text-left py-2 pr-3">렌탈사</th>
                  <th className="text-left py-2 pr-3">카테고리</th>
                  <th className="text-right py-2 pr-3">건수</th>
                  <th className="text-right py-2 pr-3">평균 월매출</th>
                  <th className="text-right py-2">최고</th>
                </tr>
              </thead>
              <tbody>{data.avgPrice.slice(0, 40).map((r, i) => (
                <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/40">
                  <td className="py-2 pr-3 text-white font-medium whitespace-nowrap">{r["렌탈사"] as string}</td>
                  <td className="py-2 pr-3 text-gray-300 whitespace-nowrap">{r["카테고리"] as string}</td>
                  <td className="py-2 pr-3 text-right text-gray-300">{(+r["건수"]!).toLocaleString()}</td>
                  <td className="py-2 pr-3 text-right text-amber-400">{fmt(r["평균월매출"])}</td>
                  <td className="py-2 text-right text-gray-400">{fmt(r["최고"])}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        {/* 계약기간 분포 */}
        <div className="bg-gray-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">카테고리별 계약기간 분포</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={periodChart} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis dataKey="카테고리" type="category" tick={{ fill: "#9ca3af", fontSize: 11 }} width={60} />
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", borderRadius: 8 }} labelStyle={{ color: "#fff" }} />
              <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
              {periods.map((p, i) => <Bar key={p} dataKey={`${p}개월`} stackId="a" fill={COLORS[i % COLORS.length]} />)}
            </BarChart>
          </ResponsiveContainer>
          {/* 기간별 평균단가 미니 테이블 */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {periods.filter((_, i) => i < 6).map((p, i) => {
              const rows = data.termDist.filter((r) => String(r["계약기간_개월"]) === p);
              const avgPriceVal = rows.length > 0 ? rows.reduce((s, r) => s + (+r["평균월매출"]! || 0), 0) / rows.length : 0;
              return (
                <div key={p} className="bg-gray-900 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-400">{p}개월</p>
                  <p className="text-sm font-semibold" style={{ color: COLORS[i % COLORS.length] }}>{fmt(Math.round(avgPriceVal))}</p>
                  <p className="text-xs text-gray-500">{rows.reduce((s, r) => s + (+r["건수"]! || 0), 0).toLocaleString()}건</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 유틸 ──────────────────────────────────────────────────────────────────

function getPreviousPeriod(시작일: string, 종료일: string) {
  const s = new Date(시작일 + "T00:00:00");
  const e = new Date(종료일 + "T00:00:00");
  const days = Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
  const prevEnd = new Date(s.getTime() - 86_400_000);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86_400_000);
  const d = (dt: Date) => dt.toISOString().split("T")[0];
  return { 시작일: d(prevStart), 종료일: d(prevEnd) };
}

// ─── 주간 리포트 카드 ────────────────────────────────────────────────────────

function WeeklyReportCard() {
  type WData = {
    orders: number; revenue: number; convRate: number;
    topRental: string; topCategory: string;
    ordersDiff: number; revenueDiff: number;
    periodLabel: string;
  };
  const [data, setData] = useState<WData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const d = (dt: Date) => dt.toISOString().split("T")[0];
    const end = d(today);
    const start = d(new Date(today.getTime() - 6 * 86_400_000));
    const prevEnd = d(new Date(today.getTime() - 7 * 86_400_000));
    const prevStart = d(new Date(today.getTime() - 13 * 86_400_000));

    Promise.all([
      fetchSalesData(start, end, ""),
      fetchSalesData(prevStart, prevEnd, ""),
      fetchConversionData(start, end),
    ]).then(([curr, prev, conv]) => {
      const sum = (rows: Row[], key: string) => rows.reduce((s, r) => s + (+r[key]! || 0), 0);
      const topBy = (rows: Row[], groupKey: string, valueKey: string) => {
        const m = new Map<string, number>();
        for (const r of rows) {
          const k = r[groupKey] as string;
          m.set(k, (m.get(k) || 0) + (+r[valueKey]! || 0));
        }
        return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
      };

      const orders = sum(curr.ranking, "주문건수");
      const revenue = sum(curr.ranking, "매출");
      const prevOrders = sum(prev.ranking, "주문건수");
      const prevRevenue = sum(prev.ranking, "매출");
      const totalReq = sum(conv.weekly, "총요청");
      const totalConf = sum(conv.weekly, "확정");

      setData({
        orders,
        revenue,
        convRate: totalReq > 0 ? (totalConf / totalReq) * 100 : 0,
        topRental: topBy(curr.ranking, "렌탈사", "주문건수"),
        topCategory: topBy(curr.ranking, "카테고리", "주문건수"),
        ordersDiff: prevOrders > 0 ? ((orders - prevOrders) / prevOrders) * 100 : 0,
        revenueDiff: prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0,
        periodLabel: `${start} ~ ${end}`,
      });
      setLoading(false);
    });
  }, []);

  const DiffBadge = ({ val }: { val: number }) =>
    Math.abs(val) < 0.05 ? (
      <span className="text-xs text-gray-500">±0%</span>
    ) : val > 0 ? (
      <span className="text-xs text-emerald-400">▲{val.toFixed(1)}%</span>
    ) : (
      <span className="text-xs text-red-400">▼{Math.abs(val).toFixed(1)}%</span>
    );

  if (loading) {
    return (
      <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-indigo-300">이번 주 리포트</span>
          <span className="inline-block w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-gray-700 rounded-xl h-16 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-950/60 to-gray-800 border border-indigo-700/30 rounded-2xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-indigo-300">이번 주 리포트</span>
        <span className="text-xs text-gray-500">{data.periodLabel} · 직전 7일 대비</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-gray-800/70 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">주문건수</p>
          <p className="text-lg font-bold text-white">{data.orders.toLocaleString()}건</p>
          <DiffBadge val={data.ordersDiff} />
        </div>
        <div className="bg-gray-800/70 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">매출</p>
          <p className="text-lg font-bold text-amber-400">{fmt(data.revenue)}</p>
          <DiffBadge val={data.revenueDiff} />
        </div>
        <div className="bg-gray-800/70 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">전환율</p>
          <p className="text-lg font-bold text-purple-400">{data.convRate.toFixed(1)}%</p>
        </div>
        <div className="bg-gray-800/70 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">1위 렌탈사</p>
          <p className="text-sm font-bold text-white truncate">{data.topRental}</p>
          <p className="text-xs text-gray-500">주문 기준</p>
        </div>
        <div className="bg-gray-800/70 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-1">1위 카테고리</p>
          <p className="text-sm font-bold text-white truncate">{data.topCategory}</p>
          <p className="text-xs text-gray-500">주문 기준</p>
        </div>
      </div>
    </div>
  );
}

// ─── 판매 필터 칩 ──────────────────────────────────────────────────────────

function SalesFilterChips({
  ranking,
  selectedRental,
  selectedCategory,
  onRentalChange,
  onCategoryChange,
}: {
  ranking: Row[];
  selectedRental: string | null;
  selectedCategory: string | null;
  onRentalChange: (v: string | null) => void;
  onCategoryChange: (v: string | null) => void;
}) {
  const rentals = useMemo(
    () => [...new Set(ranking.map((r) => r["렌탈사"] as string))].sort(),
    [ranking],
  );
  const categories = useMemo(
    () => [...new Set(ranking.map((r) => r["카테고리"] as string))].sort(),
    [ranking],
  );

  const chip = (label: string, active: boolean, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
        active ? "bg-indigo-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="bg-gray-800 rounded-2xl px-4 py-3 mb-4 space-y-2.5">
      <div className="flex items-start gap-3 flex-wrap">
        <span className="text-xs text-gray-500 pt-1 w-14 shrink-0">렌탈사</span>
        <div className="flex flex-wrap gap-1.5">
          {chip("전체", selectedRental === null, () => onRentalChange(null))}
          {rentals.map((r) =>
            chip(r, r === selectedRental, () => onRentalChange(r === selectedRental ? null : r)),
          )}
        </div>
      </div>
      <div className="flex items-start gap-3 flex-wrap">
        <span className="text-xs text-gray-500 pt-1 w-14 shrink-0">카테고리</span>
        <div className="flex flex-wrap gap-1.5">
          {chip("전체", selectedCategory === null, () => onCategoryChange(null))}
          {categories.map((c) =>
            chip(c, c === selectedCategory, () => onCategoryChange(c === selectedCategory ? null : c)),
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 메인 ──────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; needsSearch: boolean }[] = [
  { key: "sales", label: "판매 현황", needsSearch: true },
  { key: "conversion", label: "전환율 분석", needsSearch: false },
  { key: "products", label: "상품 등록", needsSearch: false },
  { key: "contracts", label: "계약 단가·기간", needsSearch: false },
];

export default function DashboardClient() {
  const [시작일, set시작일] = useState("2026-03-01");
  const [종료일, set종료일] = useState("2026-05-23");
  const [검색어, set검색어] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("sales");
  const [groupBy, setGroupBy] = useState<GroupBy>("상세");
  const [isPending, startTransition] = useTransition();

  const [selectedRentalFilter, setSelectedRentalFilter] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  const [salesData, setSalesData] = useState<Awaited<ReturnType<typeof fetchSalesData>> | null>(null);
  const [prevSalesData, setPrevSalesData] = useState<Awaited<ReturnType<typeof fetchSalesData>> | null>(null);
  const [convData, setConvData] = useState<Awaited<ReturnType<typeof fetchConversionData>> | null>(null);
  const [rentalConvData, setRentalConvData] = useState<Awaited<ReturnType<typeof fetchRentalConversionData>> | null>(null);
  const [isRentalLoading, setIsRentalLoading] = useState(false);
  const [prodData, setProdData] = useState<Awaited<ReturnType<typeof fetchProductData>> | null>(null);
  const [contData, setContData] = useState<Awaited<ReturnType<typeof fetchContractData>> | null>(null);

  const search = () => {
    if (activeTab === "conversion") {
      // 빠른 쿼리는 transition으로 (조회 중... 스피너 표시)
      startTransition(async () => {
        setConvData(await fetchConversionData(시작일, 종료일));
      });
      // 느린 렌탈사 쿼리는 독립적으로 로드
      setRentalConvData(null);
      setIsRentalLoading(true);
      fetchRentalConversionData(시작일, 종료일).then((d) => {
        setRentalConvData(d);
        setIsRentalLoading(false);
      });
    } else {
      startTransition(async () => {
        if (activeTab === "sales") {
          setSelectedRentalFilter(null);
          setSelectedCategoryFilter(null);
          const prev = getPreviousPeriod(시작일, 종료일);
          const [curr, prevData] = await Promise.all([
            fetchSalesData(시작일, 종료일, 검색어),
            fetchSalesData(prev.시작일, prev.종료일, 검색어),
          ]);
          setSalesData(curr);
          setPrevSalesData(prevData);
        } else if (activeTab === "products") {
          setProdData(await fetchProductData());
        } else if (activeTab === "contracts") {
          setContData(await fetchContractData(시작일, 종료일));
        }
      });
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    // 이미 데이터가 있으면 재조회 안 함
  };

  const filteredRanking = useMemo(() => {
    if (!salesData) return [];
    return salesData.ranking.filter(
      (r) =>
        (!selectedRentalFilter || r["렌탈사"] === selectedRentalFilter) &&
        (!selectedCategoryFilter || r["카테고리"] === selectedCategoryFilter),
    );
  }, [salesData, selectedRentalFilter, selectedCategoryFilter]);

  const tableRows = useMemo(() => {
    if (groupBy === "상세") return filteredRanking;
    if (groupBy === "렌탈사") return aggregateRanking(filteredRanking, "렌탈사");
    return aggregateRanking(filteredRanking, "카테고리");
  }, [filteredRanking, groupBy]);

  const countChartRows = useMemo(() => {
    if (!salesData) return [];
    if (groupBy === "카테고리") {
      const base = aggregatePivotByCategory(salesData.pivot);
      return selectedCategoryFilter ? base.filter((r) => r["카테고리"] === selectedCategoryFilter) : base;
    }
    return selectedRentalFilter
      ? salesData.weeklyCount.filter((r) => r["렌탈사"] === selectedRentalFilter)
      : salesData.weeklyCount;
  }, [salesData, groupBy, selectedRentalFilter, selectedCategoryFilter]);

  const revenueChartRows = useMemo(() => {
    if (!salesData) return [];
    if (groupBy === "카테고리") {
      const base = aggregatePivotByCategory(salesData.pivot);
      return selectedCategoryFilter ? base.filter((r) => r["카테고리"] === selectedCategoryFilter) : base;
    }
    return selectedRentalFilter
      ? salesData.weeklyRevenue.filter((r) => r["렌탈사"] === selectedRentalFilter)
      : salesData.weeklyRevenue;
  }, [salesData, groupBy, selectedRentalFilter, selectedCategoryFilter]);

  const chartGroupKey = groupBy === "카테고리" ? "카테고리" : "렌탈사";
  const currentTab = TABS.find((t) => t.key === activeTab)!;
  const hasData = activeTab === "sales" ? !!salesData : activeTab === "conversion" ? !!convData : activeTab === "products" ? !!prodData : !!contData;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">커머스팀 대시보드</h1>
          <p className="text-gray-400 text-sm">렌탈 커머스 통합 분석</p>
        </div>

        <WeeklyReportCard />

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-800 p-1 rounded-xl mb-6 w-fit">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => handleTabChange(t.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t.key ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="bg-gray-800 rounded-2xl p-4 mb-6 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-400 mb-1">시작일</label>
            <input type="date" value={시작일} onChange={(e) => set시작일(e.target.value)}
              className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">종료일</label>
            <input type="date" value={종료일} onChange={(e) => set종료일(e.target.value)}
              className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-indigo-500" />
          </div>
          {currentTab.needsSearch && (
            <div className="flex-1 min-w-48">
              <label className="block text-xs text-gray-400 mb-1">검색어 (모델명·모델코드·렌탈사)</label>
              <input type="text" value={검색어} onChange={(e) => set검색어(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="예: WPUJAC115SNW, 정수기, 코웨이..."
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:outline-none focus:border-indigo-500 placeholder-gray-500" />
            </div>
          )}
          {activeTab === "products" && (
            <p className="text-xs text-gray-500 self-center">상품 등록 현황은 기간 필터 없이 전체 데이터를 조회합니다</p>
          )}
          <button onClick={search} disabled={isPending}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 text-white rounded-lg px-6 py-2 text-sm font-medium transition-colors">
            {isPending ? "조회 중..." : "조회"}
          </button>
        </div>

        {/* Loading */}
        {isPending && (
          <div className="text-center py-20 text-gray-400">
            <div className="inline-block w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p>데이터 조회 중...</p>
          </div>
        )}

        {/* Tab Content */}
        {!isPending && hasData && (
          <>
            {/* 판매 현황 */}
            {activeTab === "sales" && salesData && (
              <>
                <SalesFilterChips
                  ranking={salesData.ranking}
                  selectedRental={selectedRentalFilter}
                  selectedCategory={selectedCategoryFilter}
                  onRentalChange={setSelectedRentalFilter}
                  onCategoryChange={setSelectedCategoryFilter}
                />
                <SummaryCards ranking={filteredRanking} prevRanking={prevSalesData?.ranking} />
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-gray-500">
                    {selectedRentalFilter || selectedCategoryFilter
                      ? `필터 적용됨${selectedRentalFilter ? ` · ${selectedRentalFilter}` : ""}${selectedCategoryFilter ? ` · ${selectedCategoryFilter}` : ""}`
                      : "조회 결과 기준으로 즉시 전환됩니다"}
                  </p>
                  <GroupByToggle value={groupBy} onChange={setGroupBy} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-800 rounded-2xl p-5">
                    <h2 className="text-sm font-semibold text-gray-300 mb-4">{chartGroupKey === "카테고리" ? "카테고리별" : "렌탈사별"} 주차 주문건수 추이</h2>
                    {countChartRows.length ? <TrendLine rows={countChartRows} groupKey={chartGroupKey} valueKey="주문건수" label="주문건수" /> : <p className="text-gray-500 text-sm">데이터 없음</p>}
                  </div>
                  <div className="bg-gray-800 rounded-2xl p-5">
                    <h2 className="text-sm font-semibold text-gray-300 mb-4">{chartGroupKey === "카테고리" ? "카테고리별" : "렌탈사별"} 주차 매출 추이</h2>
                    {revenueChartRows.length ? <StackedBar rows={revenueChartRows} groupKey={chartGroupKey} valueKey="매출" label="매출" /> : <p className="text-gray-500 text-sm">데이터 없음</p>}
                  </div>
                </div>
                <div className="bg-gray-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-gray-300">
                      {groupBy === "상세" ? "상품별 판매 상세" : groupBy === "렌탈사" ? "렌탈사별 집계" : "카테고리별 집계"}
                      {groupBy === "상세" && <span className="ml-2 text-xs text-gray-500 font-normal">상위 50개</span>}
                    </h2>
                    <span className="text-xs text-gray-500">{tableRows.length}개 항목</span>
                  </div>
                  <SalesTable rows={tableRows} groupBy={groupBy} />
                </div>
              </>
            )}

            {/* 전환율 */}
            {activeTab === "conversion" && convData && (
              <ConversionTab data={convData} rentalData={rentalConvData} isRentalLoading={isRentalLoading} />
            )}

            {/* 상품 등록 */}
            {activeTab === "products" && prodData && <ProductsTab data={prodData} />}

            {/* 계약 단가 */}
            {activeTab === "contracts" && contData && <ContractsTab data={contData} />}
          </>
        )}

        {/* Empty state */}
        {!isPending && !hasData && (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg mb-2">조회 버튼을 눌러 데이터를 불러오세요</p>
            <p className="text-sm">
              {activeTab === "products" ? "기간 설정 없이 전체 상품 현황을 조회합니다" : "기간을 설정하고 조회하세요"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
