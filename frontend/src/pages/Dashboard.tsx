import { useEffect, useState } from 'react'
import Card from '../components/Card'
import AntList from '../components/AntList'
import Streak from '../components/Streak'
import { getBudgetSummary, simulatePaycheck, scheduleBill, p2pTransfer } from '../lib/api'

export default function Dashboard(){
  const [summary, setSummary] = useState<any>(null)
  const [paycheck, setPaycheck] = useState(2500)
  const [bill, setBill] = useState({payee:'CFE', amount:650, payment_date:'2025-10-30'})
  const [p2p, setP2p] = useState({to:'ACC_2', amount:200})

  const load = async ()=> setSummary(await getBudgetSummary())
  useEffect(()=>{ load() },[])

  return (
    <div className="max-w-5xl mx-auto p-4 grid md:grid-cols-2 gap-4">
      <Card title="Mínimo para vivir">
        <div className="text-3xl font-bold mb-2">${summary?.survival_min?.toFixed?.(2) ?? '-'} MXN</div>
        <p>Colchón estimado: <b>${summary?.cushion?.toFixed?.(2) ?? '-'}</b></p>
      </Card>

      <Card title="Gasto hormiga (últimos 30 días)">
        <div className="text-3xl font-bold mb-2">${summary?.ant_spend?.toFixed?.(2) ?? '-'}</div>
        <AntList items={summary?.top_ant ?? []} />
      </Card>

      <Card title="Simular nómina">
        <div className="flex items-center gap-2">
          <input type="number" value={paycheck} onChange={e=>setPaycheck(parseFloat(e.target.value))} className="border rounded p-2 w-32"/>
          <button className="btn btn-primary" onClick={async()=>{await simulatePaycheck(paycheck); alert('Ok (mock o Nessie)')}}>Simular</button>
        </div>
      </Card>

      <Card title="Programar pago">
        <div className="flex flex-col gap-2">
          <input className="border rounded p-2" placeholder="Payee" value={bill.payee} onChange={e=>setBill({...bill, payee:e.target.value})}/>
          <input className="border rounded p-2" type="number" placeholder="Amount" value={bill.amount} onChange={e=>setBill({...bill, amount:parseFloat(e.target.value)})}/>
          <input className="border rounded p-2" placeholder="YYYY-MM-DD" value={bill.payment_date} onChange={e=>setBill({...bill, payment_date:e.target.value})}/>
          <button className="btn btn-primary" onClick={async()=>{await scheduleBill(bill.payee, bill.amount, bill.payment_date); alert('Pago programado (mock o Nessie)')}}>Programar</button>
        </div>
      </Card>

      <Card title="Transferencia P2P">
        <div className="flex items-center gap-2">
          <input className="border rounded p-2" placeholder="Cuenta destino" value={p2p.to} onChange={e=>setP2p({...p2p, to:e.target.value})}/>
          <input className="border rounded p-2 w-28" type="number" placeholder="Monto" value={p2p.amount} onChange={e=>setP2p({...p2p, amount:parseFloat(e.target.value)})}/>
          <button className="btn btn-primary" onClick={async()=>{await p2pTransfer(p2p.to, p2p.amount); alert('Transferencia ok (mock o Nessie)')}}>Enviar</button>
        </div>
      </Card>

      <Streak />
    </div>
  )
}
