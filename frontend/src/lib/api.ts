/**
 * API helpers para el frontend.
 * Usa variables de entorno si existen, si no, cae a http://localhost:8000
 */

// cast a any para evitar el warning "Property 'env' does not exist on type 'ImportMeta'"
const IM: any = import.meta as any;

const BACKEND_PORT: number = Number(IM?.env?.VITE_BACKEND_PORT ?? 8000);
export const API_BASE: string =
  IM?.env?.VITE_API_BASE ?? `http://localhost:${BACKEND_PORT}`;

async function asJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export type Health = { status: string } | string;

export async function getHealth(): Promise<'ok' | 'down'> {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
    if (!res.ok) return 'down';
    const data = (await res.json()) as any;
    const status = typeof data === 'string' ? data : data?.status;
    return (status || '').toLowerCase().includes('ok') ? 'ok' : 'down';
  } catch {
    return 'down';
  }
}

export async function getSummary(userId = 1): Promise<{
  min_to_live: number; needs: number; wants: number; savings: number;
}> {
  return asJson(fetch(`${API_BASE}/budget/summary?user_id=${userId}`));
}

export async function simulatePaycheck(amount: number, account_id?: string): Promise<any> {
  const body: any = { amount: Number(amount) };
  if (account_id) body.account_id = account_id;
  const res = await fetch(`${API_BASE}/nessie/simulate-paycheck`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return asJson(res);
}
