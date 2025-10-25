import React from "react";
import { getHealth, budgetSummary, streakCheckin, simulatePaycheck, p2pTransfer } from "../lib/api";

export default function Dashboard() {
  const [health, setHealth] = React.useState<string>("…");
  const [budget, setBudget] = React.useState<any>(null);
  const [streak, setStreak] = React.useState<any>(null);
  const [amount, setAmount] = React.useState<string>("2500");
  const [toAccount, setToAccount] = React.useState<string>("ACC_DEMO");
  const [busy, setBusy] = React.useState<boolean>(false);
  const [log, setLog] = React.useState<string>("");

  React.useEffect(() => {
    getHealth().then(h => setHealth(h.status)).catch(() => setHealth("error"));
    budgetSummary(1).then(setBudget).catch(err => console.error(err));
    streakCheckin(1).then(setStreak).catch(err => console.error(err));
  }, []);

  async function onSimulate() {
    try {
      setBusy(true);
      const a = Number(amount);
      if (!Number.isFinite(a) || a <= 0) throw new Error("Monto inválido");
      const r = await simulatePaycheck(a);
      setLog(prev => `[simulate] OK: ${JSON.stringify(r)}\n` + prev);
    } catch (e:any) {
      setLog(prev => `[simulate] ERROR: ${e.message}\n` + prev);
    } finally {
      setBusy(false);
    }
  }

  async function onTransfer() {
    try {
      setBusy(true);
      const a = Number(amount);
      if (!Number.isFinite(a) || a <= 0) throw new Error("Monto inválido");
      const r = await p2pTransfer(toAccount, a, "Demo transfer");
      setLog(prev => `[transfer] OK: ${JSON.stringify(r)}\n` + prev);
    } catch (e:any) {
      setLog(prev => `[transfer] ERROR: ${e.message}\n` + prev);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span>Backend:</span>
        <strong>{health}</strong>
      </section>

      <section style={{ display: "grid", gap: 8, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Resumen</h2>
        {budget ? (
          <div style={{ display: "flex", gap: 24 }}>
            <div>Ingreso estimado: <strong>${budget.income_estimate}</strong></div>
            <div>Necesidades: <strong>${budget.categories.needs}</strong></div>
            <div>Gustos: <strong>${budget.categories.wants}</strong></div>
            <div>Ahorro: <strong>${budget.categories.savings}</strong></div>
          </div>
        ) : "Cargando..."}
        {streak && (
          <div>Racha: <strong>{streak.streak}</strong> día(s) — Último check-in: {streak.last_checkin}</div>
        )}
      </section>

      <section style={{ display: "grid", gap: 8, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Operaciones Nessie</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label>Monto:</label>
          <input value={amount} onChange={e => setAmount(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }} />
          <button onClick={onSimulate} disabled={busy} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc", background: "#111", color: "#fff" }}>
            Simular nómina
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label>Cuenta destino:</label>
          <input value={toAccount} onChange={e => setToAccount(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }} />
          <button onClick={onTransfer} disabled={busy} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc", background: "#fff" }}>
            Transferir P2P
          </button>
        </div>
        <textarea readOnly value={log} placeholder="Logs…" style={{ width: "100%", minHeight: 140, padding: 8, borderRadius: 8, border: "1px solid #ddd" }} />
        <small>Si ves errores 502, revisa tu .env y conectividad con Nessie (usa HTTP).</small>
      </section>
    </div>
  );
}
