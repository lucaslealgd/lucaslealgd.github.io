É importante entender que o **modelo só gera texto**, tudo que precisa ser feito **externo** (consulta ao BD, chamar API, ler ou escrever arquivos, saber que dia é) precisa ser **criado e disponibilizado** para ele através de **tool use**
- Passamos pro modelo **quais funções existem** (lista de tools com nome, descrição e parâmetros de cada uma) disponíveis e o modelo responde com um **pedido de chamada** da função que ele precisa
	- O `stop_reason` vai ser `tool_use` 
e	- O **código vai executar** e **devolver o resultado**
- IMPORTANTE: **o modelo nunca executa nada!**

