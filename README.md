# CEOOO

AI-Powered Business Management & Executive Workspace

CEOOO is a business management platform that brings executive dashboards, financial insights, business tools, and third-party integrations into a unified workspace. It combines centralized business information with AI-assisted analysis to support business operations and decision-making.

## Features

- **Executive Dashboard** – Centralized overview of business activities and key information.
- **Financial Overview** – Access and review financial information through interactive dashboards.
- **AI Assistant** – Ask questions about available business information and receive AI-generated insights.
- **Business Intelligence** – Explore business information through visualizations, summaries, and analytics.
- **Third-party Integrations** – Connect external business applications and access their information.
- **Integration Management** – Manage connected services and monitor their connection status.

## Integrations

CEOOO includes integrations with external business platforms:

- Salesforce
- HubSpot
- Google Sheets
- Trello
- Asana
- Microsoft services

Availability depends on the implementation status and permissions configured for each provider.

## Technology Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand
- Framer Motion
- GSAP
- Node.js
- REST APIs
- OAuth 2.0
- Docker

## Running Locally

CEOOO uses Docker Compose for containerized deployment.

### Prerequisites

- Docker
- Docker Compose

### Installation

Clone the repository:


git clone https://github.com/yemizerfe/ceooo.git
cd ceooo


### Configuration

Private environment configuration is not included in this repository.

CEOOO does not distribute its `.env` files, API keys, OAuth credentials, database credentials, JWT secrets, or other private application configuration.

To run your own instance:

1. Review the available Docker Compose configuration.
2. Configure the required environment variables using your own credentials.
3. Configure your own database and external service accounts.
4. Set up the required OAuth applications and callback URLs.
5. Start the application using Docker Compose.

### Start the Application

   docker compose up --build -d


To view running containers:

   docker compose ps

To inspect application logs:

   docker compose logs -f


To stop the application:


   docker compose down

Refer to the Docker Compose configuration and application requirements for the environment variables and services required by your deployment.



## License

This project is currently maintained as a private development project.
