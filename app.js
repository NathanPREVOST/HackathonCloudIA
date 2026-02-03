console.log("app.js chargé");

// ---- Configuration IA ----
const SYSTEM_PROMPT = `Tu es le Maître du Jeu (Game Master) pour un jeu narratif interactif appelé NightQuest.

RÈGLES :
- Écris des réponses immersives en 2-3 paragraphes maximum
- Décris l'environnement, les actions et leurs conséquences de manière vivante
- Termine TOUJOURS par une question ou un choix pour le joueur (ex: "Que fais-tu ?")
- Reste cohérent avec le thème choisi ({setting})
- Ne brise jamais l'immersion - reste dans le personnage
- Réponds en français
- Utilise le présent de narration

CONTEXTE : Le joueur incarne {name}, un(e) {character} dans un univers {setting}.`;

let conversationHistory = [];

// ---- Loading Indicator ----
function showLoading() {
  const indicator = document.getElementById('loadingIndicator');
  if (indicator) indicator.classList.add('active');
}

function hideLoading() {
  const indicator = document.getElementById('loadingIndicator');
  if (indicator) indicator.classList.remove('active');
}

// ---- Chat History ----
function renderChatHistory() {
  const historyEl = document.getElementById('chatHistory');
  if (!historyEl) return;

  historyEl.innerHTML = '';

  // Afficher tous les messages sauf le dernier (qui est dans story__para)
  const messagesToShow = conversationHistory.slice(0, -1);

  messagesToShow.forEach(msg => {
    const msgEl = document.createElement('div');
    msgEl.className = `chat-message chat-message--${msg.role}`;

    const roleLabel = msg.role === 'user' ? 'Vous' : 'Maître du Jeu';

    msgEl.innerHTML = `
      <div class="chat-message__role">${roleLabel}</div>
      <div class="chat-message__content">${msg.content}</div>
    `;

    historyEl.appendChild(msgEl);
  });

  // Scroll to bottom
  historyEl.scrollTop = historyEl.scrollHeight;
}

// ---- Streaming API Call ----
async function callOllamaStreaming(userMessage, onChunk) {
  const systemPrompt = SYSTEM_PROMPT
    .replace(/{setting}/g, state.setting)
    .replace(/{character}/g, state.character)
    .replace(/{name}/g, state.name);

  conversationHistory.push({ role: 'user', content: userMessage });
  renderChatHistory();

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mistral:7b-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory
      ],
      stream: true
    })
  });

  if (!response.ok) {
    throw new Error(`Erreur API: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        if (json.message?.content) {
          fullResponse += json.message.content;
          if (onChunk) onChunk(fullResponse);
        }
      } catch (e) {
        // Ignore parsing errors for incomplete chunks
      }
    }
  }

  conversationHistory.push({ role: 'assistant', content: fullResponse });
  return fullResponse;
}

// ---- Legacy non-streaming call (fallback) ----
async function callOllama(userMessage) {
  const systemPrompt = SYSTEM_PROMPT
    .replace(/{setting}/g, state.setting)
    .replace(/{character}/g, state.character)
    .replace(/{name}/g, state.name);

  conversationHistory.push({ role: 'user', content: userMessage });
  renderChatHistory();

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mistral:7b-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory
      ],
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Erreur API: ${response.status}`);
  }

  const data = await response.json();
  const aiResponse = data.message.content;
  conversationHistory.push({ role: 'assistant', content: aiResponse });
  return aiResponse;
}

function resetConversation() {
  conversationHistory = [];
  const historyEl = document.getElementById('chatHistory');
  if (historyEl) historyEl.innerHTML = '';
}

const screens = [...document.querySelectorAll(".screen")];
const brandTitle = document.getElementById("brandTitle");

const navBack = document.getElementById("navBack");
const navForward = document.getElementById("navForward");

const characterList = document.getElementById("characterList");
const charactersTitle = document.getElementById("charactersTitle");

const charName = document.getElementById("charName");
const startBtn = document.getElementById("startBtn");

