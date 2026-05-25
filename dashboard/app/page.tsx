const shortcuts = [
  {
    label: "스니펫",
    bg: "#e8f0fe",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#4285F4">
        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
      </svg>
    ),
  },
  {
    label: "받은편지함 (7)",
    bg: "#fff",
    border: "1px solid #dadce0",
    icon: (
      <span style={{ fontSize: "20px", fontWeight: 700, fontFamily: "Georgia, serif", color: "#EA4335" }}>
        M
      </span>
    ),
  },
  {
    label: "커머스",
    bg: "#fef7e0",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#FBBC05">
        <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
      </svg>
    ),
  },
  {
    label: "NAVER",
    bg: "#03C75A",
    icon: (
      <span style={{ fontSize: "18px", fontWeight: 700, color: "#fff", fontFamily: "Arial, sans-serif" }}>
        N
      </span>
    ),
  },
  {
    label: "Google Sheets",
    bg: "#e6f4ea",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#0F9D58">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-2h2v2zm0-4H7v-2h2v2zm0-4H7V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" />
      </svg>
    ),
  },
  {
    label: "렌트리",
    bg: "#e8f0fe",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#4285F4">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
      </svg>
    ),
  },
  {
    label: "자세히 보기",
    bg: "#f1f3f4",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#5f6368">
        <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z" />
      </svg>
    ),
  },
];

const driveFiles = [
  { type: "doc", name: "영업업무 재위탁계약서_헬스케어몰", time: "오늘 수정함" },
  { type: "sheet", name: "제목 없는 스프레드시트", time: "오늘 열었음" },
  { type: "sheet", name: "[SF] 더블체크 상담&접수의 모든 것 : 백과사전 만들기", time: "오늘 열었음" },
  { type: "sheet", name: "로젠이사_상품 리스트", time: "이 시간대에 자주 이용함" },
  { type: "sheet", name: "2026_LG헬스케어 정책한판", time: "이 시간대에 자주 이용함" },
  { type: "sheet", name: "판매가능한 LG 상품 리스트 파악", time: "이 시간대에 자주 이용함" },
];

export default function Home() {
  return (
    <div
      style={{
        backgroundColor: "#f2f2f2",
        minHeight: "100vh",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          padding: "64px 16px 32px",
        }}
      >
        {/* Google 로고 */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <span style={{ fontSize: "52px", fontWeight: 400, letterSpacing: "-1px", lineHeight: 1 }}>
            <span style={{ color: "#4285F4" }}>G</span>
            <span style={{ color: "#EA4335" }}>o</span>
            <span style={{ color: "#FBBC05" }}>o</span>
            <span style={{ color: "#4285F4" }}>g</span>
            <span style={{ color: "#34A853" }}>l</span>
            <span style={{ color: "#EA4335" }}>e</span>
          </span>
        </div>

        {/* 검색창 */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "28px",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            boxShadow: "0 1px 6px rgba(32,33,36,0.22)",
            marginBottom: "28px",
          }}
        >
          <span style={{ color: "#5f6368", fontSize: "20px", lineHeight: 1, flexShrink: 0 }}>+</span>
          <span style={{ flex: 1, color: "#9aa0a6", fontSize: "15px" }}>Google에 물어보기</span>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
            {/* 마이크 */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#5f6368">
              <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V6zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
            {/* 카메라 */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#5f6368">
              <path d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9m3 15a5 5 0 0 1-5-5 5 5 0 0 1 5-5 5 5 0 0 1 5 5 5 5 0 0 1-5 5z" />
            </svg>
            {/* AI 모드 버튼 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                border: "1px solid #dadce0",
                borderRadius: "14px",
                padding: "4px 10px",
                cursor: "pointer",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <span style={{ fontSize: "12px", color: "#5f6368", fontWeight: 500, whiteSpace: "nowrap" }}>
                AI 모드
              </span>
            </div>
          </div>
        </div>

        {/* 바로가기 */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            overflowX: "auto",
            paddingBottom: "4px",
            marginBottom: "24px",
            scrollbarWidth: "none",
          }}
        >
          {shortcuts.map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
                minWidth: "72px",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "12px",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: s.bg,
                  border: s.border || "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                {s.icon}
              </div>
              <span
                style={{
                  fontSize: "11px",
                  color: "#3c4043",
                  textAlign: "center",
                  lineHeight: "1.3",
                  wordBreak: "keep-all",
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Google Drive 카드 */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          }}
        >
          {/* 헤더 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 16px 8px",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 500, color: "#3c4043" }}>Google Drive</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#5f6368">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </div>

          {/* 파일 목록 */}
          {driveFiles.map((f, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 16px",
                cursor: "pointer",
                borderTop: i === 0 ? "none" : "1px solid #f1f3f4",
              }}
            >
              {/* 파일 아이콘 */}
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "6px",
                  backgroundColor: f.type === "doc" ? "#4285F4" : "#0F9D58",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {f.type === "doc" ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zm-9-4h6v2H9v-2zm0-4h6v2H9v-2z" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-2h2v2zm0-4H7v-2h2v2zm0-4H7V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2zm4 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" />
                  </svg>
                )}
              </div>

              {/* 파일명 + 시간 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#3c4043",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {f.name}
                </div>
                <div style={{ fontSize: "11px", color: "#80868b", marginTop: "2px" }}>{f.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
