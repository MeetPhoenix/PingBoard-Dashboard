# ⚡ PingBoard — Live Server Health Dashboard

> Week 2 Deliverable — Build and push one application Docker image to the internal registry.

A minimal full-stack web app built with **Node.js + Express** (backend) and
**vanilla HTML/CSS/JS** (frontend). Displays live server stats — memory, CPU,
uptime, Node version — refreshing every 5 seconds via a polling API.

---

## Project Structure

```
pingboard/
├── src/
│   └── public/
│       ├── index.html     ← Dashboard UI
│       ├── style.css      ← All styling (dark theme)
│       └── app.js         ← Browser-side polling logic
├── server.js              ← Express server + API routes
├── package.json           ← Dependencies (Express only)
├── Dockerfile             ← Multi-stage production build
├── .dockerignore          ← Exclude node_modules from build context
└── .gitignore
```

---

## Step 1 — Install Dependencies

```bash
npm install
```

This creates `node_modules/` and `package-lock.json`.
Express is the only dependency.

---

## Step 2 — Run Locally

```bash
npm start
```

Open **http://localhost:3000** in your browser.
The dashboard will auto-refresh every 5 seconds.

To auto-restart on file changes during development:

```bash
npm run dev
```

### Verify the API directly

```bash
# Health check
curl http://localhost:3000/api/health

# Full status (all server stats as JSON)
curl http://localhost:3000/api/status
```

Stop the server with `Ctrl+C`.

---

## Step 3 — Build the Docker Image

Make sure Docker is running, then:

```bash
# Simple local build (for testing)
docker build -t pingboard:local .

# Production build with tags matching the team tagging convention
SHORT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "nogit")

docker build \
  --build-arg APP_VERSION="0.1.0" \
  --build-arg GIT_COMMIT="${SHORT_SHA}" \
  --build-arg BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -t registry.company.internal/pingboard:develop-${SHORT_SHA} \
  -t registry.company.internal/pingboard:develop-latest \
  .
```

### Verify the image was created

```bash
docker images | grep pingboard
```

### Check the baked-in labels

```bash
docker inspect registry.company.internal/pingboard:develop-latest \
  | jq '.[0].Config.Labels'
```

### Check the image size

```bash
docker images registry.company.internal/pingboard \
  --format "table {{.Tag}}\t{{.Size}}"
```

---

## Step 4 — Run the Container

```bash
docker run --rm -p 3000:3000 registry.company.internal/pingboard:develop-latest
```

Open **http://localhost:3000** — same dashboard, now running inside Docker.
The stats shown are the container's view of the host system.

Stop with `Ctrl+C`.

---

## Step 5 — Push to Registry

```bash
# Login to the internal registry (one-time per machine)
docker login registry.company.internal

# Push both tags
docker push registry.company.internal/pingboard:develop-${SHORT_SHA}
docker push registry.company.internal/pingboard:develop-latest
```

### Verify — pull back from the registry

```bash
docker pull registry.company.internal/pingboard:develop-latest

# Confirm it runs from the pulled version
docker run --rm -p 3000:3000 registry.company.internal/pingboard:develop-latest
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Serves the dashboard UI |
| `GET` | `/api/status` | Returns all server stats as JSON |
| `GET` | `/api/health` | Health check (used by Docker + Kubernetes) |

### Example `/api/status` response

```json
{
  "hostname": "my-machine",
  "platform": "linux",
  "nodeVersion": "v22.0.0",
  "serverTime": "2025-03-10T14:30:00.000Z",
  "uptime": "2h 15m 30s",
  "processUptime": "5m 12s",
  "totalMemory": "16384.0 MB",
  "freeMemory": "8192.0 MB",
  "usedMemory": "8192.0 MB",
  "memoryUsedPct": 50,
  "cpuModel": "Apple M2",
  "cpuCores": 8,
  "loadAvg": ["0.45", "0.38", "0.31"],
  "environment": "production",
  "port": 3000
}
```

---

## Week 2 Deliverables Checklist

```
☐ App runs locally         →  npm start → http://localhost:3000
☐ API responds             →  curl http://localhost:3000/api/status
☐ Docker build succeeds    →  docker build ...
☐ Container runs locally   →  docker run -p 3000:3000 ...
☐ Image pushed             →  docker push registry.../pingboard:develop-xxx
☐ Pull verified            →  docker pull registry.../pingboard:develop-latest
☐ Labels inspectable       →  docker inspect ... | jq '.[0].Config.Labels'
☐ Tag documented           →  Update pipeline-overview.md from Week 1
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the server listens on |
| `NODE_ENV` | `development` | Runtime environment label |
