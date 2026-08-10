# Funções
Uma função é um **bloco de código** que reúne uma sequência de instruções para **realizar uma tarefa específica**. Ela é definida uma vez, mas **pode ser *chamada* quantas vezes forem necessárias**
Imagina que você está escrevendo o código da sua loja de itens então você adiciona uma capa e escreve:
```python
if dinheiro_jogador < preco_capa:
	print("Saldo insuficiente")
else:
	dinheiro_jogador -= preco_capa
	quantidade_capa += 1
```
Agora você colocou um capacete e então vai fazer:
```python
if dinheiro_jogador < preco_capacete:
	print("Saldo insuficiente")
else:
	dinheiro_jogador -= preco_capacete
	quantidade_capacete += 1
```
Ai se fosse colocar uma espada teria que fazer a mesma coisa e pra cada novo item teria que escrever o mesmo código
Isso daria um trabalho enorme né? Agora imagina só se seu jogo vai ser disponibilizado em inglês e você precisa trocar a mensagem para "Insufficient balance". Você vai precisar **ir em cada um dos itens e ajustar 1 por 1**
É exatamente pra isso que você usa as funções, pois você escreve uma única vez:
```python
def comprar_item(dinheiro_jogador,quantidade_item,preco_item):
    if dinheiro_jogador < preco_item:
        print("Saldo insuficiente")
    else:
        dinheiro_jogador -= preco_item
        quantidade_item += 1
        print("Item comprado")
        
    return dinheiro_jogador,quantidade_item
```
E agora você pode usar isso pra capa, pro capacete, pra espada e pra qualquer novo item que você coloque no seu jogo e caso precise mudar algo basta ajustar nessa função.
E pra chamar essa função, é só fazer:
```python
dinheiro_Lucas, quantidade_Capa = comprar_item(dinheiro_Lucas,quantidade_Capa,preco_Capa)
```

Quando mandamos o computador executar uma função, chamamos isso de **chamar** a função. Pra isso você vai escrever o nome da função seguido de **()**. Se uma função aceitar receber informações, basta passar esses dados dentro do **()** como feito acima com o dinheiro_jogador, quantidade_item e preco_item
- Essas informações que passamos dentro do parênteses são chamados de **argumentos da função**, que irão fazer a função ser executada de acordo com os nossos parâmetros

E o mais legal é que **a própria linguagem já disponibiliza várias funções prontas** para você apenas usar, como o `print()` para exibir uma mensagem na tela. Já a Godot disponibiliza funções como `show()` e `hide()`, que podemos usar dentro do GDScript para mostrar e esconder um objeto, respectivamente
- Se eu escrevo `hide()`, o meu objeto desaparece no meu jogo, já quando eu escrevo `show()` ele irá aparecer novamente

Para escrever uma função em Python você começa fazendo ***def*** enquanto em GDScript você usa ***func***, em ambos **seguido pelo nome da função, parênteses e dois pontos**. Dentro do parênteses podem haver **parâmetros** se necessário, que basicamente são nomes que a função usa para receber informações como dinheiro_jogador e preco_item
A **linha seguinte a definição da função sempre vai começar com um Tab** (espaço no início da linha, que chamamos de **indentação**), isso vai indicar pro código o que está dentro da sua função
## Bibliotecas
Outra questão fundamental na programação é que você não precisa reinventar a roda, **muita coisa que você vai usar já está pronta**
Outros programadores muito legais já criaram **pacotes de códigos** que irão facilitar muito a sua vida e te poupar muito tempo chamado ***bibliotecas***
Em geral, elas serão **especializadas em determinado assunto** e vão ter várias ***funções*** já prontas para executar tarefas específicas
Por exemplo, em Python temos bibliotecas como o **pandas** que conseguem de forma bem simples ler um arquivo excel, fazer operações com dados, entre outras coisas