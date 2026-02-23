// Autocompletado visual (ghost text) para el título
const titleInput = document.getElementById('title');
const titleGhost = document.getElementById('titleGhost');
const authorInput = document.getElementById('author');
const authorDatalist = document.getElementById('authorSuggestions');

let lastTitleQuery = '';
let titleSuggestions = [];
let ghostActive = false;

titleInput.addEventListener('input', async function(e) {
    const title = titleInput.value;
    if (title.length < 3) {
        titleGhost.textContent = '';
        return;
    }
    if (title !== lastTitleQuery) {
        lastTitleQuery = title;
        try {
            const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}&maxResults=10`);
            const data = await res.json();
            titleSuggestions = [];
            const authors = new Set();
            if (data.items) {
                data.items.forEach(item => {
                    if (item.volumeInfo) {
                        if (item.volumeInfo.title) titleSuggestions.push(item.volumeInfo.title);
                        if (item.volumeInfo.authors) item.volumeInfo.authors.forEach(a => authors.add(a));
                    }
                });
            }
            authorDatalist.innerHTML = '';
            Array.from(authors).forEach(author => {
                const option = document.createElement('option');
                option.value = author;
                authorDatalist.appendChild(option);
            });
        } catch (e) {
            titleSuggestions = [];
            authorDatalist.innerHTML = '';
        }
    }
    // Buscar la mejor sugerencia que empiece por el texto actual (case-insensitive)
    const lower = title.toLowerCase();
    const match = titleSuggestions.find(s => s.toLowerCase().startsWith(lower) && s.length > title.length);
    if (match) {
        // Medir el ancho del texto ya escrito para posicionar el ghost
        const span = document.createElement('span');
        span.style.visibility = 'hidden';
        span.style.position = 'absolute';
        span.style.whiteSpace = 'pre';
        span.style.fontFamily = getComputedStyle(titleInput).fontFamily;
        span.style.fontSize = getComputedStyle(titleInput).fontSize;
        span.style.fontWeight = getComputedStyle(titleInput).fontWeight;
        span.style.letterSpacing = getComputedStyle(titleInput).letterSpacing;
        span.textContent = title;
        document.body.appendChild(span);
        const offset = span.offsetWidth;
        document.body.removeChild(span);
        titleGhost.style.left = (offset + 7) + 'px'; // 7px = input padding - 5px para acercar
        titleGhost.textContent = match.substring(title.length);
        titleGhost.style.display = 'flex';
    } else {
        titleGhost.textContent = '';
        titleGhost.style.display = 'none';
        titleGhost.style.left = '0';
    }
});

// Si el usuario pulsa Tab y hay ghost, autocompletar el texto original + ghost
titleInput.addEventListener('keydown', function(e) {
    if (e.key === 'Tab' && titleGhost.textContent) {
        e.preventDefault();
        titleInput.value = titleInput.value + titleGhost.textContent;
        titleGhost.textContent = '';
        // Lanzar evento input para refrescar sugerencias de autor
        titleInput.dispatchEvent(new Event('input'));
    }
});
// Asignar fecha de lectura automáticamente al seleccionar una valoración de estrellas
document.getElementById('rating').addEventListener('change', function() {
    const val = parseInt(this.value);
    const readDateInput = document.getElementById('readDate');
    if (val >= 1 && val <= 5) {
        // Solo para estrellas
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        readDateInput.value = `${yyyy}-${mm}-${dd}`;
        readDateInput.disabled = true;
    } else {
        // Para 'Leyendo' y 'Valoración', permitir edición manual
        readDateInput.value = '';
        readDateInput.disabled = false;
    }
});
// Estado para selección múltiple
let isMultiSelectMode = false;
let selectedBookIds = [];
// ========================
// BUSCAR PORTADA AUTOMÁTICA EN MODAL
document.getElementById('findCoverBtn').onclick = async function() {
    const title = document.getElementById('title').value;
    const author = document.getElementById('author').value;
    const coverOptions = document.getElementById('coverOptions');
    const coverModal = document.getElementById('coverModal');
    coverOptions.innerHTML = '';
    if (!title) return alert('Introduce el título');
    // Llama a Google Books API con idioma español
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}&langRestrict=es`);
    const data = await res.json();
    coverModal.style.display = 'flex';
    if (data.items && data.items.length > 0) {
        let found = false;
        data.items.forEach(item => {
            const img = item.volumeInfo.imageLinks?.thumbnail || item.volumeInfo.imageLinks?.smallThumbnail;
            if (img) {
                found = true;
                let imgUrl = img.replace('http:', 'https:');
                // Reemplazar cualquier parámetro zoom=1 por zoom=3 en la URL (aunque esté en medio de otros parámetros)
                imgUrl = imgUrl.replace(/([&?])zoom=1(?=&|$)/g, '$1zoom=3');
                const imgElem = document.createElement('img');
                imgElem.src = imgUrl;
                imgElem.alt = item.volumeInfo.title;
                imgElem.style.width = '80px';
                imgElem.style.height = '120px';
                imgElem.style.cursor = 'pointer';
                imgElem.title = 'Elegir esta portada';
                imgElem.onclick = () => {
                    const coverInput = document.getElementById('cover');
                    coverInput.value = imgUrl;
                    coverModal.style.display = 'none';
                    // Enfocar y seleccionar el campo para permitir edición manual
                    coverInput.focus();
                    coverInput.select();
                };
                coverOptions.appendChild(imgElem);
            }
        });
        if (!found) {
            coverOptions.innerHTML = '<span style="color: #c00">No se encontraron portadas.</span>';
        }
    } else {
        coverOptions.innerHTML = '<span style=\"color: #c00\">No se encontró el libro.</span>';
    }
};

// Cerrar el modal de portadas sugeridas
document.getElementById('closeCoverModal').onclick = function() {
    document.getElementById('coverModal').style.display = 'none';
};
// Cerrar el modal si se hace clic fuera del contenido
document.getElementById('coverModal').addEventListener('click', function(e) {
    if (e.target.id === 'coverModal') {
        document.getElementById('coverModal').style.display = 'none';
    }
});
// IMPORTS SUPABASE
// ========================
// Asegúrate de que estas funciones estén exportadas en supabaseConfig.js
// y que el archivo esté correctamente enlazado en tu HTML
// Si usas módulos ES6, usa import {...} from './supabaseConfig.js';
// Si usas script clásico, asegúrate que supabaseConfig.js se carga antes

// deleteAllBooks, deleteAllSagas, addBook, addSaga, getSagas deben estar en window o importados

let library = JSON.parse(localStorage.getItem('myLibraryStorageV2')) || { books: [], sagas: [] };
// Mantener listas de IDs eliminados para sincronizar con Supabase
let deletedBookIds = JSON.parse(localStorage.getItem('deletedBookIds') || '[]');
let deletedSagaIds = JSON.parse(localStorage.getItem('deletedSagaIds') || '[]');
// Migración: asegurar que todos los libros y sagas tengan el flag dirty (por defecto false)
if (library.books) {
    library.books.forEach(b => { if (b.dirty === undefined) b.dirty = false; });
}
if (library.sagas) {
    library.sagas.forEach(s => {
        if (s.dirty === undefined) s.dirty = false;
        if (s.books) s.books.forEach(b => { if (b.dirty === undefined) b.dirty = false; });
    });
}
let currentSagaId = null;
let currentEditingBookId = null;
let currentEditingSagaId = null;
let currentFilter = 'all'; // Filtro activo
let currentUser = null; // Usuario actual
let isUsingSupabase = false; // Flag para usar Supabase o localStorage

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
            // Limpiar duplicados en Supabase (por título+autor+sagaId) al cargar
            try {
                const allBooks = await getBooks(currentUser.id);
                const bookGroups = {};
                for (const b of allBooks) {
                    const key = (b.title + '|' + b.author + '|' + (b.saga_id || 'null')).toLowerCase();
                    if (!bookGroups[key]) bookGroups[key] = [];
                    bookGroups[key].push(b);
                }
                for (const key in bookGroups) {
                    const group = bookGroups[key];
                    if (group.length > 1) {
                        group.sort((a, b) => a.id - b.id);
                        for (let i = 1; i < group.length; i++) {
                            try { await deleteBook(group[i].id); } catch (e) { console.error('Error borrando duplicado remoto (load):', e); }
                        }
                    }
                }
            } catch (e) { console.error('Error limpiando duplicados remotos (load):', e); }
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
        //    Siempre ordenados por 'order' y sin duplicados (por id y por título+autor+sagaId)
        const sagaBooksMap = {};
        for (const saga of library.sagas) {
            sagaBooksMap[saga.id] = [];
        }
        const looseBooksArr = [];
        // Deduplicar por id y por clave compuesta
        const seenBookKeys = new Set();
        for (const b of booksData) {
            const key = (b.title + '|' + b.author + '|' + (b.saga_id || 'null')).toLowerCase();
            if (seenBookKeys.has(key)) continue;
            seenBookKeys.add(key);
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
    localStorage.setItem('deletedBookIds', JSON.stringify(deletedBookIds));
    localStorage.setItem('deletedSagaIds', JSON.stringify(deletedSagaIds));
    
    // Guardar en Supabase si hay sesión activa
    if (isUsingSupabase && currentUser) {
        syncToSupabase().catch(err => console.error('Error sincronizando:', err));
    }
    
    if (shouldRender) render();
    updateStats();
}

// Sincronizar library con Supabase
async function syncToSupabase() {
                // 0. Limpiar duplicados en Supabase (por título+autor+sagaId)
                try {
                    const allBooks = await getBooks(currentUser.id);
                    const bookGroups = {};
                    for (const b of allBooks) {
                        const key = (b.title + '|' + b.author + '|' + (b.saga_id || 'null')).toLowerCase();
                        if (!bookGroups[key]) bookGroups[key] = [];
                        bookGroups[key].push(b);
                    }
                    for (const key in bookGroups) {
                        const group = bookGroups[key];
                        if (group.length > 1) {
                            // Ordenar por id para dejar el más antiguo
                            group.sort((a, b) => a.id - b.id);
                            // Eliminar todos menos el primero
                            for (let i = 1; i < group.length; i++) {
                                try { await deleteBook(group[i].id); } catch (e) { console.error('Error borrando duplicado remoto:', e); }
                            }
                        }
                    }
                } catch (e) { console.error('Error limpiando duplicados remotos:', e); }
            // Deduplicar antes de subir: solo un libro por título+autor+sagaId
            function dedupBooksArr(arr) {
                const seen = new Set();
                return arr.filter(b => {
                    const key = (b.title + '|' + b.author + '|' + (b.sagaId || b.saga_id || 'null')).toLowerCase();
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            }
            library.books = dedupBooksArr(library.books);
            for (const saga of library.sagas) {
                saga.books = dedupBooksArr(saga.books);
            }
        // 0. Eliminar en Supabase los libros y sagas borrados localmente
        for (const bookId of deletedBookIds) {
            if (bookId && String(bookId).length > 8) {
                try { await deleteBook(bookId); } catch (e) { console.error('Error borrando libro remoto:', e); }
            }
        }
        for (const sagaId of deletedSagaIds) {
            if (sagaId && String(sagaId).length > 8) {
                try { await deleteSaga(sagaId); } catch (e) { console.error('Error borrando saga remota:', e); }
            }
        }
        deletedBookIds = [];
        deletedSagaIds = [];
    if (!currentUser) return;
    console.log('📤 Sincronizando solo entidades sucias con Supabase...');
    try {
        // 1. Sincronizar sagas sucias (solo nombre y orden)
        for (let i = 0; i < library.sagas.length; i++) {
            const saga = library.sagas[i];
            if (saga.dirty) {
                if (saga.id && String(saga.id).length > 8) {
                    await updateSaga(saga.id, { name: saga.name, order: i });
                } else {
                    const [newSaga] = await addSaga({ name: saga.name, order: i }, currentUser.id);
                    saga.id = newSaga.id;
                }
                saga.dirty = false;
            }
        }
        // 2. Sincronizar libros sueltos sucios
        for (let i = 0; i < library.books.length; i++) {
            const book = library.books[i];
            if (book.dirty) {
                if (book.id && String(book.id).length > 8) {
                    await updateBook(book.id, { ...book, sagaId: null, order: i });
                } else {
                    const [newBook] = await addBook({ ...book, sagaId: null, order: i }, currentUser.id);
                    book.id = newBook.id;
                }
                book.dirty = false;
            }
        }
        // 3. Sincronizar libros de sagas sucios
        for (const saga of library.sagas) {
            for (let i = 0; i < saga.books.length; i++) {
                const book = saga.books[i];
                if (book.dirty) {
                    if (book.id && String(book.id).length > 8) {
                        await updateBook(book.id, { ...book, sagaId: saga.id, order: i });
                    } else {
                        const [newBook] = await addBook({ ...book, sagaId: saga.id, order: i }, currentUser.id);
                        book.id = newBook.id;
                    }
                    book.dirty = false;
                }
            }
        }
        save(false); // Guardar para limpiar flags dirty
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
                if (confirm("¿Quieres sobrescribir tu biblioteca actual con los datos pegados?")) {
                    library = parsed;
                    save();
                }
            } else {
                alert("El código no parece ser válido.");
            }
        } catch (e) {
            alert("Error al procesar los datos.");
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
                if (isMultiSelectMode && selectedBookIds.includes(book.id)) {
                    bookCard.classList.add('book-selected-aura');
                } else {
                    bookCard.classList.remove('book-selected-aura');
                }
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
                card.onclick = () => { if (!isMultiSelectMode) { currentSagaId = saga.id; render(); } };
                mainGrid.appendChild(card);
            });

        library.books
            .filter(b => b.title.toLowerCase().includes(search) && shouldShowBook(b))
            .forEach(book => {
                const bookCard = createBookCard(book, false);
                if (isMultiSelectMode && selectedBookIds.includes(book.id)) {
                    bookCard.classList.add('book-selected-aura');
                } else {
                    bookCard.classList.remove('book-selected-aura');
                }
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
    // Aura visual si está seleccionado
    // ...eliminado selección múltiple...
// ...eliminado selección múltiple...

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
        id: id ? parseInt(id) : Date.now(),
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
            saga.books[idx] = { ...bookData, dirty: true };
        } else {
            let idx = library.books.findIndex(b => b.id == id);
            library.books[idx] = { ...bookData, dirty: true };
        }
    } else {
        // Nuevo
        if (currentSagaId) library.sagas.find(s => s.id === currentSagaId).books.push({ ...bookData, dirty: true });
        else library.books.push({ ...bookData, dirty: true });
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
        library.sagas.find(s => s.id == id).name = name;
        library.sagas.find(s => s.id == id).dirty = true;
    } else {
        library.sagas.push({ id: Date.now(), name: name, books: [], dirty: true });
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
    let bookIdToDelete = null;
    if (isInsideSaga) {
        const saga = library.sagas.find(s => s.id === currentSagaId);
        const idx = saga.books.findIndex(b => b.id === id);
        if (idx !== -1) {
            bookIdToDelete = saga.books[idx].id;
            saga.books.splice(idx, 1);
        }
    } else {
        const idx = library.books.findIndex(b => b.id === id);
        if (idx !== -1) {
            bookIdToDelete = library.books[idx].id;
            library.books.splice(idx, 1);
        }
    }
    if (bookIdToDelete && String(bookIdToDelete).length > 8) {
        deletedBookIds.push(bookIdToDelete);
    }
    save();
}

function deleteSaga(e, id) {
    e.stopPropagation();
    if (!confirm("¿Borrar saga y todos sus libros?")) return;
    const idx = library.sagas.findIndex(s => s.id === id);
    if (idx !== -1) {
        const sagaIdToDelete = library.sagas[idx].id;
        // También eliminar todos los libros de la saga
        for (const book of library.sagas[idx].books) {
            if (book.id && String(book.id).length > 8) {
                deletedBookIds.push(book.id);
            }
        }
        if (sagaIdToDelete && String(sagaIdToDelete).length > 8) {
            deletedSagaIds.push(sagaIdToDelete);
        }
        library.sagas.splice(idx, 1);
    }
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
        book.dirty = true;
    } else {
        const book = library.books.find(b => b.id === id);
        book.isPending = true;
        book.dirty = true;
    }
    save();
}

function removePending(e, id, isInsideSaga) {
    e.stopPropagation();
    if (isInsideSaga) {
        const saga = library.sagas.find(s => s.id === currentSagaId);
        const book = saga.books.find(b => b.id === id);
        book.isPending = false;
        book.dirty = true;
    } else {
        const book = library.books.find(b => b.id === id);
        book.isPending = false;
        book.dirty = true;
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
// INICIALIZACIÓN
// ========================
render();