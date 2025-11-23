// --- VARIÁVEIS GLOBAIS ---
let currentAudio = null;
let currentPlayBtn = null;
let stationData = [];

// --- LÓGICA EXECUTADA QUANDO A PÁGINA CARREGA ---
document.addEventListener('DOMContentLoaded', () => {
    if (document.body.classList.contains('moods-page')) {
        initMoodsPage();
    }
    if (document.body.classList.contains('stations-page')) {
        initStationsPage();
    }
    if (document.body.classList.contains('login-page')) {
        initLoginPage();
    }
    if (document.body.classList.contains('profile-page')) {
        initProfilePage();
    }
});

// ===================================================================
// --- PÁGINA DE LOGIN (/login_manual) ---
// ===================================================================
function initLoginPage() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const action = event.submitter.value;
            loginForm.querySelector('input[name="action"]').value = action;
            loginForm.submit();
        });
    }
}

// ===================================================================
// --- PÁGINA DE ESTAÇÕES (/stations) - Lógica Inalterada ---
// ===================================================================
async function initStationsPage() {
    try {
        const response = await fetch('/static/data/stations.json');
        const data = await response.json();
        stationData = data.stations;
    } catch (error) {
        console.error("Erro ao carregar o arquivo stations.json:", error);
        document.getElementById('station-container').innerHTML = `<p class="error-message">Não foi possível carregar os dados das estações. Verifique o arquivo stations.json.</p>`;
        return;
    }

    const stationContainer = document.getElementById('station-container');
    const navPillsContainer = document.getElementById('nav-pills');
    const navContentArea = document.getElementById('nav-content-area');

    stationData.forEach((station, index) => {
        const navPill = document.createElement('a');
        navPill.href = `#${station.id}`;
        navPill.className = 'nav-pill';
        navPill.textContent = station.dj;
        navPill.dataset.target = `#${station.id}`;
        if (index === 0) navPill.classList.add('active');
        navPillsContainer.appendChild(navPill);

        const navContentLink = document.createElement('a');
        navContentLink.href = `#${station.id}`;
        navContentLink.className = 'nav-content-link';
        navContentLink.textContent = station.name;
        navContentArea.appendChild(navContentLink);
        
        const section = document.createElement('section');
        section.id = station.id;
        section.className = 'station-section';
        section.innerHTML = `
            <div class="station-content">
                <div class="station-header">
                    <h2>${station.dj}</h2>
                    <h1>${station.name}</h1>
                </div>
                <div class="station-body">
                    <div class="station-media">
                        <img src="${station.image}" alt="${station.dj}" class="dj-photo">
                        ${station.gallery_images.map(img => `<img src="${img}" class="gallery-photo">`).join('')}
                    </div>
                    <div class="station-text">
                        <p class="quote">"${station.quote}"</p>
                        <p class="description">${station.description}</p>
                        <div class="tracklist-container">
                            <ul class="station-tracklist">
                                ${station.tracks.map((track, trackIndex) => `
                                    <li class="track-item" data-index="${trackIndex}">
                                        <div class="track-number">${trackIndex + 1}</div>
                                        <div class="track-info">
                                            <div class="track-title">${track.title}</div>
                                            <div class="track-artist">${track.artist}</div>
                                        </div>
                                        <button class="track-play-btn">
                                            <svg class="play-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                            <svg class="pause-icon" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                        </button>
                                        <audio class="track-audio" src="${track.url}" preload="metadata"></audio>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;
        stationContainer.appendChild(section);
    });

    const navOverlay = document.getElementById('nav-overlay');
    const openNavBtn = document.getElementById('open-nav-btn');
    const closeNavBtn = document.getElementById('close-nav-btn');
    
    openNavBtn.addEventListener('click', () => navOverlay.classList.add('is-open'));
    closeNavBtn.addEventListener('click', () => navOverlay.classList.remove('is-open'));

    navOverlay.addEventListener('click', (event) => {
        if (event.target.classList.contains('nav-content-link') || event.target.classList.contains('nav-pill')) {
            navOverlay.classList.remove('is-open');
        }
    });

    const sections = document.querySelectorAll('.station-section');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, { threshold: 0.2 });
    sections.forEach(section => observer.observe(section));

    stationContainer.addEventListener('click', (event) => {
        const playButton = event.target.closest('.track-play-btn');
        if (playButton) {
            const audio = playButton.parentElement.querySelector('.track-audio');
            playPauseTrack(audio, playButton);
        }
    });
}

