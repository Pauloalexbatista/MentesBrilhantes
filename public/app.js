/* ========================================================
   MENTES BRILHANTES — CLIENTE SOCKET.IO & GAME ENGINE
   ======================================================== */

// Conexão Socket.io
const socket = io();

// Lista de Avatares disponíveis
const AVATARS = [
  { id: "brain_1", emoji: "🧠", name: "Sábio" },
  { id: "brain_2", emoji: "🚀", name: "Astro" },
  { id: "brain_3", emoji: "🕵️", name: "Detetive" },
  { id: "brain_4", emoji: "🧙", name: "Mágico" },
  { id: "brain_5", emoji: "⚡", name: "Relâmpago" },
  { id: "brain_6", emoji: "🦉", name: "Coruja" },
  { id: "brain_7", emoji: "🎨", name: "Artista" },
  { id: "brain_8", emoji: "🏆", name: "Campeão" }
];

// Estado Local
let selectedAvatar = AVATARS[0].id;
let myPlayer = null;
let currentRoom = null;
let soundEnabled = true;
let isAnswerSubmitted = false;
let currentQuestionData = null;

// Audio Context (Sintetizador Web Audio API Nativo)
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// Efeitos Sonoros Nativos
const SoundFX = {
  click() {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(480, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  },
  correct() {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    // Acorde alegre de vitória
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.35);
    });
  },
  wrong() {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(140, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  },
  tick() {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(750, ctx.currentTime);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  },
  fanfare() {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    const notes = [523.25, 523.25, 523.25, 659.25, 783.99];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      const startT = ctx.currentTime + idx * 0.12;
      osc.frequency.setValueAtTime(freq, startT);
      gain.gain.setValueAtTime(0.15, startT);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startT);
      osc.stop(startT + 0.4);
    });
  }
};

// Elementos do DOM
const screens = {
  welcome: document.getElementById("screenWelcome"),
  lobby: document.getElementById("screenLobby"),
  countdown: document.getElementById("screenCountdown"),
  question: document.getElementById("screenQuestion"),
  reveal: document.getElementById("screenReveal"),
  gameover: document.getElementById("screenGameOver")
};

// Gestão de Ecrãs
function showScreen(screenKey) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  if (screens[screenKey]) {
    screens[screenKey].classList.add("active");
  }
}

// Toast Notificação
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3200);
}

// Helper Avatar
function getAvatarEmoji(avatarId) {
  const found = AVATARS.find(a => a.id === avatarId);
  return found ? found.emoji : "🧠";
}

/* ========================================================
   INICIALIZAÇÃO & EVENT LISTENERS
   ======================================================== */
