import requests
from bs4 import BeautifulSoup
import time
import psycopg2
from psycopg2 import extras

# --- CONFIGURAÇÕES DO BANCO DE DADOS (PREENCHA COM SEUS DADOS) ---
DB_NAME = "tuddo"
DB_USER = "postgres"
DB_PASSWORD = "a850d1b912eb7f2d9cf6"
DB_HOST = "45.165.244.102"
DB_PORT = "5432"

# --- CONFIGURAÇÕES DE SCRAPING ---
SELETOR_AULAS = 'li.leftmenu'


def buscar_cursos_sem_aulas(conn):
    """Busca no banco de dados todos os cursos que ainda não têm aulas cadastradas."""
    sql = """
        SELECT c.id, c.name, c.link_url
        FROM courses c
        LEFT JOIN aulas a ON c.id = a.course_id
        WHERE a.id IS NULL;
    """
    cursos_pendentes = []
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
            colunas = [desc[0] for desc in cur.description]
            for linha in cur.fetchall():
                cursos_pendentes.append(dict(zip(colunas, linha)))
    except Exception as e:
        print(f"Erro ao buscar cursos pendentes: {e}")
        return []
    return cursos_pendentes


def inserir_aulas_em_lote(conn, aulas_data):
    """Insere uma lista de aulas, incluindo a ordem, de uma só vez no banco."""
    if not aulas_data:
        return

    # MUDANÇA 1: Adicionamos a coluna 'ordem' no INSERT
    sql = "INSERT INTO aulas (course_id, title, lesson_order) VALUES (%s, %s, %s);"
    
    try:
        with conn.cursor() as cur:
            psycopg2.extras.execute_batch(cur, sql, aulas_data)
        conn.commit()
        print(f"     ... Sucesso! {len(aulas_data)} aulas salvas no banco em lote.")
    except Exception as e:
        print(f"     ... ERRO ao inserir em lote no banco: {e}")
        conn.rollback()


def main():
    conn = None
    try:
        print("Conectando ao banco de dados PostgreSQL...")
        conn = psycopg2.connect(dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, host=DB_HOST, port=DB_PORT)
        print("Conexão estabelecida.")

        print("\nBuscando cursos sem aulas cadastradas...")
        lista_de_cursos = buscar_cursos_sem_aulas(conn)
        
        if not lista_de_cursos:
            print("Nenhum curso pendente encontrado.")
            return
            
        print(f"Encontrados {len(lista_de_cursos)} cursos para processar.")

        for i, curso in enumerate(lista_de_cursos):
            course_id = curso.get('id')
            link_url = curso.get('link_url')
            course_name = curso.get('name')

            if not all([course_id, link_url, course_name]):
                continue

            print(f"\n{'='*50}")
            print(f"PROCESSANDO CURSO {i+1}/{len(lista_de_cursos)}: '{course_name}' (ID: {course_id})")
            time.sleep(2)

            try:
                response_pagina = requests.get(link_url, timeout=15)
                response_pagina.raise_for_status()
                soup = BeautifulSoup(response_pagina.text, 'html.parser')
                elementos_aulas = soup.select(SELETOR_AULAS)
                
                if not elementos_aulas:
                    print(f"AVISO: Nenhuma aula encontrada para o curso '{course_name}'.")
                    continue
                
                aulas_para_inserir = []
                print(f"Encontradas {len(elementos_aulas)} aulas. Coletando dados com a ordem...")

                # MUDANÇA 2: Usamos enumerate para obter o índice (ordem) de cada item
                for ordem, aula_li in enumerate(elementos_aulas, start=1):
                    texto_aula = aula_li.get_text(strip=True)
                    if texto_aula:
                        # MUDANÇA 3: Adicionamos a ordem à tupla de dados
                        aulas_para_inserir.append((course_id, texto_aula, ordem))
                
                if aulas_para_inserir:
                    inserir_aulas_em_lote(conn, aulas_para_inserir)

            except requests.exceptions.RequestException as e_page:
                print(f"ERRO ao acessar a página do curso '{course_name}'. Pulando. Erro: {e_page}")

    except Exception as e:
        print(f"Ocorreu um erro geral no processo: {e}")
    finally:
        if conn is not None:
            conn.close()
            print("\nConexão com o banco de dados fechada.")
        print(f"\n{'*'*50}\nPROCESSO CONCLUÍDO!\n{'*'*50}")


if __name__ == "__main__":
    main()