const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3085;

// Carregar perguntas
let questionsData = [];
try {
  const rawQuestions = fs.readFileSync(path.join(__dirname, "questions.json"), "utf-8");
  questionsData = JSON.parse(rawQuestions);
  console.log(`[Banco de Dados] ${questionsData.length} perguntas carregadas com sucesso.`);
} catch (err) {
  console.error("[Erro ao carregar questions.json]:", err.message);
}

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Rota de saúde e info
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    game: "Mentes Brilhantes",
    totalQuestions: questionsData.length,
    activeRooms: Object.keys(rooms).length
  });
});

// Rota de temas disponíveis
app.get("/api/themes", (req, res) => {
  const themes = [...new Set(questionsData.map(q => q.theme))];
  res.json({ themes });
});

/* ========================================================
   ESTRUTURA E ESTADO DAS SALAS DE JOGO (Multiplayer)
   ======================================================== */
const rooms = {};

// Função auxiliar para baralhar arrays (Fisher-Yates) - Shuffle Obrigatório
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Gerar código único de sala (ex: MB-4821)
function generateRoomCode() {
  let code;
  do {
    const num = Math.floor(1000 + Math.random() * 9000);
    code = `MB-${num}`;
  } while (rooms[code]);
  return code;
}

// Filtrar perguntas por temas selecionados
function getFilteredQuestions(selectedThemes) {
  if (!selectedThemes || selectedThemes.length === 0) {
    return questionsData;
  }
  return questionsData.filter(q => selectedThemes.includes(q.theme));
}

