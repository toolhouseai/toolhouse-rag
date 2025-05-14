import { GoogleGenAI, Type } from '@google/genai';
import { OpenAPIRoute, contentJson } from 'chanfana';
import { env } from 'hono/adapter';
import { z } from 'zod';
import { AppContext } from '../types';

export class RagTool extends OpenAPIRoute {
	schema = {
		request: {
			body: contentJson(
				z.object({
					rag: z.string(),
					query: z.string(),
				})
			),
		},
	};

	async handle(c: AppContext) {
		const { body } = await this.getValidatedData<typeof this.schema>();
		const { rag, query } = body;

		const files = await c.env.toolhouseRAGbucket.list({
			prefix: rag,
		});

		// Remove the first element from the files array
		// because it is the folder name
		if (files.objects.length > 0) {
			files.objects.shift();
		}

		if (files.objects.length === 0) {
			return c.json({
				message: 'Folder is empty',
			});
		}

		const { GEMINI_API_KEY, GEMINI_MODEL } = env<{ GEMINI_API_KEY: string; GEMINI_MODEL: string }>(c);
		const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

		let output: string[] = [];

		const prompt = `
You are a JSON extraction assistant.

You will receive:
- A query string.
- A chunk of text from an attached document (provided as inline data after this prompt).

Your task:
1. Perform a case-insensitive search of the provided chunk for the query.
2. For each occurrence, extract the entire sentence containing the query.
   - Define “sentence” as the text from the previous sentence-ending punctuation (., ?, !) up to and including the next one.
3. Preserve the excerpt exactly (all punctuation, spacing, and casing).
4. Output **only** a JSON array of strings:
   - If matches are found:
     ["First sentence containing the query.", "Second sentence…", …]
   - If none:
     []

Do **not** output anything else—no commentary, no extra keys, no code fences. Ensure it parses with JSON.parse without error.

Query:
${query}
`;

		try {
			await Promise.all(
				files.objects.map(async (file) => {
					const fileFromBucket = await c.env.toolhouseRAGbucket.get(file.key);
					const mimeType = fileFromBucket?.httpMetadata?.contentType;
					const fileArrayBuffer = await fileFromBucket?.arrayBuffer();

					if (!fileArrayBuffer) {
						return;
					}

					const fileBase64 = Buffer.from(fileArrayBuffer).toString('base64');

					const contents = [
						{ text: prompt },
						{
							inlineData: {
								mimeType: mimeType,
								data: fileBase64,
							},
						},
					];

					const response = await ai.models.generateContent({
						model: GEMINI_MODEL,
						contents: contents,
						config: {
							responseMimeType: 'application/json',
							responseSchema: {
								type: Type.ARRAY,
								items: {
									type: Type.STRING,
								},
							},
						},
					});

					if (response.text) {
						const jsonResponse = JSON.parse(response.text);
						output.push(...jsonResponse);
					}
				})
			);
		} catch (error) {
			console.error(error);
			return c.json({
				message: 'The tools failed to extract data from RAG',
			});
		}

		return c.json({
			response: output,
		});
	}
}
