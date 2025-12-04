# Componentes Compartilhados

Este documento descreve os componentes reutilizáveis disponíveis no sistema.

## 1. Modal de Confirmação (`ConfirmModal`)

Modal reutilizável para confirmações de ações críticas.

### Uso:
```tsx
import ConfirmModal from './components/ConfirmModal'

const [showConfirm, setShowConfirm] = useState(false)

<ConfirmModal
  isOpen={showConfirm}
  title="Confirmar Exclusão"
  message="Tem certeza que deseja excluir este item?"
  confirmText="Excluir"
  cancelText="Cancelar"
  confirmVariant="danger"
  onConfirm={() => {
    // Ação de exclusão
    setShowConfirm(false)
  }}
  onCancel={() => setShowConfirm(false)}
/>
```

### Props:
- `isOpen`: boolean - Controla visibilidade
- `title`: string - Título do modal
- `message`: string - Mensagem de confirmação
- `confirmText?`: string - Texto do botão de confirmação (padrão: "Confirmar")
- `cancelText?`: string - Texto do botão de cancelamento (padrão: "Cancelar")
- `confirmVariant?`: 'primary' | 'danger' - Variante do botão (padrão: 'primary')
- `onConfirm`: () => void - Callback ao confirmar
- `onCancel`: () => void - Callback ao cancelar

---

## 2. Loading Spinner (`LoadingSpinner`)

Indicador de carregamento reutilizável.

### Uso:
```tsx
import LoadingSpinner from './components/LoadingSpinner'

// Inline
<LoadingSpinner size="medium" message="Carregando..." />

// Overlay
<LoadingSpinner size="large" message="Processando..." overlay />
```

### Props:
- `size?`: 'small' | 'medium' | 'large' - Tamanho do spinner (padrão: 'medium')
- `message?`: string - Mensagem opcional
- `overlay?`: boolean - Se true, exibe como overlay (padrão: false)

---

## 3. Toast/Notificação (`ToastContainer` + `useToast`)

Sistema de notificações toast.

### Uso:
```tsx
import ToastContainer, { useToast } from './components/ToastContainer'

function MyComponent() {
  const { toasts, showToast, removeToast } = useToast()

  const handleSuccess = () => {
    showToast('Operação realizada com sucesso!', 'success')
  }

  return (
    <>
      <button onClick={handleSuccess}>Sucesso</button>
      <ToastContainer
        toasts={toasts}
        onClose={removeToast}
        position="top-right"
      />
    </>
  )
}
```

### Hook `useToast`:
- `toasts`: ToastItem[] - Array de toasts ativos
- `showToast(message, type?, duration?)`: Função para exibir toast
- `removeToast(id)`: Função para remover toast

### Tipos de Toast:
- `'success'` - Verde
- `'error'` - Vermelho
- `'warning'` - Laranja
- `'info'` - Azul

### Posições:
- `'top-right'` (padrão)
- `'top-left'`
- `'bottom-right'`
- `'bottom-left'`
- `'top'`
- `'bottom'`

---

## 4. Empty State (`EmptyState`)

Componente para exibir quando uma lista está vazia.

### Uso:
```tsx
import EmptyState from './components/EmptyState'

<EmptyState
  title="Nenhum cliente encontrado"
  message="Comece adicionando seu primeiro cliente."
  actionLabel="Novo Cliente"
  onAction={() => setShowModal(true)}
/>
```

### Props:
- `icon?`: JSX.Element - Ícone customizado
- `title`: string - Título
- `message?`: string - Mensagem descritiva
- `actionLabel?`: string - Texto do botão de ação
- `onAction?`: () => void - Callback do botão de ação

---

## 5. Badge de Status (`StatusBadge`)

Badge para exibir status com cores padronizadas.

### Uso:
```tsx
import StatusBadge from './components/StatusBadge'

<StatusBadge status="agendado" />
<StatusBadge status="concluido" label="Finalizado" />
```

### Props:
- `status`: 'agendado' | 'concluido' | 'cancelado' | 'ativo' | 'inativo'
- `label?`: string - Texto customizado

### Cores:
- `agendado` - Azul
- `concluido` - Verde
- `cancelado` - Vermelho
- `ativo` - Verde
- `inativo` - Cinza

---

## 6. Input com Máscara (`MaskedInput`)

Input com formatação automática.

### Uso:
```tsx
import MaskedInput from './components/MaskedInput'

const [phone, setPhone] = useState('')

<MaskedInput
  type="phone"
  value={phone}
  onChange={setPhone}
  placeholder="(00) 00000-0000"
/>
```

### Tipos de Máscara:
- `'phone'` - Telefone: (00) 00000-0000
- `'currency'` - Moeda: R$ 0,00
- `'date'` - Data: DD/MM/AAAA
- `'time'` - Horário: HH:MM

### Props:
- `type`: MaskType - Tipo de máscara
- `value`: string - Valor (sem formatação)
- `onChange`: (value: string) => void - Callback com valor sem formatação
- `placeholder?`: string
- `className?`: string
- `disabled?`: boolean
- `id?`: string
- `name?`: string

---

## 7. Autocomplete (`Autocomplete`)

Input com busca e seleção de opções.

### Uso:
```tsx
import Autocomplete from './components/Autocomplete'

const [clienteId, setClienteId] = useState('')
const clientes = [
  { id: '1', label: 'Maria Silva' },
  { id: '2', label: 'Ana Costa' },
]

<Autocomplete
  options={clientes}
  value={clienteId}
  onChange={setClienteId}
  onSelect={(option) => console.log(option)}
  label="Cliente"
  placeholder="Buscar cliente..."
  required
/>
```

### Props:
- `options`: Option[] - Array de opções
- `value`: string - ID da opção selecionada
- `onChange`: (value: string) => void - Callback com ID selecionado
- `onSelect?`: (option: Option) => void - Callback com objeto completo
- `placeholder?`: string
- `className?`: string
- `disabled?`: boolean
- `id?`: string
- `name?`: string
- `label?`: string
- `required?`: boolean
- `error?`: string - Mensagem de erro

### Interface Option:
```tsx
interface Option {
  id: string
  label: string
  value?: string
}
```

---

## Exemplos de Integração

### Integrar Toast no Layout:
```tsx
// Layout.tsx
import ToastContainer, { useToast } from './components/ToastContainer'

function Layout() {
  const { toasts, showToast, removeToast } = useToast()
  
  // Expor showToast via context se necessário
  
  return (
    <>
      {/* ... conteúdo ... */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  )
}
```

### Usar componentes em formulários:
```tsx
import MaskedInput from './components/MaskedInput'
import Autocomplete from './components/Autocomplete'
import StatusBadge from './components/StatusBadge'

function Form() {
  return (
    <form>
      <MaskedInput
        type="phone"
        value={phone}
        onChange={setPhone}
        label="Telefone"
        required
      />
      
      <Autocomplete
        options={clientes}
        value={clienteId}
        onChange={setClienteId}
        label="Cliente"
        required
      />
    </form>
  )
}
```