document.addEventListener("DOMContentLoaded", () => {
  renderAvatars();
  checkUrlForRoomCode();

  // Som Toggle
  const btnSound = document.getElementById("btnSoundToggle");
  btnSound.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    btnSound.textContent = soundEnabled ? "🔊" : "🔇";
    showToast(soundEnabled ? "Sons ativados!" : "Sons desativados.");
    if (soundEnabled) SoundFX.click();
  });

  // 1. Criar Sala
  document.getElementById("btnCreateRoom").addEventListener("click", () => {
    SoundFX.click();
    const playerName = document.getElementById("playerNameInput").value.trim();
    if (!playerName) {
      showToast("Por favor insere o teu nome!");
      document.getElementById("playerNameInput").focus();
      return;
    }
    socket.emit("create_room", {
      playerName,
      avatar: selectedAvatar
    });
  });

  // 2. Entrar na Sala
  document.getElementById("btnJoinRoom").addEventListener("click", () => {
    SoundFX.click();
    const playerName = document.getElementById("playerNameInput").value.trim();
    const roomCode = document.getElementById("roomCodeInput").value.trim();
    if (!playerName) {
      showToast("Por favor insere o teu nome primeiro!");
      document.getElementById("playerNameInput").focus();
      return;
    }
    if (!roomCode) {
      showToast("Por favor insere o código da sala!");
      document.getElementById("roomCodeInput").focus();
      return;
    }
    socket.emit("join_room", {
      roomCode,
      playerName,
      avatar: selectedAvatar
    });
  });

  // 3. Convidar Amigos por WhatsApp
  document.getElementById("btnWhatsappShare").addEventListener("click", () => {
    SoundFX.click();
    if (!currentRoom) return;

    const currentUrl = window.location.origin + window.location.pathname + `?room=${currentRoom.code}`;
    const textMsg = `🧠 Vem jogar comigo ao *Mentes Brilhantes*! Entra na minha sala com o código *${currentRoom.code}*:\n${currentUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textMsg)}`;

    window.open(whatsappUrl, "_blank");
  });

  // 4. Copiar Link
  document.getElementById("btnCopyLink").addEventListener("click", () => {
    SoundFX.click();
    if (!currentRoom) return;
    const currentUrl = window.location.origin + window.location.pathname + `?room=${currentRoom.code}`;
    navigator.clipboard.writeText(currentUrl).then(() => {
      showToast("Link copiado para a área de transferência!");
    }).catch(() => {
      showToast(`Código da sala: ${currentRoom.code}`);
    });
  });

  // 5. Configurações da Sala (Host)
  const themeChips = document.querySelectorAll(".theme-chip");
  themeChips.forEach(chip => {
    chip.addEventListener("click", (e) => {
      if (!myPlayer || !myPlayer.isHost) return;
      SoundFX.click();
      const checkbox = chip.querySelector("input");
      // Pequeno timeout para sincronizar estado
      setTimeout(() => {
        chip.classList.toggle("selected", checkbox.checked);
        emitSettingsChange();
      }, 10);
    });
  });

  document.getElementById("selectRounds").addEventListener("change", emitSettingsChange);
  document.getElementById("selectTimeLimit").addEventListener("change", emitSettingsChange);

  // 6. Iniciar Partida (Host)
  document.getElementById("btnStartGame").addEventListener("click", () => {
    SoundFX.click();
    if (!myPlayer || !myPlayer.isHost) return;
    socket.emit("start_game");
  });

  // 7. Clique nas Opções de Resposta
  const optionBtns = document.querySelectorAll(".option-btn");
  optionBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      if (isAnswerSubmitted) return;
      SoundFX.click();
      isAnswerSubmitted = true;

      // Seleção visual
      optionBtns.forEach(b => b.disabled = true);
      btn.classList.add("selected");

      const selectedOptionText = btn.querySelector(".opt-text").textContent;
      document.getElementById("playerAnswerStatus").classList.remove("hidden");

      socket.emit("submit_answer", {
        selectedOption: selectedOptionText
      });
    });
  });

  // 8. Jogar Novamente
  document.getElementById("btnPlayAgain").addEventListener("click", () => {
    SoundFX.click();
    if (myPlayer && myPlayer.isHost) {
      socket.emit("play_again");
    } else {
      showToast("Apenas o anfitrião pode recomeçar a partida.");
    }
  });

  // 9. Voltar ao Início
  document.getElementById("btnBackToHome").addEventListener("click", () => {
    SoundFX.click();
    window.location.href = window.location.pathname;
  });
});

/* ========================================================
   FUNÇÕES AUXILIARES DE RENDERIZAÇÃO
   ======================================================== */

// Renderizar grelha de avatares
function renderAvatars() {
  const container = document.getElementById("avatarGrid");
  container.innerHTML = "";

  AVATARS.forEach((av, idx) => {
    const item = document.createElement("div");
    item.className = `avatar-option ${idx === 0 ? "selected" : ""}`;
    item.dataset.id = av.id;
    item.innerHTML = `
      <span class="avatar-emoji">${av.emoji}</span>
      <span class="avatar-name">${av.name}</span>
    `;

    item.addEventListener("click", () => {
      SoundFX.click();
      document.querySelectorAll(".avatar-option").forEach(el => el.classList.remove("selected"));
      item.classList.add("selected");
      selectedAvatar = av.id;
    });

    container.appendChild(item);
  });
}

