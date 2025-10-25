import Card from '../components/Card'

export default function Learn(){
  return (
    <div className="max-w-3xl mx-auto p-4 grid gap-4">
      <Card title="Presupuesto 101">
        <p>Lección rápida (60s): Registra ingresos, separa esenciales, calcula colchón. Métrica: 10 XP.</p>
      </Card>
      <Card title="Gasto hormiga">
  <p>Identifica compras menores a $150 y no esenciales. Meta: reducir 2 ítems/sem. +10 XP.</p>
      </Card>
      <Card title="Metas SMART">
        <p>Meta específica, medible, alcanzable, relevante y con tiempo. Crea 1 meta hoy. +10 XP.</p>
      </Card>
    </div>
  )
}
