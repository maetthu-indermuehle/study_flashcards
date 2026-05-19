# Deploying Study Flashcards on OpenShift

This directory contains a Helm chart for deploying the app on any OpenShift cluster.
The chart is designed to work with OpenShift's default security context constraints
(arbitrary non-root UID injection).

---

## What the chart deploys

```
Deployment (flashcards)
  init container: prisma migrate deploy   — tools image, retries until DB is ready
  app container:  node server.js          — runner image, Next.js standalone

Service  (ClusterIP, port 80 → 3000)
Ingress  (Kubernetes Ingress, cert-manager Let's Encrypt via letsencrypt-production)
Secret   (DATABASE_URL, SESSION_SECRET, seed credentials)
Job      (post-install hook — creates the initial admin user and imports question data)

# Optional — enabled by default, disable when using a managed database:
StatefulSet      (PostgreSQL 17 via bitnami/postgresql:17 — arbitrary-UID compatible)
Service/headless (StatefulSet DNS)
Secret           (PostgreSQL username + password)
```

**Two Docker images** are published to `ghcr.io/maetthu-indermuehle/study-flashcards`:

| Tag | Purpose |
|---|---|
| `:latest` | Production Next.js standalone server |
| `:tools` | Prisma CLI + seed script + question bank (used by init container and seed Job) |

---

## Prerequisites

- OpenShift or Kubernetes cluster
- `cert-manager` with a `letsencrypt-production` ClusterIssuer (standard on APPUiO)
- Helm 3.x
- A namespace you have `edit` access to

---

## Quick start (built-in PostgreSQL)

### 1. Download the chart

```bash
curl -fsSL https://api.github.com/repos/maetthu-indermuehle/study_flashcards/tarball/main \
  -o study_flashcards.tar.gz
tar -xzf study_flashcards.tar.gz --wildcards '*/deploy/helm' --strip-components=1
```

### 2. Create a values override file

```yaml
# my-values.yaml
ingress:
  host: flashcards.example.com   # your domain (CNAME → cluster ingress)

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
  --wait --timeout 20m
```

The post-install seed Job creates the admin user and imports the question bank.
Log in at `https://flashcards.example.com/login`.

---

## Using an external / managed database

Set `postgres.enabled=false` and supply a `DATABASE_URL` directly:

```yaml
# my-values.yaml
postgres:
  enabled: false
```

```bash
helm upgrade --install flashcards ./deploy/helm \
  --namespace <your-namespace> \
  --values my-values.yaml \
  --set secrets.databaseUrl="postgresql://user:pass@host:5432/db" \
  --set secrets.sessionSecret="$(openssl rand -base64 32)" \
  --set secrets.seedAdminEmail="admin@example.com" \
  --set secrets.seedAdminPassword="<choose-a-password>" \
  --wait --timeout 20m
```

---

## Required values

| Value | When required | Description |
|---|---|---|
| `postgres.password` | `postgres.enabled=true` (default) | PostgreSQL password |
| `secrets.databaseUrl` | `postgres.enabled=false` | Full Prisma connection string |
| `secrets.sessionSecret` | always | Session signing key, **min 32 chars** |
| `secrets.seedAdminEmail` | always | Initial admin user e-mail |
| `secrets.seedAdminPassword` | always | Initial admin user password |

Never commit secret values — always pass via `--set` or CI secrets.

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
    ├── ingress.yaml              — Kubernetes Ingress (cert-manager Let's Encrypt)
    ├── secret.yaml               — DATABASE_URL, SESSION_SECRET, seed creds
    ├── seed-job.yaml             — post-install Job: creates admin user + imports cards
    ├── postgres-statefulset.yaml — PostgreSQL 17 StatefulSet (postgres.enabled=true)
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
repository, which holds the APPUiO-specific values (VSHN AppCat PostgreSQL, namespace,
hostname) and the GitHub Actions deploy workflow.
