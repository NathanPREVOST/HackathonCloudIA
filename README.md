# HackathonCloudIA# NightQuest (Hackathon Cloud / GCP)

## Concept

**NightQuest** est un jeu “dont tu es le héros” inspiré d’**AI Dungeon** :

* le joueur choisit un **thème** (Fantasy / Mystery / Zombies / Apocalyptic / Cyberpunk)
* le joueur choisit un **archétype** cohérent avec le thème (ex: Zombies → Survivor/Medic/Scout…)
* le joueur nomme son personnage
* une IA joue le rôle de **Maître du Jeu (MJ)** : elle décrit la scène, propose des conséquences, et répond aux actions du joueur (“Take a turn”, “Continue”, etc.).

Le front actuel est en **HTML/CSS/JS** (zéro framework), avec un écran **Archive** (placeholder) qui affichera plus tard les anciennes parties.

---

## Objectifs produit

* **Immersion** : UI “dark + glass” proche d’AI Dungeon.
* **Cohérence narrative** : personnages / ton / vocabulaire adaptés au thème.
* **Sessions & Archives** : sauvegarder l’historique des tours pour reprendre plus tard.
* **Scalabilité Cloud** : déployer sans serveur à gérer côté front, et backend serverless.

---

## Stack cible sur GCP

### Front (statique)

* **Cloud Storage** pour héberger le site statique (HTML/CSS/JS). ([Google Cloud Documentation][1])
* Optionnel : **Cloud CDN** (via HTTP(S) Load Balancer) pour accélérer globalement. ([Google Cloud][2])

### Backend (API)

* **Cloud Run** pour exposer une API (FastAPI/Node) : `/api/new`, `/api/turn`, `/api/archive`.
* Si besoin d’inférence custom : **Cloud Run peut utiliser des GPU** (NVIDIA L4) pour des workloads d’inférence. ([Google Cloud Documentation][3])

### IA (MJ)

Deux options réalistes :

1. **Vertex AI (recommandé hackathon)**
   Utiliser les modèles **Mistral** disponibles via **Model Garden / partner models** sur Vertex AI. ([Google Cloud Documentation][4])
   Avantage : pas de déploiement GPU à gérer, le plus rapide pour brancher un MJ.

2. **Self-host Mistral 7B sur Cloud Run GPU**
   Déployer un conteneur (ex: vLLM / llama.cpp server) sur Cloud Run avec GPU. ([Google Cloud Documentation][3])
   Avantage : contrôle total (prompting, quantization, etc.). Inconvénient : plus de dev/ops.

### Données (sessions / archives)

* **Firestore** (ou Datastore) pour stocker :

  * `users` (optionnel)
  * `games` (id, thème, personnage, timestamps)
  * `turns` (liste des messages, rôle player/GM, etc.)
* **Secret Manager** pour clés / tokens si nécessaires (si appels externes ou configuration).

---

## Architecture (simple)

1. **Le joueur** charge le front depuis **Cloud Storage (+ CDN)**
2. Le front appelle le backend **Cloud Run** (REST)
3. Le backend :

   * construit le prompt “MJ”
   * appelle **Vertex AI Mistral** (ou l’inférence self-host)
   * persiste la partie dans **Firestore**
4. Le front affiche la réponse et enrichit l’historique (chat)

---

## Parcours utilisateur (MVP)

1. Écran “Pick a setting…”
2. Écran “Select a character… (cohérent avec le setting)”
3. Nom du personnage
4. Story screen :

   * **Take a turn** = envoie l’action du joueur (texte)
   * **Continue** = demande un nouveau paragraphe
   * **Retry** = régénère la dernière réponse
   * **Erase** = efface le texte affiché (front)
5. Archive :

   * liste des parties sauvegardées
   * reprise d’une partie (plus tard)

---

## Prompting (MJ) – principe

Le backend doit fournir au modèle :

* un **system prompt** qui force le rôle MJ (narration, conséquences, choix, cohérence)
* le **thème**, l’archétype, le nom, + l’historique des tours
* des contraintes : pas de spoilers, ton adapté, 1–3 paragraphes max, finir par une question/action possible

---

## Structure projet (actuelle)

```
HackathonCLOUD/
  index.html
  styles.css
  app.js
  Hackathon_IA_Cloud_sujet.pdf
```

---

## Lancer en local (dev)

Le plus simple :

* ouvrir `index.html` dans Chrome

Si tu veux éviter les problèmes de chemins/permissions navigateur (recommandé dès que tu fais des `fetch()`):

```bash
python3 -m http.server 8000
```

Puis ouvrir :

* `http://localhost:8000`

---

## Déploiement Front sur GCP (Cloud Storage)

1. Créer un bucket et activer l’hébergement statique (index + error). ([Google Cloud Documentation][1])
2. Uploader `index.html`, `styles.css`, `app.js`
3. (Optionnel) Mettre un Load Balancer + **Cloud CDN** pour HTTPS + perf. ([Google Cloud][2])

---

## Déploiement Backend sur GCP (Cloud Run)

* Conteneuriser l’API (FastAPI recommandé pour hackathon)
* Déployer sur **Cloud Run**
* Si self-host modèle : activer **GPU Cloud Run**. ([Google Cloud Documentation][3])

---

## API (contrat minimal conseillé)

* `POST /api/new`

  * body: `{ setting, character, name }`
  * returns: `{ gameId, gmText }`

* `POST /api/turn`

  * body: `{ gameId, playerText, mode: "turn"|"continue"|"retry" }`
  * returns: `{ gmText }`

* `GET /api/archive?userId=...`

  * returns: `[ { gameId, title, setting, character, updatedAt } ]`

