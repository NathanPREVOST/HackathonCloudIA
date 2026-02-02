console.log("app.js chargé");

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
function startStory() {
  state.name = (charName?.value || "").trim();
  if (!state.name) {
    charName?.focus();
    return;
  }
  if (!state.setting || !state.character) {
    showScreen("settings", true);
    return;
  }

  const lead = document.getElementById("storyLead");
  const para = document.getElementById("storyPara");
  const quote = document.getElementById("storyQuote");

  lead.textContent = `You are ${state.name}, a ${state.character} in a ${state.setting} world. The air feels tense.`;
  para.textContent = `A distant signal draws you toward an unseen conflict. Something has changed—and you’re the one in front.`;
  quote.textContent = `“What do you do next, ${state.name}?”`;

  brandTitle.textContent = safeLower(state.name);
  goLoadingThen("story");
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
  const lead = document.getElementById("storyLead");
  const para = document.getElementById("storyPara");
  const quote = document.getElementById("storyQuote");

  if (lead) lead.textContent = "";
  if (para) para.textContent = "";
  if (quote) quote.textContent = "";
});
