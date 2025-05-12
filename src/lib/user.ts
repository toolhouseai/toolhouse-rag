import { User } from '../types/user';

export async function getUserByApiKey(baseApiUrl: string, apiKey: string): Promise<User | null> {
	console.log(`${baseApiUrl}/me`);
	const response = await fetch(`${baseApiUrl}/me`, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
	});

	if (response.status !== 200) {
		return null;
	}

	const data: { user_id: string } = await response.json();

	return {
		id: data.user_id,
	};
}
