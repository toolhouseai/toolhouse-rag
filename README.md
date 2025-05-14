# Toolhouse RAG Service

A Cloudflare Worker that provides a simple API for interacting with Cloudflare R2 storage.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/get-started/)

### Setup

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Configure your R2 bucket in `wrangler.jsonc`

### Local Development

Start a local development server:

```bash
npm run dev
```

By default, local data (including R2 bucket data) is stored in the `.wrangler/state` folder in your project directory. You can customize this location using the `--persist-to` flag with `wrangler dev`. For more details, see the [Cloudflare documentation on local data storage](https://developers.cloudflare.com/workers/local-development/local-data/#where-local-data-gets-stored).

### Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

## Environment Variables

The worker uses the following environment bindings:

- `toolhouseRAGbucket`: R2 bucket binding

## License

MIT
