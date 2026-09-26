## Requisitos
Precisamos responder antes de começar a escrever qualquer código:
- **Quem espera a resposta?**
	- Humano na tela: legal ter um feedback rápido
		- Streaming e modelos mais rápidos
	- Sistema / pipeline: formato importa mais que a latência
		- Structured output e batch se não precisar ser em tempo real
- **Qual o volume?**
	- Dezenas por dia: não precisa gastar tanto tempo em otimização
	- Milhares por hora: otimizar!
		- rate limit (RPM, ITPM, OTPM), caching, batch, modelo menor
- **Qual a tolerância a erro?**
	- Resumo interno: modelo mais barato
	- Resumo executivo / extração contábil / resposta a cliente: modelos melhores, validações, humano no loop
- **O que entra?**
	- Texto? Imagem? PDF?: analisar tamanho das imagens, blocos de conteúdo, custos
- **O que sai?**
	- Precisa ter conversa? JSON? Alguma ação?: Usar structured outputs ou tools se necessário
- **Quais as restrições?**
	- Avaliar custo máximo, dados sensíveis, latência, idiomas, etc

Ex: assistente de dúvidas de clientes em tempo real sobre PDF de 200 páginas que raramente muda
- dúvidas em tempo real: streaming
- PDF de 200 páginas que raramente muda: `file` (mesmo PDF, fica guardado) com caching (processa 1 única vez)
- limite da API por chamada de PDF é 100 páginas: checar limite de páginas
	- podemos dividir em partes, pré-processar (extrair o texto e mandar tudo como texto que não vai ter esse limite), indexar e mandar só os trechos relevantes para a pergunta
## Ciclo de vida
É o caminho de uma aplicação do protótipo até a manutençaõ
1. **Protótipo**: testar o prompt no console ou num script curto pra garantir que ele faz a tarefa
2. **Avaliação**: montar um conjunto de casos de testes (entrada e saída esperada) e roda o prompt com eles
	- Usar para comparar os modelos (**eval set**) e ver se a troca de modelo foi boa ou ruim
3. **Produção**: precisamos garantir retry/backoff, tratamento de erro, `stop_reason`, caching, escolha de modelo, rate limit e tudo que vimos até agora
4. **Monitoramento**: Acompanhar o custo (via `usage`), latência, taxa de erro, taxa de `refusal`, taxa de cache hit
5. **Manutenção e evolução**: vamos usar o ID do modelo com data (que é fixo) para referenciar o modelo que usamos e evitar que uma atualização "silenciosa" mude o comportamento do nosso processo (garantir que estamos na **versão** correta)
	- Ex: alias (`claude-sonnet-4-5`) aponta pra versão mais nova, ID com data (`claude-sonnet-4-5-20250929`) é fixo
	- A troca de modelo deve ser planejada pelo time e avaliada com o dataset de testes (**eval set**)
	- Modelos antigos vão sendo descontinuados (**deprecação** dos modelos), mas há avisos sobre isso para que seja migrado para os modelos mais novos
## Configuration Management
Como vamos armazenar tudo que não for código
- **Chaves de API**
	- Ou na variável de ambiente (`ANTHROPIC_API_KEY`) ou gerenciador de segredos
	- Uma chave por ambiente e por aplicação
	- Rotação periódica
- **Workspaces**
	- Uma organização pode ter vários workspaces, cada um com spend limite e rate limit próprios (geralmente um por projeto e ambiente)
- **Parâmetros**
	- Devem ficar fora do código (como `model`, `max_tokens`, `temperature`) em arquivo Config ou variável de ambiente (não hardcoded)
		- Trocar de modelo não deve exigir um novo deploy
- **Prompts versionados**
	- Guardar com histórico para caso algo aconteça saber o que gerou aquilo
	- Templates com placeholdes (`{{cliente}}`, `{{data}}`) para separar parte fixa (cacheavel) da variável
		- Os placeholders devem ficar na parte variável já que a API já vai receber com os valores substituídos e isso vai ser diferente (quebraria o cache)
- **Ambientes separados**
	- Separação entre DEV e PROD
## Application Design
Na hora de escolher a arquitetura, o ideal é que a gente vá para a **opção mais simples que resolve o problema!**
Referência:
- https://www.anthropic.com/engineering/building-effective-agents
- https://resources.anthropic.com/hubfs/Building%20Effective%20AI%20Agents-%20Architecture%20Patterns%20and%20Implementation%20Frameworks.pdf

Então a ideia é escolher o primeiro da lista que resolver o problema:
1. **Chamada única**: um prompt, uma resposta
	- Vamos sempre começar nessa ideia e ir criando complexidade à medida que for necessário
	- Serve pra bastante coisa: classificação, extração, resumo, resposta a pergunta com contexto
2. **Prompt chaining (encadeamento)**: dividir a tarefa em passos, cada um com uma chamada sendo a saída de uma a entrada da outra (ex: gerar rascunho -> revisar -> traduzir)
	- É mais fácil de trabalhar com cada passo sozinho
	- Podemos validar um passo antes de seguir pro próximo
