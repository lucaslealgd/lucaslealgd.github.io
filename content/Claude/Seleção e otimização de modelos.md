## LLM
O que é um LLM?
Um LLM (Large Language Model) é um modelo **treinado pra prever o próximo token**: dado um texto, ele vai tentar **prever o próximo *pedaço* de texto** que melhor se adeque ali e vai fazendo isso pedaço por pedaço até que ele entenda que está ok e finalize (`end_turn`) ou chegue no limite (`max_tokens`)
- Esse ***pedaço*** é exatamente o ***token***! (que em português não chega a ser nem 1 palavra)
	- 1 token ~ 4 chars (português gasta mais por causa de acentuação)
	- Símbolos como `{`, `"` e `:` também podem ser tokens
	- Tudo é token então **tudo tem custo**!
		- O token é a unidade de tudo (custo, limite, contagem)
	- A janela de contexto é em tokens
	- O modelo **não vai ler caracteres, ele vê tokens**
		- Por isso tarefas simples como contar letras, inverter strings ou aritmética sõa ruins pra ele -> por isso usar a parte determinística no código
			- Pensa em como o texto chega no modelo. Você escreve "morango", mas ele não recebe m-o-r-a-n-g-o; recebe algo como `[mor][ango]` — dois tokens, cada um um número inteiro numa tabela. Ele nunca vê a letra "r" como unidade; vê o token 48213 e o token 9012.
				- Cada token tem um id fixo no vocabulário do modelo e é isso que o modelo usa
				- Na saída o modelo produz ids e o tokenizador converte de volta em texto
			- Agora pede "quantos R tem em morango?". Pra responder, ele precisaria abrir os tokens e olhar letra por letra, e ele não tem essa operação. O que ele faz é _estimar_ a resposta pelo que viu no treinamento — e erra com frequência, porque nunca aprendeu a contar letras, aprendeu a prever texto.
			- Mesma coisa com: 
				- **Inverter uma string**: "ognarom" quase nunca apareceu no treinamento como reverso de "morango"; ele chuta.
				- **Aritmética exata**: "4.827 × 391" é uma sequência de tokens de dígitos. Ele aprendeu padrões de multiplicação, não o algoritmo. Acerta as fáceis, erra as grandes, e erra com confiança.
				- **Validar CPF, checar se uma data existe, somar uma coluna**: tudo regra fixa que ele aproxima em vez de executar.
	- A divisão é do tokenizador, não nossa (não controlamos)
		- Usamos o `count_tokens` se quisermos calcular
