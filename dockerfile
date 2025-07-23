# Use uma imagem base oficial do Node.js.
# Aqui usamos a versão 20, que é uma versão LTS (Long Term Support).
# A versão 'alpine' é menor e mais leve.
FROM node:20-alpine

# Define o diretório de trabalho dentro do container.
# Todas as instruções a seguir serão executadas a partir deste diretório.
WORKDIR /usr/src/app

# Copia os arquivos de definição de dependência (package.json e package-lock.json) para o diretório de trabalho.
# Isso permite que o Docker utilize o cache para a etapa de instalação das dependências,
# tornando o processo mais rápido se os arquivos não mudarem.
COPY package*.json ./

# Instala todas as dependências da aplicação.
RUN npm install

# Copia todo o código-fonte da sua aplicação para o diretório de trabalho.
# O ponto '.' no final significa "copie tudo do diretório atual para o diretório de trabalho do container".
COPY . .

# Expõe a porta 3000, que é a porta padrão para muitas aplicações Node.js.
# Isso apenas informa ao Docker que o container "escutará" nessa porta em tempo de execução.
EXPOSE 8000

# Define o comando que será executado quando o container for iniciado.
# Neste caso, ele inicia a aplicação com 'node index.js'.
CMD [ "node", "index.js" ]