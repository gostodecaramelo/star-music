import os
import json
import requests
import random
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_session import Session
import spotipy
from dotenv import load_dotenv

load_dotenv()

# ===================================================================
# --- CONFIGURAÇÃO DA APLICAÇÃO E BANCO DE DADOS ---
# ===================================================================
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///vibezone.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
Session(app)
db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    spotify_id = db.Column(db.String(80), unique=True, nullable=False)
    display_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True)
    profile_image_url = db.Column(db.String(300))
    favorites = db.relationship('Favorite', backref='user', lazy=True, cascade="all, delete-orphan")
    collections = db.relationship('Collection', backref='user', lazy=True, cascade="all, delete-orphan")

class Favorite(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    song_title = db.Column(db.String(200), nullable=False)
    artist_name = db.Column(db.String(200), nullable=False)
    cover_url = db.Column(db.String(300), nullable=False)
    mood = db.Column(db.String(50), nullable=False)
    collection_items = db.relationship('CollectionItem', backref='favorite', lazy=True)  # Adicionado backref

class Collection(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    items = db.relationship('CollectionItem', backref='collection', lazy=True, cascade="all, delete-orphan")

class CollectionItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    collection_id = db.Column(db.Integer, db.ForeignKey('collection.id'), nullable=False)
    favorite_id = db.Column(db.Integer, db.ForeignKey('favorite.id'), nullable=False)

# ===================================================================
# --- ROTAS DE AUTENTICAÇÃO DO SPOTIFY ---
# ===================================================================
def create_spotify_oauth():
    return spotipy.oauth2.SpotifyOAuth(
        scope='user-read-private user-read-email',
        client_id=os.getenv("SPOTIPY_CLIENT_ID"),
        client_secret=os.getenv("SPOTIPY_CLIENT_SECRET"),
        redirect_uri=url_for('callback', _external=True)
    )

@app.route('/login_manual', methods=['GET', 'POST'])
def login_manual():
    if request.method == 'POST':
        action = request.form.get('action')
        sp_oauth = create_spotify_oauth()
        
        if action == 'login':
            auth_url = sp_oauth.get_authorize_url()
            return redirect(auth_url)
        elif action == 'register':
            auth_url = sp_oauth.get_authorize_url()
            session['register'] = True
            return redirect(auth_url)
    
    return render_template('login.html')

@app.route('/callback')
def callback():
    sp_oauth = create_spotify_oauth()
    session.clear()
    code = request.args.get('code')
    token_info = sp_oauth.get_access_token(code, as_dict=False)
    session['token_info'] = token_info
    sp = spotipy.Spotify(auth_manager=sp_oauth)
    user_info = sp.current_user()
    spotify_id = user_info['id']
    
    user = User.query.filter_by(spotify_id=spotify_id).first()
    if not user:
        user = User(
            spotify_id=spotify_id,
            display_name=user_info['display_name'],
            email=user_info.get('email'),
            profile_image_url=user_info['images'][0]['url'] if user_info['images'] else None
        )
        db.session.add(user)
    else:
        user.display_name = user_info['display_name']
        user.email = user_info.get('email')
        user.profile_image_url = user_info['images'][0]['url'] if user_info['images'] else None
    db.session.commit()
    session['user_id'] = user.id
    return redirect(url_for('profile_page'))

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('home'))

# ===================================================================
# --- ROTAS DAS PÁGINAS ---
# ===================================================================
@app.context_processor
def inject_user_status():
    logged_in = 'user_id' in session
    return dict(logged_in=logged_in)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/stations")
def stations_page():
    try:
        with open('static/data/stations.json', 'r', encoding='utf-8') as f:
            station_data = json.load(f)
        return render_template("stations.html", stations=station_data['stations'])
    except FileNotFoundError:
        return render_template("stations.html", error="Arquivo stations.json não encontrado.")
    except json.JSONDecodeError:
        return render_template("stations.html", error="Erro ao ler o arquivo stations.json.")

@app.route("/moods")
def moods_page():
    return render_template("moods.html")

@app.route("/profile")
def profile_page():
    if 'user_id' not in session:
        return redirect(url_for('login_manual'))
    user = User.query.get(session['user_id'])
    if not user:
        session.clear()
        return redirect(url_for('login_manual'))
    favorites = Favorite.query.filter_by(user_id=user.id).order_by(Favorite.id.desc()).all()
    collections = Collection.query.filter_by(user_id=user.id).all()
    return render_template("profile.html", user=user, favorites=favorites, collections=collections)

# ===================================================================
# --- ROTAS DE API ---
# ===================================================================
MOOD_KEYWORDS = {
    "happy": ["happy hits", "feel good", "happy pop", "good vibes"],
    "sad": ["sad songs", "heartbreak", "piano sad", "acoustic sad", "melancholia"],
    "party": ["party hits", "dance floor", "club hits", "house music"],
    "focus": ["lo-fi beats", "study music", "classical focus", "ambient"],
    "chill": ["chill hits", "relax", "acoustic chill", "sunday morning"],
    "workout": ["workout hits", "gym motivation", "cardio", "power workout"],
    "romance": ["romantic songs", "love hits", "date night", "r&b love"],
    "sleep": ["sleep music", "deep sleep", "calm piano", "delta waves"],
    "gaming": ["gaming music", "epic soundtrack", "synthwave", "cyberpunk music"],
    "travel": ["road trip", "driving hits", "car songs", "travel vibes"],
    "retro": ["80s hits", "90s hits", "oldies but goldies", "flashback"],
    "summer": ["summer hits", "beach vibes", "tropical house", "sunny songs"],
    "rock": ["rock classics", "hard rock", "alternative rock", "indie rock", "rock anthems"]
}

@app.route("/api/recommend", methods=["POST"])
def recommend():
    mood = request.json.get("mood", "").strip()
    if not mood or mood not in MOOD_KEYWORDS:
        return jsonify({"error": "Por favor, selecione um humor válido"}), 400
    try:
        search_term = random.choice(MOOD_KEYWORDS[mood])
        playlist_search_url = "https://api.deezer.com/search/playlist"
        params = {"q": search_term, "limit": 75}
        response = requests.get(playlist_search_url, params=params, timeout=5)
        response.raise_for_status()
        playlists_data = response.json().get("data", [])
        if not playlists_data:
            return jsonify({"error": f"Não encontramos playlists para '{mood}'. Tente de novo!"}), 404
        chosen_playlist = random.choice(playlists_data)
        tracklist_url = chosen_playlist.get("tracklist")
        if not tracklist_url:
            return jsonify({"error": "Playlist encontrada era inválida."}), 500
        response = requests.get(tracklist_url, params={"limit": 100}, timeout=5)
        response.raise_for_status()
        tracks_data = response.json().get("data", [])
        if not tracks_data:
            return jsonify({"error": "A playlist escolhida está vazia."}), 404
        random.shuffle(tracks_data)
        selected_tracks = tracks_data[:5]
        music_list = []
        for item in selected_tracks:
            music_list.append({
                "id": item.get("id"),
                "title": item.get("title_short", item.get("title", "Título desconhecido")),
                "artist": item.get("artist", {}).get("name", "Artista desconhecido"),
                "cover_url": item.get("album", {}).get("cover_xl", ""),
                "preview_url": item.get("preview", ""),
                "link": item.get("link", "#"),
                "duration": item.get("duration", 0)
            })
        return jsonify(music_list)
    except Exception as e:
        print(f"Erro na API de recomendação: {e}")
        return jsonify({"error": "Ocorreu um erro inesperado."}), 500

@app.route("/api/favorite", methods=["POST"])
def add_favorite():
    if 'user_id' not in session:
        return jsonify({"status": "login_required"}), 401
    data = request.json
    existing_favorite = Favorite.query.filter_by(user_id=session['user_id'], song_title=data['title'], artist_name=data['artist']).first()
    if existing_favorite:
        return jsonify({"status": "already_favorited", "message": "Música já está nos favoritos."})
    new_favorite = Favorite(
        user_id=session['user_id'],
        song_title=data['title'],
        artist_name=data['artist'],
        cover_url=data['cover_url'],
        mood=data['mood']
    )
    db.session.add(new_favorite)
    db.session.commit()
    return jsonify({"status": "success", "message": "Música adicionada aos favoritos!", "favorite_id": new_favorite.id})

@app.route("/api/favorite/delete/<int:favorite_id>", methods=["POST"])
def delete_favorite(favorite_id):
    if 'user_id' not in session:
        return jsonify({"error": "Usuário não autenticado"}), 401
    favorite_to_delete = Favorite.query.get(favorite_id)
    if not favorite_to_delete or favorite_to_delete.user_id != session['user_id']:
        return jsonify({"error": "Não autorizado"}), 403
    db.session.delete(favorite_to_delete)
    db.session.commit()
    return jsonify({"status": "success", "message": "Música removida dos favoritos."})

@app.route("/api/delete_profile", methods=["POST"])
def delete_profile():
    if 'user_id' not in session:
        return jsonify({"status": "login_required"}), 401
    user = User.query.get(session['user_id'])
    if not user:
        return jsonify({"error": "Usuário não encontrado"}), 404
    db.session.delete(user)
    db.session.commit()
    session.clear()
    return jsonify({"status": "success", "message": "Perfil e todos os dados associados foram excluídos."})

@app.route("/api/create_collection", methods=["POST"])
def create_collection():
    if 'user_id' not in session:
        return jsonify({"status": "login_required"}), 401
    data = request.json
    collection_name = data.get("name", "Nova Coleção").strip()
    if not collection_name:
        return jsonify({"error": "O nome da coleção é obrigatório"}), 400
    user = User.query.get(session['user_id'])
    new_collection = Collection(user_id=user.id, name=collection_name)
    db.session.add(new_collection)
    db.session.commit()
    return jsonify({"status": "success", "collection_id": new_collection.id, "name": collection_name})

@app.route("/api/add_to_collection", methods=["POST"])
def add_to_collection():
    if 'user_id' not in session:
        return jsonify({"status": "login_required"}), 401
    data = request.json
    collection_id = data.get("collection_id")
    favorite_id = data.get("favorite_id")
    print(f"add_to_collection - collection_id: {collection_id}, favorite_id: {favorite_id}")  # Depuração
    if not collection_id or not favorite_id:
        return jsonify({"error": "ID da coleção e da música são obrigatórios"}), 400
    
    collection = Collection.query.get(collection_id)
    favorite = Favorite.query.get(favorite_id)
    
    if not collection:
        return jsonify({"error": f"Coleção com ID {collection_id} não encontrada"}), 404
    if not favorite:
        return jsonify({"error": f"Música com ID {favorite_id} não encontrada"}), 404
    
    if collection.user_id != session['user_id'] or favorite.user_id != session['user_id']:
        return jsonify({"error": "Não autorizado"}), 403
    
    if CollectionItem.query.filter_by(collection_id=collection_id, favorite_id=favorite_id).first():
        return jsonify({"error": "Música já está na coleção"}), 400
    
    new_item = CollectionItem(collection_id=collection_id, favorite_id=favorite_id)
    db.session.add(new_item)
    db.session.commit()
    return jsonify({"status": "success", "message": "Música adicionada à coleção"})

@app.route("/api/delete_collection/<int:collection_id>", methods=["POST"])
def delete_collection(collection_id):
    if 'user_id' not in session:
        return jsonify({"status": "login_required"}), 401
    collection = Collection.query.get(collection_id)
    if not collection or collection.user_id != session['user_id']:
        return jsonify({"error": "Coleção não encontrada ou não autorizada"}), 403
    db.session.delete(collection)
    db.session.commit()
    return jsonify({"status": "success", "message": "Coleção excluída"})

@app.route("/api/remove_from_collection", methods=["POST"])
def remove_from_collection():
    if 'user_id' not in session:
        return jsonify({"status": "login_required"}), 401
    data = request.json
    collection_id = data.get("collection_id")
    favorite_id = data.get("favorite_id")
    if not collection_id or not favorite_id:
        return jsonify({"error": "ID da coleção e da música são obrigatórios"}), 400
    
    item = CollectionItem.query.filter_by(collection_id=collection_id, favorite_id=favorite_id).first()
    if not item:
        return jsonify({"error": "Item não encontrado"}), 404
    if Collection.query.get(collection_id).user_id != session['user_id']:
        return jsonify({"error": "Não autorizado"}), 403
    
    db.session.delete(item)
    db.session.commit()
    return jsonify({"status": "success", "message": "Música removida da coleção"})

# ===================================================================
# --- PONTO DE ENTRADA DA APLICAÇÃO ---
# ===================================================================
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=False)