import { createMiddleware } from 'hono/factory';
import { getUserByApiKey } from '../lib/user';

export const authMiddleware = createMiddleware(async (c, next) => {
	// Get the bearer token from the request with the following format:
	// Authorization: Bearer <token>
	// Note: it's not a JWT token, it's a simple string token
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
