// ========================
// IMPORTS SUPABASE
// ========================
// Asegúrate de que estas funciones estén exportadas en supabaseConfig.js
// y que el archivo esté correctamente enlazado en tu HTML
// Si usas módulos ES6, usa import {...} from './supabaseConfig.js';
// Si usas script clásico, asegúrate que supabaseConfig.js se carga antes

// deleteAllBooks, deleteAllSagas, addBook, addSaga, getSagas deben estar en window o importados

let library = JSON.parse(localStorage.getItem('myLibraryStorageV2')) || { books: [], sagas: [] };
let currentSagaId = null;
let currentEditingBookId = null;
let currentEditingSagaId = null;
let currentFilter = 'all'; // Filtro activo
let currentUser = null; // Usuario actual
let isUsingSupabase = false; // Flag para usar Supabase o localStorage
let idCounter = Date.now(); // Contador para generar IDs únicos sin decimales

// Función para generar IDs únicos
function generateUniqueId() {
    idCounter++;
    return idCounter;
}

const mainGrid = document.getElementById('mainGrid');
const viewTitle = document.getElementById('viewTitle');
const btnBack = document.getElementById('btnBack');
const searchInput = document.getElementById('searchInput');

// ========================
// AUTENTICACIÓN
// ========================
const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const authTitle = document.getElementById('authTitle');
const authBtn = document.getElementById('authBtn');
const toggleAuthBtn = document.getElementById('toggleAuthBtn');
const logoutBtn = document.getElementById('logoutBtn');
const mainContainer = document.getElementById('mainContainer');
const togglePasswordBtn = document.getElementById('togglePasswordBtn');
const authPassword = document.getElementById('authPassword');

let isSigningUp = false;

// Toggle de visibilidad de contraseña
togglePasswordBtn.onclick = (e) => {
    e.preventDefault();
    const type = authPassword.getAttribute('type') === 'password' ? 'text' : 'password';
    authPassword.setAttribute('type', type);
    const iconSpan = togglePasswordBtn.querySelector('.material-symbols-outlined');
    iconSpan.innerText = type === 'password' ? 'visibility_off' : 'visibility';
};

// Verificar si hay sesión activa
window.addEventListener('load', async () => {
    try {
        const session = await getSession();
        if (session && session.user) {
            currentUser = session.user;
            isUsingSupabase = true;
            authModal.style.display = 'none';
            mainContainer.style.display = 'block';
            await loadBooksFromSupabase();
        }
    } catch (error) {
        console.error('Error al verificar sesión:', error);
    }
});

// Alternar entre login y signup
toggleAuthBtn.onclick = () => {
    isSigningUp = !isSigningUp;
    authTitle.innerText = isSigningUp ? 'REGÍSTRATE' : 'INICIA SESIÓN';
    authBtn.innerText = isSigningUp ? 'CREAR CUENTA' : 'INICIAR SESIÓN';
    toggleAuthBtn.innerText = isSigningUp ? '¿Ya tienes cuenta? INICIA SESIÓN' : '¿No tienes cuenta? REGÍSTRATE';
};

// Enviar formulario de autenticación
authForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    authBtn.disabled = true;
    authBtn.innerText = 'CARGANDO...';
    
    try {
        let result;
        if (isSigningUp) {
            result = await signUp(email, password);
            alert('✅ Cuenta creada. Revisa tu email para confirmar.');
        } else {
            result = await signIn(email, password);
            if (result.session) {
                currentUser = result.session.user;
                isUsingSupabase = true;
                await saveSessionToCache(rememberMe);
                authModal.style.display = 'none';
                mainContainer.style.display = 'block';
                authForm.reset();
                await loadBooksFromSupabase();
            }
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    } finally {
        authBtn.disabled = false;
        authBtn.innerText = isSigningUp ? 'CREAR CUENTA' : 'INICIAR SESIÓN';
    }
};

// Cerrar sesión
logoutBtn.onclick = async () => {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        try {
            await signOut();
            currentUser = null;
            isUsingSupabase = false;
            library = { books: [], sagas: [] };
            authModal.style.display = 'flex';
            mainContainer.style.display = 'none';
            authForm.reset();
            isSigningUp = false;
            authTitle.innerText = 'INICIA SESIÓN';
            authBtn.innerText = 'INICIAR SESIÓN';
            toggleAuthBtn.innerText = '¿No tienes cuenta? REGÍSTRATE';
        } catch (error) {
            alert('Error al cerrar sesión: ' + error.message);
        }
    }
};

