import { User } from '../types/user';

export async function getUserByApiKey(apiKey: string): Promise<User | null> {
	const response = await fetch('http://localhost:8000/v1/me', {
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
