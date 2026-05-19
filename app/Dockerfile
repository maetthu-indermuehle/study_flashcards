# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS development
ENV NODE_ENV=development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]

# tools stage is built from Dockerfile.tools at the repo root, which can also
# access data/questions/ to bake the question bank into the image.

FROM deps AS builder
COPY . .
RUN npm run prisma:generate && npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# OpenShift commonly injects an arbitrary user ID. Making the app directory
# group-readable/executable lets that user run the standalone Next.js server.
COPY --from=builder --chown=0:0 /app/public ./public
COPY --from=builder --chown=0:0 /app/.next/standalone ./
COPY --from=builder --chown=0:0 /app/.next/static ./.next/static
RUN chmod -R g=u /app

EXPOSE 3000
CMD ["node", "server.js"]
