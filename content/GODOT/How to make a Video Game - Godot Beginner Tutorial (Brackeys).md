# GODOT
- GODOT é muito amigável pra quem tá começando, open source e grátis
- dá pra fazer desde jogos FPS até um jogo 3D
## Começando
Para instalar: [[Primeiros Passos#Instalação]]
- é muito fácil de instalar e roda até no browser

Criando um novo projeto: [[Primeiros Passos#Criando um novo projeto]]

Assim que fizermos isso já vai abrir um canva em branco, que basicamente vai ter os seguintes componentes: [[Primeiros Passos#O editor da GODOT]]

Aqui, nosso objetivo é criar um jogo simples 2D:
![Brackeys_Jogo1_img1.png](../imagens/GODOT/Brackeys_Jogo1_img1.png)
Temos:
- Jogadores
- Inimigos
- Plataformas móveis
- Moedas coletáveis

Para **programação**, GODOT usa sua própria linguagem de programação chamada **GDScript**
- Não precisa se preocupar em entender totalmente os códigos (no próximo vídeo ele fala sobre GDScript)

Para fazer um jogo vamos precisar dos **"ingredientes"** (os assets), como:
- Sprites
- Models
- Textures
- Sounds
Em GODOT a gente **não precisa criar do zero**, o nosso trabalho é basicamente **colocar tudo isso junto e organizá-los**
Os assets desse jogo estão disponíveis em:
https://brackeysgames.itch.io/brackeys-platformer-bundle
Podemos encontrar assets em vários outros lugares como:
- itch.io
- opengameart.org
- kenney.nl
Se ele for CC0 significa que ele é livre para uso sem precisar dar créditos

Voltando pro Canva, no lado inferior esquerdo temos o **PAINEL DE ARQUIVOS (lista os arquivos do projeto)**
- Por padrão ele começa apenas com o icon.svg (que é o ícone da GODOT)
- Vamos criar 3 novas pastas: assets, scenes e scripts
- Vamos baixar os assets, extrair o zip e arrastar todas as pastas pra essa pasta de assets

## Como a GODOT funciona
Leia mais em: [[Primeiros Passos#Principais conceitos]]
Pra fazer qualquer coisa na GODOT nós vamos usar **nodes**
Então qualquer elemento na GODOT vai ser **um conjunto de nós**, sendo assim o nó vai ser o bloco fundamental do nosso jogo!
Tem vários tipos e cada um tem sua função:
- Sprite: mostrar uma imagem
- Audio: tocar um som
- RigidBody: adicionar física

Podemos extender nodes para criar outros nós mais poderosos
Criar um jogo na GODOT é combinar e extender nós!

Para evitar criar um nó dentro de outro dentro de outro até ficar uma coisa super complexa, vamos criar as **cenas** para organizar nosso trabalho
- As cenas vão permitir que a gente agrupe nós em **pacotes reutilizáveis**

Todas as cenas vão ser organizadas de forma a termos uma **árvore de cenas**, onde o primeiro nó é chamado de nó raiz