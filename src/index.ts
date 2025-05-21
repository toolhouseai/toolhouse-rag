import { fromHono } from 'chanfana';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { CreateRagFolder } from './controllers/create-rag-folder';
import { DeleteRagFile } from './controllers/delete-rag-file';
import { DeleteRagFolder } from './controllers/delete-rag-folder';
import { GetRagFolderFiles } from './controllers/get-rag-folder-files';
import { GetRagFolders } from './controllers/get-rag-folders';
import { RagTool } from './controllers/rag-tool';
import { UploadRagFile } from './controllers/upload-rag-file';
import { authMiddleware } from './middleware/auth-middleware';
import { Env } from './types';

const app = new Hono<{
	Bindings: Env;
	Variables: {};
}>();

app.use('*', cors());
app.use('/v1/*', authMiddleware);

// Setup OpenAPI registry
const openapi = fromHono(app, {
	docs_url: null,
	redoc_url: null,
	openapi_url: null,
});

openapi.get('/v1/rag', GetRagFolders);
openapi.post('/v1/rag', CreateRagFolder);
openapi.post('/v1/rag/:folder_name', UploadRagFile);
openapi.post('/toolhouse-rag', RagTool);
openapi.delete('/v1/rag/:folder_name', DeleteRagFolder);
openapi.get('/v1/rag/:folder_name', GetRagFolderFiles);

openapi.delete('/v1/rag/:folder_name/:filename', DeleteRagFile);

// Export the Hono app
export default app;
