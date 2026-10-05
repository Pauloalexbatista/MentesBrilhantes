# task_plan.md — Mentes Brilhantes

## Visao Geral do Projeto
Jogo de Web Quiz Multiplayer ("Mentes Brilhantes") com salas privadas/publicas, partilha de convites via WhatsApp, intercalacao de dificuldade (facil/dificil), randomizacao de opcoes de resposta e integracao na VPS e HUB de jogos.

---

## Fases de Execucao (B.L.A.S.T.)

### Fase 1: Blueprint (Especificacao & Schema)
- [x] Definicao de regras e arquitetura no gemini.md
- [x] Schema do modelo de dados de Perguntas, Salas, Jogadores e Rondas
- [ ] Obter/Confirmar o conteudo completo das 500 perguntas (atualmente gemini-code-1791223016737.txt contem apenas o titulo)

### Fase 2: Link (Conectividade & Parser de Perguntas)
- [ ] Criar script de parsing/validacao para transformar o ficheiro de perguntas em questions.json estruturado
- [ ] Validar distribuicao: 5 categorias x 100 perguntas cada (facil/dificil)

### Fase 3: Architect (Construcao 3-Layer)
- [ ] Backend (Node.js + Express + Socket.io):
  - Gestor de Salas (criar sala, gerar codigo unico, gerir estado da partida)
  - Sincronizacao em tempo real (contagem decrescente, apresentacao de pergunta, rececao de respostas)
  - Calculo de pontuacao deterministico (facil: 10 pts, dificil: 20 pts)
  - Leaderboard e podio final
- [ ] Frontend (Web Responsiva Mobile-First):
  - Ecra inicial: Avatar/Nickname, Criar Sala, Entrar com Codigo
  - Botao de convite direto por WhatsApp (wa.me/?text=...)
  - Painel de selecao de categorias e parametros de partida
  - Ecra de Quiz com Shuffle obrigatorio das 4 opcoes (A, B, C, D)
  - Feedback visual imediato e animacoes de pontuacao

### Fase 4: Stylize (UI/UX)
- [ ] Design elegante, cores vibrantes, efeitos sonoros (opcional com toggle de som)
- [ ] Experiencia suave em telemovel e desktop

### Fase 5: Trigger (Deploy VPS & Integracao HUB)
- [ ] Configuracao de Dockerfile e script de deploy VPS
- [ ] Registo no HUB de jogos (portal-hub) com slug 'mentesbrilhantes'
