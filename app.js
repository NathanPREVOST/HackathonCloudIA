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

async function callOllama(userMessage) {
  const systemPrompt = SYSTEM_PROMPT
    .replace(/{setting}/g, state.setting)
    .replace(/{character}/g, state.character)
    .replace(/{name}/g, state.name);

  conversationHistory.push({ role: 'user', content: userMessage });

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
  showScreen("loading", true);
  resetConversation();

  try {
    const intro = await callOllama(
      `Commence une nouvelle aventure. Je suis ${state.name}, un(e) ${state.character} dans un monde ${state.setting}. Décris la scène d'ouverture de manière immersive.`
    );

    const lead = document.getElementById("storyLead");
    const para = document.getElementById("storyPara");
    const quote = document.getElementById("storyQuote");

    lead.textContent = `${state.name} - ${state.character} (${state.setting})`;
    para.textContent = intro;
    quote.textContent = "";

    showScreen("story", true);
  } catch (err) {
    console.error("Erreur IA:", err);
    alert("Erreur de connexion à l'IA. Vérifiez que le serveur Ollama est actif.");
    showScreen("name", true);
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
    showScreen("loading", true);
    try {
      const response = await callOllama("Continue l'histoire. Fais progresser l'intrigue de manière intéressante.");
      para.textContent = response;
      showScreen("story", true);
    } catch (err) {
      console.error("Erreur IA:", err);
      alert("Erreur de connexion à l'IA");
      showScreen("story", true);
    }
    return;
  }

  if (btnText === "retry") {
    if (conversationHistory.length >= 2) {
      // Retirer la dernière réponse IA et le dernier message utilisateur
      conversationHistory.pop();
      conversationHistory.pop();
    }
    showScreen("loading", true);
    try {
      const lastUserMsg = conversationHistory.length > 0
        ? conversationHistory[conversationHistory.length - 1]?.content
        : "Continue l'histoire différemment.";
      const response = await callOllama(lastUserMsg || "Recommence cette partie de l'histoire différemment.");
      para.textContent = response;
      showScreen("story", true);
    } catch (err) {
      console.error("Erreur IA:", err);
      alert("Erreur de connexion à l'IA");
      showScreen("story", true);
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
  showScreen("loading", true);

  try {
    const response = await callOllama(action);
    para.textContent = response;
    showScreen("story", true);
  } catch (err) {
    console.error("Erreur IA:", err);
    alert("Erreur de connexion à l'IA");
    showScreen("story", true);
  }
}

document.getElementById("playerSubmit")?.addEventListener("click", submitPlayerAction);
document.getElementById("playerInput")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitPlayerAction();
});
