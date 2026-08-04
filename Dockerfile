# Helix — DNA firewall (HTTP reverse proxy)
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY packages ./packages
COPY schemas ./schemas
COPY fixtures ./fixtures
COPY certificates ./certificates
COPY scripts ./scripts
RUN mkdir -p /data
ENV UPSTREAM=http://127.0.0.1:4090 \
    MODE=learn \
    DNA=/data/app.dna.json \
    OBSERVE=/data/observations.ndjson \
    SHADOW_LOG=/data/shadow.ndjson \
    PORT=4080 \
    APP_ID=app
EXPOSE 4080
CMD ["node", "packages/helix-proxy/server.mjs"]
