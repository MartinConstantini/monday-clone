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
const auth = firebase.auth();

// ==============================
// DOM
// ==============================
const taskInput    = document.getElementById('taskInput');
const addTaskBtn   = document.getElementById('addTaskBtn');
const pendingTasks = document.getElementById('pendingTasks');
const doneTasks    = document.getElementById('doneTasks');

const boardTitle   = document.getElementById('boardTitle');
const boardList    = document.getElementById('boardList');
const boardInput   = document.getElementById('boardInput');
const addBoardBtn  = document.getElementById('addBoardBtn');

// botones google
const loginBtn  = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userInfo  = document.getElementById('userInfo');

// ==============================
//
// Estado
//
// ==============================
let currentBoardId      = null;
let currentUser         = null;
let unsubscribeTasks    = null; // listener de tasks del board actual
let unsubscribeBoards   = null; // listener de boards

// ==============================
// Auth
// ==============================
loginBtn.addEventListener('click', async () => {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
  } catch (e) {
    console.error('Error de login:', e);
    alert('No se pudo iniciar sesión.');
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await auth.signOut();
  } catch (e) {
    console.error('Error al cerrar sesión:', e);
    alert('No se pudo cerrar sesión.');
  }
});

auth.onAuthStateChanged(async (user) => {
  console.log('@@@ user =>', user);

  // Limpieza básica
  if (unsubscribeTasks) { unsubscribeTasks(); unsubscribeTasks = null; }
  if (user) {
    // Sesión iniciada
    currentUser = user;
    userInfo.textContent = user.email;
    loginBtn.style.display  = 'none';
    logoutBtn.style.display = 'block';

    boardInput.disabled = false;
    addBoardBtn.disabled = false;

    taskInput.disabled  = true;  // aún no hay board seleccionado
    addTaskBtn.disabled = true;

    // Iniciar listener de boards si no existe
    if (!unsubscribeBoards) startBoardsListener();
  } else {
    // Sesión cerrada
    currentUser = null;
    userInfo.textContent  = 'No autenticado';
    loginBtn.style.display  = 'block';
    logoutBtn.style.display = 'none';

    boardInput.disabled = true;
    addBoardBtn.disabled = true;

    taskInput.disabled  = true;
    addTaskBtn.disabled = true;

    boardList.innerHTML  = '';
    boardTitle.textContent = 'Inicia sesión para ver tus tareas';
    pendingTasks.innerHTML = '';
    doneTasks.innerHTML    = '';
    currentBoardId = null;

    if (unsubscribeBoards) { unsubscribeBoards(); unsubscribeBoards = null; }
  }
});

// ==============================
// Boards
// ==============================
function startBoardsListener() {
  // Seguridad: evita duplicar listener
  if (unsubscribeBoards) unsubscribeBoards();

  unsubscribeBoards = db
    .collection('boards')
    .orderBy('createdAt', 'asc')
    .onSnapshot((snap) => {
      boardList.innerHTML = '';
      let firstSelectable = null;

      snap.forEach((doc) => {
        const board = doc.data();
        const id    = doc.id;
        const name  = board.name || '(Sin nombre)';

        const li = document.createElement('li');
        li.className = 'list-group-item list-group-item-action';
        li.dataset.boardId = id;
        li.textContent = name;

        if (id === currentBoardId) li.classList.add('active');

        li.onclick = () => selectBoard(id, name);
        boardList.appendChild(li);

        if (!firstSelectable) firstSelectable = { id, name };
      });

      // Si no hay board seleccionado pero existen, seleccionar el primero
      if (!currentBoardId && firstSelectable) {
        selectBoard(firstSelectable.id, firstSelectable.name);
      }

      // Si ya no existe el board seleccionado (pudo borrarse), limpiar UI
      if (currentBoardId && !snap.docs.find(d => d.id === currentBoardId)) {
        currentBoardId = null;
        boardTitle.textContent = 'Selecciona un tablero';
        taskInput.disabled  = true;
        addTaskBtn.disabled = true;
        pendingTasks.innerHTML = '';
        doneTasks.innerHTML    = '';
      }
    }, (err) => {
      console.error('boards onSnapshot error:', err);
      alert('Ocurrió un error al cargar tableros.');
    });
}

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

function selectBoard(id, name) {
  currentBoardId = id;
  boardTitle.textContent = `📋 ${name}`;
  taskInput.disabled  = false;
  addTaskBtn.disabled = false;

  // Resaltar activo por ID
  Array.from(boardList.children).forEach(li => {
    li.classList.toggle('active', li.dataset.boardId === id);
  });

  startTasksListener(id);
}

// ==============================
// Tasks
// ==============================
async function addTask() {
  const text = taskInput.value.trim();
  if (!text || !currentBoardId) return;

  try {
    await db.collection('tasks').add({
      text,
      done: false,
      boardId: currentBoardId,
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
  span.style.textDecoration = task.done ? 'line-through' : 'none';

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
  pendingTasks.innerHTML = '';
  doneTasks.innerHTML = '';

  // Ordenar por createdAt desc en cliente
  const docs = snapshot.docs.slice().sort((a, b) => {
    const ta = a.data().createdAt?.toMillis?.() ?? 0;
    const tb = b.data().createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });

  docs.forEach((doc) => {
    const item = createTaskItem(doc);
    const data = doc.data();
    (data.done ? doneTasks : pendingTasks).appendChild(item);
  });
}

function startTasksListener(boardId) {
  if (unsubscribeTasks) { unsubscribeTasks(); unsubscribeTasks = null; }

  const q = db.collection('tasks').where('boardId', '==', boardId);
  unsubscribeTasks = q.onSnapshot(
    (snap) => renderTasks(snap),
    (err) => {
      console.error('tasks onSnapshot error:', err);
      alert('Ocurrió un error al escuchar las tareas.');
    }
  );
}
