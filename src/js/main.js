// src/js/main.js

let map;
let markers = [];
let currentPlaceId = null;
let currentUser = null;
let places = [];
let tempPhotoData = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Travel Blog запущен");
    checkAuth();
    setupEventListeners();
});

// ==================== АВТОРИЗАЦИЯ И UI ====================
function checkAuth() {
    currentUser = localStorage.getItem('current_user');
    if (currentUser) {
        document.getElementById('guestButtons').style.display = 'none';
        document.getElementById('userProfile').style.display = 'flex';
        document.getElementById('userName').textContent = '👤 ' + currentUser;
        document.getElementById('mainContent').style.display = 'grid';
        document.getElementById('guestMessage').style.display = 'none';
        
        initMap();
        loadUserPlaces();
    } else {
        document.getElementById('guestButtons').style.display = 'flex';
        document.getElementById('userProfile').style.display = 'none';
        document.getElementById('mainContent').style.display = 'none';
        document.getElementById('guestMessage').style.display = 'block';
    }
}

function setupEventListeners() {
    // Регистрация
    document.getElementById('registerBtn').onclick = () => document.getElementById('registerModal').classList.add('active');
    document.getElementById('closeRegister').onclick = () => document.getElementById('registerModal').classList.remove('active');
    document.getElementById('registerForm').onsubmit = (e) => { e.preventDefault(); handleRegister(); };

    // Вход
    document.getElementById('loginBtn').onclick = () => document.getElementById('loginModal').classList.add('active');
    document.getElementById('closeLogin').onclick = () => document.getElementById('loginModal').classList.remove('active');
    document.getElementById('loginForm').onsubmit = (e) => { e.preventDefault(); handleLogin(); };

    // Выход
    document.getElementById('logoutBtn').onclick = () => {
        if(confirm('Выйти из аккаунта?')) {
            localStorage.removeItem('current_user');
            location.reload();
        }
    };

    // Добавление места
    document.getElementById('addLocationBtn').onclick = () => document.getElementById('addModal').classList.add('active');
    document.getElementById('closeAdd').onclick = () => closeModal('addModal');
    document.getElementById('addForm').onsubmit = (e) => { e.preventDefault(); handleSavePlace(); };
    document.getElementById('placePhotoFile').onchange = handleFileSelect;
    document.getElementById('removePhoto').onclick = () => {
        tempPhotoData = null;
        document.getElementById('placePhotoUrl').value = '';
        document.getElementById('photoPreview').style.display = 'none';
        document.getElementById('placePhotoFile').value = '';
        document.getElementById('fileName').textContent = '';
    };

    // Просмотр и действия
    document.getElementById('closeView').onclick = () => closeModal('viewModal');
    document.getElementById('deletePlaceBtn').onclick = deletePlace;
    document.getElementById('editPlaceBtn').onclick = () => { closeModal('viewModal'); editPlace(); };

    // Закрытие модалок по клику на фон
    document.querySelectorAll('.modal').forEach(m => {
        m.onclick = (e) => { if(e.target === m) m.classList.remove('active'); };
    });
}

// ==================== ЛОГИКА АВТОРИЗАЦИИ ====================
function generateId() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
}

function handleRegister() {
    const u = document.getElementById('regUsername').value.trim();
    const p = document.getElementById('regPassword').value;
    const c = document.getElementById('regPasswordConfirm').value;
    const err = document.getElementById('regError');

    if (p !== c) { err.textContent = 'Пароли не совпадают!'; err.style.display = 'block'; return; }
    
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    if (users[u]) { err.textContent = 'Пользователь существует!'; err.style.display = 'block'; return; }

    users[u] = { password: p, registeredAt: new Date().toISOString() };
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('current_user', u);
    location.reload();
}

function handleLogin() {
    const u = document.getElementById('loginUsername').value.trim();
    const p = document.getElementById('loginPassword').value;
    const err = document.getElementById('loginError');
    const users = JSON.parse(localStorage.getItem('users') || '{}');

    if (!users[u] || users[u].password !== p) { err.textContent = 'Неверный логин/пароль!'; err.style.display = 'block'; return; }

    localStorage.setItem('current_user', u);
    location.reload();
}

