// Arquivo: criar_artigo.js

// 1. Definir os dados do artigo que queremos criar
const novoArtigo = {
  titulo: "Usando a API Fetch no Node.js",
  palavras_chaves: ["fetch", "node.js", "api", "es2022", "backend"],
  conteudo: "<p>A API <strong>Fetch</strong>, que já era padrão nos navegadores, agora está disponível nativamente no Node.js.</p><p>Isso simplifica muito a forma como fazemos requisições HTTP, sem a necessidade de instalar pacotes de terceiros como o <em>axios</em> ou <em>node-fetch</em> para tarefas simples.</p>"
};

// 2. Definir uma função assíncrona para enviar os dados
async function postarNovoArtigo() {
  const url = 'http://localhost:3000/api/criar-artigo';

  console.log(`Enviando dados para: ${url}`);
  console.log('Payload:', JSON.stringify(novoArtigo, null, 2));

  try {
    // 3. Fazer a requisição fetch
    const response = await fetch(url, {
      method: 'POST', // Método da requisição
      headers: {
        'Content-Type': 'application/json' // Informando ao servidor que estamos enviando JSON
      },
      body: JSON.stringify(novoArtigo) // Convertendo o objeto JavaScript para uma string JSON
    });

    // 4. Analisar a resposta do servidor (que também é em JSON)
    const responseData = await response.json();

    // 5. Verificar se a requisição foi bem-sucedida (status 2xx)
    if (response.ok) {
      console.log('\n✅ Artigo criado com sucesso!');
      console.log('Resposta do servidor:', responseData);
    } else {
      // Se o servidor retornou um erro (ex: 400, 409, 500)
      console.error(`\n❌ Erro do servidor: ${response.status} ${response.statusText}`);
      console.error('Detalhes do erro:', responseData);
    }

  } catch (error) {
    // Capturar erros de rede ou falhas na conexão
    console.error('\n🚨 Falha na requisição. O servidor está rodando?');
    console.error(error.message);
  }
}

// 6. Executar a função
postarNovoArtigo();