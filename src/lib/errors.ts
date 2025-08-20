export function errorMessage(err: unknown): string {
  if (!err) return 'Erro desconhecido.';
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