// Verificar se o URL tem ?room=MB-XXXX
function checkUrlForRoomCode() {
  const params = new URLSearchParams(window.location.search);
  const roomCodeParam = params.get("room");
  if (roomCodeParam) {
    const codeInput = document.getElementById("roomCodeInput");
    if (codeInput) {
      codeInput.value = roomCodeParam.toUpperCase();
    }
    // Quando entra por convite com código/sala definido:
    // Ocultar a criação de nova sala e o divisor para evitar enganos
    const createActions = document.getElementById("createRoomActions");
    const welcomeDivider = document.getElementById("welcomeDivider");
    if (createActions) createActions.style.display = "none";
    if (welcomeDivider) welcomeDivider.style.display = "none";

    showToast(`Convite detetado (Sala ${roomCodeParam.toUpperCase()})! Escolhe o teu nome e clica em Entrar.`);
  }
}

// Emitir alterações de configuração pelo Host
function emitSettingsChange() {
  if (!myPlayer || !myPlayer.isHost) return;

  const selectedThemes = Array.from(document.querySelectorAll("#themesSelector input:checked"))
    .map(cb => cb.value);

  if (selectedThemes.length === 0) {
    showToast("Seleciona pelo menos um tema!");
    return;
  }

  const roundsCount = parseInt(document.getElementById("selectRounds").value) || 10;
  const timeLimit = parseInt(document.getElementById("selectTimeLimit").value) || 20;

  socket.emit("update_settings", {
    selectedThemes,
    roundsCount,
    timeLimit
  });
}

// Atualizar lista de jogadores no Lobby
function updateLobbyUI(room) {
  currentRoom = room;
  document.getElementById("lobbyRoomCode").textContent = room.code;
  document.getElementById("playerCount").textContent = room.players.length;

  const playersList = document.getElementById("playersList");
  playersList.innerHTML = "";

  const isHost = (myPlayer && myPlayer.id === room.hostId);

  // Visibilidade de controlos do Host vs Convidado
  const hostSettingsArea = document.getElementById("hostSettingsArea");
  const guestWaitingBox = document.getElementById("guestWaitingBox");
  const btnStartGame = document.getElementById("btnStartGame");

  if (isHost) {
    hostSettingsArea.classList.remove("hidden");
    guestWaitingBox.classList.add("hidden");
    btnStartGame.classList.remove("hidden");
  } else {
    hostSettingsArea.classList.add("hidden");
    guestWaitingBox.classList.remove("hidden");
    btnStartGame.classList.add("hidden");
  }

  room.players.forEach(p => {
    const item = document.createElement("div");
    item.className = "player-item";
    const isThisHost = (p.id === room.hostId);
    item.innerHTML = `
      <div class="player-info">
        <span class="player-avatar">${getAvatarEmoji(p.avatar)}</span>
        <span class="player-name">${p.name} ${p.id === myPlayer?.id ? "<strong>(Tu)</strong>" : ""}</span>
      </div>
      ${isThisHost ? '<span class="host-tag">👑 Anfitrião</span>' : ""}
    `;
    playersList.appendChild(item);
  });
}

/* ========================================================
   SOCKET.IO EVENT HANDLERS
   ======================================================== */

// 1. Sala Criada
socket.on("room_created", ({ roomCode, player, room }) => {
  myPlayer = player;
  currentRoom = room;
  updateLobbyUI(room);
  showScreen("lobby");
  showToast(`Sala ${roomCode} criada com sucesso!`);
});

// 2. Jogador Entrou
socket.on("room_joined", ({ roomCode, player, room }) => {
  myPlayer = player;
  currentRoom = room;
  updateLobbyUI(room);
  showScreen("lobby");
  showToast(`Entraste na sala ${roomCode}!`);
});

// 3. Atualização de Jogadores
socket.on("players_updated", ({ players, hostId }) => {
  if (currentRoom) {
    currentRoom.players = players;
    currentRoom.hostId = hostId;
    if (myPlayer) {
      myPlayer.isHost = (myPlayer.id === hostId);
    }
    updateLobbyUI(currentRoom);
  }
});

// 4. Mudança de Anfitrião
socket.on("host_changed", ({ newHostId, newHostName }) => {
  if (myPlayer) {
    myPlayer.isHost = (myPlayer.id === newHostId);
  }
  showToast(`O anfitrião da sala é agora: ${newHostName}`);
});

