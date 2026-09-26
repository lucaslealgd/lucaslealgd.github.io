## Agentes
Quando criamos um **workflow nós definimos os passos** que o processo deve seguir, já em um **agente** é **o próprio modelo que define o melhor caminho** para o processo
- O agente que decide quando parar, então o código não sabe de antemão quantas rodadas vão acontecer
Fazemos isso através do **agent loop**, que tem sempre as seguintes etapas:
1. Manda a tarefa + lista de `tools`
2. Modelo responde:
	1. `stop_reason == end_turn`: **acabou** e a resposta está no `content`
	2. `stop_reason == tool_use`: vai retornar com um bloco de `tool_use` com `id`, `name` e `input`
		1. O **código executa a tool** (o modelo nunca executa nada!)
		2. O histórico é reenviado (inteiro + resposta do modelo intacto) junto com uma mensagem `user` com um bloco `tool_result` apontando pro `tool_use_id`
			- `tool_result` sempre vai como `user`!
			- Se der erro na tool a gente envia mesmo assim falando qual erro deu (não é erro da API e vamos deixar o modelo resolver o que fazer)
				- Vamos colocar `is_error: true` dentro do `tool_result`
			- O `content` do assistant vai intacto pro histórico (não pode guardar só o texto)
			- Se precisar de várias tools na mesma resposta, todos os `tool_result` vão na mesma mensagem de user (diferenciados pelo id)
		3. Volta pro passo 2 (Modelo responde)
**Importante**:
- Cada volta do loop reenvia tudo
	- Custo e latência crescem a cada rodada
		- Cache ajuda
- O loop precisa de um teto para não ficar iterando pra sempre (número máximo de iterações, limite de tokens, limite de tempo)
- Algumas proteções ajudam na imprevisibilidade do agente (é código, não prompt já que prompt pode falhar):
	- **Teto de iterações** (evitar custos e tempo)
	- **Humano no loop**: o modelo só prepara, o humano valida
	- **Menor privilégio**: teria menos acesso (ex: apenas leitura e não delete ou update)
	- **Sandbox**: roda dentro de um container descartável

Exemplo:
```python
messages = [{"role": "user", "content": tarefa}]
while True:
    resp = client.messages.create(model=m, max_tokens=4096, tools=tools, messages=messages)
    messages.append({"role": "assistant", "content": resp.content})
    if resp.stop_reason != "tool_use":
        break
    results = []
    for block in resp.content:
        if block.type == "tool_use":
            out = executar(block.name, block.input)
            results.append({"type": "tool_result", "tool_use_id": block.id, "content": out})
    messages.append({"role": "user", "content": results})
```
## Workflow x Agente
Começar sempre com o mais simples que resolve
O agente é mais caro e menos previsível
- **Workflow**:
	- Passos são conhecidos
	- Entrada de dados é parecida
	- Precisa de previsibilidade, auditoria, controle de custos
	- Dá pra testar cada passo isolado
- **Agente**
	- O **caminho vai poder mudar** dependendo do que for aparecendo (difícil definir os passos)
	- Existe **feedback verificável** (o modelo vai precisar saber se ele está indo bem)
	- Vale pagar mais por latência e custo em troca de **flexibilidade**
	- Entende-se que falhas podem se propagar e é mais difícil de testar e depurar
Normalmente a escolha é por um fluxo híbrido (a escolha entre workflow e agente vai ser por etapa e não pelo sistema inteiro)
## Subagentes
É outro loop de agente com `messages`, `system` e `tools` próprios que os agentes podem chamar como se fossem uma "tool"
Geralmente vão ser pra tarefas mais específicas, pra elas não precisarem ser detalhadas no agente principal (ex: agente de gerar notícia, eu crio um subagente de revisão da notícia)
**Prós**:
- **Não aumenta o contexto** do principal
- Permite criar **subagentes mais especializados** (e testá-los de forma independente)
- Pode ser usado por vários outros fluxos
- Permite o **paralelismo** entre diferentes subagentes
- Em caso de falha, não estraga o contexto do pai (**isolamento**)
**Contras**:
- **Custo total sobe**
- Se o processamento for em sequência aumenta a latência (paralelismo reduz)
- Risco de **perda de contexto entre pai e filho** (um não sabe o que o outro descobriu)
No Claude Code, cada arquivo `.claude/agents/<nome>.md` define um subagente