- Como ele é treinado para **prever o próximo token**, por mais que pra gente pareça que ele está tentando manter uma conversa no fundo ele só busca o que melhor vai se adequar naquele conjunto de informações que ele teve até agora e é por isso que às vezes a conversa não faz sentido, que ele manda dados falsos e até inventa coisas (pois a previsão dele indicou que esse seria o melhor resultado e só isso, independente de verdade ou de qualquer outra coisa)
	- Quando ele manda dados falsos / inventa: **alucinação** ("o modelo prevê textos, não verifica fatos)
Esse modelo foi treinado com muitos dados até uma data (**knowledge cutoff**) e ele não sabe nada depois disso (a menos que a gente passe no prompt)
- Ele não consulta nada em tempo real nem por conta própria, se precisar de dado atual é tool ou contexto
- Quando usamos o app por exemplo e pedimos dado atualizados o modelo não busca nada sozinho, ele tem uma ferramenta de busca pro modelo que vai perceber que não sabe e responder com uma `tool_use` de busca, então o app busca na web e volta com o `tool_result` que vai pro contexto e é usado para escrever a resposta
- Formas de inserir conhecimento:
	- prompt / contexto: primeiro a tentar
	- RAG: não cabe ou muda muito
	- fine tuning: retreina o modelo, muda o estilo
		- não adiciona conhecimento confiável
		- **não existe na API do Claude!**
## O que controla a geração?
A cada passo o modelo não escolhe um token, ele vai calcular a **probabilidade para cada token do vocabulário**
Os parâmetros que vão escolher como decidir a partir dessa lista:
- `temperature` (0 a 1, sendo o padrão 1): o quanto de aleatoriedade é aceito
	- 0 pega sempre o mais provável (quase determinístico)
		- melhor para tarefas com respostas mais certas como extração, classificação, JSON, código
		- **nunca é determinístico** pois há detalhes de hardware e paralelismo que fazem com que o cálculo nunca seja idêntico bit a bit entre as chamadas
			- Se quiser determinístico precisa cachear a resposta ou fazer no código
	- 1 sorteia proporcional às probabilidades (tokens menos prováveis aparecem, mas com menos frequência)
		- podemos ir colocando cada vez mais alto à medida que queremos adicionar "criatividade" ao nosso resultado (variações de textos, brainstorm)
- `top_p` (nucleus sampling): considera o menor conjunto de tokens cuja probabilidade acumulada chega a `p`
	- Retira os menos prováveis ("corta a cauda")
	- Usar isso **OU** `temperature`, nunca os 2
		- Não se combina `temperature` com nenhum dos 2 (p ou k)
- `top_k`: considera os `k` tokens mais prováveis (bruto e raramente preciso)
## Janela de contexto
Janela é a entrada + saída, em tokens
Alguns conceitos importantes:
1. **Lost in the middle**: o modelo foca mais no início e no fim e coisas no meio acabam sendo ignoradas
	- Colocar o importante no início e repetir no final se necessário
	- Para bases muito grandes usar RAG
2. **Mais contexto gera custo (e latência)** que cresce linearmente com o input, além disso a qualidade pode cair devido a ruído
	- Envia só o que for necessário!
	- a latência é causada por:
		- **TTFT** (time to first token): é o tempo até começar a responder e cresce com o tamanho do input (o modelo lê tudo antes de gerar)
			- Cache reduz mas streaming não (só mostra antes)
		- **Tokens por segundo**: depende do modelo
		- **Tempo total**: TTFT + (output_tokens ÷ tokens/s) -> cresce com o output (podemos pedir concisão)
	- a cada token gerado o modelo olha novamente todo o contexto, por isso o input pesa
3. A **janela pode ficar cheia em uma conversa longa**, tendo 3 saídas:
	1. **Truncar**: cortas as mensagens antigas
	2. **Compactar**: resumir o histórico antigo e mandar em uma nova mensagem
	3. **Memória externa**: guardar os fatos fora e reinjetar só o relevante
4. **Extended thinking**: ao ligar `thinking={"type": "enabled", "budget_tokens": N}` o modelo vai escrever um raciocínio antes de responder e esse raciocínio é enviado no bloco `thinking` dentro do `content` antes do `text`
	- `budget_tokens`: é o máximo que ele pode gastar pensando (tem que ser menor que o `max_tokens`)
	- É **cobrado como output**
	- Gera mais qualidade em tarefas de raciocínio em troca de custo e latência (não vale a pena pra tarefas simples)
	- `temperature` tem que ser `1` e prefill não funciona
	- Em multi-turn os blocos `thinking` das rodadas anteriores não precisam ser reenviados, só se tiver um tool use na mesma rodada
		- rodada acabou (`end_turn`) -> API descarta o `thinking` antigo
		- rodada no meio (`stop_reason: tool_use`) -> reenviar `content` intacto com o `thinking` (ele tem `signature` e é conferido)
## Modelos
Por padrão, os modelos disponíveis atualmente são:

| Faixa              | Perfil                                                                            | Quando usar                                                                   |
| ------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Fable** (Mythos) | acima do Opus; o mais capaz; Mythos com salvaguardas extras (bio, cyber, LLM R&D) | fronteira: tarefas que Opus não resolve; acesso e custo mais restritos        |
| **Opus**           | mais capaz da linha clássica, mais caro, mais lento                               | raciocínio complexo, análise longa, código difícil, agentes com muitas etapas |
| **Sonnet**         | equilíbrio: quase a qualidade do Opus, fração do custo                            | padrão pra quase tudo em produção                                             |
| **Haiku**          | mais rápido e mais barato, menos capaz                                            | classificação, extração simples, roteamento, alto volume, latência crítica    |
- A ordem de preço **aumenta cerca de ~5–10× a cada modelo**
	- Mudar o modelo é a maior alavanca de custos

Geralmente, para escolher o modelo fazemos:
1. Começa com o **Sonnet** e um **eval set**
2. **Qualidade insuficiente** -> sobe pro **Opus**
	- Antes de subir tentar fazer melhorias como extended thinking, etc
3. Qualidade sobrando mas **custo / latência elevada** -> desce pra **Haiku**

- Sempre que mudar o modelo roda novamente no **eval set** pra testar
- Tarefas heterogêneas podemos usar o **routing** com o **Haiku** pra classificação e aplicar esse padrão acima para determinar os modelos de cada tarefa
- Todos eles tem vision, tools, structured output, streaming, batch, cache, janela
- **O que muda: qualidade, velocidade e preço**

## Gestão de tokens
A gestão dos tokens é o que vai mais afetas nos custos e pra isso é importante saber que a conta base é:
`custo = input_tokens × preço_input + output_tokens × preço_output`
Sendo que o `output_token` é cerca de 5 vezes mais caro que o input

Só pra ter uma base hoje Sonnet tá custando $3 / milhão de tokens de input, enquanto o Opus está $15 (cerca de 5 vezes o preço) e Haiku $1

Algumas coisas afetam esse preço e viram multiplicadores no valor (podendo aumentar ou diminuir)

| Token | Preço relativo ao input normal |
|---|---|
| input normal | 100% |
| escrita de cache (5 min) | 125% |
| leitura de cache | 10% |
| output (inclui thinking) | ~500% |
| Batch | 50% de tudo acima |
- o thinking entra na mesma conta de output, a diferença é que quando pede thinking ele gasta mais tokens
- **os descontos se acumulam**

**Ordem de prioridade pra cortar custos:**
1. **Modelo**: é a maior alavanca de custos (desde que passe no eval)
2. **Menos input**: melhorar o prompt, usar RAG, redimensionar imagens, truncar histórico, etc
3. **Menos output** (token mais caro): Pedir concisão no prompt, sctructured output, thinking só se necessário
4. **Cache**: prefixo repetido torna o preço 10% do inicial
5. **Batch**: sem urgência

**Importante:**
- Medir antes de otimizar: 
	- Usar `count_tokens` para estimar
	- `usage` em todos os lugares
	- avaliar o custo por fluxo / feature
- Controles:
	- spend limit por workspace
	- alerta de gastos
	- `max_tokens`
	- limite de turnos em conversas / agentes
----
## Checkpoint: Modelos

> [!question] 1. Um pipeline pede ao modelo que some os valores de 40 linhas de uma planilha e devolva o total. Os totais vêm errados em ~10% dos casos. Qual a correção adequada? (selecione 1)
> a) Trocar para Opus
> b) Extrair os valores com o modelo e somar no código (ou dar uma tool de cálculo)
> c) Aumentar `max_tokens`
> d) Reduzir `temperature` para 0