// ==================== КАРТА ====================
function initMap() {
    if (!document.getElementById('map') || map) return;
    map = L.map('map').setView([55.75, 37.61], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', ).addTo(map);
}

function addMarker(place) {
    if (!map) return;
    const marker = L.marker([place.lat, place.lng]).addTo(map).bindPopup(`<b>${place.name}</b><br>${place.country || ''}`);
    marker.on('click', () => openViewModal(place.id));
    markers.push({ id: place.id, marker });
}

function loadUserPlaces() {
    if (!currentUser) return;
    const key = `places_${currentUser}`;
    try {
        places = JSON.parse(localStorage.getItem(key) || '[]');
    } catch (e) {
        places = [];
        console.error('Ошибка чтения данных:', e);
    }
    renderPlaces();
    
    markers.forEach(m => map.removeLayer(m.marker));
    markers = [];
    places.forEach(p => addMarker(p));
}

// ==================== ДЕЙСТВИЯ С МЕСТАМИ ====================
function focusOnPlace(id) {
    const place = places.find(p => p.id === id);
    if (!place || !map) return;

    const markerObj = markers.find(m => m.id === id);
    
    map.flyTo([place.lat, place.lng], 14, { duration: 1.2, easeLinearity: 0.25 });


    setTimeout(() => {
        if (markerObj && markerObj.marker) markerObj.marker.openPopup();
    }, 300);

}

function editPlaceFromList(id) {
    currentPlaceId = id;
    const p = places.find(x => x.id === id);
    if (!p) return;
    
    document.getElementById('placeName').value = p.name;
    document.getElementById('placeLat').value = p.lat;
    document.getElementById('placeLng').value = p.lng;
    document.getElementById('placeCountry').value = p.country || '';
    document.getElementById('placeNotes').value = p.notes || '';
    document.getElementById('placeDate').value = p.date || '';
    document.getElementById('placePhotoUrl').value = p.photo || '';
    
    if (p.photo) { 
        tempPhotoData = p.photo; 
        document.getElementById('previewImg').src = p.photo; 
        document.getElementById('photoPreview').style.display = 'block'; 
    }
    
    document.getElementById('addModal').classList.add('active');
}

function handleSavePlace() {
    try {
        const newId = currentPlaceId || generateId();
        const place = {
            id: newId,
            name: document.getElementById('placeName').value.trim(),
            lat: parseFloat(document.getElementById('placeLat').value),
            lng: parseFloat(document.getElementById('placeLng').value),
            country: document.getElementById('placeCountry').value.trim(),
            notes: document.getElementById('placeNotes').value.trim(),
            date: document.getElementById('placeDate').value,
            photo: tempPhotoData || document.getElementById('placePhotoUrl').value,
            userId: currentUser,
            createdAt: currentPlaceId ? (places.find(p => p.id === currentPlaceId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
        };

        if (currentPlaceId) {
            const idx = places.findIndex(p => p.id === currentPlaceId);
            if (idx !== -1) places[idx] = place;
        } else {
            places.push(place);
        }

        localStorage.setItem(`places_${currentUser}`, JSON.stringify(places));
        if (!currentPlaceId) addMarker(place);

        closeModal('addModal');
        renderPlaces();
        resetForm();
        map.setView([place.lat, place.lng], 10);
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            alert('❌ Память браузера переполнена! Используй ссылки на фото (URL) вместо загрузки файлов, или удали старые места.');
        } else {
            alert('Ошибка сохранения: ' + e.message);
        }
        console.error(e);
    }
}

function renderPlaces() {
    const list = document.getElementById('placesList');
    if (places.length === 0) {
        list.innerHTML = '<p class="empty-message">Пока нет мест. Добавьте первое! 🌍</p>';
        return;
    }
    
    list.innerHTML = places.map(p => `
        <div class="place-card">
            ${p.photo ? `<img src="${p.photo}" class="place-photo-thumb" alt="${p.name}" onclick="openViewModal('${p.id}')">` : ''}
            <div class="place-info" onclick="openViewModal('${p.id}')">
                <h4 class="place-name">${escapeHtml(p.name)}</h4>
                ${p.country ? `<p class="place-country">${escapeHtml(p.country)}</p>` : ''}
                ${p.date ? `<p class="place-date">📅 ${formatDate(p.date)}</p>` : ''}
            </div>
            <div class="place-actions">
                <button class="btn-card-action btn-map" onclick="focusOnPlace('${p.id}')" title="Показать на карте">📍</button>
                <button class="btn-card-action btn-edit" onclick="editPlaceFromList('${p.id}')" title="Редактировать">✏️</button>
            </div>
        </div>
    `).join('');
}

function openViewModal(id) {
    const p = places.find(x => x.id === id);
    if (!p) return;
    currentPlaceId = id;
    document.getElementById('viewTitle').textContent = p.name;
    document.getElementById('viewCountry').textContent = p.country || '';
    document.getElementById('viewDate').textContent = p.date ? `📅 ${formatDate(p.date)}` : '';
    document.getElementById('viewNotes').textContent = p.notes || 'Нет описания';
    
    const img = document.getElementById('viewPhoto');
    if (p.photo) { img.src = p.photo; img.style.display = 'block'; } 
    else { img.style.display = 'none'; }
    
    document.getElementById('viewModal').classList.add('active');
}

function editPlace() {
    editPlaceFromList(currentPlaceId);
}

function deletePlace() {
    if (!confirm('Удалить это место?')) return;
    places = places.filter(p => p.id !== currentPlaceId);
    localStorage.setItem(`places_${currentUser}`, JSON.stringify(places));
    
    const mIdx = markers.findIndex(m => m.id === currentPlaceId);
    if (mIdx !== -1) { map.removeLayer(markers[mIdx].marker); markers.splice(mIdx, 1); }
    
    closeModal('viewModal');
    renderPlaces();
}

// ==================== ЗАГРУЗКА ФОТО ====================
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 500000) {
        alert('⚠️ Файл слишком большой! Лучше используй URL-ссылку на фото.');
        return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
        tempPhotoData = ev.target.result;
        document.getElementById('previewImg').src = tempPhotoData;
        document.getElementById('photoPreview').style.display = 'block';
        document.getElementById('fileName').textContent = file.name;
    };
    reader.readAsDataURL(file);
}

// ==================== УТИЛИТЫ ====================
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    if (id === 'addModal') { resetForm(); currentPlaceId = null; }
}

function resetForm() {
    document.getElementById('addForm').reset();
    tempPhotoData = null;
    document.getElementById('photoPreview').style.display = 'none';
    document.getElementById('fileName').textContent = '';
    currentPlaceId = null;
}

function escapeHtml(t) { return t ? t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : ''; }
function formatDate(d) { return d ? new Date(d).toLocaleDateString('ru-RU') : ''; }
// Фикс для карты при ресайзе окна (поворот экрана телефона)
window.addEventListener('resize', () => {
    if (map) {
        // Небольшая задержка, чтобы CSS успел пересчитать размеры
        setTimeout(() => {
            map.invalidateSize();
        }, 200);
    }
});
// Глобальные функции для onclick в HTML
window.focusOnPlace = focusOnPlace;
window.openViewModal = openViewModal;
window.editPlaceFromList = editPlaceFromList;