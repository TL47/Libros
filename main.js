

// Autocompletado de título solo al pulsar el botón "Buscar títulos"
const titleInput = document.getElementById('title');
const authorInput = document.getElementById('author');
const authorDatalist = document.getElementById('authorSuggestions');

const findTitleBtn = document.getElementById('findTitleBtn');
const titleDropdown = document.getElementById('titleDropdown');

findTitleBtn.onclick = async function() {
    const title = titleInput.value;
    titleDropdown.innerHTML = '';
    titleDropdown.style.display = 'none';
    if (title.length < 3) {
        alert('Escribe al menos 3 letras para buscar.');
        return;
    }
    const apiKey = 'AIzaSyBW_Ty8_piPXRzab2UOvwyk5G3Pimq73g0';
    try {
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}&maxResults=10&langRestrict=es&key=${apiKey}`);
        const data = await res.json();
        let titleSuggestions = [];
        const authors = new Set();
        if (data.items) {
            data.items.forEach(item => {
                if (item.volumeInfo) {
                    if (item.volumeInfo.title) titleSuggestions.push(item.volumeInfo.title);
                    if (item.volumeInfo.authors) item.volumeInfo.authors.forEach(a => authors.add(a));
                }
            });
        }
        // Mostrar sugerencias de títulos en desplegable
        if (titleSuggestions.length > 0) {
            titleDropdown.innerHTML = '';
            titleSuggestions.forEach(suggestion => {
                const li = document.createElement('li');
                li.textContent = suggestion;
                li.style.padding = '10px 16px';
                li.style.cursor = 'pointer';
                li.style.background = 'var(--cloud-grey, #f7f7f7)';
                li.style.color = 'var(--dark-brown, #3e2c18)';
                li.style.fontFamily = "'Oswald', 'Lora', sans-serif";
                li.style.fontSize = '1rem';
                li.style.borderBottom = '1px solid #e0d3b8';
                li.onmouseenter = () => {
                    li.style.background = 'var(--st-pats-gold, #c5a059)';
                    li.style.color = '#fff';
                };
                li.onmouseleave = () => {
                    li.style.background = 'var(--cloud-grey, #f7f7f7)';
                    li.style.color = 'var(--dark-brown, #3e2c18)';
                };
                li.onclick = () => {
                    titleInput.value = suggestion;
                    titleDropdown.style.display = 'none';
                };
                titleDropdown.appendChild(li);
            });
            titleDropdown.style.display = 'block';
        } else {
            alert('No se encontraron títulos.');
        }
        // Autocompletar autores
        authorDatalist.innerHTML = '';
        Array.from(authors).forEach(author => {
            const option = document.createElement('option');
            option.value = author;
            authorDatalist.appendChild(option);
        });
    } catch (e) {
        alert('Error buscando títulos.');
    }
};

// Ocultar el desplegable si se hace clic fuera
document.addEventListener('click', function(e) {
    if (!titleDropdown.contains(e.target) && e.target !== findTitleBtn && e.target !== titleInput) {
        titleDropdown.style.display = 'none';
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
    // Llama a Google Books API con idioma español y API Key
    const apiKey = 'AIzaSyBW_Ty8_piPXRzab2UOvwyk5G3Pimq73g0';
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}&langRestrict=es&maxResults=10&key=${apiKey}`);
    const data = await res.json();
    coverModal.style.display = 'flex';
    if (data.items && data.items.length > 0) {
        let found = false;
        data.items.forEach(item => {
            let imgs = [];
            const links = item.volumeInfo.imageLinks || {};
            // Recoger todas las variantes disponibles
            if (links.thumbnail) imgs.push({url: links.thumbnail, label: 'Thumbnail'});
            if (links.smallThumbnail && links.smallThumbnail !== links.thumbnail) imgs.push({url: links.smallThumbnail, label: 'Small'});
            if (links.medium) imgs.push({url: links.medium, label: 'Medium'});
            if (links.large) imgs.push({url: links.large, label: 'Large'});
            if (links.extraLarge) imgs.push({url: links.extraLarge, label: 'XLarge'});
            if (imgs.length === 0) {
                imgs.push({url: 'https://via.placeholder.com/160x240/eee6d0/3e2c18?text=Sin+Portada', label: 'Sin portada'});
            }
            imgs.forEach(imgObj => {
                let imgUrl = imgObj.url.replace('http:', 'https:');
                imgUrl = imgUrl.replace(/([&?])zoom=1(?=&|$)/g, '$1zoom=3');
                const imgElem = document.createElement('img');
                imgElem.src = imgUrl;
                imgElem.alt = item.volumeInfo.title + ' - ' + imgObj.label;
                imgElem.style.width = '80px';
                imgElem.style.height = '120px';
                imgElem.style.cursor = 'pointer';
                imgElem.title = 'Elegir esta portada (' + imgObj.label + ')';
                imgElem.onclick = () => {
                    const coverInput = document.getElementById('cover');
                    coverInput.value = imgUrl;
                    coverModal.style.display = 'none';
                    coverInput.focus();
                    coverInput.select();
                };
                coverOptions.appendChild(imgElem);
            });
        });
        if (data.items.length === 0) {
            coverOptions.innerHTML = '<span style="color: #c00">No se encontraron portadas.</span>';
        }
    } else {
        coverOptions.innerHTML = '<span style="color: #c00">No se encontró el libro.</span>';
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

let library = { books: [], sagas: [] };

async function loadLibraryFromSupabase() {
    if (!currentUser) return;
    try {
        const books = await getBooks(currentUser.id);
        const sagas = await getSagas(currentUser.id);
        // Relacionar libros con sagas
        sagas.forEach(saga => {
            saga.books = books.filter(b => b.saga_id === saga.id);
        });
        library.books = books.filter(b => !b.saga_id);
        library.sagas = sagas;
        render();
    } catch (e) {
        console.error('Error cargando datos de Supabase:', e);
    }
}

// Llamar a la función de carga al iniciar
window.addEventListener('DOMContentLoaded', loadLibraryFromSupabase);
// Mantener listas de IDs eliminados para sincronizar con Supabase
// Flag de procedencia: los objetos cargados desde Supabase llevarán fromSupabase = true.
// Además, guardamos "claves" de libros borrados por título+autor+saga para limpiar cualquier copia remota.

// Función helper para generar siempre la misma clave de libro (normalizada)
function makeBookKey(title, author, sagaId) {
    const t = (title || '').trim().toLowerCase();
    const a = (author || '').trim().toLowerCase();
    const s = sagaId ? String(sagaId).trim().toLowerCase() : 'null';
    return `${t}|${a}|${s}`;
}

// Lista de claves de libros que queremos forzar a ignorar/limpiar siempre.
// (Caso concreto reportado por el usuario)
const BLOCKED_BOOK_KEYS = [
    makeBookKey('El arte de ser nosotros', 'Inma Rubiales', null),
];
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
    // Limpiar duplicados en Supabase (por título+autor+sagaId) al cargar, sin preguntar
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
                // Mantener solo el más antiguo y borrar el resto
                group.sort((a, b) => a.id - b.id);
                for (let i = 1; i < group.length; i++) {
                    try { await window.supaDeleteBook(group[i].id); } catch (e) { console.error('Error borrando duplicado remoto (load):', e); }
                }
            }
        }
    } catch (e) { console.error('Error limpiando duplicados remotos (load):', e); }
    try {
        let booksData = await getBooks(currentUser.id);
        const sagasData = await getSagas(currentUser.id);

        // ...existing code...
        
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
            const key = makeBookKey(b.title, b.author, b.saga_id);
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
                order: b.order ?? 0,
                fromSupabase: true,
                dirty: false
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

    // Solo sincronizar si hay cambios sucios o eliminaciones pendientes
    let hasDirty = false;
    if (isUsingSupabase && currentUser) {
        // Revisar si hay libros o sagas dirty
        for (const b of library.books) if (b.dirty) { hasDirty = true; break; }
        if (!hasDirty) {
            for (const s of library.sagas) {
                if (s.dirty) { hasDirty = true; break; }
                if (s.books) for (const b of s.books) if (b.dirty) { hasDirty = true; break; }
                if (hasDirty) break;
            }
        }
        if (hasDirty) {
            syncToSupabase().catch(err => console.error('Error sincronizando:', err));
        }
    }

    if (shouldRender) render();
    updateStats();
}

