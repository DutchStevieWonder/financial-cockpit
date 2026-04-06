import { useAuth } from '../context/AuthContext'
import { useMonth } from '../context/MonthContext'
import PersonalFinanceBlock from '../components/PersonalFinanceBlock'
import CategoryBreakdown from '../components/CategoryBreakdown'
import BudgetBreakdown from '../components/BudgetBreakdown'
import NetWorthOverview from '../components/NetWorthOverview'
import GoalProgress from '../components/GoalProgress'

function getMonthOptions() {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = d.toISOString().substring(0, 7)
    const label = d.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
    options.push({ value, label })
  }
  return options
}

export default function Dashboard() {
  const { profile } = useAuth()
  const { month, setMonth } = useMonth()
  const months = getMonthOptions()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">
          Welkom, {profile?.display_name}
        </h2>
        <p className="text-sm text-slate-500">
          Overzicht van je financiën
        </p>
      </div>

      <div>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Privé blok — alleen eigen domein */}
      <PersonalFinanceBlock month={month} />

      {/* Categorieën overzicht met taartdiagram — alle rekeningen gecombineerd */}
      <CategoryBreakdown month={month} />

      {/* Budget per rekening per categorie */}
      <BudgetBreakdown month={month} />

      {/* Vermogensontwikkeling */}
      <NetWorthOverview />

      {/* Spaardoelen */}
      <GoalProgress />
    </div>
  )
}