Ao usar vários subagentes, vamos fazer isso através do **orquestrador**:
- O agente principal decompõe a tarefa e despacha para os subagentes, depois ele junta os resultados e decide o que fazer
- Regras:
	- Subagentes **não falam entre si** (tudo passa pelo orquestrador)
	- Subagentes não visualizam histórico do pai (o pai só manda as instruções)
		- A chamada a esse subagente precisa ser **autossuficiente** (inclusive com **formato de retorno**)
	- Diferente do *parallelization* do workflow (que as tarefas são conhecidas e paralelizadas antes de rodar), aqui é **o modelo que decide, em tempo de execução, quantos subagentes e a tarefa de cada um**
## Contexto e memória
Tudo que ele sabe vai estar no `messages`, se tem muitas rodadas com tool results grande rapidamente ele enche a janela e começa a perder qualidade (**context rot**, é o lost in the middle aplicado a agentes) e depois estoura
- O modelo esquece instrução, repete tool e se perde
- Antes de estourar a janela ele já começa a degradar e entregar resultados piores

É preciso sempre garantir que vamos **manter a janela enxuta**! Podemos fazer:
1. **Limpar tool results antigos**
	- Se não usamos mais, podemos **remover ou substituir por um resumo curto**
	- Na API temos o **context editing**, que podemos ativar na chamada a API
		- Ele tem o `context_management` com `clear_tool_uses` que apaga automaticamente os tool results mais antigos quando o contexto passa de um limite
		- Porém a lista de `messages` não muda, ele resolve o problema na chamada
2. **Compactação**
	- Resumir o histórico antigo em uma mensagem mais curta
	- Isso faz perder detalhe e **quebra o cache** (não fazer toda hora)
3. **Subagentes**
	- Detalhe fica no contexto do filho
4. **Memória externa**
	- O agente escreve em arquivos ou BD fora da janela e lê de volta quando precisa
	- É a única forma de **memória entre sessões**
	- Na API tem a **memory tool** (o modelo pede pra ler/escrever na memória e o código faz a operação em disco)
	- No Claude Code a memória do projeto é o `CLAUDE.md`
5. **Just-in-time context**
	- É ter uma tool de buscar e leitura pro agente pegar a informação que precisa quando precisar
	- É usar um **RAG onde quem busca é o agente**
	- É mais rodada em troca de janela menor

## Claude Agent SDK
Até agora estamos implementando na mão (loop, tool results, compactação, etc), o **Claude Agent SDK já é isso pronto** empacotado como **biblioteca** (Python `claude-agent-sdk`, TypeScript `@anthropic-ai/claude-agent-sdk`)
- Por baixo dos panos ele vai subir um processo do Claude Code e conversa com ele
- Já tem loop, tools embutidas (Read, Write, Edit, Bash, Grep, Glob, WebSearch...), compactação automática, sessões, subagentes, MCP, permissões, hooks.
Seria algo como:
```python
from claude_agent_sdk import query, ClaudeAgentOptions

options = ClaudeAgentOptions(
	model="claude-sonnet-5",
    system_prompt="Você é um revisor de código.",
    allowed_tools=["Read", "Grep"],
    permission_mode="acceptEdits",
    max_turns=20,
    cwd="/repo",
    hooks={"PreToolUse": [...]}
)
async for msg in query(prompt="Revise o módulo de pagamentos", options=options):
    print(msg)
```
- `allowed_tools`: o que pode usar
	- tudo que tiver aqui não vai ser perguntado mesmo que `permission_mode="default"`
	- também tem o `disallowed_tools`
		- bloqueia mesmo se tiver `permission_mode="bypassPermissions"`
