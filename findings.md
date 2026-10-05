# findings.md — Pesquisas e Descobertas

## Descobertas Iniciais
1. **Ficheiro de Perguntas**:
   - O ficheiro existente na pasta gemini-code-1791223016737.txt tem apenas 30 bytes com o texto === QUIZ MENTES BRILHANTES ===.
   - O lote completo de 500 perguntas necessita de ser fornecido ou importado para o projeto.
2. **Arquitetura Recomendada**:
   - Backend em Node.js com Express e Socket.io é ideal para Web Quiz em tempo real com salas, sincronização de relógio, desconexões e broadcast de resultados.
   - Frontend SPA responsivo (HTML5 / Modern JS / Tailwind CSS ou CSS moderno estilizado) servido diretamente pelo Express ou empacotado com Vite, funcionando sem complexidade de SSR.
3. **Mecanismo de Convite WhatsApp**:
   - Link de partilha formatado: https://api.whatsapp.com/send?text={mensagem + url_da_sala}.
   - Permite que qualquer participante entre com 1 clique diretamente no smartphone.
4. **Regra de Baralhamento (Shuffle)**:
   - As opções de resposta de cada pergunta devem sofrer shuffle obrigatório no motor de jogo (Fisher-Yates) para que a ordem das opções nunca seja previsível.
5. **HUB de Jogos e VPS**:
   - O HUB (PRJT_Testes/portal-hub) suporta mapeamento por slugs em config.json.
   - Pode ser mapeado como slug: "mentesbrilhantes" apontando para o serviço na VPS.
