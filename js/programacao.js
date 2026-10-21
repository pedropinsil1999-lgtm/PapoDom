/* Papo Dom · programação. Fonte única: a seção Atrações e a Programação leem daqui.
   Horários de Brasília (UTC−3). Para mudar um horário, troque só aqui.
   tipo: Palestra, Oficina, Dança ou Estande (vazio = "Atração"). slots: um por dia em que a pessoa participa. */
(function () {
  var P = window.PAPO_PROG = {
    dias: [
      { id: '27', data: '2026-10-27', rotulo: '27/10', semana: 'Terça' },
      { id: '28', data: '2026-10-28', rotulo: '28/10', semana: 'Quarta' }
    ],
    // eixo da linha do tempo (minutos desde 0h)
    eixo: { ini: 19 * 60, fim: 21 * 60 + 30 },
    atracoes: [
      { id: 'victoria', nome: 'Victória Felbinger', curto: 'Victória', tipo: 'Palestra', foto: 'assets/atracoes/victoria-felbinger.webp', slots: [{ dia: '27', ini: '19:20', fim: '20:00' }] },
      { id: 'fernando', nome: 'Fernando Arcanjo', curto: 'Fernando', tipo: 'Palestra', foto: 'assets/atracoes/fernando-arcanjo.webp', slots: [{ dia: '27', ini: '20:00', fim: '20:40' }] },
      { id: 'bea', nome: 'Beatriz Lemes', curto: 'Bea', tipo: 'Oficina', foto: 'assets/atracoes/beatriz-lemes.webp', slots: [{ dia: '27', ini: '20:20', fim: '21:20' }] },
      { id: 'mamutus', nome: 'Pedro Mamutus', curto: 'Pedro Mamutus', tipo: 'Palestra', foto: 'assets/atracoes/pedro-mamutus.webp', slots: [{ dia: '28', ini: '19:10', fim: '19:50' }] },
      { id: 'joao', nome: 'João Pedro', curto: 'João Pedro', tipo: 'Dança', foto: 'assets/atracoes/joao-pedro.webp', slots: [{ dia: '28', ini: '19:50', fim: '20:20' }] },
      { id: 'ivan', nome: 'Ivan Viana', curto: 'Ivan', tipo: 'Palestra', foto: 'assets/atracoes/ivan-viana.webp', slots: [{ dia: '28', ini: '20:20', fim: '21:15' }] },
      { id: 'ariel', nome: 'Ariel Morgana', curto: 'Ariel', tipo: 'Palestra', foto: 'assets/atracoes/ariel-morgana.webp', slots: [{ dia: '28', ini: '20:30', fim: '21:30' }] },
      { id: 'luiza', nome: 'Luiza', curto: 'Luiza', tipo: 'Estande', fixo: true, foto: 'assets/atracoes/luiza.webp', slots: [{ dia: '27', ini: '19:00', fim: '21:00' }, { dia: '28', ini: '19:00', fim: '21:00' }] }
    ]
  };

  function min(hhmm) { var p = hhmm.split(':'); return +p[0] * 60 + +p[1]; }
  function dia(id) { for (var i = 0; i < P.dias.length; i++) if (P.dias[i].id === id) return P.dias[i]; return P.dias[0]; }
  P.min = min;
  P.dia = dia;
  P.tipo = function (a) { return a.tipo || 'Atração'; };
  // "19:20" → "19h20"; "20:00" → "20h"
  P.hora = function (hhmm) { var p = hhmm.split(':'); return +p[0] + 'h' + (p[1] === '00' ? '' : p[1]); };
  P.faixa = function (s) { return P.hora(s.ini) + '–' + P.hora(s.fim); };
  // instantes absolutos (ms) de um slot, no fuso de Brasília
  P.quando = function (s) {
    var d = dia(s.dia).data;
    return { ini: Date.parse(d + 'T' + s.ini + ':00-03:00'), fim: Date.parse(d + 'T' + s.fim + ':00-03:00') };
  };
  // 'antes' | 'aovivo' | 'passou'
  P.estado = function (s, agora) { var q = P.quando(s); return agora < q.ini ? 'antes' : agora < q.fim ? 'aovivo' : 'passou'; };
  // estado geral da pessoa (ao vivo em algum slot > antes > passou)
  P.estadoDe = function (a, agora) {
    var e = a.slots.map(function (s) { return P.estado(s, agora); });
    return e.indexOf('aovivo') >= 0 ? 'aovivo' : e.indexOf('antes') >= 0 ? 'antes' : 'passou';
  };
  P.quandoTexto = function (a) {
    if (a.slots.length > 1) return a.slots.map(function (s) { return s.dia; }).join(' e ') + '/10 · ' + P.faixa(a.slots[0]);
    var s = a.slots[0], d = dia(s.dia);
    return d.semana.slice(0, 3) + ' ' + d.rotulo + ' · ' + P.faixa(s);
  };
  // pedir à Programação para mostrar uma atração (Atrações → cronograma)
  P.mostrar = function (id) { window.dispatchEvent(new CustomEvent('papo:programacao', { detail: { id: id } })); };
})();
