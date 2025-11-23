# 🎵 S.T.A.R.

> **Orquestração de Serviços de Streaming e Mídia Local sob a Arquitetura MVT do Framework Flask.**

![Python](https://img.shields.io/badge/Python-3.x-blue?style=for-the-badge&logo=python)
![Flask](https://img.shields.io/badge/Flask-2.x-green?style=for-the-badge&logo=flask)
![Status](https://img.shields.io/badge/Status-Concluído-success?style=for-the-badge)

## 📄 Sobre o Projeto

O **S.T.A.R.** é uma aplicação web *full-stack* desenvolvida como Trabalho de Conclusão de Curso (TCC). O sistema tem como objetivo unificar a experiência de consumo musical, integrando um gerenciador de mídia local (playlists offline) com a descoberta de conteúdo via APIs externas (streaming).

O projeto adota a arquitetura **MVT (Model-View-Template)**, garantindo a separação de responsabilidades e a escalabilidade do código.

---

## ✨ Funcionalidades Principais

* **🎧 Realm (Playlists Locais):** Reprodução de faixas curadas localmente (arquivos MP3), organizadas por estações temáticas. Funciona 100% offline.
* **🌊 Nexus (Recomendações por Humor):** Integração com a **Deezer API** para gerar playlists dinâmicas baseadas no estado emocional do usuário (Ex: Happy, Focus, Rock, Night).
* **🔐 Autenticação OAuth 2.0:** Sistema de login seguro utilizando a conta do **Spotify**, permitindo a personalização da experiência.
* **❤️ Gestão de Favoritos:** Persistência de dados em banco relacional para salvar músicas descobertas.
* **playlist_add Coleções Personalizadas:** Criação e gerenciamento de coleções (playlists) próprias do usuário, com verificação de duplicidade.

---

## 🛠️ Tecnologias Utilizadas

* **Backend:** Python 3, Flask.
* **Banco de Dados:** SQLite, SQLAlchemy (ORM).
* **Autenticação:** Spotipy (OAuth 2.0).
* **Integração:** Requests (Deezer API).
* **Frontend:** HTML5, CSS3 (Custom), JavaScript (Vanilla).

---

## 📂 Estrutura do Projeto

A organização do código segue o padrão de separação de responsabilidades do Flask:


music-mood-recommender/
├── app.py              # Controlador Principal (Rotas e Modelos)
├── requirements.txt    # Dependências do projeto
├── .env                # Variáveis de ambiente (NÃO COMITAR)
├── vibezone.db         # Banco de dados SQLite (Gerado automaticamente)
├── stations.json       # Dados estáticos das playlist locais
├── static/
│   ├── style.css       # Estilização
│   ├── script.js       # Lógica do Frontend e Fetch API
│   ├── images/         # Capas e assets
│   └── audio/          # Arquivos MP3 locais
└── templates/
    ├── index.html      # Página Inicial
    ├── moods.html      # Página de Recomendações (API)
    ├── stations.html   # Página de Playlists (Local)
    └── profile.html    # Perfil do Usuário
````

-----

## 🚀 Como Executar o Projeto

Siga os passos abaixo para rodar o S.T.A.R. em seu ambiente local.

### Pré-requisitos

  * Python 3 instalado.
  * Conta no [Spotify for Developers](https://developer.spotify.com/).

### 1\. Clonar o Repositório

```bash
git clone [https://github.com/seu-usuario/starmusic.git](https://github.com/seu-usuario/starmusic.git)
cd star
```

### 2\. Instalar Dependências

Recomenda-se o uso de um ambiente virtual (`venv`).

```bash
pip install -r requirements.txt
```

### 3\. Configurar Variáveis de Ambiente

Crie um arquivo chamado `.env` na raiz do projeto e adicione suas credenciais:

```ini
# Chave secreta para sessão do Flask (pode ser qualquer string aleatória)
FLASK_SECRET_KEY='sua_chave_super_secreta'

# Credenciais do Spotify (Obtenha no Dashboard do Developer)
SPOTIPY_CLIENT_ID='seu_client_id'
SPOTIPY_CLIENT_SECRET='seu_client_secret'
```

> **Nota:** No painel do Spotify, configure o **Redirect URI** para: `http://127.0.0.1:5000/callback`

### 4\. Iniciar o Servidor

```bash
python app.py
```

*O banco de dados `vibezone.db` será criado automaticamente na primeira execução.*

### 5\. Acessar

Abra o navegador e vá para:
👉 **http://127.0.0.1:5000/**

-----

## 🧪 Decisões de Arquitetura

  * **Banco de Dados:** Optou-se pelo **SQLite** pela portabilidade e facilidade de configuração em ambiente acadêmico, eliminando a necessidade de servidores de banco dedicados.
  * **Normalização:** O esquema de dados respeita a **3ª Forma Normal (3FN)**, utilizando uma tabela associativa (`CollectionItem`) para decompor o relacionamento N:N entre Favoritos e Coleções.
  * **Resiliência:** A integração com APIs externas possui tratamento de erros (`try/except`) e *feedbacks* visuais na interface para garantir que o sistema não quebre em caso de falha de rede.

-----

## ✒️ Autor

  **Thiago Dias** - *Desenvolvimento Full-Stack e Documentação*

-----

*Este projeto foi desenvolvido para fins acadêmicos como requisito parcial para obtenção de grau.*
