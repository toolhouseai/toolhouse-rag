import { OpenAPIRoute, contentJson } from 'chanfana';
import { z } from 'zod';
import { AppContext } from '../types';

const renderData = (rag: AutoRagSearchResponse) => {
	return rag.data.map((item) => {
		const text = item.content.map(({ text }) => text).join('\n');
		return `Score: ${item.score}\nSource: ${item.filename}\Content: ${text}\n---\n`;
	});
};

export class RagTool extends OpenAPIRoute {
	schema = {
		request: {
			body: contentJson(
				z.object({
					rag: z.string(),
					query: z.string(),
				})
			),
		},
	};

	async handle(c: AppContext) {
		const { body } = await this.getValidatedData<typeof this.schema>();
		const { rag, query } = body;

		const folderName = rag + '/';

		try {
			const result = await c.env.AI.autorag(c.env.RAG_INSTANCE_NAME).search({
				query: query,
				filters: {
					type: 'eq',
					key: 'folder',
					value: folderName,
				},
			});
			return c.json({ data: renderData(result) });
		} catch (e) {
			return c.json({ error: 'I could not find information related to your query due to an internal error. Please try again later.' });
		}
	}
}
