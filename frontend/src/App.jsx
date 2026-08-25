import { useState, useRef, useEffect } from "react";

const API_URL = "http://127.0.0.1:8000";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [docs, setDocs] = useState([]);
  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_URL}/upload`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) alert(data.error);
      else {
        setDocs((p) => [...p, { name: data.filename, chunks: data.chunks_created, id: data.doc_id }]);
      }
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleAsk() {
    if (!question.trim()) return;
    const userMsg = { role: "user", text: question };
    setMessages((p) => [...p, userMsg]);
    setQuestion("");
    setAsking(true);
    try {
      const res = await fetch(`${API_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userMsg.text,
          doc_ids: docs.map((d) => d.id),
          history: messages.map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json();
      setMessages((p) => [
        ...p,
        {
          role: "assistant",
          text: data.answer,
          trustScore: data.trust_score,
          flagged: data.flagged_chunk_indices || [],
          sourceCount: data.sources ? data.sources.length : 0,
        },
      ]);
    } catch (err) {
      setMessages((p) => [...p, { role: "assistant", text: "Error — " + err.message }]);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div style={s.navBrand}>
          <div style={s.navMark} />
          SecureRAG
        </div>
        <div style={s.navRight}>
          <span style={s.navStatus}>
            <span style={{ ...s.navDot, background: docs.length ? BLUE : "#C7CCD9" }} />
            {docs.length ? `${docs.length} document${docs.length > 1 ? "s" : ""} indexed` : "No documents yet"}
          </span>
        </div>
      </nav>

      <section style={s.hero}>
        <span style={s.heroEyebrow}>Document verification</span>
        <h1 style={s.heroTitle}>Ask your documents. Trust the answer.</h1>
        <p style={s.heroSub}>
          Upload a file, ask a question, and get an answer sourced from your
          own content — with a trust score that flags anything the model
          couldn't fully verify.
        </p>
      </section>

      <div style={s.workspace}>
        <aside style={s.sidebar}>
          <span style={s.sidebarLabel}>Documents</span>

          <label style={s.uploadZone}>
            <span style={s.uploadPlus}>{uploading ? "…" : "+"}</span>
            <span style={s.uploadText}>
              {uploading ? "Uploading" : "Upload a document"}
            </span>
            <span style={s.uploadHint}>PDF or TXT</span>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUpload}
              style={{ display: "none" }}
              accept=".pdf,.txt"
            />
          </label>

          <div style={s.docList}>
            {docs.length === 0 ? (
              <div style={s.docEmpty}>Nothing uploaded yet.</div>
            ) : (
              docs.map((d, i) => (
                <div key={i} style={s.docCard}>
                  <div style={s.docName}>{d.name}</div>
                  <div style={s.docMeta}>{d.chunks} chunks</div>
                </div>
              ))
            )}
          </div>

          <div style={s.legend}>
            <span style={s.sidebarLabel}>Trust scale</span>
            <LegendRow color={BLUE} label="Verified" />
            <LegendRow color={AMBER} label="Partial match" />
            <LegendRow color={RED} label="Source flagged" />
          </div>
        </aside>

        <main style={s.main}>
          <div style={s.chatArea} ref={scrollRef}>
            {messages.length === 0 && (
              <div style={s.emptyState}>
                <div style={s.emptyTitle}>Ask your first question</div>
                <div style={s.emptySub}>
                  Upload a document on the left, then type a question below.
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} style={s.userRow}>
                  <div style={s.userBubble}>{m.text}</div>
                </div>
              ) : (
                <div key={i} style={s.assistantRow}>
                  <div style={s.assistantCard}>
                    <div style={s.assistantText}>{m.text}</div>
                    {m.trustScore !== undefined && (
                      <TrustMeter score={m.trustScore} flagged={m.flagged.length} sources={m.sourceCount} />
                    )}
                  </div>
                </div>
              )
            )}

            {asking && (
              <div style={s.assistantRow}>
                <div style={s.assistantCard}>
                  <div style={s.typingRow}>
                    <span style={s.typingDot} />
                    <span style={{ ...s.typingDot, animationDelay: "0.15s" }} />
                    <span style={{ ...s.typingDot, animationDelay: "0.3s" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={s.inputBar}>
            <input
              style={s.input}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder="Ask a question about your document…"
            />
            <button
              style={{ ...s.sendButton, opacity: asking || !question.trim() ? 0.4 : 1 }}
              onClick={handleAsk}
              disabled={asking || !question.trim()}
            >
              Ask
            </button>
          </div>
        </main>
      </div>

      <style>{`
        @keyframes pulse { 0%,80%,100% { opacity:.2; transform:scale(.8);} 40% { opacity:1; transform:scale(1);} }
        input::placeholder { color: #9AA1B5; }
        input:focus { outline: none; }
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
    </div>
  );
}

function LegendRow({ color, label }) {
  return (
    <div style={s.legendRow}>
      <span style={{ ...s.legendDot, background: color }} />
      <span style={s.legendText}>{label}</span>
    </div>
  );
}

function TrustMeter({ score, flagged, sources }) {
  const segments = 10;
  const filled = Math.round(score * segments);
  const color = score >= 0.8 ? BLUE : score >= 0.5 ? AMBER : RED;
  return (
    <div style={s.trustWrap}>
      <div style={s.trustBars}>
        {Array.from({ length: segments }).map((_, i) => (
          <div key={i} style={{ ...s.trustBar, background: i < filled ? color : "#E7E9F0" }} />
        ))}
      </div>
      <div style={s.trustMeta}>
        <span style={{ color, fontWeight: 600 }}>{(score * 100).toFixed(0)}% trust</span>
        <span style={s.trustDivider}>·</span>
        <span>{sources} sources</span>
        {flagged > 0 && (
          <>
            <span style={s.trustDivider}>·</span>
            <span style={{ color: RED }}>{flagged} flagged</span>
          </>
        )}
      </div>
    </div>
  );
}

const BLUE = "#3B5BDB";
const AMBER = "#C98A2B";
const RED = "#C6392F";
const INK = "#1A1D29";
const BODY = "#5B6072";
const BORDER = "#EBECF1";
const PANEL_TINT = "#FAFAFC";
const SANS = "'Inter', system-ui, -apple-system, sans-serif";
const SHADOW = "0 1px 2px rgba(20,22,35,0.04), 0 4px 16px rgba(20,22,35,0.04)";

const s = {
  page: {
    minHeight: "100vh",
    background: "#FFFFFF",
    color: INK,
    fontFamily: SANS,
    display: "flex",
    flexDirection: "column",
  },
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "18px 40px",
    borderBottom: `1px solid ${BORDER}`,
  },
  navBrand: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    fontWeight: 700,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  navMark: {
    width: 18,
    height: 18,
    borderRadius: 5,
    background: `linear-gradient(135deg, ${BLUE}, #1A3AAE)`,
  },
  navRight: {},
  navStatus: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontSize: 12.5,
    color: BODY,
  },
  navDot: { width: 6, height: 6, borderRadius: "50%" },
  hero: {
    padding: "64px 40px 44px",
    maxWidth: 640,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: BLUE,
    display: "block",
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: 700,
    lineHeight: 1.25,
    letterSpacing: -0.6,
    margin: 0,
    color: INK,
  },
  heroSub: {
    fontSize: 15,
    color: BODY,
    lineHeight: 1.65,
    marginTop: 16,
    maxWidth: 520,
  },
  workspace: {
    display: "flex",
    flex: 1,
    borderTop: `1px solid ${BORDER}`,
    minHeight: 0,
    background: PANEL_TINT,
  },
  sidebar: {
    width: 272,
    padding: "28px 20px",
    flexShrink: 0,
    overflowY: "auto",
  },
  sidebarLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#A5AABC",
    display: "block",
    marginBottom: 12,
  },
  uploadZone: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: "26px 12px",
    borderRadius: 14,
    border: `1.5px dashed #D5D8E3`,
    cursor: "pointer",
    background: "#fff",
    boxShadow: SHADOW,
  },
  uploadPlus: { fontSize: 18, color: BLUE, fontWeight: 700 },
  uploadText: { fontSize: 13, fontWeight: 600 },
  uploadHint: { fontSize: 11, color: "#A5AABC" },
  docList: { marginTop: 18, display: "flex", flexDirection: "column", gap: 8 },
  docEmpty: { fontSize: 13, color: "#A5AABC" },
  docCard: {
    background: "#fff",
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: "10px 12px",
  },
  docName: {
    fontSize: 13,
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  docMeta: { fontSize: 11, color: "#A5AABC", marginTop: 2 },
  legend: { marginTop: 30 },
  legendRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 9 },
  legendDot: { width: 6, height: 6, borderRadius: "50%" },
  legendText: { fontSize: 12.5, color: BODY },
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, padding: "20px 20px 0 0" },
  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    background: "#fff",
    borderRadius: 18,
    border: `1px solid ${BORDER}`,
    boxShadow: SHADOW,
    marginBottom: 16,
  },
  emptyState: { margin: "auto", textAlign: "center", maxWidth: 300 },
  emptyTitle: { fontSize: 15, fontWeight: 700, marginBottom: 6, color: INK },
  emptySub: { fontSize: 13.5, color: BODY, lineHeight: 1.55 },
  userRow: { display: "flex", justifyContent: "flex-end" },
  userBubble: {
    maxWidth: "66%",
    background: INK,
    color: "#fff",
    borderRadius: "14px 14px 3px 14px",
    padding: "10px 15px",
    fontSize: 13.5,
    lineHeight: 1.55,
  },
  assistantRow: { display: "flex", justifyContent: "flex-start" },
  assistantCard: {
    maxWidth: "76%",
    background: PANEL_TINT,
    border: `1px solid ${BORDER}`,
    borderRadius: "14px 14px 14px 3px",
    padding: "13px 16px",
  },
  assistantText: { fontSize: 13.5, lineHeight: 1.6, color: INK },
  trustWrap: { marginTop: 12, paddingTop: 11, borderTop: `1px solid ${BORDER}` },
  trustBars: { display: "flex", gap: 3, marginBottom: 7 },
  trustBar: { flex: 1, height: 4, borderRadius: 2 },
  trustMeta: {
    fontSize: 11,
    color: BODY,
    display: "flex",
    gap: 6,
    alignItems: "center",
    fontWeight: 500,
  },
  trustDivider: { color: "#C7CCD9" },
  typingRow: { display: "flex", gap: 5, padding: "3px 2px" },
  typingDot: { width: 6, height: 6, borderRadius: "50%", background: BLUE, animation: "pulse 1.2s infinite ease-in-out" },
  inputBar: {
    display: "flex",
    gap: 10,
    paddingBottom: 20,
  },
  input: {
    flex: 1,
    background: "#fff",
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    color: INK,
    fontSize: 13.5,
    fontFamily: SANS,
    padding: "12px 16px",
    boxShadow: SHADOW,
  },
  sendButton: {
    background: INK,
    color: "#fff",
    border: "none",
    padding: "0 22px",
    borderRadius: 12,
    fontWeight: 600,
    fontSize: 13.5,
    cursor: "pointer",
  },
};