import { useEffect, useState } from 'react'
import { checkin } from '../lib/api'

export default function Streak(){
  const [streak, setStreak] = useState<{day_count:number,last_checkin_date:string}|null>(null)
  const doCheckin = async()=>{
    const res = await checkin()
    setStreak(res)
  }
  useEffect(()=>{ doCheckin() },[])
  return (
    <div className="card flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold">Racha</h3>
        <p className="text-sm opacity-80">Días seguidos: <b>{streak?.day_count ?? '-'}</b></p>
      </div>
      <button className="btn btn-primary" onClick={doCheckin}>Check-in</button>
    </div>
  )
}