// Cargar libros desde Supabase
async function loadBooksFromSupabase() {
    try {
        const booksData = await getBooks(currentUser.id);
        const sagasData = await getSagas(currentUser.id);
        
        // 1. Ordenar y crear sagas
        library.sagas = sagasData
            .slice()
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map(s => ({
                id: s.id,
                name: s.name,
                books: [],
            }));

        // 2. Limpiar libros sueltos
        library.books = [];

        // 3. Clasificar libros: si tiene saga_id va a la saga, si no a library.books
        //    Siempre ordenados por 'order' y sin duplicados
        const sagaBooksMap = {};
        for (const saga of library.sagas) {
            sagaBooksMap[saga.id] = [];
        }
        const looseBooksArr = [];
        for (const b of booksData) {
            const book = {
                id: b.id,
                title: b.title,
                author: b.author,
                cover: b.cover,
                rating: b.rating,
                readDate: b.read_date,
                opinion: b.opinion,
                isPending: b.is_pending,
                order: b.order ?? 0
            };
            if (b.saga_id && sagaBooksMap[b.saga_id]) {
                sagaBooksMap[b.saga_id].push(book);
            } else if (!b.saga_id) {
                looseBooksArr.push(book);
            }
        }
        // 4. Asignar libros ordenados a cada saga
        for (const saga of library.sagas) {
            saga.books = (sagaBooksMap[saga.id] || []).slice().sort((a, b) => a.order - b.order);
        }
        // 5. Asignar libros sueltos ordenados
        library.books = looseBooksArr.slice().sort((a, b) => a.order - b.order);
        render();
    } catch (error) {
        console.error('Error cargando libros:', error);
    }
}

// ========================
// INICIALIZACION SORTABLE
// ========================
// Inicializar Sortable para permitir arrastrar
const sortable = new Sortable(mainGrid, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    onEnd: async function () {
        // Reordenar el array según el nuevo orden visual
        const items = Array.from(mainGrid.children);
        const newOrderIds = items.map(item => parseInt(item.dataset.id));

        if (currentSagaId) {
            const saga = library.sagas.find(s => s.id === currentSagaId);
            saga.books.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
            // Actualizar orden en Supabase para libros de la saga
            if (isUsingSupabase && currentUser) {
                for (let i = 0; i < saga.books.length; i++) {
                    const book = saga.books[i];
                    book.order = i;
                    try {
                        await updateBook(book.id, { ...book, sagaId: saga.id, order: i });
                    } catch (e) { console.error('Error actualizando orden libro saga:', e); }
                }
            }
        } else {
            // Separar sagas y libros para reordenar ambos
            const sagaIds = items.filter(i => i.classList.contains('saga-card')).map(i => parseInt(i.dataset.id));
            const bookIds = items.filter(i => i.classList.contains('book-card')).map(i => parseInt(i.dataset.id));

            library.sagas.sort((a, b) => sagaIds.indexOf(a.id) - sagaIds.indexOf(b.id));
            library.books.sort((a, b) => bookIds.indexOf(a.id) - bookIds.indexOf(b.id));

            // Actualizar orden en Supabase para sagas y libros sueltos
            if (isUsingSupabase && currentUser) {
                for (let i = 0; i < library.sagas.length; i++) {
                    const saga = library.sagas[i];
                    saga.order = i;
                    try {
                        await updateSaga(saga.id, { ...saga, order: i });
                    } catch (e) { console.error('Error actualizando orden saga:', e); }
                }
                for (let i = 0; i < library.books.length; i++) {
                    const book = library.books[i];
                    book.order = i;
                    try {
                        await updateBook(book.id, { ...book, sagaId: null, order: i });
                    } catch (e) { console.error('Error actualizando orden libro suelto:', e); }
                }
            }
        }
        save(false); // Guardar sin volver a renderizar para no romper el drag
    }
});

// ========================
// FUNCIONES DE ALMACENAMIENTO
// ========================
// FUNCIÓN UNIFICADA save() - Usa una sola key de localStorage
function save(shouldRender = true) {
    // Guardar en localStorage (backup local)
    localStorage.setItem('myLibraryStorageV2', JSON.stringify(library));
    
    // Guardar en Supabase si hay sesión activa
    if (isUsingSupabase && currentUser) {
        syncToSupabase().catch(err => console.error('Error sincronizando:', err));
    }
    
    if (shouldRender) render();
    updateStats();
}

