// -----------------------------------------------------------------------------
// ARQUIVO: index.js
// DESCRIÇÃO: Servidor de blog com Node.js, Express, EJS e PostgreSQL.
// ATUALIZAÇÃO DO SITEMAP: O sitemap é criado na inicialização. A cada
//                        novo artigo, sua URL é APENAS ANEXADA ao arquivo
//                        existente, de forma eficiente.
// -----------------------------------------------------------------------------

// Importação dos módulos necessários
const express = require('express');
const path = require('path');
const slugify = require('slugify');
const fs = require('fs');
const xmlbuilder = require('xmlbuilder');
const { Pool } = require('pg');

// --- Configuração da Conexão com o Banco de Dados ---
const pool = new Pool({
 user: 'postgres',
  host: '45.165.244.102',
  database: 'tuddo',
  password: 'a850d1b912eb7f2d9cf6',
  port: 5432,
});

// Inicialização do Express
const app = express();
const PORT = 8000;
const SITE_URL = `https://worldscope.com.br`;
const SITEMAP_PATH = path.join(__dirname, 'public', 'sitemap.xml');

// --- Middlewares e Configurações do Express ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Lógica do Sitemap ---

/**
 * Cria o arquivo sitemap.xml do zero.
 * Executada apenas na inicialização do servidor.
 */
const criarSitemapInicial = async () => {
  try {
    const [artigosResult, aulasResult] = await Promise.all([
      pool.query("SELECT slug, data_criacao FROM artigos ORDER BY data_criacao DESC"),
      pool.query("SELECT slug, created_at FROM aulas WHERE slug IS NOT NULL ORDER BY created_at DESC")
    ]);

    // Extrai as linhas (rows) de cada resultado
    const artigosRows = artigosResult.rows;
    const aulasRows = aulasResult.rows;
    const root = xmlbuilder.create('urlset', { version: '1.0', encoding: 'UTF-8' });
    root.att('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');

    root.ele('url').ele('loc', `${SITE_URL}/`);

    artigosRows.forEach(artigo => {
      const url = root.ele('url');
      url.ele('loc', `${SITE_URL}/artigo/${artigo.slug}`);
      url.ele('lastmod', new Date(artigo.data_criacao).toISOString().split('T')[0]);
      url.ele('changefreq', 'hourly');
    });
    //console.log(rows2)
    aulasRows.forEach(artigo => {
      const url = root.ele('url');
      url.ele('loc', `${SITE_URL}/learn/${artigo.slug}`);
      url.ele('lastmod', new Date(artigo.created_at).toISOString().split('T')[0]);
      url.ele('changefreq', 'hourly');
    });

    const xml = root.end({ pretty: true });
    fs.writeFileSync(SITEMAP_PATH, xml);
    console.log(`[${new Date().toLocaleTimeString()}] Sitemap inicial criado com sucesso!`);
  } catch (error) {
    console.error("Erro ao criar o sitemap inicial:", error);
  }
};

/**
 * Adiciona uma única URL ao sitemap.xml existente de forma eficiente.
 * @param {object} artigo - O objeto do novo artigo, contendo slug e data_criacao.
 */
const adicionarUrlAoSitemap = (artigo) => {
  try {
    // 1. Cria o fragmento XML para a nova URL
    const lastmod = new Date(artigo.data_criacao).toISOString().split('T')[0];
    const novaUrl = `
  <url>
    <loc>${SITE_URL}/artigo/${artigo.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
  </url>`;

    // 2. Lê o sitemap atual
    const sitemapContent = fs.readFileSync(SITEMAP_PATH, 'utf-8');

    // 3. Insere a nova URL antes da tag de fechamento </urlset>
    const position = sitemapContent.lastIndexOf('</urlset>');
    const newSitemapContent = [
      sitemapContent.slice(0, position),
      novaUrl,
      sitemapContent.slice(position)
    ].join('');
    
    // 4. Sobrescreve o arquivo com o novo conteúdo
    fs.writeFileSync(SITEMAP_PATH, newSitemapContent);
    console.log(`[${new Date().toLocaleTimeString()}] Nova URL adicionada ao sitemap: /artigo/${artigo.slug}`);

  } catch (error) {
      console.error(`Erro ao adicionar URL ao sitemap para o slug ${artigo.slug}:`, error);
      // Como fallback, podemos tentar recriar o sitemap inteiro
      console.log("Tentando recriar o sitemap como fallback...");
      criarSitemapInicial();
  }
};


// --- ROTAS DA APLICAÇÃO ---

/**
 * ROTA DE API (POST): /api/criar-artigo
 * Cria um novo artigo e chama a função para ANEXAR a nova URL ao sitemap.
 */
