A API do Claude **não tem memória**!
- Se quiser conversa com histórico **você tem que enviar esse histórico** (e tudo que é reenviado **conta como token de entrada**)
## Anatomia da Chamada
### Requisição
4 campos importantes pra **requisição** (os **3 primeiros são obrigatórios**):
- `model`: qual modelo (ex: claude-sonnet-5)
- `max_tokens`: máximo de tokens **que a resposta pode ter**
	- Obrigatório
	- É só sobre a saída (não é o tamanho da janela de contexto)
		- É o **máximo que ele vai poder escrever** pra montar a resposta
			- Se **chegou no limite ele simplesmente corta**
				- Ele avisa no ***stop_reason: "max_tokens"***
				- Também pode ser verificado se `usage.output_tokens` for igual ao `max_tokens`
			- Se esse número for maior do que resta de tokens da janela de contexto, a janela vai limitar a resposta (ou dar erro de validação)
		- **Janela de contexto**: tamanho total que o modelo consegue "enxergar" em uma chamada (system + mensagens + respostas). É uma **propriedade do modelo** e não é configurável
- `messages`: a lista da conversa com `role` e `content`
	- **Sempre começa com o `role` de `user`** e se quiser manter o histórico coloca em `assistant` o que o Claude respondeu
		- **Precisa alternar entre `user` e `assistant` senão dá request inválido!**
	- `content` pode ser uma string simples ou uma lista de blocos (inclusive pode ter diferentes tipos como imagem, tool_use, etc)
- `system`: o prompt do sistema (**não existe role: "system"!**)
	- é **opcional**, sem ele o modelo responde como assistente genérico
### Resposta
Quando a chamada é finalizada com sucesso, a **resposta** vem com os campos:
- `id`: id da resposta (é único), serve para log e rastreio
- `role`: sempre vai ser `assistant`
	- **Para guardar no histórico é só fazer `{"role": "assistant", "content": resp.content}`**
- `model`
- `content`: resposta gerada (é sempre uma **lista de blocos**)
- `stop_reason`: diz o motivo que o processo parou
	- `end_turn`: terminou naturalmente (tudo ok!)
	- `max_tokens`: bateu no limite de tokens e cortou a resposta
		- Vem como 200 (não é erro HTTP)
	- `stop_sequence`: o modelo parou pois encontrou alguma das condições enviadas em `stop_sequences`
		- Por exemplo, pedimos para ele parar no quinto item da lista, então `stop_sequences=["\n6."]` e ele vai retornar os 5 primeiros itens de uma lista e parar com `stop_reason: "stop_sequence"` e `stop_sequence: "\n6."`
			- Ele vai cortar antes da string de parada (ou seja, antes de chegar na sexta linha), por isso usamos o valor 6 e não 5
		- Obs: **max_tokens corta por quantidade** (resposta provavelmente incompleta, é um problema) enquanto **stop_sequence corta por conteúdo** (você definiu, **intencional**)
	- `tool_use`: quer chamar alguma ferramenta
		- Precisa executar a tool e devolver em `tool_result`
	- `refusal`: recusado por segurança (ideal não retentar novamente)
- `usage`: mede o custo
	- `input_tokens`: tudo que mandamos (system + histórico + pergunta)
	- `output_tokens`: o que ele escreveu
	- O **custo** é dado por **input x preço de input + output x preço de output**
		- o **output é bem mais caro** por token
	- **Reporta tokens reais**, contados pelo tokenizador do modelo
		- Existe um endpoint (count_tokens) que pode ser usado para contagem de tokens que devolve só o input_tokens e não cobra
## Streaming
Define se a API vai esperar escrever tudo para poder responder ou se pode ir respondendo aos poucos
- `stream=True`: a **resposta vai vindo em pedaços conforme o modelo gera** (tipo o chat do Claude.ai)
	- Pq usar?
		- **Percepção de latência**: por mais que o tempo total seja o mesmo, para um humano vendo dá uma sensação de que tá respondendo e não de que travou
		- **Timeouts**: vai manter a conexão "viva", já que respostas muito longas podem demorar tanto que estourariam o timeout de HTTP
			- Para `max_tokens` muito alto é obrigatório
			- Se der timeout do HTTP e a conexão cair você paga assim mesmo
		- **Processar no meio**: você pode começar a fazer ações antes do fim do processamento, à medida que for recebendo informações
	- Não traz ganho, a não ser como transporte pra resposta longa (adicionaria complexidade sem nenhum ganho):
		- Processamento em lote sem ninguém olhando
			- Lote sem urgência é feito por Batch API (processa em até 24h e é 50% mais barato)
		- É necessário a resposta completa para continuar

**A resposta vem como uma sequência de eventos**, onde cada evento tem um tipo e um JSON e sempre é na mesma ordem:
```
message_start          → começa a mensagem (id, model, usage.input_tokens)
  content_block_start  → começa um bloco (índice 0, tipo text)
  content_block_delta  → pedaço de texto ("Para ", "consultar", ...)
  content_block_delta
  ...
  content_block_stop   → fechou o bloco 0
message_delta          → stop_reason e usage.output_tokens
message_stop           → acabou
```

Ele sempre vai começar com o `message_start` indicando o início
Depois começa a escrever os blocos, que vão ser as respostas do streaming e podem ser um bloco de texto, outro de tools, etc (os blocos sempre vão ter um `type` como `text`, `tool_use`, `thinking`). Cada bloco tem o seu `_start` e `_stop` indicando seu começo e fim, com índice próprio e na sequência
- A API não vai mandar o texto completo, ela vai mandando pedaços do texto (tudo que for novo desde a última vez que ela mandou), então pra ter o texto completo precisamos unir todos os `content_block_delta`, ex:
	- delta 1: "Para "
	- delta 2: "consultar "
	- delta 3: "o saldo"
	- delta 4: "..."
