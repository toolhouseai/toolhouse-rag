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

		const prompt = query;
		const systemInstruction = `
I am providing a document attached. 
    Please split the document into chunks that maintain semantic coherence and ensure that each chunk represents a complete and meaningful unit of information. 
    Each chunk should stand alone, preserving the context and meaning without splitting key ideas across chunks. 
    Use your understanding of the content's structure, topics, and flow to identify natural breakpoints in the text. 
    Ensure that no chunk exceeds 1000 characters length, and prioritize keeping related concepts or sections together.

    Do not modify the document, just split to chunks and return them as an array of strings, where each string is one chunk of the document.
    Return all the relevant chunks that answer to the query: ${query}
`;

		try {
			await Promise.all(
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
