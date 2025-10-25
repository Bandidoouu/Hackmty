import { useState } from 'react'
import Card from '../components/Card'
import { getBudgetSummary, createGoal } from '../lib/api'

export default function Coach(){
  const [messages, setMessages] = useState<string[]>([
    "Hola, soy FinCoach. Soy educativo. Pídeme 3 acciones concretas para ahorrar esta semana."
  ])

  const ask = async () => {
    const sum = await getBudgetSummary()
    const tips = [
      `Recorta 2 cafés = ~$110 MXN/sem`,
      `Sustituye 1 snack/día = ~$140 MXN/sem`,
      `Revisa suscripciones (> $100/mes)`
    ]
    setMessages(m => [...m, `Diagnóstico breve: hormiga aprox $${sum.ant_spend} en 30 días.`, `Acciones: ${tips.join(" | ")}`, `¿Creo una meta de $400 MXN en 14 días?`])
  }

  const makeGoal = async ()=>{
    const res = await createGoal("Ahorro 14 días", 400)
    setMessages(m=>[...m, `Meta creada: ${res.name} → $${res.target_amount}`])
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <Card title="Coach educativo (stub)">
        <div className="space-y-2">
          {messages.map((t,i)=>(<p key={i} className="text-sm">{t}</p>))}
        </div>
        <div className="mt-3 flex gap-2">
          <button className="btn btn-primary" onClick={ask}>Pedir 3 acciones</button>
          <button className="btn" onClick={makeGoal}>Crear meta</button>
        </div>
      </Card>
    </div>
  )
}
