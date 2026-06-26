# 🚀 Lexi — Personal AI Assistant

<p align="center">
  <img src="docs/images/lexi-banner.png" alt="Lexi Banner" width="100%">
</p>

<p align="center">
  <strong>A voice-enabled AI assistant with personality modes, persistent memory, web search, and mobile-first design.</strong>
</p>

<p align="center">
  <a href="https://stratify-ai-tan.vercel.app">🌐 Live Demo</a> •
  <a href="#features">✨ Features</a> •
  <a href="#architecture">🏗️ Architecture</a> •
  <a href="#installation">⚙️ Installation</a>
</p>

---

## 📖 Overview

Lexi is a full-stack AI assistant designed to provide more than just chatbot conversations.

Built over 11 days, Lexi combines conversational AI, long-term memory, voice interaction, intelligent web search, and specialized personality modes into a single assistant experience.

Unlike simple LLM wrappers, Lexi includes:

* 🧠 Multi-node reasoning workflows
* 🎤 Voice conversations
* 💾 Persistent memory
* 🌐 Real-time web search
* 📱 Mobile-first responsive design
* 🎭 Multiple AI personalities

---

## ✨ Features

### 🎭 Four Personality Modes

| Mode                | Description                                                                  |
| ------------------- | ---------------------------------------------------------------------------- |
| **Planner**         | Converts goals into structured plans, roadmaps, milestones, and action items |
| **Tutor**           | Explains concepts step-by-step using examples and analogies                  |
| **Friend**          | Casual and empathetic conversations with a supportive tone                   |
| **Interview Coach** | Conducts mock interviews and provides feedback                               |

---

### 🎤 Voice Mode

* Continuous voice conversations
* Automatic listen → think → respond cycle
* Animated AI orb with visual states
* Multiple voice options:

  * Aria
  * Jenny
  * Guy
* Voice-enabled mock interviews
* Mobile-friendly voice interface

#### Orb States

| Color     | State     |
| --------- | --------- |
| 🟢 Green  | Listening |
| 🟣 Purple | Thinking  |
| 🩷 Pink   | Speaking  |

---

### 💾 Persistent Memory

* Cloud-based chat storage
* Resume previous conversations
* Pin important chats
* Delete unused sessions
* Synchronization across devices

---

### 🌐 Smart Web Search

Lexi automatically determines when external information is required.

When necessary:

1. Searches the web using Tavily
2. Collects relevant information
3. Synthesizes results into a natural response
4. Maintains conversational context

---

### 📱 Mobile Responsive

Fully optimized for:

* Mobile phones
* Tablets
* Laptops
* Desktop devices

Responsive features include:

* Slide-out sidebar
* Hamburger navigation
* Responsive orb scaling
* Safe-area support
* Touch-friendly controls

Tested on:

* 375px
* 390px
* 430px
* 768px
* Desktop resolutions

---

## 🛠️ Tech Stack

### Backend

| Technology           | Purpose                   |
| -------------------- | ------------------------- |
| FastAPI              | REST API framework        |
| LangGraph            | Workflow orchestration    |
| Groq (Llama 3.3 70B) | LLM inference             |
| MongoDB Atlas        | Persistent memory storage |
| Motor                | Async MongoDB driver      |
| Tavily               | Web search                |
| Render               | Backend hosting           |

---

### Frontend

| Technology     | Purpose                             |
| -------------- | ----------------------------------- |
| Next.js 16     | React framework                     |
| TypeScript     | Type safety                         |
| Framer Motion  | UI animations                       |
| Web Speech API | Speech recognition & text-to-speech |
| Vercel         | Frontend deployment                 |

---

## 🏗️ Architecture

```text
User Input (Text / Voice)
           │
           ▼
     FastAPI Backend
           │
           ▼
      LangGraph Router
           │
 ┌─────────┼─────────┐
 │         │         │
 ▼         ▼         ▼
Casual  Emotional  Planning
           │
           ▼
     Search Decision
           │
           ▼
      Tavily Search
           │
           ▼
  Personality Prompt
           │
           ▼
       Groq LLM
           │
           ▼
 MongoDB Memory Save
           │
           ▼
     Frontend Output
```

