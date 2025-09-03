export async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  // sem data-uri prefix: backend aceita dos dois jeitos
  const base64 = typeof window === 'undefined'
    ? Buffer.from(buf).toString('base64')
    : btoa(String.fromCharCode(...new Uint8Array(buf)));
  return base64;
}