// Thèmes -> rôles cohérents
const THEME_CHARACTERS = {
  Fantasy: ["Noble", "Princess", "Knight", "Wizard", "Witch", "Ranger", "Rogue"],
  Mystery: ["Detective", "Forensic Analyst", "Journalist", "Private Investigator", "Officer", "Hacker", "Witness"],
  Zombies: ["Survivor", "Medic", "Scout", "Mechanic", "Ex-Soldier", "Engineer", "Smuggler"],
  Apocalyptic: ["Scavenger", "Courier", "Engineer", "Farmer", "Technician", "Ex-Cop", "Nomad"],
  Cyberpunk: ["Netrunner", "Street Samurai", "Techie", "Corpo", "Fixer", "Medtech", "Nomad"],
};

const state = { setting: null, character: null, name: "" };

// ---- Navigation (back/forward) ----
const historyStack = ["settings"];
let historyIndex = 0;

function updateNavButtons() {
  if (navBack) navBack.disabled = historyIndex <= 0;
  if (navForward) navForward.disabled = historyIndex >= historyStack.length - 1;
}

function showScreen(name, pushHistory = true) {
  screens.forEach(s => s.classList.toggle("is-active", s.dataset.screen === name));

  if (pushHistory) {
    historyStack.splice(historyIndex + 1);
    historyStack.push(name);
    historyIndex = historyStack.length - 1;
  }
  updateNavButtons();
}

function goLoadingThen(next) {
  showScreen("loading", true);
  setTimeout(() => showScreen(next, true), 550);
}

navBack?.addEventListener("click", () => {
  if (historyIndex > 0) {
    historyIndex--;
    showScreen(historyStack[historyIndex], false);
  }
});

navForward?.addEventListener("click", () => {
  if (historyIndex < historyStack.length - 1) {
    historyIndex++;
    showScreen(historyStack[historyIndex], false);
  }
});

updateNavButtons();

// ---- Helpers ----
function safeLower(s) {
  return (s || "").toLowerCase();
}

function renderCharacterChoices(setting) {
  const list = THEME_CHARACTERS[setting] || [];
  characterList.innerHTML = "";

  // Titre contextualisé (optionnel)
  if (charactersTitle) {
    charactersTitle.textContent = `Select a character… (${setting})`;
  }

  list.forEach((role, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice";
    btn.dataset.character = role;

    btn.innerHTML = `
      <span class="choice__num">${idx + 1}</span>
      <span class="choice__label">${role}</span>
      <span class="choice__arrow">›</span>
    `;

    characterList.appendChild(btn);
  });
}

// ---- Click handling ----
document.addEventListener("click", (e) => {
  const choice = e.target.closest(".choice");
  if (choice) {
    // Archive
    if (choice.dataset.action === "archive") {
      brandTitle.textContent = "archive";
      goLoadingThen("archive");
      return;
    }

    // Setting choisi
    if (choice.dataset.setting) {
      state.setting = choice.dataset.setting;
      state.character = null;
      brandTitle.textContent = safeLower(state.setting);

      renderCharacterChoices(state.setting);
      goLoadingThen("characters");
      return;
    }

    // Character choisi
    if (choice.dataset.character) {
      state.character = choice.dataset.character;
      brandTitle.textContent = safeLower(state.character);

      goLoadingThen("name");
      return;
    }
  }

  // Boutons back internes (data-back)
  const backBtn = e.target.closest("[data-back]");
  if (backBtn) {
    showScreen(backBtn.dataset.back, true);
    return;
  }
});

// ---- Start story ----
async function startStory() {
  state.name = (charName?.value || "").trim();
  if (!state.name) {
    charName?.focus();
    return;
  }
  if (!state.setting || !state.character) {
    showScreen("settings", true);
    return;
  }

  brandTitle.textContent = safeLower(state.name);
  resetConversation();

  const lead = document.getElementById("storyLead");
  const para = document.getElementById("storyPara");
  const quote = document.getElementById("storyQuote");

  lead.textContent = `${state.name} - ${state.character} (${state.setting})`;
  para.textContent = "";
  para.classList.add("streaming-cursor");
  quote.textContent = "";

  showScreen("story", true);
  showLoading();

  try {
    await callOllamaStreaming(
      `Commence une nouvelle aventure. Je suis ${state.name}, un(e) ${state.character} dans un monde ${state.setting}. Décris la scène d'ouverture de manière immersive.`,
      (text) => {
        para.textContent = text;
      }
    );
    para.classList.remove("streaming-cursor");
  } catch (err) {
    console.error("Erreur IA:", err);
    para.classList.remove("streaming-cursor");
    alert("Erreur de connexion à l'IA. Vérifiez que le serveur Ollama est actif.");
    showScreen("name", true);
  } finally {
    hideLoading();
  }
}