io.on("connection", (socket) => {
  console.log(`[Socket Conectado] ${socket.id}`);

  // 1. CRIAR NOVA SALA
  socket.on("create_room", ({ playerName, avatar }) => {
    const roomCode = generateRoomCode();
    const player = {
      id: socket.id,
      name: playerName.trim() || "Jogador 1",
      avatar: avatar || "brain_1",
      score: 0,
      answeredCurrent: false,
      isHost: true,
      lastPointsEarned: 0
    };

    rooms[roomCode] = {
      code: roomCode,
      hostId: socket.id,
      status: "lobby", // lobby | question | reveal | game_over
      selectedThemes: ["Ciência e Tecnologia", "Música e Cinema", "Cultura Geral", "Geografia", "Desporto"],
      roundsCount: 10,
      timeLimit: 20,
      currentRound: 0,
      questionsPool: [],
      currentQuestion: null,
      questionStartTime: 0,
      timerInterval: null,
      players: [player]
    };

    socket.join(roomCode);
    socket.roomCode = roomCode;

    socket.emit("room_created", {
      roomCode,
      player,
      room: sanitizeRoomForClient(rooms[roomCode])
    });

    console.log(`[Sala Criada] ${roomCode} pelo Host ${player.name}`);
  });

  // 2. ENTRAR NUMA SALA EXISTENTE
  socket.on("join_room", ({ roomCode, playerName, avatar }) => {
    const formattedCode = (roomCode || "").trim().toUpperCase();
    const room = rooms[formattedCode];

    if (!room) {
      return socket.emit("error_message", "Sala não encontrada. Verifica o código!");
    }

    if (room.status !== "lobby") {
      return socket.emit("error_message", "Esta partida já começou. Tenta outra sala!");
    }

    // Verificar se jogador já existe na sala
    let existingPlayer = room.players.find(p => p.id === socket.id);
    if (!existingPlayer) {
      existingPlayer = {
        id: socket.id,
        name: playerName.trim() || `Jogador ${room.players.length + 1}`,
        avatar: avatar || `brain_${(room.players.length % 6) + 1}`,
        score: 0,
        answeredCurrent: false,
        isHost: false,
        lastPointsEarned: 0
      };
      room.players.push(existingPlayer);
    }

    socket.join(formattedCode);
    socket.roomCode = formattedCode;

    socket.emit("room_joined", {
      roomCode: formattedCode,
      player: existingPlayer,
      room: sanitizeRoomForClient(room)
    });

    // Notificar os outros jogadores da sala
    io.to(formattedCode).emit("players_updated", {
      players: room.players,
      hostId: room.hostId
    });

    console.log(`[Jogador Entrou] ${existingPlayer.name} entrou na sala ${formattedCode}`);
  });

  // 3. ATUALIZAR CONFIGURAÇÕES DA SALA (Apenas Host)
  socket.on("update_settings", ({ selectedThemes, roundsCount, timeLimit }) => {
    const room = rooms[socket.roomCode];
    if (!room || room.hostId !== socket.id || room.status !== "lobby") return;

    if (selectedThemes && Array.isArray(selectedThemes) && selectedThemes.length > 0) {
      room.selectedThemes = selectedThemes;
    }
    if (roundsCount) {
      room.roundsCount = Math.max(3, Math.min(30, parseInt(roundsCount) || 10));
    }
    if (timeLimit) {
      room.timeLimit = Math.max(10, Math.min(60, parseInt(timeLimit) || 20));
    }

    io.to(room.code).emit("settings_updated", {
      selectedThemes: room.selectedThemes,
      roundsCount: room.roundsCount,
      timeLimit: room.timeLimit
    });
  });

  // 4. INICIAR PARTIDA (Apenas Host)
  socket.on("start_game", () => {
    const room = rooms[socket.roomCode];
    if (!room || room.hostId !== socket.id || room.status !== "lobby") return;

    // Reset scores e status
    room.players.forEach(p => {
      p.score = 0;
      p.answeredCurrent = false;
      p.lastPointsEarned = 0;
    });

    // Selecionar perguntas baralhadas para esta partida
    const available = getFilteredQuestions(room.selectedThemes);
    const shuffledPool = shuffleArray(available);
    room.questionsPool = shuffledPool.slice(0, room.roundsCount);
    room.currentRound = 0;

    console.log(`[Jogo Iniciado] Sala ${room.code} com ${room.questionsPool.length} rondas.`);

    // Iniciar contagem pré-jogo de 3 segundos
    io.to(room.code).emit("game_starting", { countdown: 3 });

    setTimeout(() => {
      nextRound(room);
    }, 3500);
  });

  // 5. SUBMETER RESPOSTA DO JOGADOR
  socket.on("submit_answer", ({ selectedOption }) => {
    const room = rooms[socket.roomCode];
    if (!room || room.status !== "question" || !room.currentQuestion) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.answeredCurrent) return; // Não pode responder duas vezes

    player.answeredCurrent = true;

    // Calcular tempo decorrido e pontuação
    const elapsedSeconds = (Date.now() - room.questionStartTime) / 1000;
    const remainingSeconds = Math.max(0, room.timeLimit - elapsedSeconds);
    const isCorrect = (selectedOption === room.currentQuestion.correctAnswer);

    let pointsEarned = 0;
    if (isCorrect) {
      // Pergunta fácil: 10 pts | difícil: 20 pts
      const basePoints = room.currentQuestion.difficulty === "fácil" ? 10 : 20;
      // Bónus de velocidade: até 5 pontos baseado no tempo que sobrou
      const speedBonus = Math.round((remainingSeconds / room.timeLimit) * 5);
      pointsEarned = basePoints + speedBonus;
      player.score += pointsEarned;
    }

    player.lastPointsEarned = pointsEarned;

    // Notificar jogador individualmente se acertou
    socket.emit("answer_ack", {
      isCorrect,
      pointsEarned,
      currentScore: player.score
    });

    // Informar sala que o jogador respondeu (sem revelar qual foi a resposta)
    io.to(room.code).emit("player_has_answered", {
      playerId: player.id,
      answeredCount: room.players.filter(p => p.answeredCurrent).length,
      totalPlayers: room.players.length
    });

    // Se todos os jogadores responderam, terminar a ronda imediatamente
    const allAnswered = room.players.every(p => p.answeredCurrent);
    if (allAnswered) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      revealRoundResults(room);
    }
  });

  // 6. ANFITRIÃO REINICIA O JOGO (VOLTAR AO LOBBY OU JOGAR DE NOVO)
  socket.on("play_again", () => {
    const room = rooms[socket.roomCode];
    if (!room || room.hostId !== socket.id) return;

    if (room.timerInterval) clearInterval(room.timerInterval);
    room.status = "lobby";
    room.currentRound = 0;
    room.currentQuestion = null;
    room.players.forEach(p => {
      p.score = 0;
      p.answeredCurrent = false;
      p.lastPointsEarned = 0;
    });

    io.to(room.code).emit("room_reset_lobby", {
      room: sanitizeRoomForClient(room)
    });
  });

  // DESCONEXÃO
  socket.on("disconnect", () => {
    console.log(`[Desconectado] ${socket.id}`);
    const roomCode = socket.roomCode;
    if (!roomCode || !rooms[roomCode]) return;

    const room = rooms[roomCode];
    room.players = room.players.filter(p => p.id !== socket.id);

    // Se a sala ficou vazia, elimina
    if (room.players.length === 0) {
      if (room.timerInterval) clearInterval(room.timerInterval);
      delete rooms[roomCode];
      console.log(`[Sala Encerrada] ${roomCode} (ficou vazia)`);
      return;
    }

    // Se quem saiu foi o anfitrião, passa a liderança para o próximo
    if (room.hostId === socket.id) {
      room.hostId = room.players[0].id;
      room.players[0].isHost = true;
      io.to(roomCode).emit("host_changed", {
        newHostId: room.hostId,
        newHostName: room.players[0].name
      });
    }

    io.to(roomCode).emit("players_updated", {
      players: room.players,
      hostId: room.hostId
    });

    // Se estiver em jogo e faltavam apenas as respostas de quem saiu
    if (room.status === "question") {
      const allAnswered = room.players.every(p => p.answeredCurrent);
      if (allAnswered) {
        if (room.timerInterval) clearInterval(room.timerInterval);
        revealRoundResults(room);
      }
    }
  });
});

