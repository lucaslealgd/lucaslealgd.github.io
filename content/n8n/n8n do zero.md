O n8n é uma ferramenta de **automação visual**, onde você **cria e conecta blocos** chamados de nós (ou nodes), **cada um com uma tarefa específica**, para que a própria ferramenta faça o trabalho repetitivo no seu lugar.
Imagina que todo dia você tem que abrir o e-mail, baixar uma planilha, extrair as informações e salvar esses dados para gerar um relatório. No n8n você configura esse processo e agora você pode apenas olhar o relatório e **gastar seu tempo analisando os insights ao invés de fazer trabalho manual**.
O n8n é uma ferramenta low-code, onde é possível fazer muita coisa com pouco conhecimento em programação. E, quando o processo for mais complexo, existem nós onde **você escreve seu próprio código em JavaScript ou Python**.

Segundo a própria definição da ferramenta:
> O n8n é uma ferramenta de automação de fluxo de trabalho com licença Fair Code que combina recursos de IA com automação de processos de negócios. - [Documentação Oficial](https://docs.n8n.io/)

O Fair Code é um modelo de licença um pouco mais restritiva que o Open Source, mas para uso pessoal e até mesmo na sua empresa isso não será um problema. Se quiser saber mais, fique à vontade para ler em [faircode.io](https://faircode.io/) e no [artigo sobre licença comunitária do n8n](https://docs.n8n.io/n8n-community-license) (mas não se preocupe com isso agora, é só uma informação para caso você fique curioso sobre esse ponto).

Pra começar a utilizar o n8n, você pode fazer de 2 formas:
- **n8n Cloud**: você vai rodar o seu n8n em uma máquina do próprio n8n e pagar por isso. Existe um **free trial de 14 dias** (sem precisar cadastrar cartão de crédito) com todas as features do plano Pro incluídas
	- O **começo é bem mais rápido** e não precisa se preocupar com instalações, porém **após 14 dias existe um custo** que pode ser visto na [página de pricing](https://n8n.io/pricing/)
	- Se o seu objetivo é fazer um projeto rápido para alguma entrevista próxima, pode ser a melhor opção
- **n8n auto-hospedado**: o n8n vai ser executado na nossa própria máquina (ou nossa própria infraestrutura)
	- **Não existe o custo do n8n** (apenas custos caso seja feito uma hospedagem) e é mais personalizável, porém existe um **tempo de configuração um pouco maior** (mas não é nada muito complicado) e capacidade da sua máquina
	- O instalador pede cerca de **4 GB de RAM livres**

Se você quiser optar pela opção auto-hospedado, vou te ajudar com o passo a passo para isso. Caso use o Cloud pode pular para o tópico "**Primeiros passos no n8n**". 
Pessoalmente eu sugiro que você instale o auto-hospedado pois é muito raro você conseguir criar um projeto que seja realmente relevante para ser mostrado em uma entrevista de emprego em apenas 14 dias sem uma dedicação integral, mas se você quiser começar no Cloud pra já colocar a mão na massa no n8n e depois fazer a instalação quando precisar também fique à vontade.
E pra isso você pode consultar tudo nessa nota: [[Instalando o n8n auto-hospedado]]


# Primeiros passos no n8n