startBtn?.addEventListener("click", startStory);

charName?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") startStory();
});

const homeBtn = document.getElementById("homeBtn");
const eraseBtn = document.getElementById("eraseBtn");

function resetToSettings() {
  // reset state
  state.setting = null;
  state.character = null;
  state.name = "";
  if (charName) charName.value = "";

  // reset UI
  brandTitle.textContent = "New Adventure";
  if (characterList) characterList.innerHTML = "";

  // reset navigation history
  historyStack.length = 0;
  historyStack.push("settings");
  historyIndex = 0;

  // go home without re-push
  showScreen("settings", false);
  updateNavButtons();
}

homeBtn?.addEventListener("click", resetToSettings);

eraseBtn?.addEventListener("click", () => {
  resetConversation();
  resetToSettings();
});

// ---- Story Actions ----
const storyActions = document.querySelector(".story__actions");

storyActions?.addEventListener("click", async (e) => {
  const btn = e.target.closest(".btn");
  if (!btn) return;

  const btnText = btn.textContent.trim().toLowerCase();
  const para = document.getElementById("storyPara");
  const playerInput = document.getElementById("playerInput");

  if (btnText === "take a turn") {
    // Afficher/masquer le champ de saisie
    const inputContainer = document.getElementById("playerInputContainer");
    if (inputContainer) {
      inputContainer.classList.toggle("hidden");
      playerInput?.focus();
    }
    return;
  }

  if (btnText === "continue") {
    para.textContent = "";
    para.classList.add("streaming-cursor");
    showLoading();
    try {
      await callOllamaStreaming(
        "Continue l'histoire. Fais progresser l'intrigue de manière intéressante.",
        (text) => { para.textContent = text; }
      );
      para.classList.remove("streaming-cursor");
    } catch (err) {
      console.error("Erreur IA:", err);
      para.classList.remove("streaming-cursor");
      alert("Erreur de connexion à l'IA");
    } finally {
      hideLoading();
    }
    return;
  }

  if (btnText === "retry") {
    if (conversationHistory.length >= 2) {
      // Retirer la dernière réponse IA et le dernier message utilisateur
      conversationHistory.pop();
      conversationHistory.pop();
    }
    renderChatHistory();
    para.textContent = "";
    para.classList.add("streaming-cursor");
    showLoading();
    try {
      const lastUserMsg = conversationHistory.length > 0
        ? conversationHistory[conversationHistory.length - 1]?.content
        : "Continue l'histoire différemment.";
      await callOllamaStreaming(
        lastUserMsg || "Recommence cette partie de l'histoire différemment.",
        (text) => { para.textContent = text; }
      );
      para.classList.remove("streaming-cursor");
    } catch (err) {
      console.error("Erreur IA:", err);
      para.classList.remove("streaming-cursor");
      alert("Erreur de connexion à l'IA");
    } finally {
      hideLoading();
    }
    return;
  }
});

// ---- Player Input Submit ----
async function submitPlayerAction() {
  const playerInput = document.getElementById("playerInput");
  const para = document.getElementById("storyPara");
  const inputContainer = document.getElementById("playerInputContainer");

  const action = playerInput?.value?.trim();
  if (!action) {
    playerInput?.focus();
    return;
  }

  playerInput.value = "";
  inputContainer?.classList.add("hidden");
  para.textContent = "";
  para.classList.add("streaming-cursor");
  showLoading();

  try {
    await callOllamaStreaming(
      action,
      (text) => { para.textContent = text; }
    );
    para.classList.remove("streaming-cursor");
  } catch (err) {
    console.error("Erreur IA:", err);
    para.classList.remove("streaming-cursor");
    alert("Erreur de connexion à l'IA");
  } finally {
    hideLoading();
  }
}

document.getElementById("playerSubmit")?.addEventListener("click", submitPlayerAction);
document.getElementById("playerInput")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitPlayerAction();
});
