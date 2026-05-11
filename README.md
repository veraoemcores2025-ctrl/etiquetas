# Etiquetas ZPL

Plataforma local para converter arquivos `.zpl` ou `.txt` de etiquetas em PDF 4x6 / 100 x 150 mm.

## Como rodar

```bash
npm install
npm start
```

Depois abra:

```text
http://localhost:3210
```

## Recursos

- Analisa arquivos ZPL direto no navegador.
- Mostra etiquetas reais, blocos ZPL e lotes.
- Gera PDF completo 4x6 e salva em `Downloads`.
- Limite inicial de 200 etiquetas por arquivo.
- Mantém teste de impressão direta ZPL para impressoras compatíveis.

## Deploy na Vercel

O projeto já inclui `api/` e `vercel.json`.

Na Vercel, a plataforma funciona em modo web:

- Gera o PDF completo 4x6 para download no navegador.
- Esconde impressão direta ZPL, porque a Vercel não acessa impressoras locais.
- Não salva em `Downloads` diretamente, porque isso só é possível no modo local.
