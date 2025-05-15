import { OpenAPIRoute } from 'chanfana';
import { AppContext } from '../types';

export class GetRagFolderFiles extends OpenAPIRoute {
	schema = {};

	async handle(c: AppContext) {
		const folder_name = c.req.param('folder_name');
		if (!folder_name) {
			return c.json(
				{
					error: 'Invalid request data',
					details: 'Folder name is required',
				},
				400
			);
		}

		const userId = c.get('user').id;
		const sanitizedFolderName = folder_name.replace(/^\/+|\/+$/g, '');

		const result = await c.env.toolhouseRAGbucket.list({
			prefix: `${userId}/${sanitizedFolderName}/`,
		});

		if (result.objects.length === 0) {
			return c.json(
				{ error: `RAG folder '${folder_name}' not found.` },
				404
			);
		}

		let files: string[] = [];
		try {
			files = await Promise.all(result.objects.map(async (obj) => {
				if (obj.key !== `${userId}/${sanitizedFolderName}/`) { // Exclude the folder itself
					return obj.key.replace(`${userId}/${sanitizedFolderName}/`, '');
				}else{
					return null; // Return null for the folder
				}
			})).then(files => files.filter(file => file !== null)); // Filter out null values
		} catch (error) {
			return c.json({ error: 'Failed to list RAG folder files' }, 500);
		}

		return c.json({ message: `Successfully listed files in RAG folder '${folder_name}'`, folderName: sanitizedFolderName, files: files }, 200);
	}
}