- `permission_mode`: 
	- `default`: pergunta antes de agir
	- `acceptEdits`: aceita edição de **arquivo** sozinho
		- bash, rede, acesso fora da pasta continua passando pela checagem 
	- `plan`: só planeja, não executa
	- `bypassPermissions`: faz tudo sem perguntar (só em sandbox)
		- desliga a checagem inteira, executa qualquer tool comando sem perguntar
- `max_turns`: teto de iteração do bloco 1
- `agents`: define subagentes (se tiver)
- `mcp_servers`: tools externas via MCP
- `hooks`: são funções criadas pela gente que o SDK (não o modelo) chama em pontos fixos do loop (como PreToolUse antes de usar uma tool)
	- É **determinístico** e **roda sempre**
		- **Se quisermos garantir algo, é a melhor opção!**

Existem **2 modos de entrada** (pra falar com o agente)
- **Single message**: `query(prompt="faz X")`
	- Manda uma frase, ele trabalha e acabou
	- É mais pra one-off (tarefa avulsa) / automação
- **Streaming input**: abre uma sessão e vai mandando mensagens enquanto trabalha (como o Claude Code)
	- A segunda pergunta vai saber o que aconteceu na primeira (mesma sessão)
	- Vamos usar `await client.interrupt()` para interromper a tarefa atual (mas a sessão continua)
	- É o **ClaudeSDKClient**


O **SDK grava o histórico da sessão em disco** (API não, o SDK sim), então dá pra:
- `resume`: retomar uma sessão de onde parou com todo o contexto
- `fork_session`: continuar a partir de uma sessão (dois caminhos do mesmo ponto tipo um git branch)


No SDK **a tool vai ser uma função Python com `@tool`**


A escolha entre fazer algo próprio ou usar SDK geralmente vai depender:
- **Harness próprio**:
	- Harness é "o loop + tudo que o cerca", seria todo o processo que faríamos na mão
	- Ideal para agentes pequenos, tools próprias e que é necessário o controle a cada rodada
- **SDK**:
	- Processos maiores e mais complexos que precisamos de mais coisas prontas
	- Aceita a dependência do Claude Code


**Hospedagem:** (precisamos definir onde o loop vai rodar)
- **Self-hosted**: na nossa máquina ou container
	- Nós gerenciamos o sandbox, sessões, etc
- **Managed Agents**: hospedagem na Anthropic
	- Chama uma API REST e a Anthropic roda o loop, o sandbox e guarda o log da sessão
	- Zero infra porém menos controle
- **Managed com sandbox nosso**: roda na Anthropic mas os comandos (bash, arquivos) são executados na nossa rede
	- Evita o dado sair da empresa


**Frameworks**: se precisarmos de realizar algumas tarefas específicas podemos recorrer a frameworks de terceiros (não são da Anthropic):
- rodar o mesmo código em Claude, GPT, Gemini se a empresa exigir
- precisa de um grafo de estado explícito (ex: LangGraph)
- time já usa
- camada a mais que esconde `messages`/`tool_result`, dificulta cache e debug
O ideal é começar sem framework e depois ver se vai ser necessário
-----
## Checkpoint: Agentes

> [!question]- 1. Um agent loop guarda no histórico apenas `resp.content[0].text` de cada resposta do modelo. Na primeira vez que o modelo pede uma tool, a chamada seguinte retorna 400. Qual a causa? (selecione 1)
> a) `max_tokens` insuficiente para o `tool_result`
> b) O bloco `tool_use` foi descartado; o `tool_result` referencia um `tool_use_id` que não existe no histórico
> c) `tool_result` deveria ir com `role: "assistant"`
> d) A tool não está na lista de `tools`
>
> [!success]- Resposta
> **b**. O `content` do assistant vai intacto. Sem o bloco `tool_use`, o `tool_result` fica órfão. `tool_result` é sempre `user`.

