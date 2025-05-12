import { fromHono } from 'chanfana';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { CreateRagFolder } from './controllers/create-rag-folder';
import { GetRagFolders } from './controllers/get-rag-folders';
import { authMiddleware } from './middleware/auth-middleware';
import { Env } from './types';

const app = new Hono<{
	Bindings: Env;
	Variables: {};
}>();

app.use('*', cors());
app.use('*', authMiddleware);
// Authentication middleware
// async function authMiddleware(c: AppContext, next: () => Promise<void>) {
// 	try {
// 		const authHeader = c.req.header('Authorization');
// 		if (!authHeader || !authHeader.startsWith('Bearer ')) {
// 			return c.json({ error: 'Unauthorized - Missing or invalid token' }, 401);
// 		}

// 		const token = authHeader.split(' ')[1];
// 		const secret = new TextEncoder().encode(c.env.JWT_SECRET);

// 		const { payload } = await jwtVerify(token, secret);

// 		// Store user information in context
// 		c.set('userId', payload.sub as string);
// 		c.set('user', {
// 			id: payload.sub as string,
// 			email: payload.email as string,
// 		});

// 		await next();
// 	} catch (error) {
// 		console.error('Authentication error:', error);
// 		return c.json({ error: 'Unauthorized - Invalid token' }, 401);
// 	}
// }

// Apply authentication middleware to all /v1/rag routes
// app.use('*', authMiddleware);

// Setup OpenAPI registry
const openapi = fromHono(app);

// export class UserFiles extends OpenAPIRoute {
// 	schema = {};

// 	async handle(c: AppContext) {
// 		const data = await this.getValidatedData<typeof this.schema>();
// 		console.log(await c.env.toolhouseRAGbucket.list());

// 		// const object = await c.env.BUCKET.list();

// 		return c.json({ message: 'ok' });
// 	}
// }

// interface RagFolderRequest {
// 	body: {
// 		folder_name: string;
// 	};
// }

// export class CreateRagFolder extends OpenAPIRoute {
// 	schema = {
// 		body: {
// 			type: 'object',
// 			required: ['folder_name'],
// 			properties: {
// 				folder_name: {
// 					type: 'string',
// 					pattern: '^[a-zA-Z0-9-_]+$',
// 					minLength: 1,
// 					maxLength: 255,
// 				},
// 			},
// 		},
// 	} as const;

// 	async handle(c: AppContext) {
// 		try {
// 			const data = await this.getValidatedData<RagFolderRequest>();
// 			const userId = c.get('userId');

// 			if (!userId) {
// 				return c.json({ error: 'Unauthorized' }, 401);
// 			}

// 			if (!data.body?.folder_name) {
// 				return c.json({ error: 'folder_name is required' }, 400);
// 			}

// 			const basePath = `toolhouse-rag/${userId}`;
// 			const fullPath = `${basePath}/${data.body.folder_name}`;

// 			// Check if base directory exists
// 			const baseDirList = await c.env.toolhouseRAGbucket.list({ prefix: basePath, limit: 1 });
// 			if (baseDirList.objects.length === 0) {
// 				// Create base directory by putting an empty object
// 				await c.env.toolhouseRAGbucket.put(`${basePath}/`, new Uint8Array(0));
// 			}

// 			// Check if folder already exists
// 			const folderList = await c.env.toolhouseRAGbucket.list({ prefix: fullPath, limit: 1 });
// 			if (folderList.objects.length > 0) {
// 				return c.json({ error: `folder '${data.body.folder_name}' already exists` }, 409);
// 			}

// 			// Create the folder by putting an empty object
// 			await c.env.toolhouseRAGbucket.put(`${fullPath}/`, new Uint8Array(0));

// 			return c.json({ message: `RAG folder '${data.body.folder_name}' created successfully` }, 201);
// 		} catch (error) {
// 			console.error('Error creating RAG folder:', error);
// 			return c.json({ error: 'Internal server error' }, 500);
// 		}
// 	}
// }

// Register OpenAPI endpoints (this will also register the routes in Hono)
// TODO: add user authentication
openapi.get('/v1/rag', GetRagFolders);
openapi.post('/v1/rag', CreateRagFolder);

// Export the Hono app
export default app;
