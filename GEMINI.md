# Project: MindVault

## Project Overview

MindVault is a web application designed to turn conversations into actionable insights. It leverages the Gemini API to analyze conversation transcripts from text or files, extracting key information such as summaries, business ideas, and tasks. The application provides a rich user interface for viewing, organizing, and interacting with the generated data. It uses Supabase for data persistence and user management.

The core technologies used are:

*   **Frontend:** React with TypeScript, built with Vite.
*   **Backend:** Supabase for database and authentication.
*   **AI:** Google's Gemini API for content generation and analysis.

The application's architecture is centered around a main `Dashboard` component that manages the application's state and UI. It interacts with three main services:

*   `geminiService.ts`: Handles all communication with the Gemini API, including summarization, idea extraction, task generation, and more.
*   `supabaseService.ts`: Manages all interactions with the Supabase backend, including data storage and retrieval, and user authentication.
*   `scoringService.ts`: Provides logic for scoring ideas and identifying high-potential opportunities.

## Building and Running

To build and run the project locally, follow these steps:

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Set Environment Variables:**
    Create a `.env.local` file in the root of the project and add your Gemini API key:
    ```
    GEMINI_API_KEY=your_gemini_api_key
    ```

3.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

### Available Scripts

*   `npm run dev`: Starts the development server.
*   `npm run build`: Builds the application for production.
*   `npm run preview`: Serves the production build locally for preview.

## Development Conventions

*   **Styling:** The project uses Tailwind CSS for styling.
*   **State Management:** State is managed using React hooks (`useState`, `useCallback`, `useMemo`, `useEffect`).
*   **Services:** Business logic is separated into services (`geminiService.ts`, `supabaseService.ts`, `scoringService.ts`).
*   **Types:** TypeScript types are defined in `types.ts`.
*   **Components:** UI components are located in the `components` directory.
*   **API Routes:** The `app/api` directory contains serverless functions for handling API requests, though the primary backend is Supabase.
