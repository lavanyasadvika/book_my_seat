# SeatSync

Real-time seat & slot booking platform. See [`backend/README.md`](backend/README.md)
and [`frontend/README.md`](frontend/README.md) for what the app actually does.
This file covers how the two are packaged and deployed.

## The pattern: two environments, one shape

Both environments run the same three containers, wired the same way — only the
orchestrator differs.

```
LOCAL / DEMO (docker compose)          CLOUD (Azure Container Instances)
┌───────────────────────────┐          ┌───────────────────────────┐
│  postgres  backend  frontend │  ≈ same ≈  │  postgres  backend  frontend │
│  (bridge network, 1 host)  │          │  (1 container group, 1 IP) │
└───────────────────────────┘          └───────────────────────────┘
```

No observability stack (Prometheus/Grafana/Zipkin) here — SeatSync's own
requirements only ever called for structured logging, which the backend
already does to stdout. If that changes later, it slots into this same
pattern: a service per compose + a matching container in `app.bicep`.

## 1. Local: Docker Compose

```bash
cp .env.example .env
# fill in RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET (Test Mode) - see backend/README.md
docker compose up --build
```

- Frontend: http://localhost:8081
- Backend: http://localhost:8080 (health: `/actuator/health`)
- Postgres: localhost:5432 (persisted in the `seatsync-pgdata` volume — survives
  `docker compose down`, wiped by `docker compose down -v`)

Every value the backend needs is an environment variable with a working
default (see `docker-compose.yml`); real secrets live in the gitignored
`.env`, following `.env.example`.

**One thing that doesn't carry over 1:1 from a typical env-var setup:** the
frontend is a static React SPA. `VITE_API_BASE_URL` gets compiled into the
JS bundle at *build* time (Vite convention), not read at container *start*
time like the backend's variables — see the comment in `frontend/Dockerfile`.
Practically this means: if the backend's public URL ever changes, the
frontend image must be *rebuilt*, not just restarted with a new env var.

## 2. Cloud: Azure Container Instances

Same three containers, one container group, one public IP + DNS label —
`azure/app.bicep` mirrors `docker-compose.yml` directly. Infra setup (once)
is separate from app deploys (every time you ship), because infra changes
rarely and redeploying it carelessly is riskier than redeploying the app.

### One-time setup

```bash
cd azure
# ../.env already has AZURE_RESOURCE_GROUP / AZURE_LOCATION / AZURE_ACR_NAME /
# AZURE_DNS_LABEL - edit those first if you want different values.
./setup-infra.sh
```

Creates the resource group and an Azure Container Registry (ACR). Run this
once per environment, not on every deploy.

### Every deploy

```bash
cd azure
./deploy.sh
```

This builds both images locally, tags each with a timestamp (never `latest`,
so the container group always pulls a fresh image), pushes them to ACR, then
redeploys the container group to the new tags. Because the DNS label is
fixed ahead of time (chosen once in `.env`), the app's public URL never
changes across redeploys — only the images do. The script prints the final
URLs when it finishes.

**Needs**: Azure CLI (`az`) installed and logged in (`az login` — `deploy.sh`
and `setup-infra.sh` will prompt if you aren't), and Docker running locally
with enough free disk to build two images (backend + frontend).

### Known gotcha: Docker Hub rate limiting

`postgres:16-alpine` is pulled from our own ACR (`${acrLoginServer}/postgres:16-alpine`
in `app.bicep`/`app.json`), not straight from Docker Hub. Azure Container
Instances shares outbound IPs across many customers, and pulling public
images directly from Docker Hub during deployment frequently fails with
`An error response is received from the docker registry 'index.docker.io'.
Please retry later.` — that's Docker Hub's anonymous-pull rate limit, not a
problem with this app. `deploy.sh` mirrors the image into ACR first
(`az acr import`) to avoid it; if deploying manually via the portal, run that
same `az acr import` command once before your first deploy.

### Known limitation (same trade-off as the reference architecture this follows)

Postgres runs as a plain container in the group with **no persistent
volume**. Every `deploy.sh` run replaces the whole container group —
including postgres — so **booking/user data does not survive a deploy**.
That's an acceptable trade for a free/cheap demo deployment. If you need
data to persist across deploys, swap the `postgres` container in
`azure/app.bicep` for a managed **Azure Database for PostgreSQL Flexible
Server** and point `DB_URL` at it instead — everything else (image builds,
env-var wiring, the one-time/redeploy split) carries over unchanged.

## Ports at a glance

| Service | Local (compose) | Azure (container group) |
|---|---|---|
| frontend | `localhost:8081` | `<dns-label>.<region>.azurecontainer.io:8081` |
| backend | `localhost:8080` | `<dns-label>.<region>.azurecontainer.io:8080` |
| postgres | `localhost:5432` | internal only (not publicly exposed) |

Frontend and backend deliberately use different port numbers (8081 vs 8080)
in *both* environments — Azure Container Instances shares one network
namespace across every container in a group, so two containers can't bind
the same port, unlike Docker's per-container port mapping.

## Repo layout

```
backend/    Spring Boot API - see backend/README.md
frontend/   React SPA - see frontend/README.md
azure/      IaC + deploy scripts (infra.bicep, app.bicep, setup-infra.sh, deploy.sh)
docker-compose.yml   local/demo orchestration - mirrors azure/app.bicep
.env.example         committed template; copy to .env (gitignored) and fill in secrets
```
