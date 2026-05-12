# Support Insight

AI-powered customer support ticket analytics platform. Upload a CSV of support tickets and instantly get dashboards, trends, category breakdowns, sentiment analysis, and AI-generated agent replies.

## Features

- **Dashboard** — KPI cards, ticket volume by category, sentiment distribution, revenue at risk, top issues, countries, and radar chart
- **Trends** — Daily volume, sentiment over time, status breakdown, velocity comparison vs previous period
- **Categories** — Per-category drilldown with status/sentiment charts and top issues
- **Ticket Explorer** — Search, filter, resolve/escalate tickets, generate AI replies (powered by Gemini)
- **Upload** — Drag-and-drop CSV ingestion with automatic category inference and sentiment scoring
- **Fully responsive** — Sidebar navigation on desktop, slide-out drawer on mobile

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Recharts |
| Backend | FastAPI, SQLAlchemy, SQLite |
| AI | Google Gemini 2.0 Flash |
| Deploy | Docker, Render |

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 18+

### 1. Clone and set up environment

```bash
git clone https://github.com/YOUR_USERNAME/ticket-management-app.git
cd ticket-management-app

# Copy env file and add your Gemini API key (optional — only needed for AI replies)
cp .env.example .env
```

### 2. Start the backend

```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`  
API docs at `http://localhost:8000/docs`

### 3. Start the frontend

```bash
cd react-frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`

### 4. Load sample data

Go to the **Upload** page and upload `data/raw/sample_1000.csv` — the app will automatically infer categories and sentiment scores.

## Deployment on Render (Free)

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service → connect your repo
3. Render auto-detects the `Dockerfile`
4. Set instance type to **Free** and click **Create Web Service**

The Dockerfile builds the React frontend and bundles it into the FastAPI server — one URL serves everything.

> **Note:** The free tier uses SQLite, so data resets on each deploy. Upload the sample CSV after deploying.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./support_db.sqlite3` | Database connection string |
| `GEMINI_API_KEY` | *(empty)* | Google Gemini API key for AI replies |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Gemini model to use |

Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com/app/apikey).  
AI reply generation works without a key — it returns a fallback message if the key is missing.

## CSV Format

The Upload page accepts CSV files with these columns:

| Column | Required | Format |
|---|---|---|
| `timestamp` | Yes | `YYYY-MM-DD HH:MM:SS` |
| `customer_id` | Yes | string |
| `channel` | Yes | `chat` / `email` / `web` |
| `message` | Yes | text |
| `ticket_id` | No | UUID (auto-generated if missing) |
| `agent_reply` | No | text |
| `product` | No | string |
| `order_value` | No | numeric (USD) |
| `customer_country` | No | string |
| `resolution_status` | No | `open` / `resolved` / `escalated` |

## Project Structure

```
ticket-management-app/
├── backend/
│   ├── api/routes/         # FastAPI route handlers
│   ├── models/             # SQLAlchemy models + Pydantic schemas
│   ├── pipeline/           # AI reply generation (Gemini)
│   ├── utils/              # Gemini client, logger
│   ├── db/                 # Database session
│   ├── config.py           # App settings
│   └── main.py             # FastAPI app entry point
├── react-frontend/
│   └── src/
│       ├── pages/          # Dashboard, Trends, Categories, TicketExplorer, Upload
│       ├── components/     # Shared UI components
│       └── api/client.js   # Axios API client
├── data/raw/
│   └── sample_1000.csv     # Sample dataset for testing
├── Dockerfile              # Multi-stage build (Node → Python)
├── render.yaml             # Render deployment config
└── .env.example            # Environment variable template
```
