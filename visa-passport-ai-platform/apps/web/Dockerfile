FROM node:22-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

WORKDIR /workspace

FROM base AS builder

ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG DATABASE_URL=postgresql://visa_user:visa_password@postgres:5432/visa_platform
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV DATABASE_URL=$DATABASE_URL

COPY . .

RUN pnpm install --frozen-lockfile \
    && pnpm --filter @visa-platform/config build \
    && pnpm --filter @visa-platform/database build \
    && pnpm --filter @visa-platform/types build \
    && pnpm --filter @visa-platform/ui build \
    && pnpm --filter @visa-platform/web build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /workspace

RUN addgroup --system --gid 1001 appgroup \
    && adduser --system --uid 1001 --ingroup appgroup appuser \
    && mkdir -p /workspace/apps/web/public/uploads \
    && chown -R appuser:appgroup /workspace

COPY --from=builder --chown=appuser:appgroup /workspace/apps/web/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /workspace/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=appuser:appgroup /workspace/apps/web/public ./apps/web/public

WORKDIR /workspace/apps/web
USER appuser

EXPOSE 3000

CMD ["node", "server.js"]