---

## 📂 Project Structure

```bash
stratify-ai/
│
├── backend/
│   ├── main.py
│   ├── routes/
│   ├── workflows/
│   ├── prompts/
│   └── services/
│
└── frontend/
    ├── app/
    ├── components/
    ├── hooks/
    └── lib/
```

---

## ⚙️ Installation

### Prerequisites

* Python 3.10+
* Node.js 18+
* MongoDB Atlas Account
* Groq API Key
* Tavily API Key

---

## Backend Setup

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file:

```env
GROQ_API_KEY=your_key
MONGODB_URI=your_uri
TAVILY_API_KEY=your_key
```

Run the backend:

```bash
uvicorn main:app --reload
```

Backend:

```text
http://localhost:8000
```

---

## Frontend Setup

```bash
cd frontend

npm install
```

Create `.env.local`

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Run:

```bash
npm run dev
```

Frontend:

```text
http://localhost:3000
```

---

## 🚀 Deployment

| Service  | Deployment                             |
| -------- | -------------------------------------- |
| Frontend | https://stratify-ai-tan.vercel.app     |
| Backend  | https://lexi-backend-y21x.onrender.com |
| Database | MongoDB Atlas                          |

> **Note:** Free Render instances may take 30–60 seconds to wake up after inactivity.

---

## 🔌 API Endpoints

| Method | Endpoint                      | Description    |
| ------ | ----------------------------- | -------------- |
| POST   | `/api/chat`                   | Send message   |
| GET    | `/api/chats`                  | Get sessions   |
| GET    | `/api/messages/{session_id}`  | Fetch messages |
| POST   | `/api/chats/{session_id}/pin` | Pin chat       |
| DELETE | `/api/chats/{session_id}`     | Delete chat    |

---

### Example Request

```json
{
  "message": "Help me plan a trip to Paris",
  "session_id": "lexi_123456",
  "mode": "Planner",
  "history": []
}
```

---

## 📅 Development Timeline

| Day   | Completed Work                       |
| ----- | ------------------------------------ |
| 1–4   | FastAPI, LangGraph, Groq, MongoDB    |
| 5     | Tavily Search Integration            |
| 6     | Persistent Memory                    |
| 7     | Voice Mode                           |
| 8     | Personality Modes                    |
| 8     | Mobile Optimization                  |
| 9     | Render Deployment                    |
| 10–11 | Vercel Deployment & Production Fixes |

---

## 🗺️ Roadmap

### Phase 2 — Integrations

* Google OAuth
* Gmail Integration
* Google Calendar
* Google Drive Access

### Phase 3 — Intelligence

* Premium Voice Models
* Spotify Integration
* Proactive Suggestions

### Phase 4 — Vision

* Image Understanding
* Screen Analysis
* Visual Dashboard

### Phase 5 — True Assistant

* Wake Word Activation
* Background Processing
* Continuous Presence

---

## ⚠️ Current Limitations

### Voice Interruptions

Voice barge-in is currently unsupported because browser speech recognition and speech synthesis can conflict when operating simultaneously.

### Render Cold Starts

Backend response times may be delayed after periods of inactivity.

### Browser Support

Voice mode currently works best on:

* Google Chrome
* Microsoft Edge

Limited support exists for:

* Firefox
* Safari

---

## 👨‍💻 Developer

**Lekshmi Prasad**

Final-year Computer Science student building AI-powered products and intelligent assistant systems.

### Links

* GitHub: https://github.com/Lexmiii
* Live Demo: https://stratify-ai-tan.vercel.app

---

## ⭐ Support

If you found this project interesting, consider giving the repository a star.

It helps others discover the project and supports future development.

---

## 📜 License

This project is licensed under the MIT License.

---

<p align="center">
  <strong>Phase 1 Complete ✅</strong><br>
  Building toward a truly intelligent personal AI assistant.
</p>
