export default function AntList({items}:{items:{merchant:string,amount:number}[]}){
  return (
    <ul className="space-y-1">
      {items.map((it,idx)=>(
        <li key={idx} className="flex justify-between">
          <span>{it.merchant}</span>
          <span>${it.amount.toFixed(2)}</span>
        </li>
      ))}
    </ul>
  )
}
