import { createMiddleware } from 'hono/factory';
import { getUserByApiKey } from '../lib/user';

export const authMiddleware = createMiddleware(async (c, next) => {
	const bearerToken = c.req.header('Authorization');
	if (!bearerToken) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const apiKey = bearerToken.split(' ')[1]?.trim();

	if (!apiKey) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const user = await getUserByApiKey(apiKey);
	if (!user) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	c.set('user', user);

	await next();
});
