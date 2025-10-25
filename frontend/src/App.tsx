import { useEffect, useMemo, useState } from "react";
import "./index.css";
import { API_BASE, getHealth, getSummary, simulatePaycheck } from "./lib/api";

type Summary = {
  min_to_live: number;
  needs: number;
  wants: number;
  savings: number;
};

type Toast = { type: "ok" | "err"; title: string; msg: string } | null;

function currency(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

export default function App() {
  const [backend, setBackend] = useState<"ok" | "down">("down");
  const [sum, setSum] = useState<Summary | null>(null);

  const [amount, setAmount] = useState<number>(2500);
  const [accountId, setAccountId] = useState<string>(""); // tu cuenta real de Nessie aquí si quieres fijarla
  const [last, setLast] = useState<any>(null);
  const [toast, setToast] = useState<Toast>(null);
  const apiShown = useMemo(() => API_BASE.replace(/^https?:\/\//, ""), []);

  useEffect(() => {
    (async () => {
      const h = await getHealth();
      setBackend(h);
      try {
        const s = await getSummary(1);
        setSum(s);
      } catch {
        // si el endpoint no existe, omitimos el resumen
        setSum(null);
      }
    })();
  }, []);

  async function onSimular() {
    try {
      const r = await simulatePaycheck(amount, accountId || undefined);
      setLast(r);
      setToast({
        type: "ok",
        title: "Depósito creado",
        msg:
          `Se registró un depósito por ${currency(amount)} ` +
          (r?.objectCreated?._id ? `• id: ${r.objectCreated._id}` : ""),
      });
    } catch (e: any) {
      setLast({ error: String(e) });
      setToast({
        type: "err",
        title: "Error al simular",
        msg: e?.message ?? "Ocurrió un error inesperado",
      });
    }
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <div className="brand">FinCoach</div>
        <div className={`badge ${backend === "ok" ? "ok" : "err"}`}>
          <span className="dot" />
          Backend: {backend} <span style={{ opacity: .6 }}>({apiShown})</span>
        </div>
      </div>

      <div className="grid">
        {/* Resumen */}
        <section className="card" style={{ minHeight: 160 }}>
          <h3>Resumen</h3>
          {sum ? (
            <div className="kpis">
              <div className="kpi">
                <div className="label">Mínimo para vivir</div>
                <div className="value">{currency(sum.min_to_live || 0)}</div>
              </div>
              <div className="kpi">
                <div className="label">Necesidades</div>
                <div className="value">{currency(sum.needs || 0)}</div>
              </div>
              <div className="kpi">
                <div className="label">Gustos</div>
                <div className="value">{currency(sum.wants || 0)}</div>
              </div>
              <div className="kpi">
                <div className="label">Ahorro</div>
                <div className="value">{currency(sum.savings || 0)}</div>
              </div>
            </div>
          ) : (
            <div className="label" style={{ marginTop: 6 }}>
              (El resumen no está disponible. El backend está activo, pero ese endpoint puede estar vacío.)
            </div>
          )}
        </section>

        {/* Operaciones Nessie */}
        <section className="card">
          <h3>Operaciones Nessie</h3>

          <div className="row">
            <div>
              <div className="label">Monto</div>
              <input
                className="input"
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value || 0))}
                min={1}
              />
            </div>

            <div>
              <div className="label">Cuenta destino (opcional)</div>
              <input
                className="input"
                placeholder="ID de cuenta Nessie"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              />
            </div>

            <div style={{ marginTop: 18 }}>
              <button className="btn" onClick={onSimular}>
                Simular nómina
              </button>
            </div>
          </div>

          {last && (
            <>
              <div className="label" style={{ marginTop: 12 }}>
                Detalle (debug)
              </div>
              <pre className="pretty">{JSON.stringify(last, null, 2)}</pre>
            </>
          )}
        </section>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          <div>
            <div className="title">{toast.title}</div>
            <div className="msg">{toast.msg}</div>
          </div>
          <button className="close" onClick={() => setToast(null)}>✕</button>
        </div>
      )}
    </div>
  );
}
