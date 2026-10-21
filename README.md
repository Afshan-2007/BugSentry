# BugSense AI — AI-Powered Bug Detection and Incident Management

An AI-assisted bug tracking and incident management system designed to help software teams report, investigate, track, and resolve bugs through a structured workflow.

BugSense AI combines role-based dashboards, centralized bug management, attachment support, and locally hosted LLM-based analysis to support the software debugging lifecycle.

## Features

### Role-Based Access

- **Reporter:** Submit bug reports, attach supporting files, and track bug status.
- **Developer:** View and investigate assigned bugs and support the debugging workflow.
- **Administrator:** Manage users and bugs according to the application's implemented permissions.

### Bug Reporting and Lifecycle Management

- Create bug reports with titles and detailed descriptions.
- Select severity, priority, and bug category.
- Attach screenshots, logs, and other supporting files.
- Track bugs across statuses such as Open, In Progress, and Resolved.
- View bug summaries and recent reports through the dashboard.

### AI-Assisted Bug Analysis

- Integrates with **Ollama** to run the Llama 3.2 model locally.
- Uses bug details to generate a predicted category, probable root cause, and confidence score.
- Validates the returned category and confidence value.
- Provides a fallback response when AI prediction is unavailable.

> BugSense AI uses a pretrained language model for inference; it does not train a custom bug-classification model.

### Authentication and Data Management

- Supabase authentication.
- PostgreSQL database for application data.
- Row-Level Security (RLS) policies defined in database migrations.
- Supabase Storage integration for bug attachments.

### Testing and Verification

- Selenium-based browser checks for application loading, page content, login form behavior, and related UI conditions.
- Manual testing of selected Reporter, Developer, and Administrator workflows.
- Responsive-layout checks at selected viewport widths.

Testing results reflect the checks actually executed; not every possible workflow or testing method has been completed.

## Tech Stack

| Area | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend services | Supabase |
| Database | PostgreSQL |
| Authentication | Supabase Auth |
| File storage | Supabase Storage |
| AI integration | Ollama, Llama 3.2 |
| Browser testing | Selenium, Python |
| Development tools | VS Code, Git, GitHub |

## Architecture Overview

1. Users interact with the React frontend.
2. Supabase provides authentication and application data services.
3. PostgreSQL stores bug-management data.
4. Supabase Storage supports file attachments.
5. The AI integration sends bug details to the locally running Ollama API.
6. The Llama 3.2 model generates a structured analysis response for the application to process.

**Local AI endpoint:** `http://localhost:11434/api/chat`

The Ollama service must be running on the machine where the AI integration is expected to execute. This local endpoint is intended for development and is not a public production endpoint.

## Getting Started

### Prerequisites

- Node.js and npm
- Git
- A Supabase project
- Ollama
- The Llama 3.2 model
- Python and Selenium if you want to run the browser checks

### 1. Clone the Repository

```bash
git clone https://github.com/Afshan-2007/BugSentry.git
cd BugSentry
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root using the variable names expected by the application.

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Use your own Supabase project values. Never commit service-role keys, passwords, access tokens, or other secrets to GitHub.

### 4. Configure Supabase

- Set up the required database tables and policies.
- Configure Supabase Authentication.
- Configure the Storage bucket required for attachments.
- Apply the project's database migrations where appropriate.

Review the migration files under `supabase/migrations/` before applying them to an existing database.

### 5. Install and Start Ollama

Install Ollama from [ollama.com](https://ollama.com/), then download the model:

```bash
ollama pull llama3.2
```

Confirm that the model is available:

```bash
ollama list
```

Test local inference:

```bash
ollama run llama3.2
```

The application expects the local Ollama chat API at `http://localhost:11434/api/chat`. Confirm that the configured model name and endpoint match your implementation.

### 6. Start the Development Server

```bash
npm run dev
```

Open the local URL printed by Vite, typically:

```text
http://localhost:5173
```

## Testing

The project includes Selenium-based browser checks and manual workflow verification.

The executed Selenium checks covered areas such as:

- Application loading and page content.
- Page title and body availability.
- Login form structure and password masking.
- Layout overflow at a tested viewport.
- Empty-login behavior.
- A single observed page-load duration.

Ten Selenium checks were recorded as passed across two runs. The recorded page-load observation was 2.37 seconds for one load, and the tested viewport measurement was 502 pixels wide.

These observations apply only to the tested conditions and should not be interpreted as comprehensive performance or compatibility results. Playwright and white-box testing were not executed as part of the recorded test runs.

## Repository Structure

```text
BugSentry/
├── src/                    # Frontend application and AI integration
├── supabase/
│   └── migrations/         # Database schema and policy migrations
├── tests/                  # Browser testing files
├── package.json            # Dependencies and scripts
├── package-lock.json
├── playwright.config.ts    # Playwright configuration
└── README.md
```

The exact files and folders may change as the project evolves.

## Security Notes

- Keep private credentials out of source control.
- Use appropriate Supabase Row-Level Security policies.
- Review Storage bucket visibility and access policies before deployment.
- Restrict access to bug reports and attachments according to user roles.
- Do not expose the local Ollama endpoint directly to untrusted networks.

## Project Objectives

BugSense AI aims to:

- Centralize bug reporting and incident tracking.
- Improve visibility into bug status and investigation progress.
- Support debugging with locally hosted AI assistance.
- Organize bug-related evidence, investigation, and verification workflows.
- Demonstrate the integration of frontend development, database services, local LLM inference, and browser testing.

## Authors

**Afshan** and **Jyoshika R**

GitHub: [Afshan-2007](https://github.com/Afshan-2007)

---

*BugSense AI is an academic software engineering project developed to explore bug lifecycle management and AI-assisted debugging.*
