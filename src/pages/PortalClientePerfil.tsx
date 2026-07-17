import { getUserSession } from '../services/auth'
import './PortalCliente.css'

function PortalClientePerfil() {
  const usuario = getUserSession()

  return (
    <div className="portal-cliente-page">
      <section className="portal-section">
        <h2>Meu Perfil</h2>
        <div className="portal-profile">
          <div>
            <span>Nome</span>
            <strong>{usuario?.nome || '-'}</strong>
          </div>
          <div>
            <span>E-mail</span>
            <strong>{usuario?.email || '-'}</strong>
          </div>
          <div>
            <span>CPF</span>
            <strong>{usuario?.cpf || '-'}</strong>
          </div>
        </div>
      </section>
    </div>
  )
}

export default PortalClientePerfil
