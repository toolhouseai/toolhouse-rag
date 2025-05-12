import { OpenAPIRoute } from 'chanfana';
import { AppContext } from '../types';

export class GetRagFolders extends OpenAPIRoute {
	schema = {};

	async handle(c: AppContext) {
		return c.json(['folder1', 'project-alpha-docs', 'another-folder']);
	}
}