// Sincronizar library con Supabase
async function syncToSupabase() {
    if (!currentUser) return;
    console.log('📤 Sincronizando con Supabase...');
    try {
        // 1. Borrar todos los libros y sagas del usuario
        await Promise.all([
            deleteAllBooks(currentUser.id),
            deleteAllSagas(currentUser.id)
        ]);

            // 2. Subir todas las sagas primero (sin libros), guardando el orden
            for (let i = 0; i < library.sagas.length; i++) {
                const saga = library.sagas[i];
                await addSaga({ name: saga.name, order: i }, currentUser.id);
        }

        // 3. Obtener las sagas insertadas para mapear IDs
        const sagasInDb = await getSagas(currentUser.id);
        const sagaNameToId = {};
        for (const saga of sagasInDb) {
            sagaNameToId[saga.name] = saga.id;
        }

            // 4. Subir solo los libros sueltos (que no están en ninguna saga), guardando el orden
            for (let i = 0; i < library.books.length; i++) {
                const book = library.books[i];
                await addBook({ ...book, sagaId: null, order: i }, currentUser.id);
            }

            // 5. Subir los libros de cada saga con su sagaId y orden
            for (const saga of library.sagas) {
                const sagaId = sagaNameToId[saga.name];
                for (let i = 0; i < saga.books.length; i++) {
                    const book = saga.books[i];
                    await addBook({ ...book, sagaId, order: i }, currentUser.id);
                }
        }
    } catch (err) {
        console.error('Error sincronizando con Supabase:', err);
    }
}

// ========================
// FUNCIONES DE COPIA/IMPORTACIÓN
// ========================
function copyToClipboard() {
    const data = JSON.stringify(library);
    navigator.clipboard.writeText(data).then(() => {
        alert("¡Biblioteca copiada! Ahora ve a tu página de GitHub Pages y dale al botón de Importar.");
    });
}

function importFromClipboard() {
    const data = prompt("Pega aquí el código que has copiado de tu versión local:");
    if (data) {
        try {
            const parsed = JSON.parse(data);
            if (parsed.books && parsed.sagas) {
                if (confirm("¿Quieres importar estos libros a tu biblioteca? Si hay libros con el mismo título y autor, se reemplazarán.")) {
                    const idMap = {}; // Mapear IDs antiguos a nuevos sagas
                    
                    // Procesar sagas: crear nuevas o actualizar existentes
                    for (const saga of parsed.sagas) {
                        // Buscar si la saga ya existe por nombre
                        let existingSaga = library.sagas.find(s => s.name === saga.name);
                        
                        if (existingSaga) {
                            // Saga existe: reemplazar sus libros
                            idMap[saga.id] = existingSaga.id;
                            existingSaga.books = [];
                        } else {
                            // Saga nueva: crear con nuevo ID
                            const newSagaId = generateUniqueId();
                            idMap[saga.id] = newSagaId;
                            library.sagas.push({
                                id: newSagaId,
                                name: saga.name,
                                books: [],
                                order: saga.order || 0
                            });
                        }
                    }
                    
                    // Procesar libros sueltos
                    for (const book of parsed.books) {
                        // Buscar si el libro ya existe (por título + autor)
                        const existingBookIndex = library.books.findIndex(b => 
                            b.title.toLowerCase() === book.title.toLowerCase() && 
                            b.author.toLowerCase() === book.author.toLowerCase()
                        );
                        
                        const bookData = {
                            id: existingBookIndex !== -1 ? library.books[existingBookIndex].id : generateUniqueId(),
                            title: book.title,
                            author: book.author,
                            cover: book.cover,
                            rating: book.rating,
                            readDate: book.readDate || null,
                            opinion: book.opinion || null,
                            isPending: book.isPending || false,
                            order: book.order || 0
                        };
                        
                        if (existingBookIndex !== -1) {
                            // Reemplazar existente
                            library.books[existingBookIndex] = bookData;
                        } else {
                            // Añadir nuevo
                            library.books.push(bookData);
                        }
                    }
                    
                    // Procesar libros de sagas
                    for (const saga of parsed.sagas) {
                        const sagaId = idMap[saga.id];
                        const sagaInLibrary = library.sagas.find(s => s.id === sagaId);
                        
                        for (const book of saga.books) {
                            // Buscar si el libro ya existe en la saga
                            const existingBookIndex = sagaInLibrary.books.findIndex(b => 
                                b.title.toLowerCase() === book.title.toLowerCase() && 
                                b.author.toLowerCase() === book.author.toLowerCase()
                            );
                            
                            const bookData = {
                                id: existingBookIndex !== -1 ? sagaInLibrary.books[existingBookIndex].id : generateUniqueId(),
                                title: book.title,
                                author: book.author,
                                cover: book.cover,
                                rating: book.rating,
                                readDate: book.readDate || null,
                                opinion: book.opinion || null,
                                isPending: book.isPending || false,
                                order: book.order || 0
                            };
                            
                            if (existingBookIndex !== -1) {
                                // Reemplazar existente
                                sagaInLibrary.books[existingBookIndex] = bookData;
                            } else {
                                // Añadir nuevo
                                sagaInLibrary.books.push(bookData);
                            }
                        }
                    }
                    
                    save();
                    alert("✅ Biblioteca importada correctamente. Los libros nuevos se han añadido y los duplicados se han actualizado.");
                }
            } else {
                alert("El código no parece ser válido.");
            }
        } catch (e) {
            alert("Error al procesar los datos: " + e.message);
        }
    }
}

