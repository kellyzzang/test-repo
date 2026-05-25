"use server";

const REDASH_URL = "https://redash.turn.rentre.kr";
const REDASH_API_KEY = "ei3YBWRCNcUnK9Qs5vnm8QmUjbZzJpMj1F8gnDTJ";

async function runQuery(
  queryId: number,
  params: Record<string, string>
): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${REDASH_URL}/api/queries/${queryId}/results`, {
    method: "POST",
    headers: {
      Authorization: `Key ${REDASH_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ parameters: params, max_age: 0 }),
    cache: "no-store",
  });
  const data = await res.json();

  if (data.query_result) return data.query_result.data.rows;

  const jobId: string = data.job?.id;
  if (!jobId) return [];

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const poll = await fetch(`${REDASH_URL}/api/jobs/${jobId}`, {
      headers: { Authorization: `Key ${REDASH_API_KEY}` },
      cache: "no-store",
    });
    const { job } = await poll.json();
    if (job?.status === 3 && job.query_result_id) {
      const r = await fetch(`${REDASH_URL}/api/query_results/${job.query_result_id}`, {
        headers: { Authorization: `Key ${REDASH_API_KEY}` },
        cache: "no-store",
      });
      return (await r.json()).query_result?.data?.rows ?? [];
    }
    if (job?.status === 4) return [];
  }
  return [];
}

// ── 판매 현황 ──────────────────────────────────────────────────────────────
export async function fetchSalesData(시작일: string, 종료일: string, 검색어: string) {
  const p = { 시작일, 종료일, 검색어 };
  const [ranking, weeklyCount, weeklyRevenue, pivot] = await Promise.all([
    runQuery(4449, p),
    runQuery(4450, p),
    runQuery(4451, p),
    runQuery(4452, p),
  ]);
  return { ranking, weeklyCount, weeklyRevenue, pivot };
}

// ── 전환율 분석 (빠른 쿼리: 주차별 추이 + 카테고리별) ───────────────────────
export async function fetchConversionData(시작일: string, 종료일: string) {
  const p = { 시작일, 종료일 };
  const [weekly, byCategory] = await Promise.all([
    runQuery(4463, p),
    runQuery(4464, p),
  ]);
  return { weekly, byCategory };
}

// ── 렌탈사별 전환율 (느린 쿼리: 별도 로딩) ──────────────────────────────────
export async function fetchRentalConversionData(시작일: string, 종료일: string) {
  const p = { 시작일, 종료일 };
  const [byRental, rentalWeekly] = await Promise.all([
    runQuery(4483, p),
    runQuery(4484, p),
  ]);
  return { byRental, rentalWeekly };
}

// ── 상품 등록 현황 ──────────────────────────────────────────────────────────
export async function fetchProductData() {
  const [byCategory, monthly, byRentalDetail, byRentalSummary] = await Promise.all([
    runQuery(4465, {}),
    runQuery(4466, {}),
    runQuery(4475, {}), // 렌탈사×카테고리
    runQuery(4476, {}), // 렌탈사별 요약
  ]);
  return { byCategory, monthly, byRentalDetail, byRentalSummary };
}

// ── 계약 단가·기간 ──────────────────────────────────────────────────────────
export async function fetchContractData(시작일: string, 종료일: string) {
  const p = { 시작일, 종료일 };
  const [avgPrice, termDist] = await Promise.all([
    runQuery(4467, p),
    runQuery(4468, p),
  ]);
  return { avgPrice, termDist };
}
