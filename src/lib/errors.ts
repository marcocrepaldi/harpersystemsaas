export function errorMessage(err: unknown): string {
  const raw =
    (typeof err === 'object' && err && 'message' in err && (err as any).message) ||
    (typeof err === 'string' ? err : '');

  let msg = String(raw || 'Falha ao processar a solicitação.');

  // Limita primeiro para evitar regex em strings gigantes (ex.: base64 enorme)
  if (msg.length > 2000) msg = msg.slice(0, 2000) + '…';

  // Remove data URL/base64 que porventura tenham sobrado
  msg = msg.replace(/data:[\w.+-]+\/[\w.+-]+;base64,[A-Za-z0-9+/=]+/g, '[base64]');

  return msg;
}