// ========================
// FUNCIÓN RENDER
// ========================
function shouldShowBook(book) {
    // Aplicar filtro por categoría
    if (currentFilter === 'reading' && book.rating !== 6) return false;
    if (currentFilter === 'pending' && !book.isPending) return false;
    if (currentFilter === 'completed' && (book.rating === 0 || book.rating === 6 || book.isPending)) return false;
    return true;
}

function render(searchText = '') {
    mainGrid.innerHTML = '';
    const search = searchText.toLowerCase();

    if (currentSagaId) {
        const saga = library.sagas.find(s => s.id === currentSagaId);
        viewTitle.innerText = saga.name;
        btnBack.classList.remove('hidden');
        document.getElementById('addSagaBtn').classList.add('hidden');
        saga.books
            .filter(b => b.title.toLowerCase().includes(search) && shouldShowBook(b))
            .forEach(book => {
                const bookCard = createBookCard(book, true);
                mainGrid.appendChild(bookCard);
            });
    } else {
        viewTitle.innerText = "Biblioteca Personal";
        btnBack.classList.add('hidden');
        document.getElementById('addSagaBtn').classList.remove('hidden');

        library.sagas
            .filter(s => s.name.toLowerCase().includes(search))
            .filter(s => s.books.some(b => shouldShowBook(b)))
            .forEach(saga => {
                const card = document.createElement('div');
                card.className = 'saga-card';
                card.dataset.id = saga.id;

                // Filtrar libros de la saga según el filtro activo
                const filteredBooks = saga.books.filter(b => shouldShowBook(b));

                // HTML limpio y correcto para la saga-card
                card.innerHTML = `
                    <h3>${saga.name}</h3>
                    <span>${filteredBooks.length} LIBROS</span>
                    <div class="saga-bg-animated"></div>
                    <div class="card-actions" style="justify-content: center;">
                        <button class="action-btn edit-btn" onclick="openEditSaga(event, ${saga.id})">Editar</button>
                        <button class="action-btn delete-btn" onclick="deleteSaga(event, ${saga.id})">Borrar</button>
                    </div>
                `;
                // Fondo animado de portadas al hacer hover
                const bgDiv = card.querySelector('.saga-bg-animated');
                let bgInterval = null;
                let bgIdx = 0;
                // Por defecto, sin fondo
                bgDiv.style.backgroundImage = '';
                bgDiv.style.opacity = 0;
                card.addEventListener('mouseenter', function () {
                    if (filteredBooks.length > 0) {
                        bgIdx = 0;
                        bgDiv.style.backgroundImage = `url('${filteredBooks[0].cover}')`;
                        bgDiv.style.opacity = 1;
                        if (filteredBooks.length > 1) {
                            bgInterval = setInterval(() => {
                                bgIdx = (bgIdx + 1) % filteredBooks.length;
                                bgDiv.style.opacity = 0;
                                setTimeout(() => {
                                    bgDiv.style.backgroundImage = `url('${filteredBooks[bgIdx].cover}')`;
                                    bgDiv.style.opacity = 1;
                                }, 250);
                            }, 2000);
                        }
                    }
                });
                card.addEventListener('mouseleave', function () {
                    if (bgInterval) clearInterval(bgInterval);
                    bgDiv.style.opacity = 0;
                    setTimeout(() => {
                        bgDiv.style.backgroundImage = '';
                    }, 250);
                });
                card.onclick = () => { currentSagaId = saga.id; render(); };
                mainGrid.appendChild(card);
            });

        library.books
            .filter(b => b.title.toLowerCase().includes(search) && shouldShowBook(b))
            .forEach(book => {
                const bookCard = createBookCard(book, false);
                mainGrid.appendChild(bookCard);
            });
    }
    updateStats();
}