app.post('/api/criar-artigo', async (req, res) => {
  const { titulo, palavras_chaves, conteudo } = req.body;

  if (!titulo || !palavras_chaves || !conteudo || !Array.isArray(palavras_chaves) || palavras_chaves.length === 0) {
    return res.status(400).json({ erro: 'Campos inválidos.' });
  }

  const slug = slugify(titulo, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
  const sqlQuery = `
      INSERT INTO artigos (titulo, slug, palavras_chaves, conteudo)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
  `;
  const values = [titulo, slug, palavras_chaves, conteudo];

  try {
    const result = await pool.query(sqlQuery, values);
    const novoArtigo = result.rows[0];

    console.log('Novo artigo criado no banco de dados:', novoArtigo.titulo);
    
    // <<-- MUDANÇA PRINCIPAL: Chama a função de anexo passando o novo artigo -->>
    adicionarUrlAoSitemap(novoArtigo);

    res.status(201).json({ mensagem: 'Artigo criado com sucesso!', artigo: novoArtigo });
  } catch (error) {
    console.error('Erro ao inserir artigo no banco de dados:', error);
    if (error.code === '23505') {
        return res.status(409).json({ erro: 'Já existe um artigo com este título/slug.' });
    }
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});


// ... (As rotas GET / e GET /artigo/:slug permanecem exatamente as mesmas) ...

app.get('/', async (req, res) => {
    try {
      const sqlQuery = "SELECT titulo, slug, data_criacao FROM artigos ORDER BY data_criacao DESC LIMIT 10";
      const { rows } = await pool.query(sqlQuery);
      res.render('index', {lg: 'pt-BR', artigos: rows, class: 'artigo' });
    } catch (error) {
      console.error("Erro ao buscar artigos para a página inicial:", error);
      res.status(500).send("Não foi possível carregar os artigos.");
    }
});

app.get('/cursos', async (req, res) => {
    try {
      const sqlQuery = "SELECT s.id,s.section_name,COALESCE(json_agg(json_build_object( 'id', c.id,'nome', c.name,'descricao', c.name,'imagem', c.image_url) ORDER BY c.name) FILTER (WHERE c.id IS NOT NULL),'[]'::json) as cursos FROM sections s LEFT JOIN course_sections cs ON s.id = cs.section_id LEFT JOIN     courses c ON cs.course_id = c.id GROUP BY s.id, s.section_name ORDER BY  s.section_name ASC;";
      
      const { rows } = await pool.query(sqlQuery);
      //console.log(rows[0].cursos)
      res.render('cursos', {lg: 'pt-BR', secoes: rows, class: 'artigo' });
    } catch (error) {
      console.error("Erro ao buscar artigos para a página inicial:", error);
      res.status(500).send("Não foi possível carregar os artigos.");
    }
});

app.get('/curso/:id', async (req, res) => {
     const { id } = req.params;
    try {
      const sqlQuery = "SELECT c.id,c.name,c.image_url,COALESCE(json_agg(json_build_object('id',l.id,'nome',l.title,'aslug', l.slug)ORDER BY l.lesson_order ASC)FILTER(WHERE l.id IS NOT NULL),'[]'::json) AS aulas FROM courses c LEFT JOIN aulas l ON c.id = l.course_id WHERE c.id = $1 GROUP BY c.id, c.name, c.image_url;";
      
      const { rows } = await pool.query(sqlQuery, [id]);
      console.log(rows[0].aulas)
      //console.log(rows[0].cursos)
      res.render('aulas', {lg: 'pt-BR', curso: rows[0], class: 'artigo' });
    } catch (error) {
      console.error("Erro ao buscar artigos para a página inicial:", error);
      res.status(500).send("Não foi possível carregar os artigos.");
    }
});
 


app.get('/artigo/:slug', async (req, res) => {
    const { slug } = req.params;
    const sqlQuery = "SELECT * FROM artigos WHERE slug = $1";
    try {
      const { rows } = await pool.query(sqlQuery, [slug]);
      const artigo = rows[0];
      if (!artigo) { return res.status(404).send('Artigo não encontrado'); }
      const metaDescription = artigo.conteudo.replace(/<[^>]*>?/gm, '').substring(0, 155).trim().replace(/"/g, '&quot;') + '...';
      res.render('artigo', {lg: 'pt-BR', artigo, metaDescription, urlCanonica: `${SITE_URL}/artigo/${artigo.slug}` });
    } catch (error) {
      console.error(`Erro ao buscar o artigo com slug "${slug}":`, error);
      res.status(500).send("Erro ao carregar o artigo.");
    }
});

app.get('/learn/:slug', async (req, res) => {
    const { slug } = req.params;
    const sqlQuery = "SELECT * FROM aulas WHERE slug = $1";
    try {
      const { rows } = await pool.query(sqlQuery, [slug]);
      console.log(rows[0])
      const artigo = {conteudo: rows[0].content, slug: rows[0].slug, titulo: rows[0].title, data_criacao: rows[0].data_criacao};
      if (!artigo) { return res.status(404).send('Artigo não encontrado'); }
      const metaDescription = artigo.conteudo.split(' ').slice(0, 10)
      res.render('artigo', { lg: 'en-US',artigo, metaDescription, urlCanonica: `${SITE_URL}/learn/${artigo.slug}` });
    } catch (error) {
      console.error(`Erro ao buscar o artigo com slug "${slug}":`, error);
      res.status(500).send("Erro ao carregar o artigo.");
    }
});



// --- INICIALIZAÇÃO DO SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Servidor rodando em ${SITE_URL}`);
  
  // Cria o sitemap do zero quando o servidor é iniciado.
  criarSitemapInicial();
  // crie atualiza do sitemap a cada 1h
    setInterval(criarSitemapInicial, 3600000); // 1 hora em milissegundos
});