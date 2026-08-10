# O que é programação?
**Programar** é **dizer para o computador** de ***forma precisa*** como fazer uma tarefa em uma **linguagem que o computador vai entender** (nesses exemplos usaremos Python e GDScript, mas os conceitos servem pra várias outras)
Aqui eu vou começar apresentando muita coisa nova e provavelmente você não vai entender tudo, mas não se preocupe. Com o tempo tudo vai ficar mais natural pra você!
### Desenhe um círculo
Ao pensar em desenhar um círculo:
**Pra gente**: desenhe um círculo
**Pro computado**r: desenho um círculo da cor azul água com o centro em 0,0 com raio de 60 pixels
- Só que ao invés de falar essas palavras, vamos passar **comandos**
- **Tudo importa**: parênteses, pontos, vírgulas, letras maiúsculas e minúsculas, etc
- Por exemplo, em GDScript:
	- Vamos supor que eu te peça: desenhe um círculo
		- Você pode simplesmente pegar e desenhar, mas onde você vai desenhar? Qual o tamanho? De que cor? 
			- Todas essas decisões você tomou por conta própria, o computador não faz isso. **Tudo que você precisar que o computador faça precisa ser dito explicitamente!**
				- Obs mas não precisa se preocupar com isso agora: algumas coisas vão ter valores padrão, mas mesmo esses valores foi alguém que passou pro computador então se você não disse pra ele, outra pessoa fez isso
	- Observa que no código abaixo estamos falando a posição, o tamanho e a cor. Tudo que é necessário para gerar um círculo
```gdscript
draw_circle(
	Vector2(0,0),
	60,
	Color.AQUA
)
```
### Comprando um item no jogo
Um ponto importante é que muitas linguagens usam palavras em inglês, então ter um mínimo domínio do idioma vai te ajudar a progredir mais rapidamente (mas se não tiver sem problemas também, você vai aprendendo no caminho)
O código que você escrever sempre vai ser lido de cima para baixo, respeitando todas as condições que estão escritas (como um `if` / `else`, `while`, `_ready`, etc)
Tanto em GDScript quanto em Python, **escrever um código vai ser semelhante a conversar com o computador**. você só precisa ir aprendendo quais palavras usar e como montar isso no código
Vamos supor que você está criando um jogo e quer fazer uma loja no seu jogo com alguns itens especiais
- A primeira coisa é validar se o jogador tem dinheiro. Então você precisa fazer algo do tipo "***se*** o usuário tiver dinheiro suficiente, ele pode comprar o item"
	- Qual palavra você usaria para o ***se***? (Dica: pense em inglês)
		- Se você pensou em ***if*** pronto, você já sabe o comando, agora é só você saber que a estrutura do if é:
