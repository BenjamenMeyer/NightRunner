# NOTE: VITE_ environment variables are baked into the JS bundle at build time.
# They CANNOT be injected at runtime. Pass them as Docker build arguments:
#   docker build \
#     --build-arg VITE_API_BACKEND_URL=https://api.example.com/v1 \
#     --build-arg VITE_BACKEND_URL=https://api.example.com \
#     --build-arg VITE_OIDC_AUTHORITY=https://auth.example.com \
#     --build-arg VITE_OIDC_CLIENT_ID=my-client-id \
#     -t nightrunner-frontend .

# ── Stage 1: builder ─────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npm ci

COPY . .

ARG VITE_API_BACKEND_URL=http://localhost:8000/v1
ARG VITE_BACKEND_URL=http://localhost:8000
ARG VITE_OIDC_AUTHORITY=http://localhost:4000
ARG VITE_OIDC_CLIENT_ID=client-id

ENV VITE_API_BACKEND_URL=$VITE_API_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_OIDC_AUTHORITY=$VITE_OIDC_AUTHORITY
ENV VITE_OIDC_CLIENT_ID=$VITE_OIDC_CLIENT_ID

# Use npx vite build directly — npm run build invokes env-cmd which requires
# .env.local and will fail in Docker where that file is not present.
RUN npx vite build

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