3. **Routing (roteamento)**: uma chamada mais barata classifica a entrada e manda pro tratamento certo (ex: um fluxo para pergunta simples, outro para pergunta técnica e outro para análise de arquivo)
	- Ideal se as **entradas são muito heterogêneas**
	- Seria difícil gerar um prompt que funcionasse bem pra todos
4. **Parallelization (paralelização)**: é executar partes da tarefa de forma paralela (ao mesmo tempo), podendo ser partes independentes ou uma mesma tarefa que é executada mais de 1 vez e os resultados são votados para escolher o melhor
	- 2 formas:
		- **Seccionar**: quebrar a tarefa em partes independentes e rodar em paralelo
			- Reduz **latência**
		- **Votar**: roda a mesma tarefa N vezes e escolhe o melhor resultado
			- Aumenta a **confiança**
5. **Orchestrator-workers**: um modelo central decidem quais das tarefas serão realizadas e despacha para os workers, depois ele junta tudo.
	- Diferente do paralelo, as tarefas não são conhecidas de antemão
6. **Evaluator-optimizer**: um modelo gera enquanto outro avalia considerando critérios definidos, então volta pro primeiro que refina com o feedback e faz isso em loop
	- Precisa existir um critério claro de qualidade (ex: tradução)

**Outras definições importantes:**
1. **Onde ficar a lógica?**
	- Se é determinístico (as regras são claras e definidas) fica no código
		- Validar CPF, checar data, etc
	- Precisa de linguagem, julgamento? Fica no modelo!
2. **Workflow ou agente?**
	- Se os **passos são previsíveis, segue um workflow**, se o **modelo precisar decidir é melhor usar um agente**
3. **Como dar contexto? Tudo no prompt ou RAG?**
	- Se o documento cabe na janela e é **sempre o mesmo**: **tudo no prompt + caching**
	- Base de dados **muito grande, que muda muito ou muitos dfocumentos diferentes por chamada**: **RAG**
		- **RAG** (Retrieval-Augmented Generation, falaremos depois): a base fica num índice de busca (geralmente vetorial) e a cada pergunta o código busca os trechos relevantes para aquela pergunta específica (a busca é do código, não do Claude)
		- Ele vai buscar apenas os trechos mais relevantes e enviar só isso
		- Ele gera mais complexidade e corre o risco de deixar trechos de fora se for usado de forma errada
## Software Engineering Foundations
É importante lembrar que as chamadas custam dinheiro, podem ser lentas, são **não determinísticas** (uma mesma chamada pode vir diferente em 2 requisições exatamente iguais) e pode falhar de vários jeitos
É importante saber que toda chamada **precisa** ter:
1. **Timeout**: por mais que existam valores padrões, é importante ser configurado para ter um controle
	- A resposta travada pode segurar o worker
	- Se a resposta for muito longa -> streaming ao invés de timeout alto
2. **Retry com backoff e limite** para erros temporários como **429, 5xx e conexão**
	- Garantir que vai ter um número máximo
	- Usar **Jitter** (um valor aleatório para evitar que vários clientes executem com o mesmo backoff) -> então vai esperar 1s + um valor aleatório, depois 2s + outro valor aleatório
3. **Idempotência** (é a propriedade de uma operação que pode ser aplicada várias vezes sem alterar o resultado final após a primeira execução)
	- Precisamos construir essa idempotência: garantir que uma nova chamada vai gerar o mesmo efeito e não um novo pedido por exemplo (o texto pode variar, mas o pedido não pode duplicar)
	- Se tentarmos uma operação que já foi feita pode duplicar (ex: duplicar um pedido)
	- Precisamos de uma chave de idempotência ou verificar antes de repetir
		- Nesse caso a chamada consulta se já foi feito e se sim ele só retorna o resultado (ex: o número do pedido) sem mudar nada
4. **Filas e assincronia**
	- Se não precisa de resposta imediata vai pra uma fila e os workers consomem no ritmo do rate limit
		- Tendo mais prazo: Batch API
5. **Fallback**: trocar o modelo se cair em 529 ou jogar pra uma resposta padrão (é melhor uma resposta simples do que nenhuma)
6. **Observabilidade**: log estruturado por chamada (modelo, `usage`, latência, `stop_reason`, erros) e métricas agregadas (custo por dia, taxa de erro, etc)
7. **Testes**: unitários, eval sets, testes de integração
8. **Segurança**: Chave fora do código, evitar prompt injection (usuário conseguir controlar a chamada a partir do que escrever), validação da saída do modelo
9. **Acompanhamento de custos**: estimar antes com o `count_tokens`, limitar `max_tokens`, ter spend limit, alerta de custos, etc

-----
## Checkpoint: Aplicações

> [!question]- 1. Uma fintech quer um assistente que responde dúvidas de clientes em tempo real sobre um manual de 60 páginas atualizado uma vez por ano. Qual combinação atende? (selecione 1)
> a) Batch API + `output_format`
> b) Streaming + manual no `system` com prompt caching
> c) RAG com índice vetorial + `temperature=1`
> d) Chamada síncrona sem streaming + Files API
>
> > [!success]- Resposta
> > **b**. Tempo real → streaming; documento que cabe na janela e raramente muda → prompt + cache. RAG é para base que não cabe ou muda muito.