/* ========================================================
   FUNÇÕES DO MOTOR DE RONDAS
   ======================================================== */

function nextRound(room) {
  room.currentRound += 1;

  if (room.currentRound > room.roundsCount || room.questionsPool.length === 0) {
    endGame(room);
    return;
  }

  const rawQ = room.questionsPool[room.currentRound - 1];

  // Regra Inviolável de Negócio: SHUFFLE OBRIGATÓRIO das opções
  const shuffledOptions = shuffleArray(rawQ.options);

  room.currentQuestion = {
    id: rawQ.id,
    theme: rawQ.theme,
    difficulty: rawQ.difficulty,
    question: rawQ.question,
    options: shuffledOptions,
    correctAnswer: rawQ.answer, // mantido seguro no backend
    timeLimit: room.timeLimit
  };

  room.status = "question";
  room.questionStartTime = Date.now();

  // Reset do status de resposta dos jogadores
  room.players.forEach(p => {
    p.answeredCurrent = false;
    p.lastPointsEarned = 0;
  });

  // Enviar pergunta aos clientes (SEM a resposta correta!)
  io.to(room.code).emit("new_question", {
    round: room.currentRound,
    totalRounds: room.roundsCount,
    theme: room.currentQuestion.theme,
    difficulty: room.currentQuestion.difficulty,
    question: room.currentQuestion.question,
    options: room.currentQuestion.options,
    timeLimit: room.timeLimit
  });

  // Temporizador do servidor
  let timeLeft = room.timeLimit;
  if (room.timerInterval) clearInterval(room.timerInterval);

  room.timerInterval = setInterval(() => {
    timeLeft -= 1;
    io.to(room.code).emit("timer_tick", { timeLeft });

    if (timeLeft <= 0) {
      clearInterval(room.timerInterval);
      revealRoundResults(room);
    }
  }, 1000);
}

function revealRoundResults(room) {
  room.status = "reveal";
  if (room.timerInterval) clearInterval(room.timerInterval);

  // Ordenar ranking atual
  const leaderboard = [...room.players].sort((a, b) => b.score - a.score);

  io.to(room.code).emit("round_reveal", {
    correctAnswer: room.currentQuestion.correctAnswer,
    players: leaderboard,
    round: room.currentRound,
    totalRounds: room.roundsCount
  });

  // Aguardar 4.5 segundos antes de passar à próxima pergunta
  setTimeout(() => {
    if (rooms[room.code] && rooms[room.code].status === "reveal") {
      nextRound(room);
    }
  }, 4500);
}

function endGame(room) {
  room.status = "game_over";
  if (room.timerInterval) clearInterval(room.timerInterval);

  const finalRanking = [...room.players].sort((a, b) => b.score - a.score);

  console.log(`[Fim de Jogo] Sala ${room.code}. Vencedor: ${finalRanking[0]?.name}`);

  io.to(room.code).emit("game_over", {
    podium: finalRanking.slice(0, 3),
    ranking: finalRanking,
    roundsPlayed: room.roundsCount
  });
}

// Sanitizar sala para enviar ao cliente (remover intervalos, etc.)
function sanitizeRoomForClient(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    selectedThemes: room.selectedThemes,
    roundsCount: room.roundsCount,
    timeLimit: room.timeLimit,
    currentRound: room.currentRound,
    players: room.players
  };
}

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🧠 MENTES BRILHANTES — Servidor Ativo!`);
  console.log(`🚀 A correr em: http://localhost:${PORT}`);
  console.log(`===============================================`);
});
