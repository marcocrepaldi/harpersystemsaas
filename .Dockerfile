# Frontend (Next.js 15) — multi-stage
FROM node:20-alpine AS builder
WORKDIR /app

# Dependências com cache
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else pnpm install --frozen-lockfile; fi

# Código
COPY . .

# Garante que exista /public (caso repo não tenha)
RUN mkdir -p public

# Build de produção
RUN if [ -f yarn.lock ]; then yarn build; else npm run build; fi

# --- Runner ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Apenas o necessário para rodar
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000
# Usa "next start" (já presente nos scripts do package.json)
CMD ["yarn", "start"]
