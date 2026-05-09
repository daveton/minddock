# NAS Deployment

MindDock is a static Vite app. The simplest NAS deployment is:

1. Build a Docker image with Node.
2. Serve the generated `dist` folder with Nginx.
3. Point Cloudflare Tunnel to the NAS service at `http://localhost:18080`.

## Deploy On NAS

Copy this repository to the NAS, then run:

```bash
docker compose up -d --build
```

The app will listen on:

```text
http://NAS_IP:18080
```

## Cloudflare Tunnel Route

Your public hostname is already routed:

```text
minddock.daveton.top
```

Set the tunnel service target to:

```text
http://localhost:18080
```

If `cloudflared` runs on another machine instead of the NAS, use the NAS LAN IP:

```text
http://NAS_IP:18080
```

## Update Deployment

After pulling or copying new code to the NAS:

```bash
docker compose up -d --build
```

## Security Note

Do not deploy browser-visible API keys. Any Vite variable starting with `VITE_`
is bundled into frontend JavaScript and can be viewed by visitors.
