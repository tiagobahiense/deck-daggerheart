import os
import json

# --- CORREÇÃO AQUI ---
# As cartas estão dentro da pasta 'img', e não soltas na raiz.
# O caminho precisa ser "img/cartas"
diretorio_base = os.path.join("img", "cartas")
arquivo_saida = "lista_cartas.json"

dados_cartas = []

print(f"Tentando ler imagens na pasta: {diretorio_base}...")

# Verificação de segurança: A pasta existe mesmo?
if not os.path.exists(diretorio_base):
    print("\n[ERRO] A pasta não foi encontrada!")
    print(f"O script procurou em: {os.path.abspath(diretorio_base)}")
    print("Certifique-se que a estrutura é: projeto-daggerheart > img > cartas")
else:
    # Varre todas as pastas e pega os arquivos
    for pasta_raiz, _, arquivos in os.walk(diretorio_base):
        for arquivo in arquivos:
            if arquivo.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                caminho_sistema = os.path.join(pasta_raiz, arquivo)
                
                # Corrige as barras invertidas do Windows para barras normais de Web (/)
                caminho_web = caminho_sistema.replace("\\", "/")
                
                # Pega o nome da pasta (ex: Classes) como categoria
                categoria = os.path.basename(pasta_raiz)
                
                dados_cartas.append({
                    "caminho": caminho_web,
                    "nome": os.path.splitext(arquivo)[0],
                    "categoria": categoria
                })

    # Salva num arquivo JSON para o site ler
    with open(arquivo_saida, "w", encoding="utf-8") as f:
        json.dump(dados_cartas, f, ensure_ascii=False, indent=4)

    print(f"\nSucesso! {len(dados_cartas)} cartas mapeadas em '{arquivo_saida}'.")