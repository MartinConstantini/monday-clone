// Configuración
const firebaseConfig = {
  apiKey: "AIzaSyAVnMZ-k-3k3F-XCQi9oj9z2VEo2zIWhpw",
  authDomain: "ad-2025-99da3.firebaseapp.com",
  projectId: "ad-2025-99da3",
  storageBucket: "ad-2025-99da3.firebasestorage.app",
  messagingSenderId: "981827668438",
  appId: "1:981827668438:web:8235bb0eb267ec37ecbc77",
};
// Credenciales de Firebase
// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore()


// Obtener elementos del DOM para las tareas
const taskInput = document.getElementById('taskInput')
const addTaskBtn = document.getElementById('addTaskBtn')
const pendingTasks = document.getElementById('pendingTasks')
const doneTasks = document.getElementById('doneTasks')

// Referencias al tablero
const boardTitle = document.getElementById('boardTitle')
const boardList = document.getElementById('boardList')
const boardInput = document.getElementById('boardInput')
const addBoardBtn = document.getElementById('addBoardBtn')

let currentBoardId = null

addBoardBtn.addEventListener('click', async () => {
    const name = boardInput.value.trim()
    if (name){
        await db.collection('boards').add({ name })
        boardInput.value = ''
    }
})

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

const selectBoard = (id, name) => {
    currentBoardId = id
    boardTitle.textContent = 📋 ${name}
    taskInput.disable = false 
    addTaskBtn.disabled = false
}

// Agregamos evento click al botón
addTaskBtn.addEventListener('click', async () =>{
    const text = taskInput.value.trim()
    if(text){
        await db.collection('tasks').add({
            text, done: false
        })
        taskInput.value = ''
    }
})


// Función para escuchar en tiempo real la db
db.collection('tasks').onSnapshot((tareas) => {
    pendingTasks.innerHTML = ''
    doneTasks.innerHTML= ''
 tareas.forEach((doc) => {
    const task = doc.data();

    const li = document.createElement('li');
    li.classList = 'list-group-item d-flex justify-content-between align-items-center';

    // Div izquierdo con checkbox y texto
    const leftDiv = document.createElement('div');
    leftDiv.classList = 'd-flex align-items-center';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList = 'form-check-input me-2';
    checkbox.checked = task.done;
    checkbox.onchange = () =>
      db.collection('tasks').doc(doc.id).update({ done: checkbox.checked });

    const span = document.createElement('span');
    span.textContent = task.text;
    if (task.done) {
      span.style.textDecoration = 'line-through';
    }

    leftDiv.appendChild(checkbox);
    leftDiv.appendChild(span);

    // Botón eliminar
    const delBtn = document.createElement('button');
    delBtn.classList = 'btn btn-danger btn-sm';
    delBtn.textContent = 'Eliminar';
    delBtn.onclick = () => db.collection('tasks').doc(doc.id).delete();

    // Armar el li
    li.appendChild(leftDiv);
    li.appendChild(delBtn);

    // Agregar a la lista correspondiente
    if (task.done) {
      doneTasks.appendChild(li);
    } else {
      pendingTasks.appendChild(li);
    }
    })
})