// 5. Configurações Atualizadas
socket.on("settings_updated", ({ selectedThemes, roundsCount, timeLimit }) => {
  if (!myPlayer?.isHost) {
    // Sincronizar UI dos convidados se necessário
    document.getElementById("selectRounds").value = roundsCount;
    document.getElementById("selectTimeLimit").value = timeLimit;
  }
});

// 6. Contagem Decrescente Pré-Jogo
socket.on("game_starting", ({ countdown }) => {
  showScreen("countdown");
  let count = countdown;
  const numEl = document.getElementById("countdownNumber");
  numEl.textContent = count;
  SoundFX.fanfare();

  const timer = setInterval(() => {
    count -= 1;
    if (count > 0) {
      numEl.textContent = count;
      SoundFX.tick();
    } else {
      numEl.textContent = "VAI! 🚀";
      clearInterval(timer);
    }
  }, 1000);
});

// 7. Nova Pergunta (In-Game)
socket.on("new_question", (data) => {
  currentQuestionData = data;
  isAnswerSubmitted = false;

  showScreen("question");

  // Reset de estado visual
  document.getElementById("playerAnswerStatus").classList.add("hidden");
  document.getElementById("answeredCounter").textContent = `👥 0 / ${currentRoom?.players?.length || 1} responderam`;

  // Preenchimento de dados
  document.getElementById("roundIndicator").textContent = `Ronda ${data.round} / ${data.totalRounds}`;
  document.getElementById("questionThemeTag").textContent = `🏷️ ${data.theme}`;
  
  const diffTag = document.getElementById("questionDiffTag");
  diffTag.textContent = data.difficulty === "fácil" ? "10 pts (Fácil)" : "20 pts (Difícil)";
  diffTag.style.background = data.difficulty === "fácil" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)";
  diffTag.style.color = data.difficulty === "fácil" ? "var(--accent-green)" : "var(--accent-red)";

  document.getElementById("questionText").textContent = data.question;

  // Temporizador
  const timerBar = document.getElementById("timerBar");
  const timerSeconds = document.getElementById("timerSeconds");
  timerBar.style.width = "100%";
  timerSeconds.textContent = data.timeLimit;
  timerSeconds.classList.remove("urgent");

  // Renderizar 4 Opções (SHUFFLE DETERMINÍSTICO VEM DO BACKEND)
  const letters = ["A", "B", "C", "D"];
  const optionBtns = document.querySelectorAll(".option-btn");

  optionBtns.forEach((btn, index) => {
    btn.disabled = false;
    btn.className = "option-btn";
    btn.querySelector(".opt-letter").textContent = letters[index];
    btn.querySelector(".opt-text").textContent = data.options[index] || "";
  });
});

// 8. Ticks do Temporizador
socket.on("timer_tick", ({ timeLeft }) => {
  const timerBar = document.getElementById("timerBar");
  const timerSeconds = document.getElementById("timerSeconds");

  if (timerSeconds) {
    timerSeconds.textContent = timeLeft;
    if (timeLeft <= 5) {
      timerSeconds.classList.add("urgent");
      SoundFX.tick();
    }
  }

  if (timerBar && currentQuestionData) {
    const pct = Math.max(0, (timeLeft / currentQuestionData.timeLimit) * 100);
    timerBar.style.width = `${pct}%`;
  }
});

// 9. Jogador Respondeu
socket.on("player_has_answered", ({ answeredCount, totalPlayers }) => {
  const counterEl = document.getElementById("answeredCounter");
  if (counterEl) {
    counterEl.textContent = `👥 ${answeredCount} / ${totalPlayers} responderam`;
  }
});

// 10. Confirmação Individual da Resposta
socket.on("answer_ack", ({ isCorrect, pointsEarned, currentScore }) => {
  if (isCorrect) {
    SoundFX.correct();
  } else {
    SoundFX.wrong();
  }
});

