import React from 'react'
export default function Card({title, children}:{title:string, children:React.ReactNode}){
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {children}
    </div>
  )
}
