import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfiguracoesProvider } from './contexts/ConfiguracoesContext'
import { TemaProvider } from './components/TemaProvider'
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'

// Lazy loading de páginas
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Clientes = lazy(() => import('./pages/Clientes'))
const NovoCliente = lazy(() => import('./pages/NovoCliente'))
const DetalhesCliente = lazy(() => import('./pages/DetalhesCliente'))
const Servicos = lazy(() => import('./pages/Servicos'))
const AgendaDia = lazy(() => import('./pages/AgendaDia'))
const AgendaSemana = lazy(() => import('./pages/AgendaSemana'))
const AgendaMes = lazy(() => import('./pages/AgendaMes'))
const Historico = lazy(() => import('./pages/Historico'))
const Usuarios = lazy(() => import('./pages/Usuarios'))
const Configuracoes = lazy(() => import('./pages/Configuracoes'))
const RedirectAgenda = lazy(() => import('./components/RedirectAgenda'))

function App() {
  return (
    <ConfiguracoesProvider>
      <TemaProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* Rotas autenticadas */}
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/clientes/novo" element={<NovoCliente />} />
                <Route path="/clientes/:id" element={<DetalhesCliente />} />
                <Route path="/servicos" element={<Servicos />} />
                <Route path="/agenda" element={<RedirectAgenda />} />
                <Route path="/agenda/dia" element={<AgendaDia />} />
                <Route path="/agenda/semana" element={<AgendaSemana />} />
                <Route path="/agenda/mes" element={<AgendaMes />} />
                <Route path="/historico" element={<Historico />} />
                <Route path="/usuarios" element={<Usuarios />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TemaProvider>
    </ConfiguracoesProvider>
  )
}

export default App
