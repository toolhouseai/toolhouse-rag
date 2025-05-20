import { OpenAPIRoute } from 'chanfana';
import { z } from 'zod';
import { ragFolderNameSchema } from '../schemas/rag';
import { AppContext } from '../types';

export class DeleteRagFile extends OpenAPIRoute {
	schema = {
		request: {
			params: z.object({
				folder_name: ragFolderNameSchema,
				filename: z.string(),
			}),
		},
	};

	async handle(c: AppContext) {
		try {
			const { params } = await this.getValidatedData<typeof this.schema>();
			const { folder_name, filename } = params;
			const userId = c.get('user').id;
			const folderKey = `${userId}/${folder_name}/`;
			const folderExists = await c.env.toolhouseRAGbucket.head(folderKey);

			if (!folderExists) {
				return c.json(
					{
						error: 'RAG folder not found or does not exist',
					},
					404
				);
			}

			const fileKey = `${userId}/${folder_name}/${filename}`;
			const fileExists = await c.env.toolhouseRAGbucket.head(fileKey);

			if (!fileExists) {
				return c.json(
					{
						error: `File '${filename}' not found or does not exist in folder '${folder_name}'`,
					},
					404
				);
			}

			await c.env.toolhouseRAGbucket.delete(fileKey);
			return new Response(null, { status: 204 });
		} catch (err) {
			if (err instanceof z.ZodError) {
				return c.json(
					{
						error: 'Validation error',
						details: err.errors,
					},
					400
				);
			}
			console.error('Error deleting file:', err);
			return c.json(
				{
					error: 'The server encountered an error while trying to delete the file',
				},
				500
			);
		}
	}
}