> [!question]- 2. A equipe trocou o system prompt e não sabe se a qualidade melhorou ou piorou. O que faltou no ciclo de vida? (selecione 1)
> a) Monitoramento de custo via `usage`
> b) Um eval set com entradas e saídas esperadas para comparar versões
> c) Workspaces separados por ambiente
> d) Usar alias do modelo em vez de ID com data
>
> > [!success]- Resposta
> > **b**. Sem conjunto de avaliação, mudança de prompt ou modelo é chute. Eval set é a fase 2 e volta em toda troca.

> [!question]- 3. Uma aplicação em produção passou a se comportar diferente sem nenhum deploy. O `model` na config é `claude-sonnet-4-5`. Qual a causa provável e a correção? (selecione 1)
> a) Rate limit mudou; aumentar o tier
> b) O alias passou a apontar para uma versão nova; fixar o ID com data
> c) O cache expirou; usar `ttl: "1h"`
> d) A chave de API foi rotacionada
>
> > [!success]- Resposta
> > **b**. Alias segue a versão mais recente. Produção usa ID com data e migra de forma planejada, com eval.

> [!question]- 4. Dois times da mesma organização usam a API; o job noturno de um esgota o rate limit e derruba o chatbot do outro. O que fazer? (selecione 1)
> a) Aumentar `max_retries` no chatbot
> b) Separar em Workspaces, cada um com rate limit e spend limit próprios
> c) Compartilhar a mesma chave com prefixos diferentes
> d) Mover o chatbot para streaming
>
> > [!success]- Resposta
> > **b**. Workspaces isolam chave, limite e uso. Retry no chatbot não cria capacidade; streaming não afeta rate limit.

> [!question]- 5. Uma aplicação precisa gerar um rascunho de contrato, revisá-lo contra uma checklist jurídica e depois traduzi-lo. Os passos são fixos. Qual padrão? (selecione 1)
> a) Agente autônomo com tools
> b) Prompt chaining, com validação entre os passos
> c) Parallelization com votação
> d) Orchestrator-workers
>
> > [!success]- Resposta
> > **b**. Passos previsíveis e sequenciais, saída de um é entrada do outro → chaining. Agente só quando o modelo precisa decidir os passos.

> [!question]- 6. Um suporte recebe perguntas simples (horário, endereço), perguntas técnicas sobre produto e reclamações que devem ir para humano. Um único prompt está genérico demais. Qual padrão? (selecione 1)
> a) Routing: uma chamada barata classifica e encaminha para o tratamento certo
> b) Evaluator-optimizer
> c) Parallelization seccionada
> d) Aumentar o `system` com todos os casos
>
> > [!success]- Resposta
> > **a**. Entradas heterogêneas → roteamento, com modelo barato na classificação e prompt específico em cada rota.

> [!question]- 7. Após um retry por timeout, o cliente recebeu dois e-mails de confirmação de pedido. O que corrige de forma adequada? (selecione 1)
> a) Remover o retry
> b) `temperature=0` para o modelo responder igual
> c) Chave de idempotência na ação de envio, checando se já foi executada antes de repetir
> d) Trocar para Batch API
>
> > [!success]- Resposta
> > **c**. A chamada ao modelo é segura de retentar; a ação com efeito colateral não. Idempotência se constrói no código; `temperature` não garante nada.

> [!question]- 8. O custo mensal da API dobrou e ninguém sabe qual fluxo causou. O que faltou? (selecione 1)
> a) Prompt caching
> b) Log estruturado por chamada com `usage` e métricas agregadas por fluxo
> c) Modelo menor
> d) Streaming
>
> > [!success]- Resposta
> > **b**. Sem observabilidade não se sabe onde o dinheiro vai. Cache e modelo menor são remédios; o diagnóstico vem antes.

> [!question]- 9. Uma aplicação valida CPF e calcula o total de uma nota fiscal pedindo ao modelo que faça isso no prompt. Qual a crítica de design? (selecione 1)
> a) Deveria usar Opus para cálculos
> b) Lógica determinística deve ficar no código; o modelo fica com o que exige linguagem ou julgamento
> c) Deveria usar RAG
> d) Deveria usar `stop_sequences`
>
> > [!success]- Resposta
> > **b**. Regra clara → código: mais barato e sem erro de geração. Modelo para extração e interpretação, não para aritmética.

> [!question]- 10. Um pipeline noturno de 20 mil documentos está falhando com 429 e 529 em sequência. Quais mudanças são adequadas? (selecione 2)
> a) Colocar as requisições numa fila consumida no ritmo do rate limit, ou migrar para Batch
> b) Retentar imediatamente em loop
> c) Fallback para um modelo menor quando o principal está em 529
> d) Aumentar `max_tokens`
>
> > [!success]- Resposta
> > **a, c**. Fila/Batch desacopla do limite; fallback mantém o pipeline andando na sobrecarga. Retry em loop piora; `max_tokens` não tem relação.