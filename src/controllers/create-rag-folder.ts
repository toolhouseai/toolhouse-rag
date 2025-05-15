import { contentJson, OpenAPIRoute } from 'chanfana';
import { z } from 'zod';
import { ragFolderNameSchema } from '../schemas/rag';
import { AppContext } from '../types';

export class CreateRagFolder extends OpenAPIRoute {
	schema = {
		request: {
			body: contentJson(
				z.object({
					folder_name: ragFolderNameSchema,
				})
			),
		},
	};

	async handle(c: AppContext) {
		const { body } = await this.getValidatedData<typeof this.schema>();
		const { folder_name } = body;

		const userId = c.get('user').id;

		// Ensure folder_name does not have leading/trailing slashes
		const sanitizedFolderName = folder_name.replace(/^\/+|\/+$/g, '');
		const folderKey = `${userId}/${sanitizedFolderName}/`;

		try {
			// Create a zero-byte object to represent the folder
			await c.env.toolhouseRAGbucket.put(folderKey, '');
		} catch (error) {
			return c.json({ error: 'Failed to create RAG folder' }, 500);
		}

		return c.json({ message: `RAG folder '${folder_name}' created successfully` }, 201);
	}
}
