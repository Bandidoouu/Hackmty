import { useState } from 'react'
import Card from '../components/Card'

export default function Onboarding(){
  const [income, setIncome] = useState(18000)
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <Card title="Bienvenido">
        <p className="mb-3">Configura tu ingreso mensual simulado y carga datos de demo (seed).</p>
        <div className="flex gap-2 items-center">
          <label>Ingreso mensual</label>
          <input type="number" value={income} onChange={e=>setIncome(parseFloat(e.target.value))} className="border rounded p-2"/>
          <button className="btn btn-primary" onClick={()=>alert('En el MVP, el ingreso está en seed. Puedes ajustar en backend/scripts/seed.py')}>Guardar</button>
        </div>
      </Card>
      <Card title="Datos de prueba">
        <p className="mb-3">Ya se incluyen 90 días de transacciones (seed). Si necesitas resembrar, ejecuta <code>python scripts/seed.py</code>.</p>
        <button className="btn" onClick={()=>alert('Seed listo por defecto.')}>
          Cargar seed
        </button>
      </Card>
    </div>
  )
}