// ========================
// CREAR TARJETA DE LIBRO
// ========================
function createBookCard(book, isInsideSaga) {
    const div = document.createElement('div');
    div.className = 'book-card';
    div.dataset.id = book.id;

    // Lógica para mostrar estrellas o "Leyendo"
    let ratingDisplay = '';
    if (book.rating == 6) {
        ratingDisplay = `<div class="status-reading">📖 Leyendo</div>`;
    } else if (book.rating > 0 && book.rating <= 5) {
        ratingDisplay = `<div class="stars">${'★'.repeat(book.rating)}${'☆'.repeat(5 - book.rating)}</div>`;
    } else {
        ratingDisplay = `<div class="stars" style="color: transparent;">-</div>`; // Espacio vacío si es 0
    }

    // Mostrar etiqueta "Pendiente" si está marcado, o botón para marcar como pendiente solo si no tiene valoración
    let pendingDisplay = '';
    if (book.isPending) {
        pendingDisplay = `<div class="status-pending">⏳ Pendiente <button class="action-btn" style="color: var(--cloud-grey); padding: 0; margin-left: 8px; font-size: 0.7rem;" onclick="removePending(event, ${book.id}, ${isInsideSaga})">✓ Listo</button></div>`;
    } else if (book.rating === 0) {
        pendingDisplay = `<button class="status-btn-add" onclick="markAsPending(event, ${book.id}, ${isInsideSaga})">+ Pendiente</button>`;
    }

    // Crear el elemento HTML de manera segura
    div.innerHTML = `
        <div style=\"position:relative;\">
            <img src=\"${book.cover}\" 
                 alt=\"Portada de ${book.title}\" 
                 onerror=\"this.src='https://via.placeholder.com/240x340?text=Sin+Imagen'\">
        </div>
        <div class=\"book-content\"> 
            <p class=\"book-title\">${book.title}</p>
            <p class=\"book-author\">${book.author}</p>
            ${ratingDisplay}
            ${pendingDisplay}
            <div id=\"opinion-${book.id}\"></div>
            <div class=\"card-actions\"> 
                <button class=\"action-btn edit-btn\" onclick=\"openEditBook(event, ${book.id}, ${isInsideSaga})\">Editar</button>
                <button class=\"action-btn delete-btn\" onclick=\"deleteBook(event, ${book.id}, ${isInsideSaga})\">Borrar</button>
            </div>
        </div>
    `;



    // PREVENCIÓN DE XSS: Insertar la opinión de forma segura usando textContent
    if (book.opinion) {
        const opinionDiv = div.querySelector(`#opinion-${book.id}`);
        opinionDiv.className = 'opinion';
        opinionDiv.textContent = book.opinion; // textContent no interpreta HTML, previene XSS
    } else {
        div.querySelector(`#opinion-${book.id}`).remove();
    }

    return div;
}

// ========================
// FUNCIONES DE EDICIÓN
// ========================
function openEditBook(e, id, isInsideSaga) {
    e.stopPropagation();
    const book = isInsideSaga
        ? library.sagas.find(s => s.id === currentSagaId).books.find(b => b.id === id)
        : library.books.find(b => b.id === id);

    currentEditingBookId = id;
    document.getElementById('editBookId').value = id;
    document.getElementById('title').value = book.title;
    document.getElementById('author').value = book.author;
    document.getElementById('cover').value = book.cover;
    document.getElementById('rating').value = book.rating;
    document.getElementById('readDate').value = book.readDate || '';
    document.getElementById('opinion').value = book.opinion;

    document.getElementById('bookModalTitle').innerText = "EDITAR LIBRO";
    document.getElementById('bookModal').style.display = 'flex';
}

function openEditSaga(e, id) {
    e.stopPropagation();
    const saga = library.sagas.find(s => s.id === id);
    
    currentEditingSagaId = id;
    document.getElementById('editSagaId').value = id;
    document.getElementById('sagaName').value = saga.name;
    document.getElementById('sagaModalTitle').innerText = "EDITAR SAGA";
    document.getElementById('sagaModal').style.display = 'flex';
}

// ========================
// FORMULARIOS SUBMIT
// ========================
document.getElementById('bookForm').onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('editBookId').value;
    const title = document.getElementById('title').value;
    const author = document.getElementById('author').value;
    
    // VALIDACIÓN: Prevenir duplicados
    if (!id) {
        const isDuplicate = currentSagaId 
            ? library.sagas.find(s => s.id === currentSagaId).books.some(b => 
                b.title.toLowerCase() === title.toLowerCase() && 
                b.author.toLowerCase() === author.toLowerCase()
              )
            : library.books.some(b => 
                b.title.toLowerCase() === title.toLowerCase() && 
                b.author.toLowerCase() === author.toLowerCase()
              );
        
        if (isDuplicate) {
            alert('⚠️ Este libro ya existe en tu biblioteca.');
            return;
        }
    }
    
    const bookData = {
        id: id ? parseInt(id) : generateUniqueId(),
        title: title,
        author: author,
        cover: document.getElementById('cover').value,
        rating: parseInt(document.getElementById('rating').value),
        readDate: document.getElementById('readDate').value || null,
        opinion: document.getElementById('opinion').value
    };
    if (id) {
        // Actualizar existente
        if (currentSagaId) {
            let saga = library.sagas.find(s => s.id === currentSagaId);
            let idx = saga.books.findIndex(b => b.id == id);
            saga.books[idx] = bookData;
        } else {
            let idx = library.books.findIndex(b => b.id == id);
            library.books[idx] = bookData;
        }
    } else {
        // Nuevo
        if (currentSagaId) library.sagas.find(s => s.id === currentSagaId).books.push(bookData);
        else library.books.push(bookData);
    }
    save();
    closeModals();
    e.target.reset();
}

