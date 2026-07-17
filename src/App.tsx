import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfiguracoesProvider } from './contexts/ConfiguracoesContext'
import { TemaProvider } from './components/TemaProvider'
import Layout from './components/Layout'
import PortalClienteLayout from './components/PortalClienteLayout'
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
const Profissionais = lazy(() => import('./pages/Profissionais'))
const Configuracoes = lazy(() => import('./pages/Configuracoes'))
const Estabelecimentos = lazy(() => import('./pages/Estabelecimentos'))
const RedirectAgenda = lazy(() => import('./components/RedirectAgenda'))
const PortalClienteInicio = lazy(() => import('./pages/PortalClienteInicio'))
const PortalClienteAgendamentos = lazy(() => import('./pages/PortalClienteAgendamentos'))
const PortalClientePerfil = lazy(() => import('./pages/PortalClientePerfil'))
const AutoAgendamento = lazy(() => import('./pages/AutoAgendamento'))
const AutoAgendamentoSucesso = lazy(() => import('./pages/AutoAgendamentoSucesso'))

function App() {
  return (
    <ConfiguracoesProvider>
      <TemaProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/agendar" element={<AutoAgendamento />} />
              <Route path="/agendar/sucesso" element={<AutoAgendamentoSucesso />} />

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
                <Route path="/estabelecimentos" element={<Estabelecimentos />} />
                <Route path="/profissionais" element={<Profissionais />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
              </Route>

              <Route path="/portal" element={<PortalClienteLayout />}>
                <Route index element={<PortalClienteInicio />} />
                <Route path="agendamentos" element={<PortalClienteAgendamentos />} />
                <Route path="perfil" element={<PortalClientePerfil />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TemaProvider>
    </ConfiguracoesProvider>
  )
}

export default App
