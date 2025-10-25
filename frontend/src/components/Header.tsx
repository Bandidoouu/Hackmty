export default function Header() {
  return (
    <header className="p-4 bg-white shadow sticky top-0 z-10">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <h1 className="text-2xl font-bold">FinCoach</h1>
        <nav className="space-x-3 text-sm">
          <a href="#/onboarding" className="hover:underline">Onboarding</a>
          <a href="#/dashboard" className="hover:underline">Dashboard</a>
          <a href="#/coach" className="hover:underline">Coach</a>
          <a href="#/learn" className="hover:underline">Aprende</a>
        </nav>
      </div>
    </header>
  )
}
