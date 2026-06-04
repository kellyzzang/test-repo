"""
렌트리 인터넷·유심·가전 지원금 비교 대시보드
실행: streamlit run app.py
"""
import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime
import calendar

from loader import load_comparison_file
import history as hist

# ── 페이지 설정 ────────────────────────────────────────────────
st.set_page_config(
    page_title="렌트리 지원금 비교 대시보드",
    page_icon="📡",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.title("📡 렌트리 지원금 비교 대시보드")
st.caption("이지태스크·리얼컨택서비스 월별 조사 결과 vs 렌트리 지원금")

# ── 사이드바: 파일 업로드 ──────────────────────────────────────
with st.sidebar:
    st.header("📂 파일 업로드")
    uploaded = st.file_uploader(
        "처리 완성 파일 업로드",
        type=["xlsx"],
        help="process_internet.py 실행 후 생성된 '인터넷_지원금비교_완성.xlsx' 파일",
    )

    month_input = st.text_input(
        "조사 월 (YYYY-MM)",
        value=datetime.now().strftime("%Y-%m"),
        max_chars=7,
    )

    save_btn = st.button("💾 이달 데이터 저장", use_container_width=True)

    st.divider()
    st.header("📅 이전 월 선택")
    saved_months = hist.list_months()
    selected_hist = st.selectbox(
        "비교할 이전 월",
        options=["(현재만 보기)"] + saved_months,
        index=0,
    )

    st.divider()
    st.header("🔍 필터")
    cat_filter = st.multiselect(
        "카테고리",
        ["인터넷", "유심", "가전"],
        default=["인터넷", "유심", "가전"],
    )
    source_filter = st.multiselect(
        "조사 업체",
        ["이지태스크", "리얼컨택"],
        default=["이지태스크", "리얼컨택"],
    )

# ── 데이터 로드 ────────────────────────────────────────────────
@st.cache_data
def process_file(file_bytes: bytes) -> dict:
    return load_comparison_file(file_bytes)


current_sheets = {}
if uploaded:
    try:
        current_sheets = process_file(uploaded.read())
        if save_btn:
            hist.save_snapshot(month_input, current_sheets)
            st.sidebar.success(f"✅ {month_input} 저장 완료!")
    except Exception as e:
        st.error(f"파일 처리 오류: {e}")
elif saved_months:
    latest = saved_months[0]
    current_sheets = hist.load_snapshot(latest) or {}
    if current_sheets:
        st.info(f"저장된 최신 데이터 로드 중: **{latest}**  ·  새 파일을 업로드하면 최신 데이터로 갱신됩니다.")

prev_sheets = {}
if selected_hist != "(현재만 보기)":
    prev_sheets = hist.load_snapshot(selected_hist) or {}

if not current_sheets:
    st.warning("👈 왼쪽에서 '인터넷_지원금비교_완성.xlsx' 파일을 업로드하세요.")
    st.stop()


# ── 데이터 통합 ────────────────────────────────────────────────
def merge_all(sheets: dict, cat_filter: list, src_filter: list) -> pd.DataFrame:
    dfs = []
    for df in sheets.values():
        dfs.append(df)
    if not dfs:
        return pd.DataFrame()
    all_df = pd.concat(dfs, ignore_index=True)
    all_df = all_df[all_df["category"].isin(cat_filter)]
    all_df = all_df[all_df["source"].isin(src_filter)]
    return all_df


df = merge_all(current_sheets, cat_filter, source_filter)

if df.empty:
    st.warning("선택한 필터에 해당하는 데이터가 없습니다.")
    st.stop()

# ── 요약 카드 ──────────────────────────────────────────────────
st.subheader("📊 이달 요약")
col1, col2, col3, col4, col5 = st.columns(5)

total_count = len(df)
rentre_filled = df["렌트리지원금"].gt(0).sum()
df_with_rentre = df[df["렌트리지원금"].gt(0)].copy()

with col1:
    st.metric("조사 항목 수", f"{total_count:,}")
with col2:
    st.metric("렌트리 기준 입력됨", f"{rentre_filled:,}")

if not df_with_rentre.empty:
    rentre_higher = (df_with_rentre["격차"].gt(0)).sum()
    pct_higher = rentre_higher / len(df_with_rentre) * 100
    avg_gap = df_with_rentre["격차"].mean()
    max_gap_row = df_with_rentre.loc[df_with_rentre["격차"].idxmax()]
    min_gap_row = df_with_rentre.loc[df_with_rentre["격차"].idxmin()]

    with col3:
        st.metric(
            "렌트리 우위 비율",
            f"{pct_higher:.0f}%",
            help="렌트리 지원금이 타사보다 높은 비율",
        )
    with col4:
        st.metric("평균 격차 (렌트리-타사)", f"{avg_gap:+,.0f}원")
    with col5:
        st.metric(
            "최대 격차 우위",
            f"{max_gap_row['격차']:+,.0f}원",
            help=f"{max_gap_row['업체명']} · {max_gap_row['상품명'][:15]}",
        )

st.divider()

# ── 탭 구성 ───────────────────────────────────────────────────
tab1, tab2, tab3, tab4, tab5 = st.tabs(
    ["🏆 업체별 비교", "📈 전월 대비 변화", "🥇 업체 순위", "📊 통신사별 분석", "📋 전체 데이터"]
)


# ─────────────── TAB 1: 업체별 비교 ───────────────────────────
with tab1:
    st.subheader("업체별 총지원금 vs 렌트리")

    cat_choice = st.selectbox(
        "카테고리 선택",
        options=["인터넷", "유심", "가전"],
        key="tab1_cat",
    )
    df_cat = df[df["category"] == cat_choice].copy()

    if df_cat.empty:
        st.info("해당 카테고리 데이터 없음")
    else:
        # 업체별 평균 총지원금
        vendor_avg = (
            df_cat.groupby("업체명")["총지원금"]
            .mean()
            .reset_index()
            .rename(columns={"총지원금": "타사 평균 총지원금"})
            .sort_values("타사 평균 총지원금", ascending=False)
        )

        rentre_avg = (
            df_cat[df_cat["렌트리지원금"].gt(0)]
            .groupby("업체명")["렌트리지원금"]
            .mean()
            .reset_index()
            .rename(columns={"렌트리지원금": "렌트리 평균 지원금"})
        )
        merged = vendor_avg.merge(rentre_avg, on="업체명", how="left")

        fig = go.Figure()
        fig.add_bar(
            name="타사 평균 총지원금",
            x=merged["업체명"],
            y=merged["타사 평균 총지원금"],
            marker_color="#3B82F6",
            text=merged["타사 평균 총지원금"].apply(lambda x: f"{x/10000:.1f}만"),
            textposition="outside",
        )
        if "렌트리 평균 지원금" in merged.columns:
            fig.add_bar(
                name="렌트리 평균 지원금",
                x=merged["업체명"],
                y=merged["렌트리 평균 지원금"],
                marker_color="#10B981",
                text=merged["렌트리 평균 지원금"].apply(
                    lambda x: f"{x/10000:.1f}만" if pd.notna(x) and x > 0 else ""
                ),
                textposition="outside",
            )

        fig.update_layout(
            barmode="group",
            height=420,
            yaxis_title="지원금 (원)",
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
            plot_bgcolor="white",
            yaxis=dict(gridcolor="#F3F4F6"),
        )
        st.plotly_chart(fig, use_container_width=True)

        # 격차 히트맵 테이블
        st.markdown("#### 업체 × 통신사 격차 (렌트리 - 타사) 단위: 만원")
        df_gap = df_cat[df_cat["격차"].notna()].copy()
        if not df_gap.empty:
            pivot = (
                df_gap.groupby(["업체명", "통신사"])["격차"]
                .mean()
                .unstack("통신사")
                .round(0)
                .div(10000)
                .round(1)
            )
            st.dataframe(
                pivot.style
                .background_gradient(cmap="RdYlGn", axis=None)
                .format("{:+.1f}만"),
                use_container_width=True,
            )
        else:
            st.info("렌트리 지원금 데이터를 입력하면 격차 분석을 볼 수 있습니다.")


# ─────────────── TAB 2: 전월 대비 변화 ────────────────────────
with tab2:
    st.subheader("전월 대비 지원금 변화")

    if not prev_sheets:
        st.info("👈 사이드바에서 비교할 이전 월을 선택하세요.")
    else:
        prev_df = merge_all(prev_sheets, cat_filter, source_filter)
        if prev_df.empty:
            st.warning("이전 월 데이터가 없습니다.")
        else:
            key_cols = ["통신사", "상품명", "구분", "업체명", "category", "source"]
            curr_agg = df.groupby(key_cols)["총지원금"].mean().reset_index()
            prev_agg = prev_df.groupby(key_cols)["총지원금"].mean().reset_index()

            merged = curr_agg.merge(
                prev_agg,
                on=key_cols,
                suffixes=("_현재", "_이전"),
            )
            merged["변화"] = merged["총지원금_현재"] - merged["총지원금_이전"]
            merged["변화율"] = (merged["변화"] / merged["총지원금_이전"] * 100).round(1)

            up = merged[merged["변화"] > 0].nlargest(10, "변화")
            down = merged[merged["변화"] < 0].nsmallest(10, "변화")

            col_u, col_d = st.columns(2)
            with col_u:
                st.markdown("#### ⬆️ 지원금 인상 TOP 10")
                if up.empty:
                    st.info("인상 없음")
                else:
                    st.dataframe(
                        up[["업체명", "상품명", "통신사", "총지원금_이전", "총지원금_현재", "변화"]].rename(
                            columns={"총지원금_이전": "이전", "총지원금_현재": "현재"}
                        ).style.format({"이전": "{:,.0f}", "현재": "{:,.0f}", "변화": "{:+,.0f}"}),
                        use_container_width=True,
                        hide_index=True,
                    )

            with col_d:
                st.markdown("#### ⬇️ 지원금 인하 TOP 10")
                if down.empty:
                    st.info("인하 없음")
                else:
                    st.dataframe(
                        down[["업체명", "상품명", "통신사", "총지원금_이전", "총지원금_현재", "변화"]].rename(
                            columns={"총지원금_이전": "이전", "총지원금_현재": "현재"}
                        ).style.format({"이전": "{:,.0f}", "현재": "{:,.0f}", "변화": "{:+,.0f}"}),
                        use_container_width=True,
                        hide_index=True,
                    )

            # 시계열 트렌드 (전체 월 기록 있을 때)
            all_months = hist.list_months()
            if len(all_months) >= 2:
                st.markdown("#### 📈 월별 평균 총지원금 트렌드")
                trend_rows = []
                for m in sorted(all_months):
                    snap = hist.load_snapshot(m)
                    if snap:
                        snap_df = merge_all(snap, cat_filter, source_filter)
                        if not snap_df.empty:
                            trend_rows.append({
                                "월": m,
                                "평균 총지원금": snap_df["총지원금"].mean(),
                            })
                if trend_rows:
                    trend_df = pd.DataFrame(trend_rows)
                    fig_trend = px.line(
                        trend_df, x="월", y="평균 총지원금",
                        markers=True, height=300,
                    )
                    fig_trend.update_traces(line_color="#3B82F6", marker_size=8)
                    fig_trend.update_layout(plot_bgcolor="white", yaxis=dict(gridcolor="#F3F4F6"))
                    st.plotly_chart(fig_trend, use_container_width=True)


# ─────────────── TAB 3: 업체 순위 ─────────────────────────────
with tab3:
    st.subheader("업체별 지원금 순위")

    cat3 = st.selectbox("카테고리", ["인터넷", "유심", "가전"], key="tab3_cat")
    df3 = df[df["category"] == cat3].copy()

    if df3.empty:
        st.info("데이터 없음")
    else:
        rank_df = (
            df3.groupby("업체명")
            .agg(
                평균_총지원금=("총지원금", "mean"),
                최대_총지원금=("총지원금", "max"),
                최소_총지원금=("총지원금", "min"),
                조사건수=("총지원금", "count"),
            )
            .round(0)
            .sort_values("평균_총지원금", ascending=False)
            .reset_index()
        )
        rank_df["순위"] = range(1, len(rank_df) + 1)

        # 렌트리 격차 추가
        gap_df = df3[df3["격차"].notna()].groupby("업체명")["격차"].mean().round(0)
        rank_df = rank_df.merge(gap_df.rename("평균_격차"), on="업체명", how="left")

        # 색상: 렌트리 우위면 초록, 열세면 빨강
        def color_gap(val):
            if pd.isna(val):
                return ""
            if val > 0:
                return "color: #10B981; font-weight: bold"
            elif val < 0:
                return "color: #EF4444; font-weight: bold"
            return ""

        styled = rank_df[["순위", "업체명", "평균_총지원금", "최대_총지원금", "최소_총지원금", "평균_격차", "조사건수"]].style.format(
            {
                "평균_총지원금": "{:,.0f}",
                "최대_총지원금": "{:,.0f}",
                "최소_총지원금": "{:,.0f}",
                "평균_격차": "{:+,.0f}",
            }
        ).applymap(color_gap, subset=["평균_격차"])

        st.dataframe(styled, use_container_width=True, hide_index=True)

        # 바 차트
        fig3 = px.bar(
            rank_df.sort_values("평균_총지원금"),
            x="평균_총지원금",
            y="업체명",
            orientation="h",
            color="평균_격차",
            color_continuous_scale="RdYlGn",
            color_continuous_midpoint=0,
            height=max(300, len(rank_df) * 45),
            labels={"평균_총지원금": "평균 총지원금 (원)", "평균_격차": "렌트리 격차"},
        )
        fig3.update_layout(plot_bgcolor="white")
        st.plotly_chart(fig3, use_container_width=True)


# ─────────────── TAB 4: 통신사별 분석 ────────────────────────
with tab4:
    st.subheader("통신사 × 상품 유형별 분석")

    cat4 = st.selectbox("카테고리", ["인터넷", "유심", "가전"], key="tab4_cat")
    df4 = df[df["category"] == cat4].copy()

    if df4.empty:
        st.info("데이터 없음")
    else:
        col_a, col_b = st.columns(2)

        with col_a:
            st.markdown("#### 통신사별 평균 총지원금")
            tel_df = (
                df4.groupby("통신사")["총지원금"]
                .mean()
                .sort_values(ascending=False)
                .reset_index()
            )
            fig4a = px.bar(
                tel_df, x="통신사", y="총지원금",
                color="통신사", height=320,
                text=tel_df["총지원금"].apply(lambda x: f"{x/10000:.0f}만"),
            )
            fig4a.update_layout(showlegend=False, plot_bgcolor="white")
            st.plotly_chart(fig4a, use_container_width=True)

        with col_b:
            st.markdown("#### 구분별 평균 총지원금")
            seg_df = (
                df4.groupby("구분")["총지원금"]
                .mean()
                .sort_values(ascending=False)
                .reset_index()
            )
            fig4b = px.pie(
                seg_df, names="구분", values="총지원금",
                height=320, hole=0.4,
            )
            st.plotly_chart(fig4b, use_container_width=True)

        # 통신사 × 구분 pivot
        st.markdown("#### 통신사 × 구분 평균 총지원금 (만원)")
        pivot4 = (
            df4.groupby(["통신사", "구분"])["총지원금"]
            .mean()
            .unstack("구분")
            .round(0)
            .div(10000)
            .round(1)
        )
        st.dataframe(
            pivot4.style.background_gradient(cmap="Blues", axis=None).format("{:.1f}만"),
            use_container_width=True,
        )


# ─────────────── TAB 5: 전체 데이터 ──────────────────────────
with tab5:
    st.subheader("전체 데이터")

    search = st.text_input("🔍 검색 (업체명, 상품명, 통신사)", "")
    display_df = df.copy()
    if search:
        mask = (
            display_df["업체명"].str.contains(search, na=False) |
            display_df["상품명"].str.contains(search, na=False) |
            display_df["통신사"].str.contains(search, na=False)
        )
        display_df = display_df[mask]

    show_cols = [
        "category", "source", "통신사", "상품명", "구분", "업체명",
        "현금", "상품권", "추가현금", "리뷰보너스", "설치비",
        "총지원금", "렌트리지원금", "격차",
    ]
    col_labels = {
        "category": "카테고리", "source": "조사처",
        "현금": "현금", "상품권": "상품권",
        "추가현금": "추가현금", "리뷰보너스": "리뷰",
        "설치비": "설치비", "총지원금": "총지원금",
        "렌트리지원금": "렌트리", "격차": "격차(렌트리-타사)",
    }

    fmt = {c: "{:,.0f}" for c in ["현금", "상품권", "추가현금", "리뷰보너스", "설치비", "총지원금", "렌트리지원금"]}
    fmt["격차"] = "{:+,.0f}"

    def color_diff(val):
        try:
            v = float(val)
            if v > 0:
                return "color: #10B981"
            if v < 0:
                return "color: #EF4444"
        except Exception:
            pass
        return ""

    st.dataframe(
        display_df[show_cols]
        .rename(columns=col_labels)
        .style.format(fmt, na_rep="—")
        .applymap(color_diff, subset=["격차(렌트리-타사)"]),
        use_container_width=True,
        height=500,
        hide_index=True,
    )

    st.caption(f"총 {len(display_df):,}행 표시")

    # 다운로드
    csv = display_df[show_cols].to_csv(index=False, encoding="utf-8-sig")
    st.download_button(
        "📥 CSV 다운로드",
        csv,
        file_name=f"지원금비교_{month_input}.csv",
        mime="text/csv",
    )
