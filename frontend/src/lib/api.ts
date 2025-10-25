const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export async function getBudgetSummary() {
  const res = await fetch(`${BASE}/budget/summary?user_id=1`)
  return res.json()
}
export async function checkin() {
  const res = await fetch(`${BASE}/streak/checkin?user_id=1`, { method: 'POST' })
  return res.json()
}
export async function createGoal(name: string, target_amount: number) {
  const res = await fetch(`${BASE}/goals`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ user_id:1, name, target_amount })})
  return res.json()
}
export async function simulatePaycheck(amount: number) {
  const res = await fetch(`${BASE}/nessie/simulate-paycheck`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ account_id:'ACC_DEMO', amount, description: 'Nómina semanal' })})
  return res.json()
}
export async function scheduleBill(payee: string, amount: number, payment_date: string) {
  const res = await fetch(`${BASE}/nessie/schedule-bill`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ account_id:'ACC_DEMO', payee, amount, payment_date })})
  return res.json()
}
export async function p2pTransfer(to: string, amount: number) {
  const res = await fetch(`${BASE}/nessie/p2p-transfer`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ from_account:'ACC_1', to_account: to, amount, description:'P2P' })})
  return res.json()
}
