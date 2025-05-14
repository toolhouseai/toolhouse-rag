import { OpenAPIRoute } from 'chanfana';
import { AppContext } from '../types';

export class DeleteRagFolder extends OpenAPIRoute {
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

		let deletedFiles: string[] = [];
		try {
			deletedFiles = await Promise.all(result.objects.map(async (obj) => {
				if (obj.key !== `${userId}/${sanitizedFolderName}/`) { // Exclude the folder itself
					await c.env.toolhouseRAGbucket.delete(obj.key);
					return obj.key.replace(`${userId}/${sanitizedFolderName}/`, '');
				}else{
					await c.env.toolhouseRAGbucket.delete(obj.key);
					return null; // Return null for the folder
				}
			})).then(files => files.filter(file => file !== null)); // Filter out null values
		} catch (error) {
			return c.json({ error: 'Failed to delete RAG folder' }, 500);
		}

		return c.json({ message: `RAG folder '${folder_name}' deleted successfully`, folderName: sanitizedFolderName, deletedFiles: deletedFiles}, 200);
	}
}
