# CEOOO

**AI-Powered Business Management & Executive Workspace**

[**Live Demo**](https://ceooo-git-main-yemizerfes-projects.vercel.app/)

CEOOO is an executive business management platform designed to bring business operations, financial information, analytics, and third-party integrations into one centralized workspace.

It combines interactive dashboards, AI-assisted insights, and business tools to help executives monitor performance, manage information, and make informed decisions.

## Features

- **Executive Dashboard** – Centralized visibility into business activities, performance, and key metrics.
- **Financial Management** – Interactive financial dashboards for reviewing business financial information.
- **AI Assistant** – AI-powered assistance for exploring business data and generating insights.
- **Business Intelligence** – Visual analytics, summaries, and data-driven insights.
- **Third-Party Integrations** – Connect external business platforms and access integrated information.
- **Integration Management** – Manage connected applications and monitor their connection status.

## Integrations

CEOOO is designed to integrate with external business services, including:

- Salesforce
- HubSpot
- Google Sheets
- Trello
- Asana
- Microsoft services

Integration availability depends on implementation status and provider configuration.

## Technology Stack

| Category | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript |
| UI & Styling | Tailwind CSS, shadcn/ui |
| State Management | Zustand |
| Animations | Framer Motion, GSAP |
| Backend | Node.js, REST APIs |
| Authentication | OAuth 2.0 |
| Infrastructure | Docker |
| Database | PostgreSQL, Prisma |

## Project Structure

```text
ceooo/
├── client/       # Next.js frontend application
├── server/       # Express backend and API
└── README.md
```

The client and server are maintained as independent applications. The frontend communicates with the backend through HTTP APIs.

## Getting Started

### Prerequisites

- Docker
- Docker Compose
- Git

### Installation

Clone the repository:

```bash
git clone https://github.com/yemizerfe/ceooo.git
cd ceooo
```

### Environment Configuration

Private environment configuration is not included in the repository.

Before running the application, configure your own:

- Database credentials and connection URLs
- JWT and session secrets
- Frontend and backend URLs
- AI service credentials
- OAuth application credentials
- Third-party integration settings

Do not commit `.env` files, API keys, access tokens, or other sensitive configuration.

### Run with Docker Compose

Build and start the application:

```bash
docker compose up --build -d
```

View running containers:

```bash
docker compose ps
```

View application logs:

```bash
docker compose logs -f
```

Stop the application:

```bash
docker compose down
```


## Security & Configuration

- Environment files and private credentials are excluded from the repository.
- OAuth credentials are configured through provider applications.
- Database migrations are managed with Prisma.
- Each deployment uses its own environment configuration.

## License

This project is currently maintained as a private development project.
