// JARVIS // Worker do Cloudflare
// Guarda a chave da Anthropic em segredo e responde as perguntas vindas do celular.
// Variáveis (Settings > Variables and Secrets): ANTHROPIC_KEY (chave) e TOKEN (sua senha).
// Opcional: MODEL (ex.: claude-haiku-5-5 para respostas mais baratas e rápidas). Padrão: claude-sonnet-5-5.

export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'content-type,x-token',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    };
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, 'content-type': 'application/json' } });

    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('JARVIS online', { headers: cors });
    if (!env.TOKEN || req.headers.get('x-token') !== env.TOKEN) return json({ error: 'senha incorreta' }, 401);

    let body;
    try { body = await req.json(); } catch (e) { return json({ error: 'pedido inválido' }, 400); }

    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }))
      .slice(-12);
    while (messages.length && messages[0].role !== 'user') messages.shift();
    if (!messages.length) return json({ error: 'sem mensagem' }, 400);

    const system =
      'Você é o J.A.R.V.I.S., assistente de IA sofisticado, calmo e com um toque sutil de humor britânico. ' +
      'Trate o usuário por "senhor". Responda sempre em português do Brasil. ' +
      'Suas respostas aparecem em uma tela de TV e são lidas em voz alta, então: no máximo 2 ou 3 frases curtas ' +
      '(até cerca de 250 caracteres), sem markdown, sem listas, sem emojis. ' +
      'Se faltar informação em tempo real, diga isso com honestidade em vez de inventar. ' +
      'O usuário mora em Imbituba, Santa Catarina, Brasil. ' +
      'Data e hora atuais do usuário: ' + String(body.now || 'desconhecida') + '.';

    let r;
    try {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ model: env.MODEL || 'claude-sonnet-5-5', max_tokens: 400, system, messages })
      });
    } catch (e) { return json({ error: 'falha ao falar com a IA' }, 502); }

    const j = await r.json().catch(() => ({}));
    const reply = j.content && j.content[0] && j.content[0].text ? j.content[0].text.trim() : '';
    if (!reply) return json({ error: (j.error && j.error.message) || 'sem resposta da IA' }, 502);
    return json({ reply });
  }
};
