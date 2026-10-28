O Claude é um assistente de IA que vai, principalmente, executar um LLM, que é a sigla para "**Large Language Model**" (que traduzindo é um grande modelo de linguagem) que como o próprio nome diz é feito para **dado um trecho, prever qual será o próximo pedaço de texto** 
Então se eu escrevo: "qual é a capital do Brasil?" esse modelo vai ver prever que a melhor resposta pra isso é "Brasília", mesmo sem conceitualmente saber o que é o Brasil ou sequer ter alguma informação sobre Brasília

Para explicar melhor sobre isso vamos precisar entrar em algumas questões conceituais mas se seu objetivo for apenas usar o Claude pode ir para [[Como usar o Claude]]
# LLM
Um LLM (Large Language Model) é um modelo **treinado pra prever o próximo token**: dado um texto, ele vai tentar **prever o próximo *pedaço* de texto** que melhor se adeque ali e vai fazendo isso pedaço por pedaço até que ele "*entenda* que a resposta está ok" e a finalize
- Ele não tem a capacidade de "*entender*" nada, o que acontece na verdade é que também existe um token que vai dizer para ele parar quando essa for a melhor opção
- Esse ***pedaço*** é exatamente o ***token***! (que em português não chega a ser nem 1 palavra)
	- O modelo **não vai ler caracteres, ele vê tokens**
	- Então se você escrever "aquela fruta vermelha com cabinho que colocamos no açaí é" ele vai tentar prever o próximo token que será `[mor]` e então vai entender que ainda não acabou e vai prever o token seguinte que será `[ango]` e então ele irá finalizar pois respondeu completamente a sua pergunta
		- E dentro do modelo ele nem sequer viu `[mor]`, ele viu um número como 48213 (tanto o `[mor]` quando o número são ilustrativos, isso depende do modelo)
			- Tanto o que você escreve quanto o que você responde são convertidos nesses números e depois ele volta para palavras para você conseguir ler o que o modelo gerou
			- É por isso que quando você pede "quantos R tem em morango?" ele não consegue acertar. Pra responder, ele precisaria abrir os tokens e olhar letra por letra, e ele não tem essa operação. O que ele faz é _estimar_ a resposta pelo que viu no treinamento — e erra com frequência, porque nunca aprendeu a contar letras, aprendeu a prever texto.
				- Mesma coisa com: 
					- **Inverter uma string**: "ognarom" quase nunca apareceu no treinamento como reverso de "morango"; ele chuta.
					- **Aritmética exata**: "4.827 × 391" é uma sequência de tokens de dígitos. Ele aprendeu padrões de multiplicação, não o algoritmo. Acerta as fáceis, erra as grandes, e ***erra com confiança***.
					- **Validar CPF, checar se uma data existe, somar uma coluna**: tudo regra fixa que ele aproxima em vez de executar.
- Falamos que ele ***"erra com confiança"*** pois pro modelo aquele é o melhor token que se adequa ao texto anterior e pra ele está certo. Então precisamos entender que: **o objetivo do modelo não é te entregar o dado mais correto, é manter "a melhor conversa possível"**, mesmo que pra isso a informação esteja errada
	- Por isso, muitas vezes, **o modelo vai falar o que queremos ouvir** e não a informação mais correta
		- É o que chamamos de **sycophancy**, ou "bajulação" em português (acontece pois o modelo foi aprendendo que as pessoas gostavam mais do que concordava com elas e foi sendo direcionado para "te agradar")
			- É bom não perguntar "minha ideia é boa?" mas sim coisas do tipo "como posso melhorar essa ideia?", "como faço isso ficar melhor", etc
			- O aplicativo do Claude guarda algumas coisas na memória e pode usar isso para continuar confirmando o que você já acredita
	- Os modelos fazem o que chamamos de **"alucinar"**, que é **"inventar uma resposta"** quando ele não sabe
		- Lembre-se que o objetivo do modelo é manter a conversa, então ele prefere te dizer algo com muita convicção do que não responder ou dizer **"não sei"** afinal o token do **"não sei"** provavelmente não é o melhor naquele contexto
		- Deixando claro: ele não sabe que ele está inventando, pra ele aquilo ali é só o token mais provável (que pode ser o correto como pode ser algo totalmente fora da realidade)
Outra questão importante de entendermos é que todos os **modelos** vão ter:
- **data de corte**: é basicamente **até qual data o modelo vai ter informações**
	- Todo modelo é treinado com dados até um dia específico e tudo que aconteceu depois disso fica invisível pro modelo
	- Existem formas de pedirmos pro app do Claude buscar os dados após essa data para melhorar a resposta e aqui precisamos entender:
		- **Modelo**: é o que foi treinado com as informações e que vai definir qual o próximo token
		- **Aplicativo**: é onde vamos ter o modelo junto com outras ferramentas como busca web, upload de arquivos, memória, etc
			- é como se fosse o carro (enquanto o modelo é o motor)
			- o app vai ter uma memória interna onde ele consegue armazenar algumas informações sobre o usuário, porém como é algo automático e você não escolhe o que entra não serve como contexto
- **janela de contexto**: é tudo que é enviado junto com a mensagem, como histórico de conversa, arquivos anexados, instruções, etc (algumas coisas são enviadas por você e outras o próprio app envia)
	- **O modelo só vai ver o que tiver nessa janela** (junto com tudo que ele "aprendeu"). Toda conversa começando em uma nova janela é algo totalmente novo pro modelo, como se fosse você abrindo o Claude pela primeira vez
	- **Quando melhor você explicar o seu contexto** (seus documentos, os dados que você está colocando, onde está a informação que você precisa) **melhor o modelo vai conseguir te responder!**
	- A janela tem limite e **quanto maior a janela maior o "gasto"** pra gerar as informações (falaremos dos custos mais pra frente)
