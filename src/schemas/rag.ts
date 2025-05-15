import { z } from 'zod';

/**
 * Schema for validating RAG folder names
 * Allows letters, numbers, dashes, and underscores
 */
export const ragFolderNameSchema = z
	.string()
	.regex(/^[a-zA-Z0-9-_]+$/, 'Folder name can only contain letters, numbers, dashes, and underscores');