> [!question]- 2. Durante o loop, a tool `buscar_pedido` lança exceção por timeout no banco. Qual o tratamento correto? (selecione 1)
> a) Encerrar o loop e retornar erro ao usuário
> b) Devolver `tool_result` com `is_error: true` e a mensagem, deixando o modelo decidir o próximo passo
> c) Retentar a chamada à API com backoff
> d) Remover a tool da lista e chamar de novo
>
> > [!success]- Resposta
> > **b**. Erro na tool não é erro na API. O modelo lê o erro e decide (retentar, outra tool, avisar). Backoff é para 429/5xx da API.

> [!question]- 3. Um agente de suporte às vezes entra em ciclo: chama a mesma tool com o mesmo input dezenas de vezes e a conta da API explode. Qual guardrail resolve? (selecione 1)
> a) Escrever no `system` "não repita chamadas de tool"
> b) Teto de iterações (ou de tokens/tempo) no código do loop
> c) `temperature=0`
> d) Trocar para Opus
>
> > [!success]- Resposta
> > **b**. Guardrail é código, não prompt: instrução pode ser ignorada; o teto segura sempre. `temperature` e modelo não garantem parada.

> [!question]- 4. Uma aplicação gera um contrato, revisa contra checklist e traduz — sempre nessa ordem. O time propõe um agente com as três tools e deixar o modelo decidir. Qual a crítica? (selecione 1)
> a) Agente precisaria de Opus
> b) Passos fixos e previsíveis → workflow (prompt chaining); agente é mais caro, menos previsível e mais difícil de testar sem ganho aqui
> c) Faltaria `max_turns`
> d) Deveria usar orchestrator-workers
>
> > [!success]- Resposta
> > **b**. Comece com o mais simples que resolve. Agente é para quando o caminho depende do que aparece no meio.

> [!question]- 5. Um agente de pesquisa faz 30 buscas web; cada resultado tem ~15 mil tokens e fica no histórico. Nas últimas rodadas ele ignora instruções do `system` e repete buscas já feitas. Qual o diagnóstico e a correção mais adequada? (selecione 1)
> a) Modelo fraco; subir para Opus
> b) Context rot; limpar tool results antigos (context editing) ou mover as buscas para um subagente que devolve só o resumo
> c) Aumentar `max_tokens`
> d) Aumentar a janela de contexto na requisição
>
> > [!success]- Resposta
> > **b**. Janela cheia degrada antes de estourar. Correção é enxugar a janela, não aumentar limites (janela não é configurável; `max_tokens` é saída).

> [!question]- 6. Um orquestrador despacha "pesquise concorrentes" para um subagente e recebe de volta 8 páginas de texto que não usa. O que faltou? (selecione 1)
> a) Dar ao subagente acesso ao histórico do pai
> b) Instrução autossuficiente, com objetivo, restrições e **formato de retorno** definido
> c) Usar o mesmo modelo no pai e no filho
> d) Rodar o subagente em sequência, não em paralelo
>
> > [!success]- Resposta
> > **b**. Subagente não vê o histórico do pai (e não deve — é o ponto do isolamento de contexto). Tudo que ele precisa vai na chamada.

> [!question]- 7. Qual a diferença entre *parallelization* (workflow) e *orchestrator-workers* (agente)? (selecione 1)
> a) Parallelization usa Haiku; orchestrator usa Opus
> b) Em parallelization as tarefas paralelas são definidas no código antes de rodar; no orchestrator o modelo decide em tempo de execução quantos workers e com qual tarefa
> c) Orchestrator é síncrono; parallelization é assíncrona
> d) Não há diferença; são sinônimos
>
> > [!success]- Resposta
> > **b**. Mesma distinção workflow vs agente aplicada ao paralelismo: quem define as partes, o código ou o modelo.

> [!question]- 8. Um agente precisa lembrar, na sessão de amanhã, das preferências que o usuário informou hoje. Como? (selecione 1)
> a) Reenviar o histórico completo de hoje na primeira chamada de amanhã
> b) Memória externa: o agente grava em arquivo/BD (ex.: memory tool, `CLAUDE.md`) e lê de volta quando precisa
> c) Prompt caching com `ttl: "1h"`
> d) A API guarda o contexto por `session_id`
>
> > [!success]- Resposta
> > **b**. API é stateless e cache expira. Memória entre sessões é sempre externa, escrita e lida pelo seu código.

