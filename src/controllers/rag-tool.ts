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

		console.log(GEMINI_MODEL);

		let output: string[] = [];

		const prompt = `
			You are a JSON extraction assistant. Follow these rules exactly:

			Inputs:
			- One chunk of the attached document.
			- A query string.

			Extraction rules:
			1. Search the chunk for the query (case-insensitive).
			2. For each occurrence, extract the entire sentence containing the query:
			- A "sentence" is defined as the text from the previous sentence-ending punctuation (., ?, !) up to the next one.
			3. Each excerpt must include the query exactly as it appears in the text (preserving case and spacing).

			Output requirements:
			- Output only valid JSON—nothing else. No commentary, no extra keys.
			- The JSON must be an array of strings:
			- If you find matches: ["First full sentence containing the query.", "Second one…"]
			- If you find no matches: []
			- Ensure the output can be parsed with JSON.parse without error.

			Query:
			${query}`;

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

				console.log(response.text);

				if (response.text) {
					const jsonResponse = JSON.parse(response.text);
					output.push(...jsonResponse);
				}
			})
		);

		return c.json({
			response: output,
		});
	}
}
