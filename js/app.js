// Configuración
const firebaseConfig = {
  apiKey: "AIzaSyAVnMZ-k-3k3F-XCQi9oj9z2VEo2zIWhpw",
  authDomain: "ad-2025-99da3.firebaseapp.com",
  projectId: "ad-2025-99da3",
  storageBucket: "ad-2025-99da3.firebasestorage.app",
  messagingSenderId: "981827668438",
  appId: "1:981827668438:web:8235bb0eb267ec37ecbc77",
};

// Inicializar Firebase (compat)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM
const taskInput    = document.getElementById('taskInput');
const addTaskBtn   = document.getElementById('addTaskBtn');
const pendingTasks = document.getElementById('pendingTasks');
const doneTasks    = document.getElementById('doneTasks');

const boardTitle   = document.getElementById('boardTitle');
const boardList    = document.getElementById('boardList');
const boardInput   = document.getElementById('boardInput');
const addBoardBtn  = document.getElementById('addBoardBtn');

let currentBoardId = null;
let unsubscribeTasks = null; // para apagar/encender el listener al cambiar de tablero

// ---- BOARDS ----
addBoardBtn.addEventListener('click', async () => {
  const name = boardInput.value.trim();
  if (!name) return;

  try {
    const ref = await db.collection('boards').add({
      name,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    boardInput.value = '';
    // Seleccionar automáticamente el tablero creado
    selectBoard(ref.id, name);
  } catch (e) {
    console.error('Error al crear tablero:', e);
    alert('No se pudo crear el tablero.');
  }
});

db.collection('boards')
  .orderBy('createdAt', 'asc')
  .onSnapshot((snap) => {
    boardList.innerHTML = '';
    snap.forEach((doc) => {
      const board = doc.data();
      const li = document.createElement('li');
      li.className = 'list-group-item list-group-item-action';
      li.textContent = board.name || '(Sin nombre)';
      if (doc.id === currentBoardId) li.classList.add('active');
      li.onclick = () => selectBoard(doc.id, board.name || '(Sin nombre)');
      boardList.appendChild(li);
    });

    // Si no hay tablero seleccionado pero existen, toma el primero
    if (!currentBoardId && snap.docs.length) {
      const first = snap.docs[0];
      selectBoard(first.id, first.data().name || '(Sin nombre)');
    }
  }, (err) => console.error('boards onSnapshot error:', err));

function selectBoard(id, name) {
  currentBoardId = id;
  boardTitle.textContent = `📋 ${name}`;   // <-- corregido (template string)
  taskInput.disabled = false;              // <-- corregido (disabled)
  addTaskBtn.disabled = false;

  // resaltar activo
  Array.from(boardList.children).forEach(li => {
    li.classList.toggle('active', li.textContent === name);
  });

  startTasksListener(id);
}

// ---- TASKS ----
async function addTask() {
  const text = taskInput.value.trim();
  if (!text || !currentBoardId) return;

  try {
    await db.collection('tasks').add({
      text,
      done: false,
      boardId: currentBoardId, // vínculo con el tablero
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    taskInput.value = '';
    taskInput.focus();
  } catch (err) {
    console.error('Error al guardar tarea:', err);
    alert('No se pudo guardar la tarea.');
  }
}

addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTask();
});

function createTaskItem(doc) {
  const task = doc.data();
  const li = document.createElement('li');
  li.className = 'list-group-item d-flex justify-content-between align-items-center';

  // izquierda: checkbox + texto
  const leftDiv = document.createElement('div');
  leftDiv.className = 'd-flex align-items-center';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'form-check-input me-2';
  checkbox.checked = !!task.done;
  checkbox.onchange = async () => {
    try {
      await db.collection('tasks').doc(doc.id).update({ done: checkbox.checked });
    } catch (e) {
      console.error('Error al actualizar done:', e);
      alert('No se pudo actualizar la tarea.');
      checkbox.checked = !checkbox.checked;
    }
  };

  const span = document.createElement('span');
  span.textContent = task.text || '(sin texto)';
  if (task.done) span.style.textDecoration = 'line-through';

  leftDiv.appendChild(checkbox);
  leftDiv.appendChild(span);

  // derecha: eliminar
  const delBtn = document.createElement('button');
  delBtn.className = 'btn btn-danger btn-sm';
  delBtn.textContent = 'Eliminar';
  delBtn.onclick = async () => {
    try {
      await db.collection('tasks').doc(doc.id).delete();
    } catch (e) {
      console.error('Error al eliminar:', e);
      alert('No se pudo eliminar la tarea.');
    }
  };

  li.appendChild(leftDiv);
  li.appendChild(delBtn);
  return li;
}

function renderTasks(snapshot) {
  // limpia columnas
  pendingTasks.innerHTML = '';
  doneTasks.innerHTML = '';

  // ordenar por createdAt desc en cliente (así no dependemos de índices)
  const docs = snapshot.docs.slice().sort((a, b) => {
    const ta = a.data().createdAt?.toMillis?.() ?? 0;
    const tb = b.data().createdAt?.toMillis?.() ?? 0;
    return tb - ta;
    // si quieres evitar ordenar en cliente, usa .orderBy('createdAt','desc')
    // pero puede requerir índice compuesto con where('boardId')
  });

  docs.forEach((doc) => {
    const li = createTaskItem(doc);
    const data = doc.data();
    (data.done ? doneTasks : pendingTasks).appendChild(li);
  });
}

function startTasksListener(boardId) {
  // apaga listener anterior
  if (unsubscribeTasks) unsubscribeTasks();

  // solo tareas del tablero actual
  const q = db.collection('tasks').where('boardId', '==', boardId);

  unsubscribeTasks = q.onSnapshot(
    (snap) => renderTasks(snap),
    (err) => {
      console.error('tasks onSnapshot error:', err);
      alert('Ocurrió un error al escuchar las tareas.');
    }
  );
}