- Nenhum delta sozinho é a resposta, **a resposta completa é a concatenação de todos os deltas!**
	- Essa concatenação vai depender do tipo de bloco também, quando é um bloco de texto ele seria assim: `{"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "Para "}}`
		- Então é só juntar o `delta.text` e pode ser mostrando à medida que vai montando o texto
	- Já se for um `tool_use` viria como `{"type": "content_block_delta", "index": 1, "delta": {"type": "input_json_delta", "partial_json": "{\"clie"}}`
		- Precisa juntar todos os `delta.partial_json` até chegar no `content_block_stop` e só então vai conseguir parsear o JSON
Ao terminar os blocos, ele finaliza com o `_delta` e `_stop` da mensagem
- o `stop_reason` e o `output_tokens` só existem no `message_delta` (só é visto no final)
	- o `input_tokens` já vem no `message_start`
Tem 2 eventos que podem aparecer em qualquer lugar (pois eles são enviado durante a execução apenas para checagem ou informação de erro)
- `ping`: a API manda de tempos em tempos apenas pra não perder a conexão por inatividade (o código ignora)
- `error`: algo deu errado **depois** que o stream começou (ex: sobrecarga no servidor)
	- O HTTP já respondeu 200 lá no início (quando o stream abriu) e ele não tem como mudar isso depois
	- **O código precisa tratar como falha e retentar**

-----
## Checkpoint 1: Anatomia da chamada e streaming

> [!question] 1. Um chatbot de suporte responde certo na primeira mensagem, mas na segunda "esquece" o que o usuário disse antes. Cada pergunta é enviada como uma única mensagem `user`. Qual é a causa? (selecione 1)
> a) O modelo escolhido não suporta conversas multi-turn
> b) A API é stateless; o histórico precisa ser reenviado em `messages` a cada chamada
> c) Falta enviar o `id` da resposta anterior para a API recuperar o contexto
> d) O `system` prompt precisa conter o histórico da conversa

> [!success]- Resposta
> **b**. A API não guarda nada entre chamadas. Quem mantém o histórico é o cliente, reenviando as mensagens anteriores (user e assistant alternados). O `id` serve só para log; `system` é instrução, não histórico.

> [!question] 2. Uma aplicação pede ao modelo um JSON com dados extraídos de contratos. Em contratos longos, o parser falha porque o JSON vem sem a chave de fechamento. A API retorna HTTP 200. Qual a ação correta? (selecione 1)
> a) Adicionar retry com backoff, pois a API está instável
> b) Trocar para um modelo maior, que gera JSON mais confiável
> c) Verificar `stop_reason == "max_tokens"` e aumentar `max_tokens`
> d) Adicionar `stop_sequences=["}"]` para garantir o fechamento

> [!success]- Resposta
> **c**. Resposta cortada por `max_tokens` vem com 200 e JSON válido porém incompleto. O sinal é `stop_reason: "max_tokens"` (ou `output_tokens` igual ao limite). Retry não resolve, modelo maior não resolve, e `stop_sequences` pararia *antes* de escrever o `}`.

> [!question] 3. Qual requisição abaixo é válida na Messages API? (selecione 1)
> a) `messages=[{"role":"system","content":"Seja breve"},{"role":"user","content":"Oi"}]`
> b) `messages=[{"role":"user","content":"Oi"},{"role":"user","content":"Tudo bem?"}]`
> c) `model="claude-sonnet-5", messages=[{"role":"user","content":"Oi"}]` sem `max_tokens`
> d) `system="Seja breve", max_tokens=512, messages=[{"role":"user","content":"Oi"}]` com `model` definido

> [!success]- Resposta
> **d**. Obrigatórios: `model`, `max_tokens`, `messages`. `system` é campo próprio, não um role. Não existe `role: "system"` (a), roles precisam alternar (b) e `max_tokens` é obrigatório (c).

> [!question] 4. Você quer que o modelo devolva apenas os 3 primeiros itens de uma lista numerada ("1.", "2.", "3."...). Qual configuração faz isso? (selecione 1)
> a) `stop_sequences=["\n3."]`
> b) `stop_sequences=["\n4."]`
> c) `max_tokens=3`
> d) `stop_sequences=["3."]` e verificar `stop_reason == "end_turn"`

> [!success]- Resposta
> **b**. O modelo para antes de escrever a string de parada. Para manter o item 3, a parada é o início do item 4. A resposta virá com `stop_reason: "stop_sequence"` e `stop_sequence: "\n4."`. `max_tokens=3` corta por quantidade, não por conteúdo.

> [!question] 5. Uma empresa precisa classificar 50 mil e-mails antigos por sentimento. Não há urgência e o custo importa. Qual abordagem? (selecione 1)
> a) Chamadas síncronas com `stream=True` para evitar timeout
> b) Batch API, que processa em até 24h com desconto de 50%
> c) Uma única chamada com todos os e-mails no `system` prompt
> d) Chamadas síncronas com `max_tokens` alto e retry

> [!success]- Resposta
> **b**. Lote sem urgência é Batch API: sem conexão aberta, sem timeout, metade do preço. Streaming resolve latência percebida e timeout de respostas longas, não volume. Colocar tudo numa chamada estoura contexto e mistura resultados.

> [!question] 6. Antes de enviar um documento grande, a aplicação precisa saber se ele cabe na janela de contexto e estimar o custo, sem gerar resposta. O que usar? (selecione 1)
> a) Chamar `messages.create` com `max_tokens=1` e ler `usage.input_tokens`
> b) Dividir o número de caracteres por 4
> c) O endpoint `count_tokens`, que recebe a mesma estrutura de mensagens e retorna `input_tokens` sem cobrar
> d) Ler `usage.input_tokens` no evento `message_delta` de um stream

