import os
import requests
# Importe o conector do seu banco de dados (descomente a linha correspondente)
import psycopg2         # Para PostgreSQL
# import mysql.connector  # Para MySQL
# import sqlite3          # Para SQLite

# --- CONFIGURAÇÃO ---
# 1. Defina a pasta onde as imagens serão salvas
PASTA_DESTINO = 'imagens_cursos'

# 2. Defina sua consulta SQL.
#    IMPORTANTE: A consulta DEVE retornar a URL da imagem como a primeira coluna.
SQL_QUERY = "SELECT image_url FROM courses WHERE image_url IS NOT NULL AND image_url != '';"

# 3. Configure os detalhes da sua conexão com o banco de dados
DB_CONFIG = {
    "postgresql": {
        "host": "45.165.244.102",
        "database": "tuddo",
        "user": "postgres",
        "password": "a850d1b912eb7f2d9cf6"
    },
    "mysql": {
        "host": "localhost",
        "database": "seu_banco",
        "user": "seu_usuario",
        "password": "sua_senha"
    },
    "sqlite": {
        "database_file": "seu_banco.db" # Caminho para o arquivo do banco SQLite
    }
}

# Escolha qual configuração de banco de dados usar: 'postgresql', 'mysql', ou 'sqlite'
DB_TYPE = 'postgresql'
# --- FIM DA CONFIGURAÇÃO ---


def conectar_ao_banco():
    """Cria e retorna uma conexão com o banco de dados com base no DB_TYPE."""
    print(f"Tentando conectar ao banco de dados {DB_TYPE}...")
    try:
        if DB_TYPE == 'postgresql':
            conn = psycopg2.connect(**DB_CONFIG['postgresql'])
            return conn
        elif DB_TYPE == 'mysql':
            conn = mysql.connector.connect(**DB_CONFIG['mysql'])
            return conn
        elif DB_TYPE == 'sqlite':
            conn = sqlite3.connect(DB_CONFIG['sqlite']['database_file'])
            return conn
        else:
            print(f"Erro: Tipo de banco de dados '{DB_TYPE}' não suportado.")
            return None
    except Exception as e:
        print(f"Erro ao conectar ao banco de dados: {e}")
        return None

def baixar_imagem(url, nome_arquivo, pasta_destino):
    """Baixa uma imagem de uma URL e a salva na pasta de destino."""
    try:
        caminho_salvar = os.path.join(pasta_destino, nome_arquivo)
        
        # Faz a requisição para baixar a imagem em chunks (eficiente)
        resposta = requests.get(url, stream=True, timeout=15)
        resposta.raise_for_status()  # Lança um erro se a requisição falhar (ex: 404)

        with open(caminho_salvar, 'wb') as f:
            for chunk in resposta.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f"  -> SUCESSO! Imagem '{nome_arquivo}' salva.")

    except requests.exceptions.RequestException as e:
        print(f"  -> ERRO ao baixar a imagem {url}: {e}")
    except Exception as e:
        print(f"  -> Ocorreu um erro inesperado ao processar {url}: {e}")


def main():
    """Função principal que orquestra todo o processo."""
    
    print(f"Verificando pasta de destino: '{PASTA_DESTINO}'")
    os.makedirs(PASTA_DESTINO, exist_ok=True)

    conn = None
    try:
        conn = conectar_ao_banco()
        if conn is None:
            return

        print("Conexão estabelecida com sucesso.")
        
        cursor = conn.cursor()
        print(f"Executando a consulta: {SQL_QUERY}")
        cursor.execute(SQL_QUERY)
        cursos = cursor.fetchall()
        total_cursos = len(cursos)
        print(f"Encontrados {total_cursos} cursos com URL de imagem.")

        for i, curso in enumerate(cursos):
            image_url = curso[0]
            print(curso[0])
            print(f"\nProcessando curso {i+1}/{total_cursos}...")

            if not image_url or not image_url.strip():
                print("  -> URL vazia. Ignorando.")
                continue

            # --- LÓGICA DE VERIFICAÇÃO ADICIONADA AQUI ---
            try:
                # Pega o nome do arquivo da URL. Links web usam '/', não '\'.
                nome_arquivo = image_url.split('/')[-1].split('?')[0] # Remove query params
                if not nome_arquivo:
                    print(f"  -> Não foi possível extrair um nome de arquivo da URL. Ignorando.")
                    continue

                caminho_arquivo_local = os.path.join(PASTA_DESTINO, nome_arquivo)

                # Verifica se o arquivo já existe
                if os.path.exists(caminho_arquivo_local):
                    print(f"  -> IGNORANDO. O arquivo '{nome_arquivo}' já existe.")
                    continue # Pula para a próxima iteração do loop

            except Exception as e:
                print(f"  -> ERRO ao processar nome do arquivo da URL '{image_url}': {e}")
                continue
            # --- FIM DA VERIFICAÇÃO ---

            print(f"  -> Baixando. URL: {image_url}")
            baixar_imagem(image_url, nome_arquivo, PASTA_DESTINO)

    except Exception as e:
        print(f"Ocorreu um erro fatal durante a execução: {e}")
    finally:
        if conn:
            conn.close()
            print("\nConexão com o banco de dados fechada.")
            
    print("Script concluído.")

if __name__ == "__main__":
    main()