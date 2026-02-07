# MongoDB DCS Generator

A Next.js 15 application that helps Solutions Architects generate Discovery Capture Sheets (DCS) from sales call transcripts using AI.

## Features

- **Dashboard**: List all accounts with status tracking
- **Account Management**: Create accounts and upload transcript files
- **AI-Powered DCS Generation**: Uses Google Gemini via Vercel AI SDK to analyze transcripts
- **Structured Output**: Generates DCS following the Tiger DCS format with account info, value framework, and logistics

## Tech Stack

- **Framework**: Next.js 15 (App Router, Server Actions)
- **Database**: MongoDB Atlas (via Mongoose)
- **AI**: Vercel AI SDK with Google Gemini (`@ai-sdk/google`)
- **Styling**: Tailwind CSS + Lucide React
- **Language**: TypeScript

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy the `.env.local` file and update with your actual values:

```bash
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/dcs-generator

# Google Vertex AI API Key
GOOGLE_VERTEX_AI_API_KEY=your-google-vertex-ai-api-key
GOOGLE_VERTEX_AI_PROJECT_ID=your-project-id
GOOGLE_VERTEX_AI_LOCATION=us-central1
```

### 3. Set Up MongoDB

- Install MongoDB locally or use MongoDB Atlas
- Update the `MONGODB_URI` in `.env.local`

### 4. Set Up Google Vertex AI

- Create a Google Cloud Project
- Enable the Vertex AI API
- Create an API key or service account
- Update the Google Vertex AI variables in `.env.local`

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Usage

1. **Create an Account**: Click "New Account" on the dashboard
2. **Upload Transcripts**: Go to an account and upload `.txt` files containing transcripts
3. **Generate DCS**: Click "Generate DCS" to analyze transcripts with AI
4. **View Results**: The generated DCS will be displayed in a structured format

## DCS Schema

The application generates structured DCS data with:

- **Account Info**: Workload name, sales motion, stakeholders, partners
- **Value Framework**: Current state, future state, value drivers
- **Logistics**: Timeline, capabilities, success metrics

## Development

The application uses:

- Server Actions for data mutations
- Mongoose for MongoDB interactions
- Cached database connections
- TypeScript for type safety
- Zod for schema validation
