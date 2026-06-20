FROM node:22-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

WORKDIR /workspace

FROM base AS builder

ARG DATABASE_URL=postgresql://visa_user:visa_password@postgres:5432/visa_platform
ENV DATABASE_URL=$DATABASE_URL

COPY . .

RUN pnpm install --frozen-lockfile \
    && pnpm --filter @visa-platform/config build \
    && pnpm --filter @visa-platform/database build \
    && pnpm --filter @visa-platform/types build \
    && pnpm --filter @visa-platform/worker build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /workspace

RUN addgroup --system --gid 1001 appgroup \
    && adduser --system --uid 1001 --ingroup appgroup appuser \
    && mkdir -p /workspace/uploads \
    && chown -R appuser:appgroup /workspace

COPY --from=builder --chown=appuser:appgroup /workspace/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /workspace/apps/worker/package.json ./apps/worker/package.json
COPY --from=builder --chown=appuser:appgroup /workspace/apps/worker/dist ./apps/worker/dist
COPY --from=builder --chown=appuser:appgroup /workspace/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=builder --chown=appuser:appgroup /workspace/packages/config/package.json ./packages/config/package.json
COPY --from=builder --chown=appuser:appgroup /workspace/packages/config/dist ./packages/config/dist
COPY --from=builder --chown=appuser:appgroup /workspace/packages/config/node_modules ./packages/config/node_modules
COPY --from=builder --chown=appuser:appgroup /workspace/packages/database/package.json ./packages/database/package.json
COPY --from=builder --chown=appuser:appgroup /workspace/packages/database/dist ./packages/database/dist
COPY --from=builder --chown=appuser:appgroup /workspace/packages/database/node_modules ./packages/database/node_modules
COPY --from=builder --chown=appuser:appgroup /workspace/packages/types/package.json ./packages/types/package.json
COPY --from=builder --chown=appuser:appgroup /workspace/packages/types/dist ./packages/types/dist

USER appuser

CMD ["node", "apps/worker/dist/index.js"]
