/**
 * Cloudflare Worker for R2 storage operations
 *
 * This worker provides an API for interacting with Cloudflare R2 storage.
 * It allows for uploading, downloading, and listing objects in an R2 bucket.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 */

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const key = url.pathname.slice(1);

		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return handleCORS(request);
		}

		// Add CORS headers to all responses
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		};

		// Route based on HTTP method
		try {
			if (request.method === 'GET') {
				if (key === '') {
					// List objects in the bucket
					const objects = await env.toolhouseRAGbucket.list();
					return new Response(JSON.stringify(objects), {
						headers: {
							'Content-Type': 'application/json',
							...corsHeaders,
						},
					});
				} else {
					// Get a specific object
					const object = await env.toolhouseRAGbucket.get(key);

					if (object === null) {
						return new Response('Object Not Found', { status: 404, headers: corsHeaders });
					}

					const headers = new Headers(corsHeaders);
					object.writeHttpMetadata(headers);
					headers.set('etag', object.httpEtag);

					return new Response(object.body, {
						headers,
					});
				}
			}
			// Handle PUT and POST requests for uploading objects
			if (request.method === 'PUT' || request.method === 'POST') {
				if (!key) {
					return new Response('Missing Key', { status: 400, headers: corsHeaders });
				}

				const contentType = request.headers.get('Content-Type') || 'application/octet-stream';

				// Store the object in R2
				await env.toolhouseRAGbucket.put(key, request.body, {
					httpMetadata: {
						contentType,
					},
				});

				return new Response(`Successfully uploaded ${key}`, {
					headers: corsHeaders,
				});
			}
			// Handle DELETE requests for deleting objects
			if (request.method === 'DELETE') {
				if (!key) {
					return new Response('Missing Key', { status: 400, headers: corsHeaders });
				}

				// Delete the object from R2
				await env.toolhouseRAGbucket.delete(key);

				return new Response(`Successfully deleted ${key}`, {
					headers: corsHeaders,
				});
			}

			return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
		} catch (error) {
			console.error(`Error processing request: ${error}`);
			return new Response(`Error processing request: ${error}`, { status: 500, headers: corsHeaders });
		}
	},
} satisfies ExportedHandler<Env>;

// Handle CORS preflight requests
function handleCORS(request: Request): Response {
	return new Response(null, {
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			'Access-Control-Max-Age': '86400',
		},
	});
}
