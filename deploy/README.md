# Deploying PPL Flashcards on OpenShift

This directory contains a Helm chart for deploying the app on any OpenShift cluster.
The chart is designed to work with OpenShift's default security context constraints
(arbitrary non-root UID injection).

---

## What the chart deploys

```
Deployment (flashcards)
  init container: prisma migrate deploy   — tools image, retries until DB is ready
  app container:  node server.js          — runner image, Next.js standalone

StatefulSet (PostgreSQL 17 via bitnami/postgresql:17 — arbitrary-UID compatible)
Service (ClusterIP, port 80 → 3000)
Route (OpenShift Route, edge TLS, Let's Encrypt via kubernetes.io/tls-acme)
Secret (DATABASE_URL, SESSION_SECRET, seed credentials)
Job (post-install hook — creates the initial admin user)
```

**Two Docker images** are published to `ghcr.io/maetthu-indermuehle/study-flashcards`:

| Tag | Purpose |
|---|---|
| `:latest` | Production Next.js standalone server |
| `:tools` | Prisma CLI + seed script (used by init container and seed Job) |

---

## Prerequisites

- OpenShift cluster with a `route.openshift.io` API (any OCP/OKD 4.x)
- `cert-manager` with Let's Encrypt configured (for `kubernetes.io/tls-acme` annotation)
- Helm 3.x
- A namespace you have `edit` access to

---

## Quick start

### 1. Download the chart

```bash
curl -fsSL https://api.github.com/repos/maetthu-indermuehle/study-flashcards/tarball/main \
  -o study-flashcards.tar.gz
tar -xzf study-flashcards.tar.gz --wildcards '*/deploy/helm' --strip-components=1
```

### 2. Create a values override file

```yaml
# my-values.yaml
route:
  host: flashcards.example.com   # your domain (CNAME → OpenShift router)

postgres:
  storageSize: 2Gi
```

### 3. Install

```bash
helm upgrade --install flashcards ./deploy/helm \
  --namespace <your-namespace> \
  --values my-values.yaml \
  --set postgres.password="$(openssl rand -base64 24)" \
  --set secrets.sessionSecret="$(openssl rand -base64 32)" \
  --set secrets.seedAdminEmail="admin@example.com" \
  --set secrets.seedAdminPassword="<choose-a-password>" \
  --wait
```

The post-install seed Job creates the admin user on first install.
Log in at `https://flashcards.example.com/login` and import questions via `/import`.

---

## Required values

All four must be supplied via `--set` (never commit secrets to values files):

| Value | Description |
|---|---|
| `postgres.password` | PostgreSQL password |
| `secrets.sessionSecret` | Session signing key, **min 32 chars** (`openssl rand -base64 32`) |
| `secrets.seedAdminEmail` | Initial admin user e-mail |
| `secrets.seedAdminPassword` | Initial admin user password |

---

## Helm chart structure

```
deploy/helm/
├── Chart.yaml
├── values.yaml                   — defaults (override with -f or --set)
└── templates/
    ├── _helpers.tpl              — shared template helpers
    ├── deployment.yaml           — app Deployment + migration init container
    ├── service.yaml              — ClusterIP Service (port 80 → 3000)
    ├── route.yaml                — OpenShift Route (edge TLS)
    ├── secret.yaml               — DATABASE_URL, SESSION_SECRET, seed creds
    ├── seed-job.yaml             — post-install Job: creates admin user
    ├── postgres-statefulset.yaml — PostgreSQL 17 StatefulSet
    ├── postgres-service.yaml     — headless Service for StatefulSet DNS
    └── postgres-secret.yaml      — PostgreSQL username + password
```

---

## Private image pull (if the ghcr.io package is private)

```bash
kubectl create secret docker-registry ghcr-pull-secret \
  --namespace <your-namespace> \
  --docker-server=ghcr.io \
  --docker-username=<github-user> \
  --docker-password=<PAT-with-read:packages>

helm upgrade --install flashcards ./deploy/helm \
  ... \
  --set imagePullSecretName=ghcr-pull-secret
```

---

## APPUiO deployment

The actual deployment to APPUiO cloudscale-lpg-2 is managed from the
[metar_display-appuio](https://github.com/maetthu-indermuehle/metar_display-appuio)
repository, which holds the APPUiO-specific values and the GitHub Actions deploy workflow.
