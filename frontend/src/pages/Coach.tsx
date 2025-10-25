import React from "react";
import { coachSend } from "../lib/api";

export default function Coach() {
  const [input, setInput] = React.useState<string>("Quiero ahorrar para un viaje. ¿Por dónde empiezo?");
  const [reply, setReply] = React.useState<string>("");

  async function onSend() {
    try {
      const r = await coachSend(input);
      setReply(r.reply);
    } catch (e:any) {
      setReply("Error: " + e.message);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 720 }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>Coach financiero</h2>
      <textarea value={input} onChange={e => setInput(e.target.value)} style={{ width: "100%", minHeight: 120, padding: 8, borderRadius: 8, border: "1px solid #ddd" }} />
      <div>
        <button onClick={onSend} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc", background: "#111", color: "#fff" }}>
          Enviar
        </button>
      </div>
      <div style={{ whiteSpace: "pre-wrap", border: "1px solid #eee", padding: 12, borderRadius: 12, minHeight: 80 }}>
        {reply || "Respuesta aparecerá aquí."}
      </div>
      <small>Si no configuras GEMINI_API_KEY en backend/.env, verás una respuesta básica.</small>
    </div>
  );
}