> [!success]- Resposta
> **c**. `count_tokens` conta com o tokenizador real do modelo, sem gerar saída e sem custo. (a) funciona mas paga pela chamada; (b) é estimativa; (d) mistura os eventos — `input_tokens` vem no `message_start`, e ainda assim seria uma chamada paga.

> [!question] 7. Uma UI de chat recebe reclamações de que o assistente "trava" por vários segundos antes de responder. O tempo total de geração é aceitável. O que muda isso? (selecione 1)
> a) Reduzir `max_tokens` para respostas mais curtas
> b) Usar `stream=True` para reduzir o tempo até o primeiro token
> c) Trocar para a Batch API
> d) Aumentar `temperature` para o modelo responder mais rápido

> [!success]- Resposta
> **b**. O problema é percepção de latência, não tempo total. Streaming não acelera a geração, mas o primeiro token chega quase na hora e o texto vai aparecendo. Batch é o oposto (assíncrono); `temperature` não afeta velocidade.

> [!question] 8. Durante um stream, em qual evento a aplicação descobre se a resposta foi cortada por `max_tokens`? (selecione 1)
> a) `message_start`
> b) `content_block_stop`
> c) `message_delta`
> d) `message_stop`

> [!success]- Resposta
> **c**. `stop_reason` e `usage.output_tokens` chegam no `message_delta`, quase no fim. `message_start` traz `input_tokens`; `message_stop` só sinaliza o fim; `content_block_stop` fecha um bloco.

> [!question] 9. Quais afirmações sobre `usage` estão corretas? (selecione 2)
> a) `input_tokens` inclui system prompt, histórico e a mensagem atual
> b) `output_tokens` custa menos por token que `input_tokens`
> c) Os valores são contados pelo tokenizador real do modelo
> d) `usage` só existe em chamadas sem streaming

> [!success]- Resposta
> **a, c**. Output é *mais* caro por token (b errada). Em streaming, `usage` vem dividido: input no `message_start`, output no `message_delta` (d errada).

> [!question] 10. Ao guardar a resposta do modelo no histórico para a próxima chamada, qual é a forma correta? (selecione 1)
> a) `{"role": "assistant", "content": resp.content[0].text}`
> b) `{"role": "assistant", "content": resp.content}`
> c) `{"role": "user", "content": resp.content}`
> d) `{"role": "assistant", "content": resp.id}`

> [!success]- Resposta
> **b**. O `content` do assistant é a lista de blocos inteira. Guardar só o texto funciona hoje, mas quebra quando a resposta tem bloco `tool_use`. Role é sempre `assistant`; `id` não carrega conteúdo.

> [!question] 11. Em um stream, a aplicação recebe `content_block_delta` de um bloco `tool_use` e chama `json.loads` em cada `partial_json`. O parse falha. Por quê? (selecione 1)
> a) `tool_use` não suporta streaming
> b) Cada `partial_json` é um fragmento de string; só o conjunto até o `content_block_stop` forma JSON válido
> c) É preciso usar `text_delta` para blocos de tool
> d) O modelo gerou JSON malformado; retentar a chamada

> [!success]- Resposta
> **b**. Fragmentos de `input_json_delta` não são JSON sozinhos. Acumula e faz o parse no `content_block_stop` do bloco.

> [!question] 12. Uma chamada com streaming retornou HTTP 200, mas o texto veio incompleto e nunca chegou `message_stop`. `stop_reason` não foi recebido. O que aconteceu? (selecione 1)
> a) A resposta foi cortada por `max_tokens`
> b) Chegou um evento `error` no meio do stream; o status HTTP não muda depois que o stream abre
> c) O `ping` interrompeu o stream
> d) Faltou `stop_sequences` na requisição

> [!success]- Resposta
> **b**. Corte por `max_tokens` traria `message_delta` com `stop_reason` e `message_stop`. Sem eles, houve `error` no meio; tratar como falha e retentar.

-----
## Vision
Além de mandar textos, também podemos mandar imagens pro Claude e perguntar algo sobre ela, nesse caso iremos passar no `content` o `"type": "image"`  e todas as informações da imagem da seguinte forma: 
```python
messages=[{
    "role": "user",
    "content": [
        {"type": "image", 
	     "source": 
	        {"type": "base64", "media_type": "image/png", "data": img_b64}
	    },
        {"type": "text", "text": "Qual o valor total desta fatura?"},
    ],
}]
```
Pro modelo vai ser como se a gente tivesse colado a imagem no chat e escrito embaixo

As imagens sempre vão ser com `"role": "user"`
- O modelo não gera imagens, a resposta sempre vai ser blocos de texto
Pro `"type": "text"` a gente passa em `text` o que queremos "falar" com ele, já na imagem vamos passar em `source` a informação de onde vem essa imagem, que pode receber 3 valores em `type`:
- `base64`: você vai ler o arquivo, converter pra base64 e mandar o bytes dentro do JSON
	- Precisa dizer o `media_type`, que pode ser `image/png`, `image/jpeg`, etc
	- É o mais comum quando a imagem tá no servidor
- `url`: manda a url em `url` e a API baixa (somente se a URL for pública)
- `file`: o arquivo foi carregado pela **Files API** e temos o `file_id` dele
	- Útil se a mesma imagem for ser usada em várias chamadas (evita reenviar os bytes toda vez)

Formatos aceitos: JPEG, PNG, GIF, WebP

