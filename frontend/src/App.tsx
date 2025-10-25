import Header from './components/Header'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Coach from './pages/Coach'
import Learn from './pages/Learn'
import { useEffect, useState } from 'react'

export default function App(){
  const [route, setRoute] = useState(window.location.hash || '#/dashboard')
  useEffect(()=>{
    const onHash = () => setRoute(window.location.hash || '#/dashboard')
    window.addEventListener('hashchange', onHash)
    return ()=> window.removeEventListener('hashchange', onHash)
  },[])

  let Page = Dashboard
  if(route.startsWith('#/onboarding')) Page = Onboarding
  if(route.startsWith('#/dashboard')) Page = Dashboard
  if(route.startsWith('#/coach')) Page = Coach
  if(route.startsWith('#/learn')) Page = Learn

  return (
    <div>
      <Header />
      <Page />
    </div>
  )
}
