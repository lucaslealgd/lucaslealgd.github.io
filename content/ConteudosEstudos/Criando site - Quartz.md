---
title: Criando site - Quartz
tags:
  - sites
  - jardimDigital
---
## Criando um site pro Jardim Digital
Para criar o site eu usei o [Quartz](github.com/jackyzha0/quartz), que já possui um template pra obsidian e é de graça. O site fica no próprio GitHub
## Necessário
- Ter uma conta no GitHub
- Ter o GitHub Desktop instalado
- Uma pasta onde você esteja criando o seu jardim digital
	- Caso ainda não esteja criando o seu jardim digital, ao executar `npx quartz create` selecione `new`
## Passo a passo
1. Instalar o Node.js
	1. Node.js 22 ou mais novo
2. Criar o repositório pelo template
	1. Logado com a conta do github acessar github.com/jackyzha0/quartz
	2. Clicar no botão verde **"Use this template"** e em **"Create a new repository"**
	3. Para o nome do repositório: use **`<seu usuário>.github.io`** — esse nome especial faz seu site ficar na raiz, sem sufixo. (Qualquer outro nome também funciona, só que o site fica em `<seu usuário>.github.io/nome`.)
	4. Deixa a visibilidade como **Public** — obrigatório para o GitHub Pages funcionar no plano gratuito. Lembre disso: <mark><b>as notas que você publicar serão visíveis para qualquer pessoa</b></mark>
	5. Clique em **Create repository**.
3. Clonar com o GitHub Desktop
	1. Vá em GitHub Desktop → **File → Clone repository**
	2. - Na aba GitHub.com, selecione `<seu usuário>/<seu usuário>.github.io`.
	3. Em local path selecione a pasta do seu GitHub (ele cria a subpasta sozinho) e clique em **Clone**
4. Montar o Quartz no terminal
	1. No GitHub Desktop, ainda com o repositório aberto vá em **Repository → Open in Command Prompt**
	2. Execute:
		1. `npm i`
		2. `npx quartz create`
			1. **Template**: `obsidian` (feito exatamente pro nosso caso)
			2. **Conteúdo**: 
				1. Caso **tenha uma pasta onde já está criando seu jardim**:
					1. `copy` — copiar de uma pasta existente. Ele vai pedir o caminho: abra o Explorer na pasta onde você está criando o seu `JardimDigital`, clique na barra de endereço, copie o caminho completo (algo como `C:\Users\<seu usuário>\<pasta GitHub>\JardimDigital`) e cole no terminal.
				2. Caso **ainda não tenha uma pasta**:
					1. `new`
			3. **Base URL**: `<seu usuário>.github.io` — sem o https:// na frente.
		3.  `npx quartz plugin install --from-config`
			1. Vai instalar os plugins
		4. `npx quartz build --serve`
			1. Para testar localmente, ele vai abrir onde vai estar o site (geralmente http://localhost:8080)
			2. Quando terminar, volte ao terminal e aperte **Ctrl+C** para parar
5. Atualizar o arquivo **index**
	1. Agora vá até a pasta que foi criada em `<seu usuário>.github.io` e procure pela pasta <mark><b>content</b></mark>
		1. <mark><b>Essa será a nova pasta que você irá usar para criar seu Jardim Digital</b></mark>
		2. Se quiser continuar mantendo a pasta antiga como um rascunho e depois mover para essa pasta quando tiver pronto, é uma opção (eu não recomendo muito)
		3. <mark><b><u>MUITO CUIDADO POIS TUDO QUE TIVER NESSA PASTA FICARÁ PÚBLICO, NÃO COLOQUE INFORMAÇÕES SENSÍVEIS, SENHAS NEM NADA DO TIPO</u></b></mark>
	2. Coloque a pasta **content** como seu novo cofre do Obsidian para garantir que irá fazer todas as edições nela
6. Atualizar o arquivo **quartz.config.yaml**
	1. Abra esse arquivo e ajuste
		1. `pageTitle` para `Jardim Digital`
		2. `locale` para `pt-BR`
	2. Salve e feche
7. Criando o arquivo de **deploy**
	1. Na pasta raiz do repositório cria uma pasta `.github` e dentro dela a pasta `workflows` (se não houver)
	2. Se tiver arquivos dentro dessa pasta, apague todos
	3. Crie um novo arquivo `deploy.yml` (cuidado pra não criar um txt)
	4. Cole o código abaixo nesse arquivo e salve
```
name: Deploy Quartz site to GitHub Pages

on:
  push:
    branches:
      - v5
      - main
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v6
        with:
          node-version: 24
      - name: Install Dependencies
        run: npm ci
      - name: Install Quartz plugins
        run: npx quartz plugin install
      - name: Build Quartz
        run: npx quartz build
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: public

  deploy:
    needs: build
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

8.  Ligando o GitHub Pages
	1. No site do github, vá no repositório
	2. Vá em **Settings → Pages**
	3. Em **Build and deployment → Source** selecione **GitHub Actions**
	4. Pode sair dessa tela
9. Enviando tudo para o GitHub
	1. Agora vá no seu GitHub Desktop e envie tudo que foi criado para o main do `<seu usuário>.github.io`