Dá pra mandar várias imagens em uma mesma mensagem (e até pedir pra comparar entre elas)
- O ideal é que o texto venha depois das imagens

- **IMPORTANTE!**
	- A imagem vai virar token de entrada, como texto, e quanto maior a imagem maior o custo (**imagem custa por pixel**)
		- O cálculo é aproximadamente **(largura x altura) / 750** (ou **pixels / 750**)
			- **1568x1568 (o máximo útil)** dá ~1.600 tokens
				- **Acima disso (1568 pixels) a API redimensiona para baixo sozinha**
					- Mandar 4000x3000 não melhora a leitura, só gasta upload e tempo
		- Se **custo importa: redimensionar antes de mandar**

O PDF possui `"type": "document"` e a mesma estrutura de `source` da imagem (com `"media_type": "application/pdf"`)
- A API faz **2 coisas**: extrai o texto de cada página **E** renderiza cada página como imagem
	- O custo é dobrado (paga os tokens extraídos + ~1.500 tokens por página pela imagem)
	- PDF de 20 páginas: ~30 mil tokens
	- Limite de umas 100 páginas por requisição
	- Pra PDF grande consultado várias vezes: `file` + prompt caching

## Structured output
O modelo, por padrão, vai gerar a resposta em texto. Para conseguir garantir que o formato será como precisamos vamos usar as técnicas de Structured output
1. **Pedir a formatação no prompt:** 
No `system` vamos colocar algo como "responda apenas com JSON com os campos A, B e C" e talvez dê um exemplo
- Não é garantia pois o modelo pode desviar 
Também podemos usar o **prefill**, que é basicamente colocar uma mensagem na role de "assistant" que já vai começar com `"{"` (como o modelo vai continuar a partir daí, a resposta já começa com { obrigatoriamente)
```python
messages=[
    {"role": "user", "content": "Extraia nome e valor desta fatura: ..."},
    {"role": "assistant", "content": "{"},
]
```

2. **Tool use como schema:**
Definimos uma "ferramenta" com um `input_schema` sendo um JSON Schema e força o modelo a chamá-la com `tool_choice`
- O modelo nem precisa executar nada, o que queremos é o input dessa ferramenta mesmo
- `tool_choice` é o que permite a gente obrigar o modelo a chamar uma tool
	- `tool_choice`: `auto` (padrão, decide), `any` (obriga alguma), `tool` + `name` (obriga uma específica), `none` (proíbe)

3. **Saída estruturada de forma nativa:**
Também é possível passar um JSON Schema direto na requisição (`output_format` do tipo `json_schema`) e a API vai garantir que a saída vai ser exatamente o que foi pedido
- É o jeito recomendado hoje, quando disponível para o modelo (nem todo modelo possui)
- Nem todo JSON Schema é aceito
- Se o Schema muda toda hora, isso pode pesar (prefill é o mais barato se queremos evitar apenas preâmbulo (aquelas conversinhas antes do que pediu tipo "claro, aqui está seu texto", "obrigado") em texto, sem schema)
- **Devolve apenas o JSON** (se quiser explicação não dá pra usar)

***Decisão:***
- preciso do JSON (apenas isso) e no formato específico
	1. `output_format` nativo
	2. tool use forçado com `tool_choice`
- **explicação** + dados estruturados:
	1. tool use (**nativo não devolve explicação**): a resposta vem um `text` (explicação) e um bloco `tool_use` (JSON)
- só evitar aquelas mensagens de "Claro, aqui está seu texto":
	1. prefill com `{` (é o mais "barato" mas não garante que os campos estejam certos nem que termine corretamente) 

É importante deixar claro que mesmo com o Schema não vamos confiar cegamente no JSON retornado, então podemos fazer algumas coisas como:
- Fazer o **parse com tratamento**: fazer o `json.loads` dentro de um `try/except`
	- Gastaria 1 linha pra fazer isso
- **Validação de conteúdo**: o Schema garante a forma, não o conteúdo.
	- Fazer as validações necessárias para garantir que as informações retornadas pela API estão corretas (a data existe, etc)
- **Verificar o `max_tokens`**: o JSON vai vir correto **se o modelo terminar**, se cortar antes viria errado mesmo se a gente fizer tudo certo na requisição
	- Verificar o `stop_reason` antes do parse

Verificando que o JSON veio errado, podemos retentar mandando o erro tipo "veio errado com tal erro, tenta novamente" (limitar as tentativas pra não entrar em loop e não gastar mais do que deve)
## Erros
Se a chamada falhar, além do status 4xx ou 5xx vem o `error.type` e `error.message`
- Erros **4xx são problemas nosso** e precisamos **ajustar antes de enviar novamente** (exceto o [[#Erro 429]])
- Erros **5xx podem ser retentados com backoff exponencial**
	- O 529 pode chegar como evento `error` no meio de um stream

| HTTP | `error.type`            | Causa                                                                                    | Retentar?                                        |
| ---- | ----------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 400  | `invalid_request_error` | requisição inválida: campo faltando, roles não alternam, `max_tokens` acima do permitido | não, corrige o código                            |
| 401  | `authentication_error`  | chave errada ou ausente                                                                  | não                                              |
| 403  | `permission_error`      | chave válida mas sem permissão pro recurso                                               | não                                              |
| 404  | `not_found_error`       | modelo ou recurso não existe (nome do modelo errado)                                     | não                                              |
| 413  | `request_too_large`     | corpo da requisição acima do limite                                                      | não, reduz                                       |
| 429  | `rate_limit_error`      | passou do limite de requisições ou tokens por minuto                                     | sim, com backoff; respeitar header `retry-after` |
| 500  | `api_error`             | erro interno da Anthropic                                                                | sim, com backoff                                 |
| 529  | `overloaded_error`      | API sobrecarregada                                                                       | sim, com backoff                                 |
- Mesmo se vier **200**, duas condições ainda são erro: 
	- `stop_reason: "max_tokens"` -> cortou devido ao limite de tokens
	- `stop_reason: "refusal"` -> recusou por segurança (ideal não tentar novamente)

### Erro 429
É o `rate_limit_error`
Acontece quando qualquer um dos limites (**rate limits**) são excedidos, que podem ser:
- **RPM** (requests per minute): quantas chamadas podem ser feitas por minuto.
- **ITPM** (input tokens per minute): quantidade de tokens de entrada por minuto.
- **OTPM** (output tokens per minute): quantidade de tokens de saída por minuto.

**Dependem da organização e são definidos por tier (nível) e modelo**
- O tier começa em 1 e sobe à medida que se gasta dinheiro na API

Também existe um **spend limit** (limite de gastos) mensal por organização que é o teto financeiro (não de velocidade)
- Chegar nesse limite vai dar erro até o mês seguinte ou até esse valor ser aumentado

O que fazer:
1. **Backoff com `retry-after`**
	- Quando chega a resposta 429 ela vem com o **header `retry-after` (em segundos)**. Esse é o mínimo de tempo que devemos esperar
2. **Ler os headers de limite**
	- Todas as respostas vão vir com as informações abaixo, podemos usar isso para ajustar o consumo antes de bater o limite e dar 429
		- `anthropic-ratelimit-requests-remaining`: quantas requisições restam
		- `anthropic-ratelimit-tokens-remaining`: quantos tokens restam
		- `...-reset`: quando vai resetar aquele limite (tanto pra request quanto pros 2 tipos de token)
3. **Reduzir tokens**
	- Se o gargalo for input tokens (ITPM), podemos usar [[#Prompt caching]] pois **tokens lidos do cache não contam pro ITPM** (na maioria dos modelos)
4. **Trocar por Batch**
	- Batch tem limites separados e muito mais altos (porém não responde na hora)
5. **Pedir aumento de tier**
	- ai seria mais com a organização

## Checkpoint 2: Vision, Structured output e Erros

> [!question] 1. Uma aplicação envia fotos de faturas em 4000×3000 pixels para extração de dados. A latência está alta e o custo por chamada também. O que fazer? (selecione 1)
> a) Trocar para `source.type = "url"` para reduzir o tamanho do payload
> b) Redimensionar as imagens antes de enviar; acima de ~1568px a API reduz sozinha e não ganha precisão
> c) Enviar a imagem em uma mensagem `assistant` para não contar como input
> d) Usar `max_tokens` menor

> [!success]- Resposta
> **b**. Imagem custa ≈ pixels/750 e acima do máximo útil a API redimensiona de qualquer forma. `url` só muda de onde a API baixa; imagem só entra em `user`; `max_tokens` é saída.

> [!question] 2. Um mesmo manual em PDF de 80 páginas é consultado centenas de vezes por dia. Hoje ele é enviado em `base64` em toda chamada. O que reduz o payload sem mudar o resultado? (selecione 1)
> a) Enviar só a primeira página
> b) Subir uma vez pela Files API e referenciar por `file_id` (`source.type = "file"`)
> c) Converter o PDF em texto puro manualmente e enviar como bloco `text`
> d) Usar `source.type = "url"` apontando para um arquivo na rede interna

