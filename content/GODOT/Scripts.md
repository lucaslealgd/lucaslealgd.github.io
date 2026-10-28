# Conceitos básicos
O nosso jogo tem alguns momentos importantes que definem a execução do nosso script, como
### `_ready`
- É **chamada assim que o nosso nó entra na árvore de cenas** (no início do jogo)
- Colocamos aqui todo o código que queremos que seja **executado imediatamente** quando o jogo começar
### `_process`
- É **chamado a cada frame do jogo**
### Sinais
Permitem que a gente **execute códigos baseado em eventos que ocorreram** no nosso jogo (por exemplo, quando o jogador entra na área de "morte" do jogo)
A GODOT já possui muitos sinais integrados e **cada nó vai ter seus sinais específicos**

# Comandos
- `print`: imprimir uma mensagem na "Saída"
- 