document.getElementById('sagaForm').onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('editSagaId').value;
    const name = document.getElementById('sagaName').value;

    if (id) {
                // Añadir libros a sagas, ordenados por 'order'
                const sagaBooks = booksData.filter(b => b.saga_id);
                const looseBooks = booksData.filter(b => !b.saga_id);

                for (const saga of library.sagas) {
                    const booksForSaga = sagaBooks
                        .filter(b => b.saga_id === saga.id)
                        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                    saga.books = booksForSaga.map(b => ({
                        id: b.id,
                        title: b.title,
                        author: b.author,
                        cover: b.cover,
                        rating: b.rating,
                        readDate: b.read_date,
                        opinion: b.opinion,
                        isPending: b.is_pending,
                    }));
                }

                // Añadir libros sueltos, ordenados por 'order'
                library.books = looseBooks
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                    .map(b => ({
                        id: b.id,
                        title: b.title,
                        author: b.author,
                        cover: b.cover,
                        rating: b.rating,
                        readDate: b.read_date,
                        opinion: b.opinion,
                        isPending: b.is_pending,
                    }));
        library.sagas.find(s => s.id == id).name = name;
    } else {
        library.sagas.push({ id: generateUniqueId(), name: name, books: [] });
    }
    save();
    closeModals();
    e.target.reset();
};

// ========================
// FUNCIONES DE BORRADO
// ========================
function deleteBook(e, id, isInsideSaga) {
    e.stopPropagation();
    if (!confirm("¿Borrar este libro?")) return;
    if (isInsideSaga) {
        const saga = library.sagas.find(s => s.id === currentSagaId);
        saga.books = saga.books.filter(b => b.id !== id);
    } else library.books = library.books.filter(b => b.id !== id);
    save();
}

function deleteSaga(e, id) {
    e.stopPropagation();
    if (!confirm("¿Borrar saga y todos sus libros?")) return;
    library.sagas = library.sagas.filter(s => s.id !== id);
    save();
}

// ========================
// FUNCIONES DE ESTADO PENDIENTE
// ========================
function markAsPending(e, id, isInsideSaga) {
    e.stopPropagation();
    if (isInsideSaga) {
        const saga = library.sagas.find(s => s.id === currentSagaId);
        const book = saga.books.find(b => b.id === id);
        book.isPending = true;
    } else {
        const book = library.books.find(b => b.id === id);
        book.isPending = true;
    }
    save();
}

function removePending(e, id, isInsideSaga) {
    e.stopPropagation();
    if (isInsideSaga) {
        const saga = library.sagas.find(s => s.id === currentSagaId);
        const book = saga.books.find(b => b.id === id);
        book.isPending = false;
    } else {
        const book = library.books.find(b => b.id === id);
        book.isPending = false;
    }
    save();
}

// ========================
// ESTADÍSTICAS
// ========================
function updateStats() {
    // Contar libros
    let allBooks = [];
    allBooks = allBooks.concat(library.books);
    library.sagas.forEach(s => allBooks = allBooks.concat(s.books));
    
    const total = allBooks.length;
    const reading = allBooks.filter(b => b.rating === 6).length;
    const pending = allBooks.filter(b => b.isPending).length;
    const completed = allBooks.filter(b => b.rating > 0 && b.rating <= 5).length;
    
    // Mostrar contadores detallados sin barra de progreso
    document.getElementById('mainStats').innerText = `📚 ${total} Libros | 📖 ${reading} Leyendo | ⏳ ${pending} Pendientes | ⭐ ${completed} Leídos`;
}

// ========================
// MANEJO DE MODALES
// ========================
const closeModals = () => {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    
    // Limpiar el formulario de libros
    document.getElementById('bookForm').reset();
    document.getElementById('editBookId').value = '';
    document.getElementById('bookModalTitle').innerText = "AÑADIR LIBRO";
    currentEditingBookId = null;
    
    // Limpiar el formulario de sagas
    document.getElementById('sagaForm').reset();
    document.getElementById('editSagaId').value = '';
    document.getElementById('sagaModalTitle').innerText = "NUEVA SAGA";
    currentEditingSagaId = null;
};

// Cerrar modales al hacer clic fuera de ellos (en el overlay)
document.getElementById('bookModal').addEventListener('click', (e) => {
    if (e.target.id === 'bookModal') {
        closeModals();
    }
});

document.getElementById('sagaModal').addEventListener('click', (e) => {
    if (e.target.id === 'sagaModal') {
        closeModals();
    }
});

// ========================
// EVENT LISTENERS
// ========================
document.getElementById('addBookBtn').onclick = () => {
    currentEditingBookId = null; // Resetear
    document.getElementById('bookModalTitle').innerText = "AÑADIR LIBRO";
    document.getElementById('bookForm').reset();
    document.getElementById('bookModal').style.display = 'flex';
};

