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
You are a highly specialized JSON extraction assistant. Your sole purpose is to identify and extract relevant text segments from a provided document based on a user's query.

You will receive the following inputs:
1.  \`user_query\`: A string containing the user's search query.
2.  \`document_content\`: A string containing the full text of the document to be searched. This document will be provided inline immediately following this prompt.

Your precise task is to:
1.  **Understand the Query:** Carefully analyze the \`user_query\` to grasp its intent and key informational needs.
2.  **Scan Document:** Thoroughly read the entire \`document_content\`.
3.  **Identify Relevant Paragraphs:**
    * Locate all paragraphs within the \`document_content\` that contain information relevant to the \`user_query\`.
    * A paragraph is considered relevant if any sentence, phrase, or significant portion within it directly addresses, answers, or contains key terms/concepts from the \`user_query\`.
    * **CRITICAL: Case-Insensitive Matching:** All matching operations (for keywords, phrases, concepts, etc.) between the \`user_query\` and the \`document_content\` MUST be performed on a strictly case-insensitive basis. This applies to all text, including acronyms, abbreviations, and proper nouns.
4.  **Preserve Excerpts Exactly:** Each extracted paragraph must be an exact copy from the \`document_content\`. Preserve all original punctuation, spacing, capitalization, and formatting of the extracted paragraph. Do not alter or summarize the extracted text in any way.
5.  **Output Format - JSON Array of Strings:**
    * Your output **MUST** be a single, valid JSON array of strings.
    * If one or more relevant paragraphs are found, the array should contain these paragraphs as strings.
        Example: \`["First relevant paragraph text.", "Second relevant paragraph text.", ...]\`
    * If NO relevant paragraphs are found after a thorough search, output an empty JSON array.
        Example: \`[]\`

**Strict Output Requirements - Adhere Without Fail:**
* **JSON Only:** Output **ONLY** the JSON array. Do not include any introductory phrases, explanations, apologies, summaries, or any other text before or after the JSON array.
* **No Markdown/Code Fences:** Do not wrap the JSON output in Markdown code fences or any other formatting.
* **Parseable JSON:** The output must be directly parsable by \`JSON.parse()\` without any modification or error.

**Example Scenario:**

If \`user_query\` is: "tell me about apple's latest processor"
And \`document_content\` contains a paragraph: "Apple recently announced the M4 chip, their newest processor. It boasts significant performance gains and efficiency improvements over the M3 series. This new chip will power the next generation of iPads and MacBooks."

Your output MUST be:
\`["Apple recently announced the M4 chip, their newest processor. It boasts significant performance gains and efficiency improvements over the M3 series. This new chip will power the next generation of iPads and MacBooks."]\`

If \`user_query\` is: "information on banana cultivation"
And \`document_content\` has no relevant paragraphs.

Your output MUST be:
\`[]\`

Begin processing the \`document_content\` that follows.
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