```python
if condição:
	o que deve ser executado
```
mas Lucas, como eu iria saber essa estrutura?
Ai vem uma dica de ouro: **a documentação!** Vai ser onde você vai conseguir encontrar tudo que você precisa para criar seus códigos e você vai usar ela desde agora até quando você se tornar um super expert na linguagem
Por exemplo, o [if em Python](https://docs.python.org/pt-br/3/tutorial/controlflow.html#if-statements):
![[Python - If em Python.png]]
E o [if em GDScript](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/gdscript_basics.html#if-else-elif):
![[Pasted image 20260809212010.png]]
- E qual seria a condição?
	- A gente não quer que o dinheiro do jogador seja maior que o preço do item?
		- Então a gente vai fazer exatamente essa operação matemática de maior ou igual (***>=***)
	- Aqui eu também vou aproveitar pra chamar o dinheiro do jogador de **dinheiro_jogador** e o preço do item de **preco_item** pois eu não sei o valor de nenhum dos 2
```python
if dinheiro_jogador >= preco_item:
	o que deve ser executado
```
**dinheiro_jogador** e **preco_item** são o que chamamos em programação de ***variáveis***, que é um "espaço" que usamos para guardar uma informação, que vai ter um nome, e pode ser usado sempre que necessário. 
- Sempre que quisermos saber o preço do item, é só verificar o valor da variável **preco_item**
- Também **podemos mudar o valor de uma variável**, então se o jogador começa com 100 moedas, o jogo começa com **dinheiro_jogador = 100**. Se ele gastou 20 comprando um item, podemos atualizar o valor da variável **dinheiro_jogador** para que ela seja 80 agora

Pra fechar, o que eu gostaria que fosse executado?
-  Eu quero só enviar uma mensagem dizendo que o item pode ser comprado, e por mais que a gente possa pensar em algo como "escreva" ou "mostre" a palavra que vamos usar pra ele fazer isso é ***print*** (que também faz sentido)
```python
if dinheiro_jogador >= preco_item:
	print("O item pode ser comprado")
```
Observe que além de usar **if, >=, print** nós também escrevemos isso de uma forma bem específica: usando dois pontos no final, tendo um "espaço" no início da segunda linha, o texto entre parênteses e aspas.
- Isso tudo é o que eu falei sobre **como montar o código**
- Cada linguagem de programação vai ter uma forma específica de escrever o código e isso você vai entendendo e aprendendo com o tempo
Então uma dica que eu te dou é: **olhe o código de outras pessoas e tente entender o que está acontecendo ali**. Por exemplo esse seria meu código para fazer essa compra do item, onde eu vou atualizar o valor do dinheiro do jogador e da quantidade de itens após a compra ser efetuada. 
- Apenas lendo esse código, **você entende o que está acontecendo?**
	- Não digo de entender o código em si (a parte de programação), mas sim o que ele faz (faz uma compra de um item)
	- Provavelmente algumas coisas você não vai entender como "**return**" ou o "**str**", mas isso vai servir pra ser um ponto de partida pra você buscar na documentação e também pra você já ir se acostumando com coisas que vamos explicar mais pra frente
- É meio parecido com aprender idiomas, quanto mais contato com um novo idioma mais ele vai ficando natural pra você. Com programação é a mesma coisa!
```python
# Você quer comprar um item
def comprar_item(dinheiro_jogador,quantidade_item,preco_item):
    if dinheiro_jogador < preco_item:
        print("Saldo insuficiente")
    else:
        dinheiro_jogador -= preco_item
        quantidade_item += 1
        print("Item comprado")
        
    return dinheiro_jogador,quantidade_item

dinheiro_Lucas = 100
preco_Capa = 20
quantidade_Capa = 0

dinheiro_Lucas, quantidade_Capa = comprar_item(dinheiro_Lucas,quantidade_Capa,preco_Capa)

print("Saldo: " + str(dinheiro_Lucas) + " | Itens: " + str(quantidade_Capa))
```
Ao executar esse código o resultado seria:
```
Item comprado
Saldo: 80 | Itens: 1
```

O mais legal de aprender a programar é que **depois que você aprende a sua primeira linguagem a segunda fica mais fácil**, a terceira mais ainda e tudo vai se tornando mais simples pois você já começa a ter uma base cada vez mais sólida. Por isso é bom começar por uma linguagem mais simples (com uma curva de aprendizado mais suave) como GDScript ou Python e, se quiser, depois ir buscando outras
- Python e GDScript são consideradas **linguagem de programação de alto nível**, ou seja, a sua forma de escrever código está muito mais **próxima da linguagem humana** (em inglês simples) do que do código de máquina (os números binários)
## Lidando com erros
### Reduzindo a vida do jogador
**Programar é uma tarefa criativa**, assim como uma tela em branco que pode ser pintada, **existe inúmeras possibilidades de como você pode escrever um código** (apesar de existirem algumas restrições)
- e o mais legal é que você pode fazer isso colaborativamente e compartilhar com todo o mundo! -> tipo esse github que eu estou fazendo
Algo muito importante é que o computador vai **seguir cegamente o que você mandar ele fazer** (mesmo que você mande ele fazer a coisa errada)
No seu jogo você quer criar uma dinâmica de tirar a vida quando o jogador tomar dano, vamos supor que você escreveu:
```python
# Reduzindo a vida do jogador
vida_jogador = 100

vida_jogador = vida_jogador - dano_recebido

print(vida_jogador)
```
E ao executar isso você irá receber a seguinte mensagem:
```
---------------------------------------------------------------------------
NameError                                 Traceback (most recent call last)
Cell In[8], line 4
      1 # Reduzindo a vida do jogador
      2 vida_jogador = 100
----> 4 vida_jogador = vida_jogador - dano_recebido
      6 print(vida_jogador)

NameError: name 'dano_recebido' is not defined
```
Ele seguiu exatamente o que você mandou e como não foi possível executar o código ele mandou uma **mensagem de erro**
Observa que quando você erra, a linguagem de programação **vai tentar te ajudar a identificar o que aconteceu**!
No caso acima ele mostrou com a **seta onde estava o erro** (na linha 4) e na mensagem temos que: ***NameError: name 'dano_recebido' is not defined***
Ou seja, **dano_recebido** não foi definido. Se a gente definir esse valor (que chamamos de variável) teremos esse novo código:
```python
# Reduzindo a vida do jogador (definindo o nome)
vida_jogador = 100
dano_recebido = 20

vida_jogador = vida_jogador - dano_recebido

print(vida_jogador)
```
E o resultado seria:
```
80
```
Pronto, o erro foi resolvido e agora o seu código pode rodar sem problemas!

Antes de escrever sua primeira linha de código entenda que **erros vão acontecer**! O que vai fazer você melhorar como programador é a capacidade de lidar com isso!
Uma dica que eu sempre gosto de seguir é faça pequenas partes do código e vá executando e resolvendo os erros aos poucos. Fica bem mais fácil do que criar um grande código e só depois ir tentar achar os erros.
Outra coisa: **preste muita atenção nas mensagens de erro. Provavelmente tudo que você precisa pra resolver o seu problema está ali!**

> As mensagens de erro são **criadas de propósito por outros programadores que vieram antes de você**. Eles previram que você poderia encontrar determinados problemas e quiseram ajudá-lo a resolvê-los.
> 
> Você não deve enxergar os erros como fracassos. Pense neles como **mentores do passado tentando ajudá-lo**. E, o mais importante, erros não vão estragar o seu computador.
> 
> No fim das contas, você vai querer corrigir todos os erros do seu programa. Entender o que está causando cada erro, com a ajuda das mensagens de erro, é essencial para conseguir solucioná-los.
> 	- [GDQuest - Seu primeiro erro](https://gdquest.github.io/learn-gdscript/#your-first-error)
## Próximos passos
Antes de você seguir, é importante que você entenda:
- Escrever um código é **conversar com o computador** na linguagem que ele entende
- A **documentação** vai ser a sua maior aliada nessa jornada! Sempre procure por ela!
- **Variáveis** são usadas no seu código para guardar informações que poderão ser usadas e alteradas
- Erros vão acontecer! As **mensagens de erro** vão te ajudar a resolver e a melhorar como programados!
Você pode continuar estudando outros assuntos como:
- [[Funções e Bibliotecas]]