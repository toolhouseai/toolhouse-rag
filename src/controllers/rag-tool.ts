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

		const prompt = `Return **only** a JSON array of verbatim excerpts (strings) that match the query.  
Do **not** output anything else—no commentary, no keys, no formatting.

Input:
- One chunk of the attached document (≤1000 characters, coherent).
- A query string.

Chunking rules:
- Each chunk must stand alone, preserving context and key ideas.
- Prioritize keeping related concepts or sections together.

Task:
1. Search the chunk for the query (case-insensitive).
2. For each occurrence, extract the **entire sentence** containing the query.  
   - Define “sentence” as the text from the previous sentence-ending punctuation (.?!) up to the next one.  
3. Return a JSON array of those exact excerpts, preserving all original punctuation, spacing, and capitalization.
4. If no matches are found, return an empty array: [].

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
