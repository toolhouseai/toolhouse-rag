import { Context } from 'hono';
import { User } from './user';

export type Env = {
	// Example bindings
	toolhouseRAGbucket: R2Bucket;
};

export type AppContext = Context<{
	Bindings: Env;
	Variables: {
		user: User;
	};
}>;
