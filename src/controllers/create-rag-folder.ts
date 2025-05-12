import { contentJson, OpenAPIRoute } from 'chanfana';
import { z } from 'zod';
import { AppContext } from '../types';

export class CreateRagFolder extends OpenAPIRoute {
	schema = {
		request: {
			body: contentJson(
				z.object({
					folder_name: z.string(),
				})
			),
		},
	};

	async handle(c: AppContext) {
		const { body } = await this.getValidatedData<typeof this.schema>();
		const { folder_name } = body;

		const userId = c.get('user').id;

		try {
			await c.env.toolhouseRAGbucket.put(`${userId}/${folder_name}`, '');
		} catch (error) {
			return c.json({ error: 'Failed to create RAG folder' }, 500);
		}

		return c.json({ message: `RAG folder '${folder_name}' created successfully` }, 201);
	}
}
