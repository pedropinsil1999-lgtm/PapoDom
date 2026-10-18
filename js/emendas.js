/* Papo Dom · emendas entre seções.
   ESTE É O ÚNICO PONTO A EDITAR PARA TROCAR QUALQUER TRANSIÇÃO.

   Seções: 1 Home · 2 Conceito · 3 Linguagens · 4 Revista · 5 TV · 6 Web · 7 Scrapbook · 8 O evento · 9 Fecho

   Catálogo
   T1 corte de página        T5 deslize com profundidade (neutra, pode repetir até 3x)
   T2 varredura sólida (≤2x) T6 corrida horizontal (só ≥1024px)
   T3 portal tipográfico (1x, emenda 1 ou 8)   T7 cortina de scanline
   T4 empilhamento de adesivo                  T8 inversão de cor (só entre paletas diferentes)
   T0 corte rasgado (sem animação: a seção de entrada tem borda de papel rasgado)
   T17 minimizar (barra de tarefas; o cursor minimiza as janelas [data-win] e restaura a seção nova)
   T14 empurrão com inércia (a nova entra pela direita empurrando a anterior; inclina com a velocidade)
   T11 bastidores (os cards [data-block] giram; o verso tem a cor da seção nova e cobre a tela)
   T10 a logo assina (a seção sai como no T5; a logo viaja até a marca [data-mark] da seção nova)
   T9 deslize lateral (side: "left" para vir da esquerda; padrão: direita;
      keepBg: true mantém o fundo parado e move só os componentes — use entre seções de mesmo fundo)

   Regras: nunca a mesma transição em emendas consecutivas.
   Abaixo de 768px, T6, T7 e T9 caem para T5 automaticamente (T3 continua, é só rolagem). */

{ // bloco: evita erro se o script for avaliado duas vezes

const JOINTS = [
  { from: 1, to: 2, transition: "T10" },                // a logo vai para o canto superior esquerdo do Conceito
  { from: 2, to: 3, transition: "T9", keepBg: true },  // pela direita; fundo parado, só o conteúdo cruza
  { from: 3, to: 4, transition: "T11" },                // os cards giram e o verso vira a seção da turma
  { from: 4, to: 5, transition: "T14" },                // a TV entra pela direita empurrando a turma, com inércia
  { from: 5, to: 6, transition: "T5" },
  { from: 6, to: 7, transition: "T17" },                // janelas minimizam na barra de tarefas; Atrações se restaura
  { from: 7, to: 8, transition: "T5" },
  { from: 8, to: 9, transition: "T5" }
];

/* Só para revisar o catálogo (Tweaks → Emendas → Demonstração). Respeita as regras acima. */
const JOINTS_DEMO = [
  { from: 1, to: 2, transition: "T3" },
  { from: 2, to: 3, transition: "T7" },
  { from: 3, to: 4, transition: "T8" },
  { from: 4, to: 5, transition: "T4" },
  { from: 5, to: 6, transition: "T6" },
  { from: 6, to: 7, transition: "T2" },
  { from: 7, to: 8, transition: "T1" },
  { from: 8, to: 9, transition: "T5" }
];

window.PAPO_JOINTS = { JOINTS: JOINTS, JOINTS_DEMO: JOINTS_DEMO };
}
