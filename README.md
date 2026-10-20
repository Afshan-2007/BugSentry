# 🐞 BugSense AI — AI-Powered Bug Detection & Incident Management

BugSense AI is an intelligent bug tracking and incident management system designed to streamline the software debugging lifecycle. It combines AI-assisted debugging with structured investigation, fix management, testing, and verification workflows to help development teams resolve software defects more efficiently.

## ✨ Features

### 👥 Role-Based Dashboards
- **Reporter:** Submit bug reports, attach screenshots, track progress, and confirm or reopen fixes.
- **Developer:** Investigate assigned bugs, document root causes, propose fixes, and record testing and verification results.
- **Administrator:** Manage users and bugs, monitor SLA deadlines, and review audit logs and notifications.

### 🤖 AI-Assisted Debugging
- AI-assisted bug analysis and debugging suggestions.
- Root-cause reasoning and proposed code corrections.
- Confidence information and investigation support.
- Local LLM integration using Ollama and Llama 3.2.

### 🔄 Bug Lifecycle Management
Track incidents through a structured workflow:

`Report → Analyze → Assign → Reproduce → Investigate → Fix → Test → Verify → Resolve`

### 🧪 Testing & Verification
- Record regression, unit, integration, and manual test results.
- Track fix verification outcomes.
- Support a structured investigation and resolution process.

### 🔐 Authentication & Data Management
- User authentication with Supabase.
- PostgreSQL-backed application data.
- File and screenshot attachments using Supabase Storage.
- Role-based access controls and row-level security policies.

### ⏱️ SLA & Audit Tracking
- Monitor bug-resolution deadlines based on severity.
- Maintain activity history and audit information.
- Support notifications for bug updates and workflow events.

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend & Database | Supabase, PostgreSQL |
| Authentication | Supabase Auth |
| File Storage | Supabase Storage |
| AI Integration | Ollama, Llama 3.2 |
| Browser Testing | Playwright |
| Version Control | Git, GitHub |

## 🏗️ Architecture Overview

```text
Reporter / Developer / Administrator
                  |
                  v
         React + TypeScript UI
                  |
        +---------+---------+
        |                   |
        v                   v
      Supabase          Local Ollama
        |                   |
   +----+----+              v
   |    |    |         AI Analysis
   v    v    v
 Auth  DB  Storage
        |
        v
 Bug Workflow, Investigation,
 Testing, Verification & Audit
```

## 🚀 Getting Started

### Prerequisites

Install the following before running the project:

- [Node.js](https://nodejs.org/)
- npm
- A configured Supabase project
- [Ollama](https://ollama.com/) for local AI functionality

### 1. Clone the repository

```bash
git clone https://github.com/Afshan-2007/BugSentry.git
cd BugSentry
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root and add the Supabase configuration required by the application.

For a Vite application, these variables commonly use the `VITE_` prefix. Check the project's source code for the exact variable names.

**Never commit real secrets, private API keys, or service-role keys to GitHub.**

### 4. Configure Ollama

Install Ollama and pull the model used by the application:

```bash
ollama pull llama3.2
```

Start Ollama and ensure its local API is available. The application must be configured to use the appropriate local endpoint.

### 5. Start the development server

```bash
npm run dev
```

Open the local URL printed by Vite, usually:

`http://localhost:5173`

## 🧪 Running Browser Tests

If Playwright is configured in the project, install its browser dependencies:

```bash
npx playwright install
```

Run the available tests:

```bash
npx playwright test
```

View the HTML report, if generated:

```bash
npx playwright show-report
```

## 🔄 Bug Resolution Workflow

1. A reporter submits a bug with a description and supporting evidence.
2. AI assistance helps analyze the defect and suggest possible causes.
3. An administrator or workflow rule assigns the bug to a developer.
4. The developer reproduces and investigates the issue.
5. A proposed fix is reviewed and tested.
6. Verification results are recorded before resolution.
7. The reporter can confirm the fix or reopen the bug if the issue persists.

## 🎯 Project Goals

- Improve visibility across the bug-resolution lifecycle.
- Assist developers with AI-generated debugging insights.
- Encourage structured root-cause analysis and regression testing.
- Track incidents, responsibilities, verification, and SLA deadlines in one place.

## 🔮 Future Enhancements

- Automated execution of AI-generated test cases.
- Integration with CI/CD pipelines.
- Advanced defect classification and prioritization.
- More comprehensive analytics for bug trends and resolution times.

## 👩‍💻 Author

**Afshan**  
B.Tech — Computer Science Engineering (AI & ML)

GitHub: [@Afshan-2007](https://github.com/Afshan-2007)

---

*BugSense AI — Turning bug reports into a more structured, AI-assisted debugging workflow.*