document.getElementById('addSagaBtn').onclick = () => {
    currentEditingSagaId = null; // Resetear
    document.getElementById('sagaModalTitle').innerText = "NUEVA SAGA";
    document.getElementById('sagaForm').reset();
    document.getElementById('sagaModal').style.display = 'flex';
};

btnBack.onclick = () => { currentSagaId = null; render(); };
searchInput.oninput = (e) => render(e.target.value);

// Event listeners para filtros
const filterButtons = document.querySelectorAll('.filter-btn');
filterButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Remover clase active de todos
        filterButtons.forEach(b => b.classList.remove('active'));
        // Agregar clase active al botón clickeado
        e.target.classList.add('active');
        // Actualizar el filtro y renderizar
        currentFilter = e.target.dataset.filter;
        render(searchInput.value);
    });
});

// ========================
// BÚSQUEDA DE PORTADAS
// ========================
const searchCoverBtn = document.getElementById('searchCoverBtn');
const coverSearchModal = document.getElementById('coverSearchModal');
const coverSearchButton = document.getElementById('coverSearchButton');
const coverSearchInput = document.getElementById('coverSearchInput');

let coverSearchPage = 1; // Página actual de resultados

searchCoverBtn.onclick = (e) => {
    e.preventDefault();
    const title = document.getElementById('title').value;
    const author = document.getElementById('author').value;
    
    // Usar el título para buscar
    if (title) {
        coverSearchInput.value = title;
    } else if (author) {
        coverSearchInput.value = author;
    }
    
    coverSearchPage = 1; // Resetear a primera página
    coverSearchModal.style.display = 'flex';
};

function closeCoverSearchModal() {
    coverSearchModal.style.display = 'none';
    document.getElementById('coverSearchResults').innerHTML = '';
    coverSearchPage = 1;
}

coverSearchButton.onclick = async () => {
    const searchQuery = coverSearchInput.value.trim();
    if (!searchQuery) {
        alert('Por favor ingresa un título o autor para buscar.');
        return;
    }
    
    coverSearchPage = 1;
    await searchBookImages(searchQuery, coverSearchPage);
};

// Enter en el input
coverSearchInput.onkeypress = (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        coverSearchButton.click();
    }
};

