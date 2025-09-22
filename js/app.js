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
const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');

// Agregar tarea
addTaskBtn.addEventListener('click', async () => {
  const text = taskInput.value.trim();
  if (!text) return;

  try {
    await db.collection('tasks').add({
      text,
      done: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    // No dibujamos aquí: el onSnapshot se encarga
    taskInput.value = '';
    taskInput.focus();
  } catch (err) {
    console.error('Error al guardar en Firestore:', err);
    alert('No se pudo guardar la tarea. Revisa la consola para más detalles.');
  }
});

// Escuchar en tiempo real la colección correcta: "tasks"
db.collection('tasks')
  .orderBy('createdAt', 'desc')
  .onSnapshot((snapshot) => {
    taskList.innerHTML = '';

    snapshot.forEach((doc) => {
      const data = doc.data();

      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';

      const span = document.createElement('span');
      span.textContent = data.text ?? '(sin texto)';

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

      li.appendChild(span);
      li.appendChild(delBtn);
      taskList.appendChild(li);
    });
  }, (err) => {
    console.error('onSnapshot error:', err);
  });
