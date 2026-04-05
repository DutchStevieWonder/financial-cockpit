import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { MonthProvider } from './context/MonthContext'
import Login from './pages/Login'
import ResetWachtwoord from './pages/ResetWachtwoord'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Wealth from './pages/Wealth'
import Upload from './pages/Upload'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-wachtwoord" element={<ResetWachtwoord />} />
      <Route
        element={
          <ProtectedRoute>
            <MonthProvider>
              <Layout />
            </MonthProvider>
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/transacties" element={<Transactions />} />
        <Route path="/vermogen" element={<Wealth />} />
        <Route path="/upload" element={<Upload />} />
      </Route>
    </Routes>
  )
}
