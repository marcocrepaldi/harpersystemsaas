export function errorMessage(err: unknown): string {
  // tenta extrair mensagem "normal"
  const raw =
    (typeof err === 'object' && err && 'message' in err && (err as any).message) ||
    (typeof err === 'string' ? err : '');

  let msg = String(raw || 'Falha ao processar a solicitação.');

  // remove dataURL/base64
  msg = msg.replace(/data:[\w.+-]+\/[\w.+-]+;base64,[A-Za-z0-9+/=]+/g, '[base64]');
  // limita a 500 chars
  if (msg.length > 500) msg = msg.slice(0, 500) + '…';

  return msg;
}