// Sincronizar library con Supabase
async function syncToSupabase() {
    // 0. Limpiar duplicados en Supabase (por título+autor+sagaId), sin preguntar,
    //    y aplicar también las "claves" de libros borrados (título+autor+saga).
    try {
        const allBooks = await getBooks(currentUser.id);
        const bookGroups = {};
        for (const b of allBooks) {
            const key = makeBookKey(b.title, b.author, b.saga_id);
            if (!bookGroups[key]) bookGroups[key] = [];
            bookGroups[key].push(b);
        }
        for (const key in bookGroups) {
            const group = bookGroups[key];
            if (group.length > 1) {
                group.sort((a, b) => a.id - b.id);
                for (let i = 1; i < group.length; i++) {
                    try { await window.supaDeleteBook(group[i].id); } catch (e) { console.error('Error borrando duplicado remoto:', e); }
                }
            }
        }

    } catch (e) { console.error('Error limpiando duplicados remotos:', e); }
            // Deduplicar antes de subir: solo un libro por título+autor+sagaId
            function dedupBooksArr(arr) {
                const seen = new Set();
                return arr.filter(b => {
                    const key = makeBookKey(b.title, b.author, b.sagaId || b.saga_id || null);
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            }
            library.books = dedupBooksArr(library.books);
            for (const saga of library.sagas) {
                saga.books = dedupBooksArr(saga.books);
            }
        // (No hay listas locales de eliminados; las eliminaciones se ejecutan inmediatamente)
    if (!currentUser) return;
    console.log('📤 Sincronizando solo entidades sucias con Supabase...');
    try {
        // 1. Sincronizar sagas sucias (solo nombre y orden)
        for (let i = 0; i < library.sagas.length; i++) {
            const saga = library.sagas[i];
            if (saga.dirty) {
                if (saga.fromSupabase) {
                    await updateSaga(saga.id, { name: saga.name, order: i });
                } else {
                    const [newSaga] = await addSaga({ name: saga.name, order: i }, currentUser.id);
                    saga.id = newSaga.id;
                    saga.fromSupabase = true;
                }
                saga.dirty = false;
            }
        }
        // 2. Sincronizar libros sueltos sucios
        for (let i = 0; i < library.books.length; i++) {
            const book = library.books[i];
            if (book.dirty) {
                if (book.fromSupabase) {
                    await updateBook(book.id, { ...book, sagaId: null, order: i });
                } else {
                    const [newBook] = await addBook({ ...book, sagaId: null, order: i }, currentUser.id);
                    book.id = newBook.id;
                    book.fromSupabase = true;
                }
                book.dirty = false;
            }
        }
        // 3. Sincronizar libros de sagas sucios
        for (const saga of library.sagas) {
            for (let i = 0; i < saga.books.length; i++) {
                const book = saga.books[i];
                if (book.dirty) {
                    if (book.fromSupabase) {
                        await updateBook(book.id, { ...book, sagaId: saga.id, order: i });
                    } else {
                        const [newBook] = await addBook({ ...book, sagaId: saga.id, order: i }, currentUser.id);
                        book.id = newBook.id;
                        book.fromSupabase = true;
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
                if (confirm("¿Quieres sobrescribir tu biblioteca actual y la base de datos con los datos pegados?")) {
                    // Si hay sesión y Supabase activo, sincronizar TODO desde cero
                    if (isUsingSupabase && currentUser) {
                        (async () => {
                            try {
                                console.log('[IMPORT] Borrando todos los libros y sagas en Supabase...');
                                await deleteAllBooks(currentUser.id);
                                await deleteAllSagas(currentUser.id);
                                console.log('[IMPORT] Borrado completado. Insertando sagas...');
                                // 2. Insertar sagas y guardar el mapping de IDs
                                const sagaIdMap = {};
                                for (const saga of parsed.sagas) {
                                    const sagaData = { name: saga.name, order: saga.order || 0, user_id: currentUser.id };
                                    let sagaResult, sagaError = null;
                                    try {
                                        sagaResult = await addSaga(sagaData, currentUser.id);
                                    } catch (e) {
                                        sagaError = e;
                                    }
                                    if (!sagaResult || !sagaResult[0] || !sagaResult[0].id) {
                                        alert('Error insertando saga: ' + saga.name + '\n' + (sagaError ? sagaError.message : JSON.stringify(sagaResult)));
                                        console.error('[IMPORT] Error insertando saga:', saga, sagaResult, sagaError);
                                        continue;
                                    }
                                    const newSaga = sagaResult[0];
                                    sagaIdMap[saga.id] = newSaga.id;
                                    saga._newId = newSaga.id;
                                    alert(`[IMPORT] Saga insertada: ${saga.name} -> ${newSaga.id}`);
                                    console.log(`[IMPORT] Saga insertada: ${saga.name} -> ${newSaga.id}`);
                                }
                                // 3. Insertar libros sueltos (sin saga)
                                const newBooks = [];
                                for (const book of parsed.books) {
                                    const mappedBook = {
                                        title: book.title,
                                        author: book.author,
                                        cover: book.cover,
                                        rating: book.rating,
                                        readDate: book.readDate || null,
                                        opinion: book.opinion || null,
                                        isPending: book.isPending || false,
                                        sagaId: null,
                                        order: book.order || 0,
                                        user_id: currentUser.id
                                    };
                                    let bookResult, bookError = null;
                                    try {
                                        bookResult = await addBook(mappedBook, currentUser.id);
                                    } catch (e) {
                                        bookError = e;
                                    }
                                    if (!bookResult || !bookResult[0] || !bookResult[0].id) {
                                        alert('Error insertando libro: ' + book.title + '\n' + (bookError ? bookError.message : JSON.stringify(bookResult)));
                                        console.error('[IMPORT] Error insertando libro:', book, bookResult, bookError);
                                        continue;
                                    }
                                    const newBook = bookResult[0];
                                    newBooks.push({ ...book, id: newBook.id });
                                    alert(`[IMPORT] Libro insertado: ${book.title} -> ${newBook.id}`);
                                    console.log(`[IMPORT] Libro insertado: ${book.title} -> ${newBook.id}`);
                                }
                                // 4. Insertar libros de sagas
                                for (const saga of parsed.sagas) {
                                    if (!saga.books) continue;
                                    for (const book of saga.books) {
                                        const mappedBook = {
                                            title: book.title,
                                            author: book.author,
                                            cover: book.cover,
                                            rating: book.rating,
                                            readDate: book.readDate || null,
                                            opinion: book.opinion || null,
                                            isPending: book.isPending || false,
                                            sagaId: sagaIdMap[saga.id],
                                            order: book.order || 0,
                                            user_id: currentUser.id
                                        };
                                        let bookResult, bookError = null;
                                        try {
                                            bookResult = await addBook(mappedBook, currentUser.id);
                                        } catch (e) {
                                            bookError = e;
                                        }
                                        if (!bookResult || !bookResult[0] || !bookResult[0].id) {
                                            alert('Error insertando libro en saga: ' + book.title + '\n' + (bookError ? bookError.message : JSON.stringify(bookResult)));
                                            console.error('[IMPORT] Error insertando libro en saga:', book, bookResult, bookError);
                                            continue;
                                        }
                                        const newBook = bookResult[0];
                                        book._newId = newBook.id;
                                        alert(`[IMPORT] Libro de saga insertado: ${book.title} -> ${newBook.id}`);
                                        console.log(`[IMPORT] Libro de saga insertado: ${book.title} -> ${newBook.id}`);
                                    }
                                }
                                // 5. Reconstruir library local con nuevos IDs
                                const newLibrary = { books: [], sagas: [] };
                                for (const b of newBooks) {
                                    newLibrary.books.push({ ...b });
                                }
                                for (const saga of parsed.sagas) {
                                    const sagaBooks = [];
                                    if (saga.books) {
                                        for (const book of saga.books) {
                                            sagaBooks.push({ ...book, id: book._newId });
                                        }
                                    }
                                    newLibrary.sagas.push({
                                        id: saga._newId,
                                        name: saga.name,
                                        order: saga.order || 0,
                                        books: sagaBooks
                                    });
                                }
                                library = newLibrary;
                                save();
                                alert("¡Importación y sincronización con la base de datos completadas!");
                                console.log('[IMPORT] Sincronización finalizada. Nuevo estado:', library);
                                render();
                            } catch (err) {
                                alert("Error al sincronizar con Supabase: " + (err.message || err));
                                console.error('[IMPORT] Error general:', err);
                            }
                        })();
                    } else {
                        // Solo local
                        library = parsed;
                        save();
                        alert("¡Importación local completada!");
                        render();
                    }
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
            .filter(s => (Array.isArray(s.books) && s.books.length === 0) || (s.books && s.books.some(b => shouldShowBook(b))))
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
    } else if (book.rating == 8) {
        ratingDisplay = `<div class="status-abandoned">🚫 Abandonado</div>`;
    }else if (book.rating > 0 && book.rating <= 5) {
        ratingDisplay = `<div class="stars">${'★'.repeat(book.rating)}${'☆'.repeat(5 - book.rating)}</div>`;
    } else {
        ratingDisplay = `<div class="stars" style="color: transparent;">-</div>`; // Espacio vacío si es 0
    }

    // Mostrar etiqueta "Pendiente" si está marcado, o botón para marcar como pendiente solo si no tiene valoración
    let pendingDisplay = '';
    if (book.isPending) {
        pendingDisplay = `<div class="status-pending">⏳ Pendiente</div>`;
        ratingDisplay = '';
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
                <button class=\"action-btn delete-btn\" onclick=\"this.remove();deleteBook(event, ${book.id}, ${isInsideSaga})\">Borrar</button>
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
document.getElementById('bookForm').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('editBookId').value;
    const title = document.getElementById('title').value;
    const author = document.getElementById('author').value;

    // VALIDACIÓN: Prevenir duplicados al crear (no al actualizar, porque actualizaremos mediante borrar+crear)
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

    // Normalizar y calcular algunos campos derivados (isPending, readDate) según la valoración
    const ratingVal = parseInt(document.getElementById('rating').value);
    let readDateVal = document.getElementById('readDate').value || null;
    if (ratingVal === 6) {
        // 'Leyendo' -> si no hay fecha, poner hoy
        if (!readDateVal) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            readDateVal = `${yyyy}-${mm}-${dd}`;
        }
    } else if (ratingVal === 7 || ratingVal === 8) {
        // 'Pendiente' y 'Abandonado' no deberían tener fecha de lectura
        readDateVal = null;
    }

    const bookData = {
        // Para creación se usará un id nuevo más abajo; si no hay id aquí será Date.now() pero
        // en la rama de actualización sobrescribiremos con un nuevo id igualmente.
        id: id ? parseInt(id) : Date.now(),
        title: title,
        author: author,
        cover: document.getElementById('cover').value,
        rating: ratingVal,
        readDate: readDateVal,
        isPending: ratingVal === 7,
        opinion: document.getElementById('opinion').value
    };

    if (id) {
        // Actualización: borrar el libro actual (local y remoto si procede) y crear uno nuevo
        const oldIdNum = parseInt(id);
        let oldFromSupabase = false;
        if (currentSagaId) {
            const saga = library.sagas.find(s => s.id === currentSagaId);
            const idx = saga ? saga.books.findIndex(b => b.id == oldIdNum) : -1;
            if (idx !== -1) {
                oldFromSupabase = !!saga.books[idx].fromSupabase;
                saga.books.splice(idx, 1);
            }
        } else {
            const idx = library.books.findIndex(b => b.id == oldIdNum);
            if (idx !== -1) {
                oldFromSupabase = !!library.books[idx].fromSupabase;
                library.books.splice(idx, 1);
            }
        }

        // Intentar borrar remoto si el libro antiguo venía de Supabase
        if (oldFromSupabase && typeof window.supaDeleteBook === 'function') {
            try {
                await window.supaDeleteBook(oldIdNum);
            } catch (err) {
                console.error('Error eliminando libro antiguo en Supabase durante actualización:', err);
            }
        }

        // Crear nuevo libro (reutiliza la lógica de creación) con id nuevo
        const newId = Date.now();
        const newBook = { ...bookData, id: newId, dirty: true, fromSupabase: false };
        if (currentSagaId) {
            const saga = library.sagas.find(s => s.id === currentSagaId);
            saga.books.push(newBook);
        } else {
            library.books.push(newBook);
        }
    } else {
        // Nuevo
        const newBook = { ...bookData, dirty: true, fromSupabase: false };
        if (currentSagaId) library.sagas.find(s => s.id === currentSagaId).books.push(newBook);
        else library.books.push(newBook);
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
async function deleteBook(e, id, isInsideSaga) {
    if (e && typeof e.stopPropagation === 'function') {
        e.stopPropagation();
    }
    if (typeof id !== 'number' || id <= 0) {
        console.warn('[BORRADO] ID de libro inválido:', id);
        return;
    }
    if (!confirm("¿Borrar este libro?")) return;
    console.log('[BORRADO] deleteBook llamado con id:', id, 'isInsideSaga:', isInsideSaga);
    let bookIdToDelete = null;
    let idx = -1;
    let saga = null;
    if (isInsideSaga) {
        saga = library.sagas.find(s => s.id === currentSagaId);
        idx = saga ? saga.books.findIndex(b => b.id === id) : -1;
        console.log('[BORRADO] Saga encontrada:', saga, 'Índice libro:', idx);
        if (idx === -1) {
            console.warn('[BORRADO] Libro no encontrado en saga');
            return;
        }
        bookIdToDelete = saga.books[idx].id;
    } else {
        idx = library.books.findIndex(b => b.id === id);
        console.log('[BORRADO] Índice libro fuera de saga:', idx);
        if (idx === -1) {
            console.warn('[BORRADO] Libro no encontrado en library');
            return;
        }
        bookIdToDelete = library.books[idx].id;
    }
    if (typeof bookIdToDelete === 'number' && bookIdToDelete > 0) {
        console.log('[BORRADO] Enviando petición a Supabase para borrar libro:', bookIdToDelete);
        if (typeof window.supaDeleteBook === 'function') {
            try {
                await window.supaDeleteBook(bookIdToDelete);
                console.log('[BORRADO] Libro borrado en Supabase:', bookIdToDelete);
                // Solo eliminar localmente si el borrado remoto fue exitoso
                if (isInsideSaga && saga && idx !== -1) {
                    saga.books.splice(idx, 1);
                    console.log('[BORRADO] Libro borrado de saga:', bookIdToDelete);
                } else if (!isInsideSaga && idx !== -1) {
                    library.books.splice(idx, 1);
                    console.log('[BORRADO] Libro borrado de library:', bookIdToDelete);
                }
                save();
            } catch (e) {
                console.error('[BORRADO] Error borrando libro remoto:', e);
                alert('Error borrando libro en base de datos: ' + (e.message || e));
            }
        } else {
            console.error('[BORRADO] window.supaDeleteBook no es una función');
        }
    } else {
        console.warn('[BORRADO] No se encontró bookIdToDelete válido para borrar en Supabase');
    }
}

async function deleteSaga(e, id) {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    console.log('[BORRADO] deleteSaga llamado con id:', id);
    if (!confirm("¿Borrar saga y todos sus libros?")) return;
    const idx = library.sagas.findIndex(s => s.id === id);
    console.log('[BORRADO] Índice saga:', idx);
    if (idx === -1) {
        console.warn('[BORRADO] No se encontró saga para borrar en Supabase');
        return;
    }

    const saga = library.sagas[idx];
    const sagaIdToDelete = saga.id;

    // Eliminar todos los libros de la saga en Supabase (secuencialmente para manejar errores y logs)
    if (Array.isArray(saga.books)) {
        for (const book of saga.books) {
            if (book && book.id) {
                console.log('[BORRADO] Enviando petición a Supabase para borrar libro de saga:', book.id);
                if (typeof window.supaDeleteBook === 'function') {
                    try {
                        await window.supaDeleteBook(book.id);
                        console.log('[BORRADO] Libro de saga borrado en Supabase:', book.id);
                    } catch (err) {
                        console.error('[BORRADO] Error borrando libro remoto:', err);
                        alert('Error borrando libro de saga en base de datos: ' + (err.message || err));
                    }
                } else {
                    console.error('[BORRADO] window.supaDeleteBook no es una función');
                }
            }
        }
    }

    // Eliminar la saga en Supabase
    if (sagaIdToDelete) {
        console.log('[BORRADO] Enviando petición a Supabase para borrar saga:', sagaIdToDelete);
        if (typeof window.supaDeleteSaga === 'function') {
            try {
                await window.supaDeleteSaga(sagaIdToDelete);
                console.log('[BORRADO] Saga borrada en Supabase:', sagaIdToDelete);
            } catch (err) {
                console.error('[BORRADO] Error borrando saga remota:', err);
                alert('Error borrando saga en base de datos: ' + (err.message || err));
            }
        } else {
            console.error('[BORRADO] window.supaDeleteSaga no es una función');
        }
    }

    library.sagas.splice(idx, 1);
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