const firebaseConfig = {
  apiKey: "AIzaSyAVnMZ-k-3k3F-XCQi9oj9z2VEo2zIWhpw",
  authDomain: "ad-2025-99da3.firebaseapp.com",
  projectId: "ad-2025-99da3",
  storageBucket: "ad-2025-99da3.firebasestorage.app",
  messagingSenderId: "981827668438",
  appId: "1:981827668438:web:8235bb0eb267ec37ecbc77",
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore()
const auth = firebase.auth()


// Obtener elementos del DOM para las tareas
const taskInput = document.getElementById('taskInput')
const addTaskBtn = document.getElementById('addTaskBtn')
const pendingTasks = document.getElementById('pendingTasks')
const doneTasks = document.getElementById('doneTasks')

// Elementos Nuevos
const assignedInput = document.getElementById('assignedInput')
const statusInput = document.getElementById('statusInput')
const priorityInput = document.getElementById('priorityInput')

// Referencias al tablero
const boardTitle = document.getElementById('boardTitle')
const boardList = document.getElementById('boardList')
const boardInput = document.getElementById('boardInput')
const addBoardBtn = document.getElementById('addBoardBtn')

// Botones para Google
const loginBtn = document.getElementById('loginBtn')
const logoutBtn = document.getElementById('logoutBtn')
const userInfo = document.getElementById('userInfo')

// Variables globales para los id del tableros actuales
let currentBoardId = null
let currentUser = null 

// Funciones para login y logout con Google
loginBtn.addEventListener('click', async () =>{
  const provider = new firebase.auth.GoogleAuthProvider()
  await auth.signInWithPopup(provider)
})

logoutBtn.addEventListener('click', async () => {
  await auth.signOut()
})

// Evento que escucha cuando cambia de estado lan autenticación

auth.onAuthStateChanged(user => {
  console.log('@@ user =>', user)
  if (user) {
    currentUser = user
    userInfo.textContent = user.email
    loginBtn.style.display = 'none'
    logoutBtn.style.display = 'block'
    boardTitle.textContent = 'Seleccione un 📋'
    taskInput.disabled = false
    addTaskBtn.disabled = false
    boardInput.disabled = false 
    addBoardBtn.disabled = false
    boardList.disabled = false
    loadBoards()
    loadTasks()
  } else {
    currentUser = null
    userInfo.textContent = 'No autenticado'
    loginBtn.style.display = 'block'
    logoutBtn.style.display = 'none'
    boardInput.disabled = true 
    addBoardBtn.disabled = true
    boardList.disabled = true
    boardList.innerHTML = ''
    boardTitle.textContent = 'Inicia sesión para ver tus 📋'
    taskInput.disabled = true
    addTaskBtn.disabled = true
    pendingTasks.innerHTML = ''
    doneTasks.innerHTML = ''
  }
})

addBoardBtn.addEventListener('click', async () => {
    const name = boardInput.value.trim()
    if (name){
        await db.collection('boards').add({ name })
        boardInput.value = ''
    }
})

const loadBoards = () => {
    db.collection('boards').onSnapshot((tableros) =>{
        boardList.innerHTML = ''
        tableros.forEach((doc) => {
            const board = doc.data()
            const li = document.createElement('li')
            li.classList = 'list-group-item list-group-item-action'
            li.textContent = board.name 
            li.onclick = () => selectBoard(doc.id, board.name)
            boardList.appendChild(li)
        })
    })
}


const selectBoard = (id, name) => {
    currentBoardId = id
    boardTitle.textContent = `📋 ${name}`
    enableTaskForm()
    loadTasks()
}

// Función para habilitar Inputs de formulario para tareas
const enableTaskForm = () => {
  taskInput.disabled = false 
  assignedInput.disabled = false 
  priorityInput.disabled = false
  addTaskBtn.disabled = false 
  statusInput.disabled = false
}

const disableTaskForm = () => {
  taskInput.disabled = true 
  assignedInput.disabled = true 
  priorityInput.disabled = true
  addTaskBtn.disabled = true 
  statusInput.disabled = true
}

// Helpers para color de prioridad y status
const getStatusColor = status => {
  switch (status) {
    case 'Pendiente': return 'secondary'
    case 'En progreso': return 'info'
    case 'Bloqueado': return 'warning'
    case 'Hecho' : return 'success'
    default: return 'dark'
  }
}


// Agregamos evento click al botón
addTaskBtn.addEventListener('click', async () =>{
    const text = taskInput.value.trim()
    const assigned = assignedInput.value.trim()
    const status = statusInput.value
    const priority = priorityInput.value 

    if(text && assigned && currentUser && currentBoardId){
        await db.collection('tasks').add({
            text,
            assigned,
            status,
            priority, 
            done: status === 'Hecho',
            boardId: currentBoardId,
            userId: currentUser.uid
        })
        taskInput.value = ''
        assignedInput.value = ''
        statusInput.value = 'Pendiente'
        priorityInput.value = 'Media'
    } else {
      alert('Por favor, selecciona un tablero y escribe una tarea.')
    }
})

const getPriorityColor = priority => {
  switch (priority) {
    case 'Alta': return 'danger'
    case 'Media': return 'primary'
    case 'Baja': return 'success'
    default: return 'secondary'
  }
}

// Función para escuchar en tiempo real la db

const loadTasks = () => {
  db.collection('tasks').where('boardId', '==', currentBoardId)
  .onSnapshot((tasks) => {
    pendingTasks.innerHTML = ''
    doneTasks.innerHTML = ''
    tasks.forEach((doc) => {
      const task = doc.data()
      const li = document.createElement('li')

      li.className = 'list-group-item'
      // Card de las tareas
      li.innerHTML =
`
        <div class = "d-flex justify-content-between align-items-center">
          <div>
            <strong>${task.text}</strong>
            <small>👤 ${task.assigned}</small>
            <span class="badge bg-${getStatusColor(task.status)}">
              ${task.status}
            </span>
            <span class="badge bg-${getPriorityColor(task.priority)}">
              ${task.priority}
            </span>
          </div>

          <div>
            <button class="btn btn-sm btn-danger">🗑</button>   
          </div>
        </div>
`

      li.querySelector('button').onclick = () => db.collection('tasks').doc(doc.id).delete()

      // Agregar a la lista correspondiente
      if (task.done) {
        doneTasks.appendChild(li)
      } else {
        pendingTasks.appendChild(li)
      }
    })
  })
}