function playPauseTrack(audio, btn) {
    if (currentAudio && currentAudio !== audio) {
        currentAudio.pause();
        currentPlayBtn.classList.remove('playing');
    }
    if (audio.paused) {
        audio.play();
        btn.classList.add('playing');
        currentAudio = audio;
        currentPlayBtn = btn;
    } else {
        audio.pause();
        btn.classList.remove('playing');
        currentAudio = null;
        currentPlayBtn = null;
    }
    audio.onended = () => { btn.classList.remove('playing'); };
}

// ===================================================================
// --- PÁGINA DE HUMORES (/moods) - Lógica Inalterada ---
// ===================================================================
function initMoodsPage() {
    const moodButtonsContainer = document.querySelector('.mood-buttons');
    let currentMood = '';

    moodButtonsContainer.addEventListener('click', (event) => {
        const button = event.target.closest('.mood-btn');
        if (button) {
            currentMood = button.dataset.mood;
            getMoodRecommendations(currentMood);
        }
    });
}

async function getMoodRecommendations(mood) {
    const musicDisplay = document.getElementById("music-display-area");
    musicDisplay.innerHTML = `<p class="loading-message">Criando sua playlist visual...</p>`;
    try {
        const response = await fetch("/api/recommend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mood: mood })
        });
        const data = await response.json();
        if (data.error || data.length < 5) {
            musicDisplay.innerHTML = `<p class="error-message">${data.error || 'Não encontramos músicas.'}</p>`;
            return;
        }
        musicDisplay.innerHTML = "";
        data.forEach(music => {
            const card = document.createElement("div");
            card.className = "music-card";
            card.style.backgroundImage = `url(${music.cover_url})`;
            
            const favoriteData = JSON.stringify({
                title: music.title,
                artist: music.artist,
                cover_url: music.cover_url,
                mood: mood
            });

            card.innerHTML = `
                <div class="card-overlay"></div>
                <div class="card-content">
                    <div class="info"><h3>${music.title}</h3><p>${music.artist}</p></div>
                    <div class="controls">
                        <button class="play-pause-btn" onclick="togglePlay('audio-mood-${music.id}', this, event, '${music.cover_url}')">
                            <svg class="play-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            <svg class="pause-icon" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        </button>
                        <button class="favorite-btn" onclick='handleFavoriteClick(${favoriteData}, this, event)'>
                            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        </button>
                    </div>
                </div>
                <audio id="audio-mood-${music.id}" src="${music.preview_url}" preload="none"></audio>
            `;
            musicDisplay.appendChild(card);
        });
    } catch (error) {
        musicDisplay.innerHTML = "<p class='error-message'>Erro ao buscar músicas.</p>";
    }
}

async function handleFavoriteClick(musicData, btn, event) {
    event.stopPropagation();
    try {
        const response = await fetch('/api/favorite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(musicData)
        });

        const data = await response.json();

        if (data.status === 'login_required') {
            window.location.href = '/login_manual';
            return;
        }

        if (!response.ok) {
            throw new Error(data.message || 'Falha ao favoritar a música');
        }

        btn.classList.add('favorited');
        console.log("Música favoritada com sucesso!");
    } catch (error) {
        console.error("Erro ao favoritar:", error);
        alert("Não foi possível favoritar a música. Tente novamente.");
    }
}

function togglePlay(audioId, btn, event, coverUrl = null) {
    if (event) event.stopPropagation();
    const audio = document.getElementById(audioId);
    if (!audio) return;

    const bgLayer = document.getElementById('moods-background-layer');

    if (currentAudio && currentAudio !== audio) {
        currentAudio.pause();
        currentPlayBtn.classList.remove('playing');
    }

    if (audio.paused) {
        audio.play();
        btn.classList.add('playing');
        currentAudio = audio;
        currentPlayBtn = btn;
        
        if (bgLayer && coverUrl) {
            bgLayer.style.backgroundImage = `url(${coverUrl})`;
            bgLayer.classList.add('is-active');
        }
    } else {
        audio.pause();
        btn.classList.remove('playing');
        currentAudio = null;
        currentPlayBtn = null;
        
        if (bgLayer) {
            bgLayer.classList.remove('is-active');
        }
    }

    audio.onended = () => {
        btn.classList.remove('playing');
        currentAudio = null;
        currentPlayBtn = null;

        if (bgLayer) {
            bgLayer.classList.remove('is-active');
        }
    };
}

