# Papo Dom · Conexões — 15ª edição

Site do evento, exportado do Claude Design e separado em arquivos.

## Rodar localmente

```
node serve.js
```

Abra http://localhost:5173. É preciso usar um servidor: abrir o `index.html` direto no navegador não funciona, porque as seções são carregadas via `fetch`.

## Estrutura

- `index.html`: página principal (menu, trilho lateral, cortina de abertura, cursor e a lógica de rolagem e transições)
- `Home.dc.html` … `Fecho.dc.html`: uma seção por arquivo (marcação + `class Component`)
- `Logo.dc.html`: componente de logo usado pelas seções
- `js/emendas.js`: quais transições acontecem entre as seções (o único ponto a editar para trocar transições)
- `js/transicoes.js`, `js/papo-fx.js`: catálogo de transições e efeitos
- `js/dc-runtime.js`: runtime dos componentes `.dc.html` (gerado, não editar)
- `js/vendor/`: React, GSAP + ScrollTrigger, Lenis
- `assets/`: imagens em WebP, `og.png` (prévia de link, 1200×630), `favicon.png` e `apple-touch-icon.png` · `fonts/`: fontes (Bricolage Grotesque, IBM Plex Mono, Silkscreen, General Sans)
- `_original/`: o HTML standalone exportado e os PNGs originais (`assets-png/`), para referência

## Publicação

O site está em https://papodom.vercel.app, publicado pela Vercel a partir deste repositório. Cada `git push` na branch `main` gera uma nova publicação automaticamente. Não há etapa de build: a Vercel serve os arquivos como estão (`serve.js`, `README.md` e `_original/` ficam de fora via `.vercelignore`).

## Atrações e programação

Nomes, fotos, tipos e horários ficam em `js/programacao.js`: a seção Atrações (polaroids) e a Programação (linha do tempo) leem de lá. Fotos em `assets/atracoes/` (WebP quadrado, 600 px). Para mudar um horário ou acrescentar alguém, edite só esse arquivo.

## Pendências (dependem de conteúdo)

- **Sympla:** em `Evento.dc.html`, trocar "Inscrições em breve pelo Sympla" por um link `<a href="…">Inscreva-se pelo Sympla</a>` (há um comentário no ponto exato).
- **Fotos da turma:** os dois espaços de foto em `Revista.dc.html`.