> [!question]- 9. Com context editing (`clear_tool_uses`) ativado, quais afirmações estão corretas? (selecione 2)
> a) A API apaga tool results antigos da entrada daquela chamada antes de o modelo ler
> b) A lista `messages` local da aplicação é modificada pela API
> c) O input cobrado e a atenção do modelo passam a considerar só o contexto enxuto
> d) Elimina a necessidade de reenviar o histórico
>
> > [!success]- Resposta
> > **a, c**. Continua stateless: você reenvia tudo, ela filtra a cada chamada. Sua lista não muda (b) e o histórico continua sendo enviado (d).

> [!question]- 10. Num agente com Agent SDK, você precisa garantir que `rm -rf` nunca seja executado, mesmo em `bypassPermissions`. O que fazer? (selecione 1)
> a) Escrever no `system_prompt` que comandos destrutivos são proibidos
> b) Hook `PreToolUse` para Bash que devolve `deny` ao detectar o padrão (ou `disallowed_tools` com `Bash(rm *)`)
> c) `permission_mode="plan"`
> d) `max_turns=1`
>
> > [!success]- Resposta
> > **b**. Hook é código do SDK, roda sempre, independe do modelo obedecer. `disallowed_tools` e hooks são avaliados antes do `permission_mode`. `plan` não executa nada, não é o pedido.

> [!question]- 11. `permission_mode="default"` e `allowed_tools=["Read", "Grep"]`. O modelo pede Read e depois Bash. O que acontece? (selecione 1)
> a) Ambas perguntam, pois o modo é `default`
> b) Read executa direto; Bash cai na checagem de permissão
> c) Bash é bloqueada, pois não está em `allowed_tools`
> d) Ambas executam direto
>
> > [!success]- Resposta
> > **b**. `allowed_tools` pré-aprova; não remove tools. O que não está na lista segue o `permission_mode`. Bloquear de vez é `disallowed_tools`.

> [!question]- 12. Um chat interno em que o usuário conversa com o agente por vários turnos e às vezes cancela a tarefa no meio. Qual API do SDK usar? (selecione 1)
> a) `query()` chamado a cada mensagem do usuário
> b) `ClaudeSDKClient` (streaming input), que mantém a sessão e suporta `interrupt()`
> c) Batch API
> d) `query()` com `max_turns=1`
>
> > [!success]- Resposta
> > **b**. `query()` abre sessão nova a cada chamada e não interrompe. Conversa contínua e interrupção → `ClaudeSDKClient`.

> [!question]- 13. Uma startup sem time de infraestrutura quer colocar um agente em produção rápido; não há restrição de dados. Qual hospedagem? (selecione 1)
> a) Agent SDK self-hosted em Kubernetes
> b) Managed Agents (Anthropic-hosted): Anthropic roda loop, sandbox e log da sessão
> c) Managed Agents com sandbox self-hosted
> d) LangGraph em servidor próprio
>
> > [!success]- Resposta
> > **b**. Zero infra a operar. Self-hosted (ou sandbox próprio) é para compliance, dados internos ou rede fechada.

> [!question]- 14. Um time vai construir um agente de refatoração de código e discute começar com LangGraph "para ser mais robusto". Qual a avaliação alinhada às práticas da Anthropic? (selecione 1)
> a) Correto; framework é mais robusto que loop próprio
> b) Começar sem framework: Agent SDK (loop, tools de arquivo, permissões e compactação prontos) ou loop simples; framework só se precisar de grafo complexo ou multi-provedor
> c) Usar Managed Agents com LangGraph por cima
> d) Framework é obrigatório para subagentes
>
> > [!success]- Resposta
> > **b**. Framework adiciona camada que esconde `messages`/`tool_result` e dificulta cache e debug. Robustez vem de guardrails, eval e observabilidade, não da camada extra.
