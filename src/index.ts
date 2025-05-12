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

// Setup OpenAPI registry
const openapi = fromHono(app);

openapi.get('/v1/rag', GetRagFolders);
openapi.post('/v1/rag', CreateRagFolder);

// Export the Hono app
export default app;
