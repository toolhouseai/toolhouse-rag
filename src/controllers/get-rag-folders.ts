import { OpenAPIRoute } from 'chanfana';
import { AppContext } from '../types';

export class GetRagFolders extends OpenAPIRoute {
	schema = {};

	async handle(c: AppContext) {
		const userId = c.get('user').id;

		try {
			// List objects with the user's ID as prefix
			const result = await c.env.toolhouseRAGbucket.list({
				prefix: `${userId}/`,
				delimiter: '/',
			});

			// Extract folder names from the delimited prefixes
			const folders = result.delimitedPrefixes.map((prefix) => {
				// Remove the user ID prefix and trailing slash
				return prefix.replace(`${userId}/`, '').replace(/\/$/, '');
			});

			return c.json(folders);
		} catch (error) {
			console.error('Error listing RAG folders:', error);
			return c.json({ error: 'Failed to list RAG folders' }, 500);
		}
	}
}