async function deleteFavorite(favoriteId, element) {
    if (!confirm('Tem certeza que deseja remover esta música dos seus favoritos?')) {
        return;
    }
    try {
        const response = await fetch(`/api/favorite/delete/${favoriteId}`, {
            method: 'POST',
        });
        const data = await response.json();
        if (response.ok) {
            const card = element.closest('.favorite-card');
            card.style.transition = 'opacity 0.5s, transform 0.5s';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.8)';
            setTimeout(() => card.remove(), 500);
        } else {
            throw new Error(data.error || 'Falha ao remover favorito.');
        }
    } catch (error) {
        console.error('Erro ao deletar:', error);
        alert('Não foi possível remover o favorito.');
    }
}

// ... (manter o código anterior até initProfilePage) ...

// ===================================================================
// --- PÁGINA DE PERFIL (/profile) ---
// ===================================================================
function initProfilePage() {
    const deleteProfileBtn = document.getElementById('delete-profile-btn');
    if (deleteProfileBtn) {
        deleteProfileBtn.addEventListener('click', async () => {
            if (confirm('Tem certeza que deseja excluir seu perfil? Todos os favoritos e coleções serão perdidos.')) {
                try {
                    const response = await fetch('/api/delete_profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await response.json();
                    if (response.ok) {
                        alert(data.message);
                        window.location.href = '/';
                    } else {
                        throw new Error(data.error || 'Falha ao excluir perfil.');
                    }
                } catch (error) {
                    console.error('Erro ao excluir perfil:', error);
                    alert('Não foi possível excluir o perfil.');
                }
            }
        });
    }

    const createCollectionBtn = document.getElementById('create-collection-btn');
    if (createCollectionBtn) {
        createCollectionBtn.addEventListener('click', async () => {
            const collectionName = prompt('Digite o nome da nova coleção:');
            if (collectionName) {
                try {
                    const response = await fetch('/api/create_collection', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: collectionName })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        alert(`Coleção "${data.name}" criada com sucesso!`);
                        location.reload();
                    } else {
                        throw new Error(data.error || 'Falha ao criar coleção.');
                    }
                } catch (error) {
                    console.error('Erro ao criar coleção:', error);
                    alert('Não foi possível criar a coleção.');
                }
            }
        });
    }

    const collectionItems = document.querySelectorAll('.collection-item');
    collectionItems.forEach(item => {
        const addBtn = item.querySelector('.add-to-collection-btn');
        const select = item.querySelector('.favorite-select');
        if (addBtn && select) {
            addBtn.addEventListener('click', async () => {
                const collectionId = addBtn.dataset.collectionId;
                const favoriteId = select.value;
                if (!favoriteId) {
                    alert('Selecione uma música para adicionar.');
                    return;
                }
                try {
                    const response = await fetch('/api/add_to_collection', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ collection_id: collectionId, favorite_id: favoriteId })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        alert(data.message);
                        location.reload();
                    } else {
                        throw new Error(data.error || 'Falha ao adicionar à coleção.');
                    }
                } catch (error) {
                    console.error('Erro ao adicionar à coleção:', error);
                    alert('Não foi possível adicionar à coleção.');
                }
            });
        }

        const deleteCollectionBtn = item.querySelector('.delete-collection-btn');
        if (deleteCollectionBtn) {
            deleteCollectionBtn.addEventListener('click', async () => {
                if (confirm('Tem certeza que deseja excluir esta coleção?')) {
                    const collectionId = deleteCollectionBtn.dataset.collectionId;
                    try {
                        const response = await fetch(`/api/delete_collection/${collectionId}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' }
                        });
                        const data = await response.json();
                        if (response.ok) {
                            alert(data.message);
                            location.reload();
                        } else {
                            throw new Error(data.error || 'Falha ao excluir coleção.');
                        }
                    } catch (error) {
                        console.error('Erro ao excluir coleção:', error);
                        alert('Não foi possível excluir a coleção.');
                    }
                }
            });
        }

        const removeFromCollectionBtn = item.querySelector('.remove-from-collection-btn');
        if (removeFromCollectionBtn) {
            removeFromCollectionBtn.addEventListener('click', async () => {
                const collectionId = removeFromCollectionBtn.dataset.collectionId;
                const favoriteId = removeFromCollectionBtn.dataset.favoriteId;
                try {
                    const response = await fetch('/api/remove_from_collection', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ collection_id: collectionId, favorite_id: favoriteId })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        alert(data.message);
                        location.reload();
                    } else {
                        throw new Error(data.error || 'Falha ao remover da coleção.');
                    }
                } catch (error) {
                    console.error('Erro ao remover da coleção:', error);
                    alert('Não foi possível remover da coleção.');
                }
            });
        }
    });
}