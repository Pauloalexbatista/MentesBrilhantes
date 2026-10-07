# gemini.md — Constituicao do Projeto: Mentes Brilhantes

## 1. Identidade e Proposito
- **Nome**: Mentes Brilhantes
- **Tipo**: Web Quiz Multiplayer em Tempo Real para grupos, familia e amigos.
- **Ambiente de Producao**: Servidor VPS com suporte a WebSockets/Socket.io.
- **Integracao**: Portal HUB de Jogos (slug: mentesbrilhantes).

## 2. Schemas de Dados (Data-First Rule)

### Schema de Pergunta (JSON)
```json
{
  "id": "ct_001",
  "theme": "Ciência e Tecnologia",
  "difficulty": "fácil",
  "question": "Qual é o planeta mais próximo do Sol?",
  "options": [
    "Vénus",
    "Marte",
    "Mercúrio",
    "Terra"
  ],
  "answer": "Mercúrio"
}
```

### Categorias Oficiais (640 perguntas no total):
1. Ciência e Tecnologia (100 perguntas)
2. Música e Cinema (107 perguntas)
3. Cultura Geral (102 perguntas)
4. Geografia (106 perguntas)
5. Desporto (104 perguntas)
6. História de Portugal (31 perguntas)
7. História Mundial (30 perguntas)
8. Provérbios e Adivinhas (30 perguntas)
9. Ciência e Animais (30 perguntas)

### Schema da Sala (Game Room):
```json
{
  "code": "MB-4892",
  "hostId": "socket_id_ou_uuid",
  "status": "lobby | playing | round_summary | game_over",
  "selectedThemes": ["Ciência e Tecnologia", "Desporto"],
  "roundsCount": 10,
  "currentRound": 1,
  "currentQuestion": {
    "question": "Qual é o planeta mais próximo do Sol?",
    "theme": "Ciência e Tecnologia",
    "difficulty": "fácil",
    "options": ["Marte", "Mercúrio", "Terra", "Vénus"],
    "timeLimit": 20
  },
  "players": [
    {
      "id": "uuid_jogador",
      "name": "Alex",
      "avatar": "brain_1",
      "score": 30,
      "answeredCurrent": true
    }
  ]
}
```

### Schema do Leaderboard / TOP 10 Recordes (`leaderboard.json`):
```json
[
  {
    "id": "rec_1775581234567_482",
    "name": "Einstein",
    "avatar": "brain_1",
    "score": 185,
    "rounds": 10,
    "date": "07/10/2026",
    "timestamp": 1775581234567
  }
]
```

## 3. Regras Inviolaveis de Negocio
1. **Shuffle Obrigatorio**: A ordem das opcoes de resposta (A, B, C, D) tem de ser baralhada deterministicamente ou de forma aleatoria no motor antes do envio ou renderizacao de cada jogador.
2. **Sistema de Pontuacao**:
   - Pergunta Fácil: 10 pontos
   - Pergunta Difícil: 20 pontos
   - Bónus de velocidade opcional (ex: até +5 pts decrescente com o tempo).
3. **Multiplayer Fluido**:
   - O anfitrião pode iniciar a partida assim que os amigos entrarem.
   - O anfitrião pode partilhar link direto por WhatsApp com mensagem pronta: *"Vem jogar comigo ao Mentes Brilhantes! Entra na sala: [LINK]"*.
4. **Integracao VPS e HUB**:
   - Porta dedicada e configuracao compativel com Nginx / Reverse Proxy do Portal HUB.
5. **Hall of Fame / TOP 10 Recordes (Jackpots)**:
   - Mantém persistentemente em disco (`leaderboard.json`) os 10 melhores resultados de sempre.
   - Qualquer partida concluída (jogada a solo ou em grupo, com 5, 10, 15 ou 20 perguntas) qualifica pontuações > 0.
   - Se a lista tiver menos de 10 registos ou a pontuação do jogador for superior à pontuação mais baixa existente no TOP 10, a pontuação mais baixa sai e entra o novo recorde, ordenado sempre por ordem decrescente de pontuação.
