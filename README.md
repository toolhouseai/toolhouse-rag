# Toolhouse RAG service

This service encapsulates our RAG tool that allows users to perform RAG using their files

## Initial setup

Make sure your Toolhouse backend service is running locally.

1. Clone this repo
2. run `npm i`
3. Create a .dev.vars file and add your Gemini API Key
4. run `npm run local`

## Upload your files

In order to test RAG you will need to upload files. Files are uploaded locally.

To upload a file in your local environment, you will first need to create a folder, and then upload a file into that folder.

To create a folder:

```bash
curl --request POST \
  --url http://0.0.0.0:8780/v1/rag \
  --header 'Authorization: Bearer $YOUR_LOCAL_ENV_API_KEY' \
  --header 'content-type: application/json' \
  --data '{
  "folder_name": "$YOUR_FOLDER_NAME"
}'
```

To upload a file:

```bash
curl --request POST \
  --url http://0.0.0.0:8780/v1/rag/rag_test \
  --header 'Authorization: Bearer $YOUR_LOCAL_ENV_API_KEY' \
  --header 'content-type: multipart/form-data' \
  --form 'files[]=@/path_to_file'
```