# 🧠 Mentes Brilhantes — Web Quiz Multiplayer

> Jogo de Quiz Multijogador em Tempo Real para grupos, família e amigos, com salas privadas, convites diretos por WhatsApp e 640 perguntas estruturadas.

![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)
![Socket.io](https://img.shields.io/badge/Socket.io-4.7-black.svg)
![Express](https://img.shields.io/badge/Express-4.19-blue.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)

---

## 🌟 Funcionalidades Principais

- ⚡ **Multiplayer em Tempo Real**: Conexão instantânea de múltiplos jogadores via WebSockets (Socket.io).
- 📱 **Convite Direto por WhatsApp**: Botão com 1 clique para partilhar o link e código da sala em qualquer grupo ou contacto do WhatsApp.
- 🔀 **Shuffle Obrigatório**: O motor de jogo baralha deterministicamente as opções (A, B, C, D) para garantir que as posições nunca sejam previsíveis.
- 🎯 **640 Perguntas Estruturadas**:
  - 🔬 **Ciência e Tecnologia** (100 perguntas)
  - 🎬 **Música e Cinema** (107 perguntas)
  - 🌍 **Cultura Geral** (102 perguntas)
  - 🗺️ **Geografia** (106 perguntas)
  - ⚽ **Desporto** (104 perguntas)
  - 🇵🇹 **História de Portugal** (31 perguntas)
  - 🏛️ **História Mundial** (30 perguntas)
  - 🦉 **Provérbios e Adivinhas** (30 perguntas)
  - 🦁 **Ciência e Animais** (30 perguntas)
- ⚖️ **Sistema de Pontuação Justo**:
  - Pergunta Fácil: 10 pontos
  - Pergunta Difícil: 20 pontos
  - Bónus de Velocidade: até +5 pontos proporcionais à rapidez do acerto
- 🎭 **Avatares Personalizados**: Galeria de avatares animados e temáticos para cada jogador.
- ⚙️ **Painel do Anfitrião**: Escolha de temas ativos, quantidade de rondas (5 a 20) e tempo de resposta (15s a 30s).
- 🏆 **Pódio Interativo**: Ecrã final com troféus de 1º, 2º e 3º lugar, classificação completa e reinício de partida.
- 🔊 **Efeitos Sonoros Nativos**: Síntese áudio via Web Audio API (sem dependência de ficheiros externos) com botão de silenciar (Mute/Unmute).

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- NPM

### Passos de Instalação

1. Clonar o repositório:
```bash
git clone https://github.com/Pauloalexbatista/MentesBrilhantes.git
cd MentesBrilhantes
```

2. Instalar as dependências:
```bash
npm install
```

3. Iniciar o servidor:
```bash
npm start
```
Ou no Windows, basta executar o ficheiro:
```cmd
Jogar_Mentes_Brilhantes.bat
```

4. Aceder no navegador:
```
http://localhost:3085
```

---

## 🐳 Execução com Docker

Construir e correr o contentor:
```bash
docker-compose up -d --build
```
A aplicação ficará disponível na porta `3085`.

---

## 🌐 Deploy na VPS & Integração no Portal HUB

O projeto está desenhado para integração em servidores VPS com reverse proxy (Nginx / Traefik / Portal HUB):
- **Porta padrão**: `3085` (ou configurável via variável de ambiente `PORT`)
- **Slug no HUB de Jogos**: `mentesbrilhantes`
- **Endpoints de Monitorização**:
  - `GET /api/health` — Estado do servidor e salas ativas
  - `GET /api/themes` — Lista de categorias disponíveis

---

## 📁 Estrutura do Projeto

```text
├── public/                 # Frontend SPA responsivo (Mobile-First)
│   ├── index.html          # Estrutura e telas do jogo
│   ├── style.css           # Design moderno, modo escuro e animações
│   └── app.js              # Cliente Socket.io, motor de áudio e UI
├── questions.json          # Banco com as 640 perguntas estruturadas
├── server.js               # Servidor Express + Socket.io (Game Server)
├── Dockerfile              # Imagem Docker de produção
├── docker-compose.yml      # Orquestração do contentor Docker
├── Jogar_Mentes_Brilhantes.bat # Atalho de arranque para Windows
├── gemini.md               # Constituição, regras de negócio e schemas
├── task_plan.md            # Plano e fases de desenvolvimento
├── findings.md             # Descobertas e notas técnicas
├── progress.md             # Registo de progresso
└── package.json            # Metadados e dependências Node.js
```

---

## 📄 Licença
Distribuído sob licença ISC. Desenvolvido para a coleção do Portal HUB de Jogos.
