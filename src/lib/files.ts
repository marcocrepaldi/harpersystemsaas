export async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);

  // Converte em "binary string" em blocos para evitar "Maximum call stack size exceeded"
  let binary = '';
  const CHUNK = 0x8000; // 32KB
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const sub = bytes.subarray(i, i + CHUNK);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    binary += String.fromCharCode.apply(null, Array.from(sub) as any);
  }
  return btoa(binary); // sem data-uri; o chamador adiciona se precisar
}