> [!success]- Resposta
> **b**. `file` evita reenviar os bytes a cada chamada. Só a primeira página perde conteúdo; texto puro perde tabelas e layout que o `document` preserva; `url` precisa ser pública.

> [!question] 3. Sobre PDFs enviados como bloco `document`, quais afirmações estão corretas? (selecione 2)
> a) A API extrai o texto e também renderiza cada página como imagem
> b) O custo é apenas o dos tokens do texto extraído
> c) `source` aceita `base64`, `url` e `file`
> d) O modelo pode devolver um PDF anotado na resposta

> [!success]- Resposta
> **a, c**. Paga texto + imagem por página (b errada). O modelo só lê; a resposta é texto (d errada).

> [!question] 4. A resposta precisa ser sempre um JSON válido em um schema fixo, sem texto ao redor, para alimentar um pipeline. O modelo em uso suporta saída estruturada nativa. Qual a melhor opção? (selecione 1)
> a) Pedir no `system` "responda apenas com JSON"
> b) Prefill com `{` na última mensagem `assistant`
> c) `output_format` com `json_schema`
> d) `stop_sequences=["}"]`

> [!success]- Resposta
> **c**. "Garantir formato" com nativo disponível → `output_format`. Prompt e prefill não garantem; `stop_sequences` cortaria antes do `}`.

> [!question] 5. Você quer que o modelo explique em prosa a análise de um contrato e também devolva os campos extraídos em JSON, na mesma resposta. O que usar? (selecione 1)
> a) `output_format` nativo, que devolve texto e JSON
> b) Tool use com `tool_choice`, obtendo um bloco `text` e um bloco `tool_use`
> c) Duas chamadas: uma para o texto, outra para o JSON, sempre
> d) Prefill com `{` e pedir a explicação dentro de um campo do JSON

> [!success]- Resposta
> **b**. Nativo devolve só o JSON. Tool use permite `text` + `tool_use` numa resposta. Duas chamadas funcionam, mas não são "a melhor opção".

> [!question] 6. Uma aplicação com `output_format` nativo recebe esporadicamente JSON incompleto. O que verificar primeiro? (selecione 1)
> a) Se o schema está no formato correto
> b) Se `stop_reason == "max_tokens"` — schema garante formato só se o modelo terminar
> c) Se `temperature` está em 0
> d) Se a chave de API tem permissão para structured output

