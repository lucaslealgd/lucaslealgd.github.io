## Parcial
Tópicos:
- [[Messages API]]
- [[Aplicações]]
- [[Seleção e otimização de modelos]]
- [[Agentes]]
### Simulado 1: Applications, Models, Agents (EN)
45 min · 20 questões · sem consulta

> [!question] 1. A streaming response contains a `tool_use` block. The app calls `json.loads` on each `partial_json` delta and it fails. Why?
> a) `tool_use` blocks cannot be streamed
> b) The model produced malformed JSON; retry the call
> c) Each `partial_json` is a fragment; only the concatenation up to `content_block_stop` is valid JSON
> d) Tool blocks use `text_delta`, not `input_json_delta`

> [!success]- Resposta
> **c**. Fragmentos de `input_json_delta` não são JSON sozinhos. Acumula e faz o parse no `content_block_stop`.

> [!question] 2. You want the model to return only the first 5 items of a numbered list. Which configuration achieves this?
> a) `stop_sequences=["\n6."]`
> b) `stop_sequences=["\n5."]`
> c) `max_tokens=5`
> d) `stop_sequences=["5."]` and check `stop_reason == "end_turn"`

> [!success]- Resposta
> **a**. O modelo para antes de escrever a string de parada; para manter o item 5, a parada é o início do 6. `max_tokens` corta por quantidade.

> [!question] 3. Before sending a 300-page manual, the app must check whether it fits the context window and estimate cost, without generating output or paying. What should it use?
> a) `messages.create` with `max_tokens=1` and read `usage.input_tokens`
> b) Divide the character count by 4
> c) Read `usage.input_tokens` from `message_start` in a stream
> d) The `count_tokens` endpoint with the same message structure

> [!success]- Resposta
> **d**. Conta com o tokenizador real, sem gerar e sem cobrar. (a) e (c) pagam; (b) é estimativa.

> [!question] 4. A 150-page PDF must be queried by a support assistant. The API rejects the request. What is the right approach?
> a) Split the PDF or pre-process it (extract text, index, send only relevant sections); the per-request page limit is ~100
> b) Switch to Opus, which accepts larger documents
> c) Send it via `source.type = "url"` to bypass the limit
> d) Increase `max_tokens`

> [!success]- Resposta
> **a**. Limite de páginas é por requisição, independe do modelo e da origem. `max_tokens` é saída.

> [!question] 5. A chatbot answer is prose, but responses start with "Sure! Here is your summary:" and the product team wants that preamble gone. No schema is needed. What is the cheapest fix?
> a) `output_format` with `json_schema`
> b) Forced tool use with `tool_choice`
> c) `stop_sequences=["Sure"]`
> d) Prefill the `assistant` turn with the first word of the desired output

> [!success]- Resposta
> **d**. Só evitar preâmbulo, sem schema → prefill. Nativo e tool use são para JSON; `stop_sequences` cortaria a resposta.

> [!question] 6. An extraction pipeline defines one tool whose `input_schema` is the desired JSON, but the model sometimes replies in prose instead of calling it. Which change guarantees the tool is called?
> a) `tool_choice={"type": "auto"}`
> b) `tool_choice={"type": "tool", "name": "<tool_name>"}`
> c) Add "always call the tool" to `system`
> d) `tool_choice={"type": "none"}`

> [!success]- Resposta
> **b**. `tool` + `name` obriga uma tool específica; `any` obriga alguma; `auto` é o padrão que deixa o modelo decidir; `none` proíbe.

> [!question] 7. A streamed call returned HTTP 200, text arrived for a few seconds, then the stream ended without `message_delta` or `message_stop`. What happened and what should the code do?
> a) `max_tokens` was reached; increase it
> b) A `ping` event closed the connection; ignore it
> c) An `error` event (e.g., 529) arrived mid-stream; treat as failure and retry with backoff
> d) The response was cached; read it from `cache_read_input_tokens`

> [!success]- Resposta
> **c**. O status HTTP não muda depois que o stream abre. Corte por `max_tokens` traria `message_delta` com `stop_reason`.

> [!question] 8. A high-volume service wants to slow down *before* hitting 429. Which signal should it read?
> a) The `anthropic-ratelimit-*-remaining` and `-reset` headers on every response
> b) The `retry-after` header
> c) `usage.output_tokens` on every response
> d) `processing_status` of the batch

> [!success]- Resposta
> **a**. Headers de limite vêm em toda resposta e são proativos. `retry-after` só vem com o 429 (reativo).

> [!question] 9. In a long chat with the cache breakpoint on the last history message, every call shows both `cache_creation_input_tokens > 0` and `cache_read_input_tokens > 0`. What does this indicate?
> a) The cache is broken; something before the breakpoint changes each call
> b) The `system` prompt is below the minimum cacheable size
> c) The model was switched between calls
> d) Expected: the previous history is read from cache and only the new turn is written

> [!success]- Resposta
> **d**. É o comportamento do breakpoint móvel em chats longos: lê o velho a 10%, escreve o novo a 125%. Cache quebrado seria leitura zero.

> [!question] 10. Two teams in one organization share an API key. Team A's nightly job exhausts the rate limit and breaks Team B's chatbot. What should be done?
> a) Increase `max_retries` in the chatbot
> b) Move the chatbot to streaming
> c) Separate them into Workspaces, each with its own rate limit and spend limit
> d) Add a prefix to Team A's requests

