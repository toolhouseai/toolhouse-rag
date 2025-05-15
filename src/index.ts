import { fromHono } from 'chanfana';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { CreateRagFolder } from './controllers/create-rag-folder';
import { GetRagFolders } from './controllers/get-rag-folders';
import { UploadRagFile } from './controllers/upload-rag-file';
import { DeleteRagFolder } from './controllers/delete-rag-folder';
import { authMiddleware } from './middleware/auth-middleware';
import { Env } from './types';
import { RagTool } from './controllers/rag-tool';
import { GetRagFolderFiles } from './controllers/get-rag-folder-files';
const app = new Hono<{
	Bindings: Env;
	Variables: {};
}>();

app.use('*', cors());
app.use('/v1/*', authMiddleware);

// Setup OpenAPI registry
const openapi = fromHono(app);

openapi.get('/v1/rag', GetRagFolders);
openapi.post('/v1/rag', CreateRagFolder);
openapi.post('/v1/rag/:folder_name', UploadRagFile);
openapi.post('/toolhouse-rag', RagTool);
openapi.delete('/v1/rag/:folder_name', DeleteRagFolder);
openapi.get('/v1/rag/:folder_name', GetRagFolderFiles);

// Export the Hono app
export default app;