> [!success]- Resposta
> **b**. Schema restringe a geração, não o tamanho. Cortou por `max_tokens` → JSON válido porém incompleto. Checar `stop_reason` antes do parse.

> [!question] 7. Quais erros abaixo devem ser retentados com backoff exponencial? (selecione 2)
> a) 400 `invalid_request_error`
> b) 429 `rate_limit_error`
> c) 401 `authentication_error`
> d) 529 `overloaded_error`

> [!success]- Resposta
> **b, d**. 429, 500 e 529 são temporários. 400 e 401 são problema da requisição; retentar igual repete o erro.

> [!question] 8. Uma aplicação recebe 429 nos horários de pico. As respostas não precisam ser imediatas — são relatórios gerados à noite. Qual a ação mais eficaz? (selecione 1)
> a) Retentar imediatamente em loop até passar
> b) Migrar para a Batch API, que tem limites próprios e mais altos
> c) Aumentar `max_tokens`
> d) Reduzir `temperature`

> [!success]- Resposta
> **b**. Sem urgência → Batch: limites separados, sem conexão aberta, metade do preço. Retry em loop piora a sobrecarga; `max_tokens` e `temperature` não afetam rate limit.

> [!question] 9. Como uma aplicação pode desacelerar antes de receber um 429? (selecione 1)
> a) Lendo `usage.input_tokens` em cada resposta
> b) Lendo os headers `anthropic-ratelimit-*-remaining` e `-reset` em cada resposta
> c) Chamando `count_tokens` antes de cada requisição
> d) Esperando o header `retry-after`

> [!success]- Resposta
> **b**. Os headers de rate limit vêm em toda resposta e dizem quanto sobra e quando zera. `retry-after` só chega junto com o 429, é reativo.
## Prompt caching
Lembrando: **API não tem memória, tudo precisa ser reenviado em cada requisição**
Se tem um `system` de 5 mil tokens (instruções, políticas, exemplos) cada requisição envia novamente esses 5k tokens
- Além disso o modelo reprocessa tudo do 0 toda vez: custa latência

O **Prompt caching** serve pra **marcar um trecho do prompt como "isso vai se repetir"** e a **API guardar o processamento** dele e **nas próximas chamadas ela reaproveitar ao invés de reprocessar**
- **A API não guarda a conversa**, ela não vai lembrar o que foi perguntado antes e vamos continuar precisando mandar o prompt inteiro em toda chamada
- O  que **ela vai guardar** no servidor dela é **o resultado do processamento** de um trecho
	- Ao ler 5 mil tokens do system prompt ele faz um trabalho pesado de cálculo sobre aquele texto. Na próxima vez ele não precisa refazer esse trabalho pq isso vai estar guardado por alguns minutos então a API pula essa parte
		- Ela **guarda do lado dela**
- Nesse exemplo, precisamos mandar o `system` exatamente igual pra ela reconhecer e usar o prompt caching
- A leitura do cache das outras vezes custa **~10% do preço do input normal** (já compensa a partir de 2 chamadas)

Importante:
- O cache **é por prefixo**
	- Ela vai comparar o início da requisição com o que está guardado e se for igual é lido do cache (o que vier depois é processado normal)
	- **A ordem importa!** O conteúdo cacheável precisa estar no começo
		- É fixa: **tools → system → messages**
- **Breakpoints**
	- Marcamos onde termina (tudo antes daquilo entra no cache)
		- Qualquer mudança antes do breakpoint vai quebrar o cache
			- Por isso o conteúdo variável (pergunta do usuário, data de hoje) vai **depois** do breakpoint
			- Se tiver algo que muda em toda chamada (id, ordem das tools) move pra depois do breakpoint
				- Acompanhar no `cache_creation`
- Trocar o modelo também quebra o cache
- Na primeira chamada a API vai escrever o cache
	- **Custa ~25% a mais** que o input normal
- **Expira em 5 minutos sem uso** (é renovado a cada leitura)
	- `cache_control` aceita `"ttl": "1h"` pra expirar em 1 hora, porém o custo é maior
- **Tem um tamanho mínimo** de cerca de 1 a 2 mil tokens dependendo do modelo
	- Abaixo disso vai ser ignorado (sem erro)

Ele sempre vai no último bloco que desejamos cachear, que geralmente é o `system` e é sempre escrito como `"cache_control": {"type": "ephemeral"}` (só tem a opção de ephemeral)
```python
system=[
    {"type": "text", "text": instrucoes_longas, "cache_control": {"type": "ephemeral"}},
]
```
Tudo até esse bloco entra no cache

**Importante:**
- Pode ter **até 4 breakpoints** em uma requisição
	- Pode cachear em camadas, como um pra tools, outro pra system, outro pra mensagem
		- É uma opção se uma tools é compartilhada entre diferentes processos, um system entre outros processos e a mensagem é mais específica
			- Então todo mundo que usa essa tool já pega esse cache da tool, ai quem usa o system paga o cache desse system específico e assim por diante
- Em **chats longos** podemos colocar o **breakpoint na última mensagem do histórico**
	- Tudo que já tiver sido lido não precisa ser reprocessado e só vai processar agora o que vier de novo
	- Realmente vai gastar mais pra cada mensagem nova (125%) só que todo o resto que já foi cacheado vai gastar só 10%, então o custo total é muito menor
	- Ex:
		- system + histórico até "A conta 123"     → já estava no cache → lido a 10%
		- "Saldo R$ 500" + "E a outra?"             → novo → escrito a 125%
- Documentos / PDF consultado várias vezes: documento no início, cache nele e pergunta depois

