import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfiguracoesProvider } from './contexts/ConfiguracoesContext'
import { TemaProvider } from './components/TemaProvider'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Clientes from './pages/Clientes'
import NovoCliente from './pages/NovoCliente'
import DetalhesCliente from './pages/DetalhesCliente'
import Servicos from './pages/Servicos'
import AgendaDia from './pages/AgendaDia'
import AgendaSemana from './pages/AgendaSemana'
import AgendaMes from './pages/AgendaMes'
import Historico from './pages/Historico'
import Configuracoes from './pages/Configuracoes'
import RedirectAgenda from './components/RedirectAgenda'

function App() {
  return (
    <ConfiguracoesProvider>
      <TemaProvider>
        <BrowserRouter>
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
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TemaProvider>
    </ConfiguracoesProvider>
  )
}

export default App
