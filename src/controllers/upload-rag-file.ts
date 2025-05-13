import { OpenAPIRoute } from 'chanfana';
import { z } from 'zod';
import { AppContext } from '../types';

// Types
interface UploadedFile {
	name: string;
	type: string;
	size: number;
	arrayBuffer(): Promise<ArrayBuffer>;
}

interface UploadResult {
	file_name: string;
	file_key?: string;
	size?: number;
	type?: string;
	error?: string;
	status: 'success' | 'error';
}

interface UploadSummary {
	total: number;
	successful: number;
	failed: number;
}

// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Schema definition
const schema = {
	params: z.object({
		folder_name: z.string(),
	}),
} as const;

type ValidatedData = {
	params: {
		folder_name: string;
	};
};

type Schema = typeof schema;

// Utility functions
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sanitizePath = (path: string): string => path.replace(/^\/+|\/+$/g, '');

async function uploadFileWithRetry(
	bucket: R2Bucket,
	key: string,
	content: ArrayBuffer,
	options: R2PutOptions,
	retryCount = 0
): Promise<R2Object> {
	try {
		return await bucket.put(key, content, options);
	} catch (error) {
		if (retryCount < MAX_RETRIES) {
			console.warn(`Retry ${retryCount + 1}/${MAX_RETRIES} for file ${key}`);
			await wait(RETRY_DELAY_MS * Math.pow(2, retryCount));
			return uploadFileWithRetry(bucket, key, content, options, retryCount + 1);
		}
		throw error;
	}
}

async function uploadSingleFile(file: File, bucket: R2Bucket, userId: string, folderName: string): Promise<UploadResult> {
	const sanitizedFileName = sanitizePath(file.name);
	const fileKey = `${userId}/${folderName}/${sanitizedFileName}`;

	try {
		const content = await file.arrayBuffer();
		await uploadFileWithRetry(bucket, fileKey, content, {
			httpMetadata: {
				contentType: file.type || 'application/octet-stream',
			},
		});

		return {
			file_name: file.name,
			file_key: fileKey,
			size: file.size,
			type: file.type || 'application/octet-stream',
			status: 'success',
		};
	} catch (error) {
		console.error(`Failed to upload file ${file.name}:`, error);
		return {
			file_name: file.name,
			error: error instanceof Error ? error.message : 'Unknown error occurred',
			status: 'error',
		};
	}
}

export class UploadRagFile extends OpenAPIRoute {
	schema = schema;

	async handle(c: AppContext) {
		try {
			const folder_name = c.req.param('folder_name');
			if (!folder_name) {
				return c.json(
					{
						error: 'Invalid request data',
						details: 'Folder name is required',
					},
					400
				);
			}

			// Validate Content-Type header
			const contentType = c.req.header('Content-Type');
			if (!contentType || !contentType.includes('multipart/form-data')) {
				return c.json(
					{
						error: 'Invalid Content-Type',
						details: 'Request must be multipart/form-data',
					},
					400
				);
			}

			const userId = c.get('user').id;
			const sanitizedFolderName = sanitizePath(folder_name);

			// Verify folder access
			const folderKey = `${userId}/${sanitizedFolderName}/`;
			const folderExists = await c.env.toolhouseRAGbucket.head(folderKey);

			if (!folderExists) {
				return c.json(
					{
						error: 'RAG folder not found or you do not have access to it',
						details: 'The specified folder either does not exist or does not belong to your account',
					},
					404
				);
			}

			// Parse the multipart form data
			let formData: FormData;
			try {
				formData = await c.req.formData();
			} catch (error) {
				return c.json(
					{
						error: 'Invalid form data',
						details: 'Failed to parse multipart form data. Please ensure the request is properly formatted.',
					},
					400
				);
			}

			const files = formData.getAll('files[]') as File[];

			if (!files.length) {
				return c.json(
					{
						error: 'No files provided',
						details: 'Please provide at least one file to upload',
					},
					400
				);
			}

			// Upload all files
			const results = await Promise.all(files.map((file) => uploadSingleFile(file, c.env.toolhouseRAGbucket, userId, sanitizedFolderName)));

			// Process results
			const failedUploads = results.filter((r: UploadResult) => r.status === 'error');
			const successfulUploads = results.filter((r: UploadResult) => r.status === 'success');
			const summary: UploadSummary = {
				total: files.length,
				successful: successfulUploads.length,
				failed: failedUploads.length,
			};

			// Return appropriate response based on upload results
			if (successfulUploads.length === 0) {
				return c.json(
					{
						error: 'All file uploads failed',
						details: 'None of the files could be uploaded successfully',
						files: results,
					},
					500
				);
			}

			if (failedUploads.length > 0) {
				return c.json(
					{
						message: `Partially successful upload: ${successfulUploads.length} of ${files.length} files uploaded`,
						files: results,
						summary,
					},
					207
				);
			}

			return c.json(
				{
					message: `Successfully uploaded ${files.length} file(s) to folder '${folder_name}'`,
					files: results,
					summary,
				},
				200
			);
		} catch (error) {
			console.error('Error processing upload request:', error);

			if (error instanceof z.ZodError) {
				return c.json(
					{
						error: 'Invalid request data',
						details: error.errors,
					},
					400
				);
			}

			return c.json(
				{
					error: 'Failed to process upload request',
					details: error instanceof Error ? error.message : 'Unknown error occurred',
				},
				500
			);
		}
	}
}