Pra **saber se funcionou**:
- O `usage` vai ganhar 2 campos:
	- `cache_creation_input_tokens`: quantos tokens foram escritos no cache nessa chamada (25% mais caro)
		- Geralmente é > 0 na primeira chamada e 0 nas demais
			- É > 0 nas demais quando a gente tá fazendo o processo dos chats longos
		- Se tiver > 0 nas demais pode ser cache quebrado
	- `cache_read_input_tokens`: quantos tokens foram lidos no cache (10% do preço)
		- Geralmente é 0 na primeira e > 0 nas demais
## Batch
**Muitas requisições e não há urgência de resposta**
- Manda tudo de uma vez para o endpoint `/v1/messages/batches` com um `custom_id` para identificação
- A Anthropic vai processar quando tiver capacidade dentro das próximas 24h (na prática costuma ser bem menos). Se passar de 24h é marcado como expirado e não é cobrado
- É **assíncrono** e você pode consultar o status através do `batch_id` (quando passar de `in_progress` para `ended` indica que terminou)
- **50% de desconto** comparado ao processo normal
- Tem **limite bem mais alto**
- **Resultado individual**: cada item enviado é processado de forma isolada e o erro em um não afeta os outros
	- Status: `succeeded`, `errored`, `canceled` ou `expired`
	- Os resultados são enviados com um `custom_id` que deve ser usado para relacionar a resposta com o que foi enviado (a ordem de saída não é garantida)
- **Disponível por 29 dias**
## SDK
- **API** é REST
	- endpoint: `POST /v1/messages` com headers `x-api-key` e `anthropic-version`
	- Chamando direto você monta headers, serializa JSON, trata erro HTTP, faz retry e interpreta os eventos do streaming um a um
- No **SDK** é a **biblioteca oficial** que monta a requisição pra gente
	- lê `ANTHROPIC_API_KEY` do ambiente
	- **retry automático com backoff** em 429 e 5xx (2 tentativas por padrão)
		- backoff: intervalo de espera entre uma tentativa que falhou e a próxima, **crescendo a cada falha** (a cada tentativa dobra)
	- timeout configurado
	- resposta como objeto tipado (`resp.content[0].text`)
	- helpers: `messages.create()`, `messages.stream()`, `count_tokens()`

Para começar a usar precisamos **configurar o Client**
```python
client = anthropic.Anthropic(
    api_key="...",       # opcional, padrão é ANTHROPIC_API_KEY do ambiente
    max_retries=2,       # padrão 2; 0 desliga o retry
    timeout=60.0,        # segundos
)
```
- Se quiser a versão **assíncrona** usar `AsyncAnthropic` (para apps que fazem **muitas chamadas em paralelo**) e usar `await client.messages.create....`

**Helpers:**
- `client.messages.create(...)`: chamada padrão, enviamos `model`, `max_tokens`, `messages` igual na API e ele devolve um objeto `Message` igual vimos acima
- `client.messages.stream(...)`: chamada via streaming, devolve `text_stream` (pedações do texto) e no final o `get_final_message()` devolve o mesmo `Message`
	- Se der `error` no meio vira exceção
- `client.messages.count_tokens(...)`: conta tokens sem gerar nada e sem gastar, devolve o `input_tokens`
	- Bom pra estimar se vai "caber" nos limites
- `client.messages.batches.create(requests=[...])`: cria um batch onde cda item na lista vai ser `{"custom_id": "...", "params": {...}}`. Devolve o objeto do batch com `id` e `processing_status`
	- O `params` é exatamente o que passaríamos pro create
	- `client.messages.batches.retrieve(batch_id)`: consulta o status atual
		- Chama de tempos em tempos até virar `ended`
	- `client.messages.batches.results(batch_id)`: itera os resultados um a um
		- Cada um tem o `custom_id` e um `result` com `type` (`succeeded`, `errored`, `canceled`, `expired`) e, se sucesso, o `Message`
- `client.files.upload(...)`: sobe arquivo pra Files API, devolve o `file_id` que você usa em `source.type = "file"`
	- Sobe 1 única vez e referencia ele
	- Depois de subir o arquivo fica contando pro limite de armazenamento da organização (boa prática apagar quando não vai ser mais usado usando `files.delete(id)`)
		- Não há cobrança por manter o arquivo, só um teto por organização
		- Se for arquivo de referência (manual, template) pode deixar
	- **Files API é pra reuso**, se for usar 1 única vez usa `base64`

**Exceções**
Os erros vão virar exceções dentro de `anthropic.APIError`

| HTTP              | Exceção                                  |
| ----------------- | ---------------------------------------- |
| 400               | `BadRequestError`                        |
| 401               | `AuthenticationError`                    |
| 403               | `PermissionDeniedError`                  |
| 404               | `NotFoundError`                          |
| 429               | `RateLimitError`                         |
| 5xx / 529         | `InternalServerError`                    |
| conexão / timeout | `APIConnectionError` / `APITimeoutError` |

> [!important]
> **Importante!: Nos erros `429` e `5xx` ele já faz as retentativas (o SDK faz o retry sozinho!) e só retorna a exceção se excede o limite definido!**

-----
## Checkpoint 3: Prompt caching, Batch e SDK

> [!question] 1. Um chatbot envia o mesmo `system` de 8 mil tokens em todas as chamadas, centenas de vezes por hora. O que reduz custo e latência sem mudar o comportamento? (selecione 1)
> a) Mover o `system` para a primeira mensagem `user`
> b) Adicionar `cache_control: {"type": "ephemeral"}` no último bloco do `system`
> c) Reduzir `max_tokens`
> d) Usar `stop_sequences` para encurtar a resposta

