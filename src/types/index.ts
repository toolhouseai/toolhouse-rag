import { Context } from 'hono';
import { User } from './user';

export type Env = {
	// Example bindings
	toolhouseRAGbucket: R2Bucket;
	AI: Ai;
	RAG_INSTANCE_NAME: string;
};

export type AppContext = Context<{
	Bindings: Env;
	Variables: {
		user: User;
	};
}>;
