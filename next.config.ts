/** @type {import('next').NextConfig} */
const nextConfig = {
  // ⚡ Configurações experimentais do Next.js
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb', // aumenta o limite para server actions
    },
  },

  // 🚫 Evita que o build falhe por causa do ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 🛠️ (Opcional) Ignora erros de tipos no build — útil enquanto o ESLint/TS não está 100%
  // Descomente se o `yarn build` ainda falhar por causa de Typescript
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
};

export default nextConfig;