> [!success]- Resposta
> **b**. Prefixo grande e repetido dentro de 5 minutos é o caso clássico de caching: leitura a ~10% do preço e menos tempo até o primeiro token. As outras opções não tocam no custo de input repetido.

> [!question] 2. Após ativar caching, o `usage` mostra `cache_creation_input_tokens` alto e `cache_read_input_tokens` igual a zero em todas as chamadas. Qual a causa mais provável? (selecione 1)
> a) O cache expirou porque as chamadas são espaçadas em mais de 5 minutos
> b) Algo antes do breakpoint muda a cada chamada (data, id do usuário, ordem das tools)
> c) O `system` é grande demais para ser cacheado
> d) `cache_control` só funciona em `messages`, não em `system`

> [!success]- Resposta
> **b**. Escrita em toda chamada e leitura zero = o prefixo nunca bate. Se fosse expiração, o cenário diria que as chamadas são espaçadas. Não há tamanho máximo, só mínimo; `system` é o lugar mais comum do breakpoint.

> [!question] 3. Um job roda uma vez a cada 40 minutos, sempre com o mesmo documento de 30 mil tokens no início do prompt. Como usar caching de forma útil? (selecione 1)
> a) `cache_control: {"type": "ephemeral"}` padrão
> b) `cache_control: {"type": "ephemeral", "ttl": "1h"}`
> c) Caching não ajuda; usar Batch
> d) Colocar o documento depois da pergunta do usuário

> [!success]- Resposta
> **b**. Intervalo maior que 5 min e menor que 1 h → `ttl: "1h"`. Com o padrão o cache expiraria entre as chamadas. Documento depois da pergunta quebra o prefixo.

> [!question] 4. Quais afirmações sobre prompt caching estão corretas? (selecione 2)
> a) A ordem do prefixo é `tools → system → messages`
> b) Trocar o modelo mantém o cache, pois o texto é o mesmo
> c) Prefixo abaixo do tamanho mínimo retorna erro 400
> d) Em conversas longas, o breakpoint na última mensagem do histórico reaproveita tudo até o turno anterior

> [!success]- Resposta
> **a, d**. Trocar o modelo invalida o cache (b errada). Prefixo pequeno é ignorado silenciosamente, sem erro (c errada).

> [!question] 5. Uma empresa precisa gerar resumos de 200 mil documentos até o fim da semana, com o menor custo possível. O que usar? (selecione 1)
> a) Chamadas síncronas em paralelo com `AsyncAnthropic`
> b) Batch API, com prompt caching no `system` compartilhado
> c) Streaming para evitar timeout
> d) Uma chamada por dia com todos os documentos concatenados

> [!success]- Resposta
> **b**. Volume alto, sem urgência de minutos, custo importa → Batch (50% off) e o desconto do cache soma. Síncrono em paralelo bate rate limit; concatenar tudo estoura contexto.

> [!question] 6. Em um batch de 10 mil itens, 12 vieram com `result.type = "errored"`. O que isso significa para os outros 9.988? (selecione 1)
> a) O batch inteiro é marcado como falho e precisa ser reenviado
> b) Nada; cada item é processado isoladamente e os demais estão `succeeded`
> c) Os itens após o primeiro erro não são processados
> d) Os 12 são retentados automaticamente pela Anthropic

> [!success]- Resposta
> **b**. Resultado é individual por item; um erro não afeta os outros. Retentar os 12 é responsabilidade da aplicação, cruzando pelo `custom_id`.

> [!question] 7. Ao ler os resultados de um batch, a aplicação assume que a ordem de saída é a mesma da entrada e associa por posição na lista. Qual o problema? (selecione 1)
> a) Nenhum; a ordem é garantida
> b) A ordem de saída não é garantida; deve-se associar pelo `custom_id`
> c) Os resultados vêm ordenados por `processing_status`
> d) Os resultados só podem ser lidos via streaming

> [!success]- Resposta
> **b**. É para isso que existe o `custom_id`: a Anthropic devolve cada resultado com ele, e a ordem pode diferir da enviada.

> [!question] 8. Uma aplicação usa o SDK Python com configuração padrão e mesmo assim recebe `RateLimitError` no `except` em horário de pico. O que isso indica e qual a correção mais adequada? (selecione 1)
> a) O SDK não faz retry em 429; implementar backoff manual
> b) O SDK já retentou 2 vezes com backoff e esgotou; aumentar `max_retries` ou reduzir carga (cache, Batch)
> c) A chave de API está inválida
> d) `timeout` está baixo demais

> [!success]- Resposta
> **b**. A exceção só chega ao código depois que as tentativas do SDK acabaram. Retry manual por cima duplica o que o SDK já faz; a solução é mais tentativas ou menos carga.

> [!question] 9. Um arquivo PDF é usado em uma única chamada e nunca mais. Qual a forma mais simples de enviá-lo? (selecione 1)
> a) `files.upload()` e referenciar por `file_id`
> b) `source.type = "base64"` direto na mensagem
> c) `files.upload()` seguido de `files.delete()` na mesma execução
> d) `source.type = "url"` com link temporário

> [!success]- Resposta
> **b**. Files API é para reuso. Uso único → `base64`, sem deixar arquivo armazenado nem passo extra.

> [!question] 10. Qual helper do SDK devolve o objeto `Message` completo (com `content`, `stop_reason` e `usage`) após uma chamada com streaming? (selecione 1)
> a) `stream.text_stream`
> b) `stream.get_final_message()`
> c) `client.messages.count_tokens()`
> d) `client.messages.batches.results()`

> [!success]- Resposta
> **b**. `text_stream` entrega só pedaços de texto; `get_final_message()` monta o `Message` igual ao do `create`.