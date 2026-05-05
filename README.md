# Trip.com Remote MCP Server

This package exposes a public HTTP MCP endpoint that you can deploy and then paste into Claude's Add custom connector screen.

## Endpoint after deploy

Your connector URL will be:

- https://YOUR-DOMAIN/mcp

Examples:

- https://tripcom-mcp.onrender.com/mcp
- https://tripcom-mcp.yourdomain.com/mcp
- https://tripcom-mcp-xxxxx.a.run.app/mcp

## Local test

```bash
npm install
npm start
```

Then open:

- http://localhost:8080/
- http://localhost:8080/mcp

## Deploy options

### Render
1. Create a new Web Service.
2. Upload this folder or connect a Git repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. After deployment, copy the public URL and append `/mcp`

### Railway
1. Create a new project.
2. Deploy the folder or Git repo.
3. Railway will detect Node automatically.
4. After deployment, use the generated domain plus `/mcp`

### Cloud Run
1. Containerize or use buildpacks.
2. Deploy as a public HTTPS service.
3. Use the generated HTTPS URL plus `/mcp`

## Add in Claude

For Pro/Max:
- Go to Customize > Connectors
- Click Add custom connector
- Choose Web
- Paste your deployed MCP URL, for example `https://your-domain.com/mcp`

For Team/Enterprise:
- Owner goes to Organization settings > Connectors
- Adds the remote MCP URL there

## Important

You do not have a real remote MCP URL until you deploy this server to a public HTTPS host. The URL is created by your hosting provider after deployment.
