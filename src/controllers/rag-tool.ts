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
			prefix: rag + '/',
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

		const systemInstruction = `The user will provide a document. 
Please return the parts of the document that are relevant to the user query.
Use your understanding of the content's structure, topics, and flow to identify natural breakpoints in the text to return the parts that are the most relevant to the user query.
Prioritize keeping related concepts or sections together.`;

		try {
			const results = await Promise.allSettled(
				files.objects.map(async (file) => {
					const fileFromBucket = await c.env.toolhouseRAGbucket.get(file.key);
					if (file.size === 0) {
						return;
					}

					const mimeType = fileFromBucket?.httpMetadata?.contentType;
					const fileArrayBuffer = await fileFromBucket?.arrayBuffer();

					if (!fileArrayBuffer) {
						return;
					}

					const fileBase64 = Buffer.from(fileArrayBuffer).toString('base64');

					const contents = [
						{ text: query },
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
							temperature: 0,
							systemInstruction,
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
						return jsonResponse;
					}
					return [];
				})
			);

			// Process only fulfilled promises
			output = results
				.filter((result): result is PromiseFulfilledResult<string[]> => result.status === 'fulfilled')
				.map((result) => result.value)
				.flat();
		} catch (error) {
			console.error(error);
			return c.json({
				message: 'Failed to extract data from RAG due to a timeout: the query took too long to process.',
			});
		}

		return c.json({
			response: output,
		});
	}
}
