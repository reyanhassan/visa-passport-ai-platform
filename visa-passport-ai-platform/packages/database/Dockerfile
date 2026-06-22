FROM node:22-alpine AS migrate

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

WORKDIR /workspace

COPY . .

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @visa-platform/database...

CMD ["sh", "-c", "pnpm --filter @visa-platform/database db:generate && pnpm --filter @visa-platform/database db:deploy"]
