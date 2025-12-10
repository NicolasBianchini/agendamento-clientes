import { initializeApp } from 'firebase/app'
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyARWVfjlfpRleEBjsIKedUAxf9gkdW-6YY",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "agendamentos-clientes-7d7bd.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "agendamentos-clientes-7d7bd",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "agendamentos-clientes-7d7bd.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "121175364166",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:121175364166:web:8d41e2112a675a6e8eb047"
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Função principal
async function updateUserRole() {
  const email = 'nicolas@gmail.com'
  const newRole = 'admin_master'

  console.log(`\n=== Atualizar Role do Usuário ===\n`)
  console.log(`Email: ${email}`)
  console.log(`Nova Role: ${newRole}\n`)

  try {
    // Buscar usuário pelo email
    const emailNormalized = email.toLowerCase().trim()
    const q = query(
      collection(db, 'usuarios'),
      where('email', '==', emailNormalized)
    )

    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      console.error(`❌ Usuário com email "${email}" não encontrado!`)
      process.exit(1)
    }

    // Pegar o primeiro documento (deve haver apenas um com esse email)
    const docSnap = querySnapshot.docs[0]
    const userData = docSnap.data()

    console.log(`Usuário encontrado:`)
    console.log(`  ID: ${docSnap.id}`)
    console.log(`  Nome: ${userData.nome}`)
    console.log(`  Email: ${userData.email}`)
    console.log(`  Role atual: ${userData.role || 'cliente'}`)
    console.log(`  Ativo: ${userData.ativo ? 'Sim' : 'Não'}\n`)

    // Atualizar role
    const userRef = doc(db, 'usuarios', docSnap.id)
    await updateDoc(userRef, {
      role: newRole
    })

    console.log(`✅ Role atualizada com sucesso!`)
    console.log(`   Nova role: ${newRole}\n`)

    process.exit(0)
  } catch (error) {
    console.error('\n❌ Erro ao atualizar role:', error)
    process.exit(1)
  }
}

// Executar script
updateUserRole()
