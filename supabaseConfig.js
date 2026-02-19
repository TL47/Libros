// ========================
// CONFIGURACIÓN SUPABASE (SDK Oficial)
// ========================

const SUPABASE_URL = 'https://xfrfgakawujgxcwckbdf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmcmZnYWthd3VqZ3hjd2NrYmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NDQyMTcsImV4cCI6MjA4NzAyMDIxN30.3lm_GCJYersZPfCw29kMQ4U6ZXC0WstNfPOlT46JlF0';

// Inicializar cliente de Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========================
// FUNCIONES DE AUTENTICACIÓN
// ========================

async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });
    if (error) throw error;
    return data;
}

async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) throw error;
    return data;
}

async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    localStorage.removeItem('supabaseToken');
    localStorage.removeItem('supabaseUser');
    localStorage.removeItem('rememberSession');
}

// Guardar sesión en cache cuando "Mantener sesión iniciada" está marcado
async function saveSessionToCache(rememberMe = false) {
    const { data } = await supabase.auth.getSession();
    if (data.session && rememberMe) {
        localStorage.setItem('supabaseToken', data.session.access_token);
        localStorage.setItem('supabaseUser', JSON.stringify(data.session.user));
        localStorage.setItem('rememberSession', 'true');
    }
}

// Obtener sesión desde Supabase o desde cache si "Mantener sesión" está habilitado
async function getSession() {
    // Primero verificar si hay sesión en cache
    const rememberSession = localStorage.getItem('rememberSession');
    const cachedToken = localStorage.getItem('supabaseToken');
    const cachedUser = localStorage.getItem('supabaseUser');
    
    if (rememberSession && cachedToken && cachedUser) {
        // Retornar sesión desde cache
        return {
            access_token: cachedToken,
            user: JSON.parse(cachedUser),
        };
    }
    
    // Si no hay sesión en cache, obtenerla de Supabase
    const { data } = await supabase.auth.getSession();
    return data.session;
}

// ========================
// FUNCIONES DE LIBROS
// ========================

async function getBooks(userId) {
    const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
}

async function addBook(bookData, userId) {
    const { data, error } = await supabase
        .from('books')
        .insert([{
            user_id: userId,
            title: bookData.title,
            author: bookData.author,
            cover: bookData.cover,
            rating: bookData.rating,
            read_date: bookData.readDate || null,
            opinion: bookData.opinion || null,
            is_pending: bookData.isPending || false,
            saga_id: bookData.sagaId || null,
        }])
        .select();
    
    if (error) throw error;
    return data;
}

async function updateBook(bookId, bookData) {
    const { data, error } = await supabase
        .from('books')
        .update({
            title: bookData.title,
            author: bookData.author,
            cover: bookData.cover,
            rating: bookData.rating,
            read_date: bookData.readDate || null,
            opinion: bookData.opinion || null,
            is_pending: bookData.isPending || false,
            saga_id: bookData.sagaId || null,
            updated_at: new Date(),
        })
        .eq('id', bookId)
        .select();
    
    if (error) throw error;
    return data;
}

async function deleteBook(bookId) {
    const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId);
    
    if (error) throw error;
}

// ========================
// FUNCIONES DE SAGAS
// ========================

async function getSagas(userId) {
    const { data, error } = await supabase
        .from('sagas')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
}

async function addSaga(sagaData, userId) {
    const { data, error } = await supabase
        .from('sagas')
        .insert([{
            user_id: userId,
            name: sagaData.name,
        }])
        .select();
    
    if (error) throw error;
    return data;
}

async function updateSaga(sagaId, sagaData) {
    const { data, error } = await supabase
        .from('sagas')
        .update({
            name: sagaData.name,
            updated_at: new Date(),
        })
        .eq('id', sagaId)
        .select();
    
    if (error) throw error;
    return data;
}

async function deleteSaga(sagaId) {
    const { error } = await supabase
        .from('sagas')
        .delete()
        .eq('id', sagaId);
    
    if (error) throw error;
}
