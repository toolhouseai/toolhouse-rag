import { Context } from 'hono';

export type Env = {
	// Example bindings
	toolhouseRAGbucket: R2Bucket;
};

export type AppContext = Context<{
	Bindings: Env;
	Variables: {};
}>;
