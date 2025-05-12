import { OpenAPIRoute } from 'chanfana';
import { AppContext } from '../types';

export class CreateRagFolder extends OpenAPIRoute {
	schema = {};

	async handle(c: AppContext) {
		return c.json({ message: 'ok' });
	}
}
