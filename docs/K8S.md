# Helix on Kubernetes (sidecar)

Mode A analogue: Helix container shares the pod network with the app, terminates client traffic on `:4080`, proxies to `127.0.0.1:<app>`.

Manifest: [deploy/k8s/helix-sidecar.yaml](../deploy/k8s/helix-sidecar.yaml)  
Image: root [Dockerfile](../Dockerfile) → `helix-proxy`

## Prove locally (no cluster)

```bash
npm run k8s-image-smoke              # docker build -t helix:local
HELIX_K8S_FULL=1 npm run k8s-image-smoke   # run container + /__helix/healthz
```

## Build / tag / push

```bash
# Tag only (writes deploy/k8s/helix-sidecar.rendered.yaml)
HELIX_IMAGE_REGISTRY=ghcr.io/your-org npm run k8s-push

# Push + optional apply
HELIX_IMAGE_REGISTRY=ghcr.io/your-org HELIX_IMAGE_TAG=$(git rev-parse --short HEAD) \
  HELIX_IMAGE_PUSH=1 npm run k8s-push

HELIX_IMAGE_REGISTRY=ghcr.io/your-org HELIX_IMAGE_PUSH=1 HELIX_K8S_CLUSTER=1 npm run k8s-push
```

Without `HELIX_IMAGE_REGISTRY`, `k8s-push` exits `K8S_PUSH_SKIP` (CI-safe).

## Deploy

1. Put certified DNA in the ConfigMap (`helix-dna`) or mount a Secret  
2. Set `MODE=shadow` first; soak; then `enforce`  
3. Tail SIEM: volume `/var/log/helix` + Filebeat ([FILEBEAT.md](./FILEBEAT.md))  
4. After promote: replace ConfigMap data + restart pod, or mount a writable DNA file and `POST /__helix/reload`

```bash
kubectl apply -f deploy/k8s/helix-sidecar.rendered.yaml
kubectl port-forward svc/demo-helix 4080:80
curl -sS http://127.0.0.1:4080/__helix/healthz
```

DNA-only — no CWL required (D5).