> [!success]- Resposta
> **b**. O modelo prevê texto, não executa aritmética; erra com confiança. Regra determinística vai pro código. Opus e temperature reduzem, não eliminam.

> [!question] 2. Um classificador de e-mails devolve categorias diferentes para o mesmo e-mail em execuções repetidas. Nenhum parâmetro de amostragem foi definido. O que ajustar primeiro? (selecione 1)
> a) `top_k=1` e `temperature=0` juntos
> b) `temperature=0`
> c) Extended thinking
> d) Trocar para Haiku

> [!success]- Resposta
> **b**. Padrão é `temperature=1` (criativo). Tarefa com resposta certa → 0. Não se combina `top_p`/`top_k` com temperature; thinking não afeta consistência.

> [!question] 3. Mesmo com `temperature=0`, duas chamadas idênticas retornaram textos ligeiramente diferentes. O que isso indica? (selecione 1)
> a) Bug na API; abrir ticket
> b) Comportamento esperado: 0 é quase determinístico, não totalmente; determinismo real só no código ou cacheando a resposta
> c) O cache de prompt está quebrado
> d) O modelo foi atualizado silenciosamente

> [!success]- Resposta
> **b**. Detalhes de hardware e paralelismo variam entre chamadas. Se precisa do mesmo resultado sempre, não dependa do modelo.