> [!success]- Resposta
> **c**. Workspaces isolam chave, limite e gasto. Retry não cria capacidade; streaming não afeta rate limit.

> [!question] 11. A payment agent retried a timed-out call and charged the customer twice. Which fix is appropriate?
> a) An idempotency key on the charge action, checking whether it already executed before repeating
> b) Remove retries from the loop
> c) `temperature=0` so the model behaves identically
> d) Move the agent to the Batch API

> [!success]- Resposta
> **a**. A chamada ao modelo pode ser retentada; a ação com efeito colateral precisa de idempotência no código.

> [!question] 12. A legal classifier must be highly reliable, and latency is not a concern. Which pattern raises confidence?
> a) Prompt chaining
> b) Parallelization with voting: run the same task N times and take the majority
> c) Routing with Haiku
> d) Sectioned parallelization to reduce latency

> [!success]- Resposta
> **b**. Votação aumenta confiança; seccionar reduz latência. São as duas formas de parallelization.

> [!question] 13. A developer sets `temperature=0.3` and `top_p=0.9` on the same request to "fine-tune creativity". What is the issue?
> a) `top_p` must be greater than 1
> b) `temperature` must be 1 whenever `top_p` is set
> c) None; both can be combined freely
> d) `temperature` and `top_p`/`top_k` should not be combined; use one or the other

> [!success]- Resposta
> **d**. Regra da Anthropic: ajuste `temperature` ou `top_p`, nunca os dois.

> [!question] 14. With extended thinking enabled, the model replied with `thinking` + `tool_use` (`stop_reason: "tool_use"`). How should the next request be built?
> a) Resend the assistant `content` intact (including the `thinking` block with its signature) plus the `tool_result`
> b) Drop the `thinking` block to save tokens; only `tool_use` matters
> c) Move the `thinking` text into `system`
> d) Start a new conversation; thinking cannot span tool calls

> [!success]- Resposta
> **a**. Rodada no meio (tool use) → `thinking` vai intacto e é conferido pela `signature`. Só rodadas encerradas (`end_turn`) descartam o thinking antigo.

> [!question] 15. A team is starting a new document-summarization feature and asks which model to use. What is the recommended approach?
> a) Start with Opus for quality, then downgrade
> b) Start with Haiku because it is cheapest
> c) Start with Sonnet and an eval set; move to Opus only if quality is insufficient, down to Haiku if quality is surplus and cost matters
> d) Use Fable, the most capable model

> [!success]- Resposta
> **c**. Sonnet + eval é o ponto de partida; sobe ou desce com evidência do eval.

> [!question] 16. Haiku costs $1 (input) / $5 (output) per million tokens. A call uses 20,000 input tokens and 2,000 output tokens. What is the cost, and via Batch?
> a) $0.020 and $0.010
> b) $0.030 and $0.015
> c) $0.030 and $0.030
> d) $0.050 and $0.025

> [!success]- Resposta
> **b**. Input 20.000 × 1/1M = 0,020; output 2.000 × 5/1M = 0,010; total 0,030. Batch = 50% → 0,015.

> [!question] 17. In one response, the model returns three `tool_use` blocks. How should the results be sent back?
> a) Three consecutive `user` messages, one `tool_result` each
> b) One `assistant` message with the three `tool_result` blocks
> c) Only the first `tool_result`; the model will ask for the others
> d) One `user` message containing the three `tool_result` blocks, each with its `tool_use_id`

> [!success]- Resposta
> **d**. Todos os `tool_result` da mesma rodada vão na mesma mensagem `user`, imediatamente após o `assistant` com os `tool_use`. Três `user` seguidos quebra a alternância.

> [!question] 18. An agent incrementally edits the same file over 20 turns, each edit depending on the previous one. A colleague proposes splitting each edit into a subagent. What is the problem?
> a) Subagents lose shared context; a task needing continuous state across steps is better in a single agent
> b) Subagents cannot edit files
> c) Subagents require Opus
> d) None; subagents always reduce cost

> [!success]- Resposta
> **a**. O principal risco de subagente é perda de contexto pai/filho. Edição incremental precisa de contexto contínuo.

> [!question] 19. An Agent SDK job runs unattended in CI, inside a disposable container, and must apply file edits and run shell commands with no human available. Which `permission_mode` fits?
> a) `default`
> b) `plan`
> c) `bypassPermissions`, combined with `disallowed_tools` for anything that must never run
> d) `acceptEdits`, since Bash will be auto-approved too

> [!success]- Resposta
> **c**. Sem humano + sandbox descartável é o caso de `bypassPermissions`. `acceptEdits` só libera edição de arquivo; Bash ainda perguntaria e travaria o job.

> [!question] 20. Using the Anthropic memory tool, the model returns a `tool_use` asking to write a file to the memory directory. Who performs the write?
> a) The API, on Anthropic's servers
> b) The application code, which executes the operation and returns a `tool_result`
> c) The model itself, directly
> d) Nobody; the memory tool is read-only

> [!success]- Resposta
> **b**. Mesma regra de sempre: o modelo só pede, quem executa é o seu código. A API é stateless.