// 11. Revelação dos Resultados da Ronda
socket.on("round_reveal", ({ correctAnswer, players, round, totalRounds }) => {
  // Destacar opções no ecrã de pergunta antes de mudar
  const optionBtns = document.querySelectorAll(".option-btn");
  optionBtns.forEach(btn => {
    const text = btn.querySelector(".opt-text").textContent;
    if (text === correctAnswer) {
      btn.classList.add("correct");
    } else if (btn.classList.contains("selected")) {
      btn.classList.add("incorrect");
    }
  });

  // Mostrar ecrã de revelação após breve atraso de 700ms
  setTimeout(() => {
    showScreen("reveal");

    const me = players.find(p => p.id === myPlayer?.id);
    const banner = document.getElementById("revealBanner");
    const icon = document.getElementById("revealIcon");
    const title = document.getElementById("revealTitle");
    const notes = document.getElementById("revealPointsNote");

    if (me && me.lastPointsEarned > 0) {
      banner.className = "reveal-result-banner success";
      icon.textContent = "🎉";
      title.textContent = "Acertaste!";
      notes.textContent = `+${me.lastPointsEarned} Pontos somados! (Total: ${me.score} pts)`;
    } else {
      banner.className = "reveal-result-banner fail";
      icon.textContent = "❌";
      title.textContent = "Ops, não foi desta!";
      notes.textContent = `0 Pontos nesta ronda. (Total: ${me ? me.score : 0} pts)`;
    }

    document.getElementById("revealCorrectAnswerText").textContent = correctAnswer;

    // Mini Leaderboard
    const miniList = document.getElementById("miniLeaderboardList");
    miniList.innerHTML = "";
    players.slice(0, 5).forEach((p, idx) => {
      const item = document.createElement("div");
      item.className = "mini-leaderboard-item";
      item.innerHTML = `
        <span>#${idx + 1} ${getAvatarEmoji(p.avatar)} ${p.name} ${p.id === myPlayer?.id ? "<strong>(Tu)</strong>" : ""}</span>
        <span style="color: var(--accent-gold);">${p.score} pts</span>
      `;
      miniList.appendChild(item);
    });
  }, 700);
});

// 12. Fim de Jogo (Pódio)
socket.on("game_over", ({ podium, ranking, roundsPlayed }) => {
  showScreen("gameover");
  SoundFX.fanfare();

  // Pódio
  const p1 = podium[0];
  const p2 = podium[1];
  const p3 = podium[2];

  if (p1) {
    document.querySelector("#podium1 .podium-avatar").textContent = getAvatarEmoji(p1.avatar);
    document.querySelector("#podium1 .podium-name").textContent = p1.name;
    document.querySelector("#podium1 .podium-score").textContent = `${p1.score} pts`;
  }
  if (p2) {
    document.querySelector("#podium2 .podium-avatar").textContent = getAvatarEmoji(p2.avatar);
    document.querySelector("#podium2 .podium-name").textContent = p2.name;
    document.querySelector("#podium2 .podium-score").textContent = `${p2.score} pts`;
  } else {
    document.getElementById("podium2").style.display = "none";
  }
  if (p3) {
    document.querySelector("#podium3 .podium-avatar").textContent = getAvatarEmoji(p3.avatar);
    document.querySelector("#podium3 .podium-name").textContent = p3.name;
    document.querySelector("#podium3 .podium-score").textContent = `${p3.score} pts`;
  } else {
    document.getElementById("podium3").style.display = "none";
  }

  // Tabela Geral
  const fullTable = document.getElementById("fullRankingTable");
  fullTable.innerHTML = "";
  ranking.forEach((p, idx) => {
    const row = document.createElement("div");
    row.className = "ranking-row";
    const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
    row.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-weight: 900; width: 28px;">${medal}</span>
        <span>${getAvatarEmoji(p.avatar)} ${p.name} ${p.id === myPlayer?.id ? "<strong>(Tu)</strong>" : ""}</span>
      </div>
      <span style="color: var(--accent-gold); font-weight: 800;">${p.score} pts</span>
    `;
    fullTable.appendChild(row);
  });
});

// 13. Reiniciar para o Lobby
socket.on("room_reset_lobby", ({ room }) => {
  currentRoom = room;
  updateLobbyUI(room);
  showScreen("lobby");
  showToast("O anfitrião reiniciou a sala para uma nova partida!");
});

// 14. Erros do Servidor
socket.on("error_message", (msg) => {
  showToast(msg);
});