> [!question] 4. Uma aplicação envia 120 mil tokens de contexto por chamada e reclama de latência alta antes do primeiro token. O que reduz esse tempo específico? (selecione 1)
> a) Streaming
> b) Prompt caching no prefixo repetido, ou reduzir o input
> c) Reduzir `max_tokens`
> d) Aumentar `temperature`

> [!success]- Resposta
> **b**. TTFT cresce com o input; cache evita reprocessar. Streaming só mostra antes; `max_tokens` afeta o tempo total, não o TTFT.

> [!question] 5. Uma instrução crítica no meio de um prompt de 150 mil tokens está sendo ignorada. O que fazer? (selecione 1)
> a) Aumentar `budget_tokens`
> b) Mover a instrução para o `system` (início) e, se preciso, repetir no fim
> c) Usar Opus
> d) Trocar para `top_p`

> [!success]- Resposta
> **b**. Lost in the middle: início e fim pesam mais. Posição da instrução, não modelo ou parâmetro.

> [!question] 6. Quais afirmações sobre extended thinking estão corretas? (selecione 2)
> a) Os tokens de thinking são cobrados como output
> b) `budget_tokens` deve ser maior que `max_tokens`
> c) Com thinking ligado, `temperature` deve ser 1 e prefill não funciona
> d) Melhora tarefas simples de classificação sem custo extra

> [!success]- Resposta
> **a, c**. `budget_tokens` < `max_tokens` (b errada). Em tarefa simples só encarece (d errada).

> [!question] 7. Uma empresa quer que o modelo responda no "tom da marca" e conheça 5 mil documentos internos. Um consultor sugere fine-tuning. Qual a avaliação correta? (selecione 1)
> a) Fine-tuning resolve os dois
> b) A API do Claude não oferece fine-tuning; tom vai no prompt (com exemplos) e conhecimento vai por RAG
> c) Fine-tuning para o tom e prompt para os documentos
> d) Opus já sabe o tom e os documentos

> [!success]- Resposta
> **b**. Fine-tuning não está na API e não adiciona conhecimento confiável. Prompt para estilo, RAG para base grande.

> [!question] 8. Um app precisa de OCR de faturas com classificação simples, milhares por hora, custo mínimo. Qual modelo começar a testar? (selecione 1)
> a) Opus, por causa da vision
> b) Haiku — todos têm vision; o que varia é qualidade, velocidade e preço
> c) Sonnet com extended thinking
> d) Fable

> [!success]- Resposta
> **b**. Vision é comum a todas as faixas. Volume alto + tarefa simples + custo → Haiku, validado com eval.

> [!question] 9. Uma aplicação em Sonnet custa caro. O log mostra respostas de 3 mil tokens com explicações longas, sendo que o sistema só usa um JSON de 200 tokens. Qual a ação de maior impacto? (selecione 1)
> a) Prompt caching
> b) Reduzir output: structured output e `max_tokens` ajustado — output custa ~5× o input
> c) Batch API
> d) Aumentar `temperature`

> [!success]- Resposta
> **b**. O desperdício está no output, o token mais caro. Cache e Batch não mexem nisso.

> [!question] 10. Com preços de US$ 3 (input) e US$ 15 (output) por milhão de tokens, uma chamada com 10 mil tokens de input e 1 mil de output custa quanto? E a mesma chamada via Batch? (selecione 1)
> a) US$ 0,045 e US$ 0,0225
> b) US$ 0,030 e US$ 0,015
> c) US$ 0,045 e US$ 0,045
> d) US$ 0,018 e US$ 0,009

> [!success]- Resposta
> **a**. Input: 10.000 × 3/1.000.000 = 0,030; output: 1.000 × 15/1.000.000 = 0,015; total 0,045. Batch = 50% → 0,0225.