async function searchBookImages(query, page = 1) {
    const loadingDiv = document.getElementById('coverSearchLoading');
    const resultsDiv = document.getElementById('coverSearchResults');
    
    loadingDiv.style.display = 'block';
    resultsDiv.innerHTML = '';
    
    try {
        console.log('🔍 Buscando en Unsplash:', query, 'Página:', page);
        
        // Unsplash API - Búsqueda de imágenes de alta calidad
        // Esta API funciona sin credenciales incluidas en el URL para búsquedas públicas
        const perPage = 10;
        const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query + ' book cover')}&page=${page}&per_page=${perPage}&client_id=OTja5Jrkk6MbgeRUBuiFf8RNqqW2-K0PQJa_5vpF_V4`;
        
        const response = await fetch(searchUrl, {
            headers: {
                'Accept-Version': 'v1'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Unsplash API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📸 Resultados Unsplash:', data);
        
        if (!data.results || data.results.length === 0) {
            resultsDiv.innerHTML = `
                <p style="grid-column: 1/-1; text-align: center; color: var(--cloud-grey); margin: 20px 0;">
                    No se encontraron imágenes para: "${query}"
                    <br><br>
                    Intenta:
                    <br>• Escribir solo el título del libro
                    <br>• Buscar en inglés
                    <br>• O pegar una URL de portada manualmente
                </p>
            `;
            loadingDiv.style.display = 'none';
            return;
        }
        
        // Convertir resultados de Unsplash a nuestro formato
        const imageUrls = data.results.map(photo => ({
            url: photo.urls.small,
            large: photo.urls.regular,
            title: photo.alt_description || photo.description || 'Book cover',
            author: photo.user.name
        }));
        
        console.log('✅ Imágenes encontradas:', imageUrls.length);
        displaySearchImageResults(imageUrls, query, page, data.total > (page * perPage));
        
    } catch (error) {
        console.error('❌ Error en Unsplash:', error);
        resultsDiv.innerHTML = `
            <p style="grid-column: 1/-1; text-align: center; color: red;">
                Error: ${error.message}
                <br><br>
                <small>Intenta:</small>
                <br>• Pegar una URL de portada manualmente
                <br>• Esperar unos segundos y reintentar
                <br>• Verificar tu conexión
            </p>
        `;
    }
    
    loadingDiv.style.display = 'none';
}

function displaySearchImageResults(imageUrls, query, page) {
    const resultsDiv = document.getElementById('coverSearchResults');
    resultsDiv.innerHTML = '';
    
    const resultsPerPage = 10;
    const startIdx = (page - 1) * resultsPerPage;
    const endIdx = startIdx + resultsPerPage;
    const paginatedUrls = imageUrls.slice(startIdx, endIdx);
    
    console.log(`📸 Mostrando portadas ${startIdx + 1} a ${Math.min(endIdx, imageUrls.length)} de ${imageUrls.length}`);
    
    if (paginatedUrls.length === 0) {
        resultsDiv.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--cloud-grey);">No hay más resultados.</p>';
        return;
    }
    
    // Mostrar imágenes
    paginatedUrls.forEach((item) => {
        // item puede ser un objeto {url, large, title, author} o solo una URL string
        const imgUrl = item.url || item;
        const fullUrl = item.large || imgUrl;
        
        const wrapper = document.createElement('div');
        wrapper.style.cursor = 'pointer';
        wrapper.style.position = 'relative';
        wrapper.style.overflow = 'hidden';
        wrapper.style.borderRadius = '8px';
        wrapper.style.transition = 'transform 0.2s';
        wrapper.style.backgroundColor = '#1a1a1a';
        wrapper.style.minHeight = '200px';
        
        const img = document.createElement('img');
        img.src = imgUrl;
        img.style.cursor = 'pointer';
        img.style.borderRadius = '8px';
        img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        img.style.width = '100%';
        img.style.aspectRatio = '3/4';
        img.style.objectFit = 'cover';
        img.style.backgroundColor = '#222';
        
        if (item.title) {
            img.title = `${item.title}${item.author ? ' - ' + item.author : ''}`;
        }
        
        wrapper.onmouseover = () => {
            wrapper.style.transform = 'scale(1.05)';
        };
        
        wrapper.onmouseout = () => {
            wrapper.style.transform = 'scale(1)';
        };
        
        img.onclick = () => {
            document.getElementById('cover').value = fullUrl;
            closeCoverSearchModal();
        };
        
        img.onerror = () => {
            console.warn('⚠️ No se pudo cargar:', imgUrl);
            wrapper.style.display = 'none';
        };
        
        wrapper.appendChild(img);
        resultsDiv.appendChild(wrapper);
    });
    
    // Agregar controles de paginación
    const totalPages = Math.ceil(imageUrls.length / resultsPerPage);
    if (totalPages > 1) {
        const paginationDiv = document.createElement('div');
        paginationDiv.style.gridColumn = '1/-1';
        paginationDiv.style.display = 'flex';
        paginationDiv.style.justifyContent = 'center';
        paginationDiv.style.gap = '10px';
        paginationDiv.style.marginTop = '20px';
        paginationDiv.style.paddingTop = '20px';
        paginationDiv.style.borderTop = '1px solid var(--tommen-green)';
        
        if (page > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.textContent = '← Anterior';
            prevBtn.className = 'btn btn-main';
            prevBtn.style.marginTop = '0';
            prevBtn.style.padding = '10px 15px';
            prevBtn.style.fontSize = '0.9rem';
            prevBtn.onclick = async () => {
                coverSearchPage = page - 1;
                const searchQuery = coverSearchInput.value;
                await searchBookImages(searchQuery, page - 1);
                document.getElementById('coverSearchResults').scrollIntoView({ behavior: 'smooth' });
            };
            paginationDiv.appendChild(prevBtn);
        }
        
        const pageInfo = document.createElement('span');
        pageInfo.textContent = `${page} de ${totalPages}`;
        pageInfo.style.color = 'var(--cloud-grey)';
        pageInfo.style.alignSelf = 'center';
        pageInfo.style.fontWeight = 'bold';
        paginationDiv.appendChild(pageInfo);
        
        if (page < totalPages) {
            const nextBtn = document.createElement('button');
            nextBtn.textContent = 'Siguiente →';
            nextBtn.className = 'btn btn-main';
            nextBtn.style.marginTop = '0';
            nextBtn.style.padding = '10px 15px';
            nextBtn.style.fontSize = '0.9rem';
            nextBtn.onclick = async () => {
                coverSearchPage = page + 1;
                const searchQuery = coverSearchInput.value;
                await searchBookImages(searchQuery, page + 1);
                document.getElementById('coverSearchResults').scrollIntoView({ behavior: 'smooth' });
            };
            paginationDiv.appendChild(nextBtn);
        }
        
        resultsDiv.appendChild(paginationDiv);
    }
}

// Cerrar modal al hacer clic en el overlay
coverSearchModal.addEventListener('click', (e) => {
    if (e.target.id === 'coverSearchModal') {
        closeCoverSearchModal();
    }
});

// ========================
// INICIALIZACIÓN
// ========================
render();
