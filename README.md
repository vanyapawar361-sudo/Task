# TaskFlow — Smart Task Manager

TaskFlow is a mini task management application that automatically calculates a priority score for each task based on its deadline and importance.

## Features
- **Smart Priority Scoring**: Computes score using: `(importance * 10) + (100 / max(daysUntilDue, 1))`.
- **Real-time Sorting**: Tasks are automatically sorted by priority score (descending).
- **Advanced Filtering**: Filter by status and minimum importance.
- **Analytics Dashboard**: Aggregated stats using MongoDB Aggregation Pipeline.
- **Modern UI**: Dark mode, glassmorphism, responsive design, and smooth animations.

## Tech Stack
- **Frontend**: React, Vite, Axios, Framer Motion, Lucide React, Date-fns.
- **Backend**: Node.js, Express, MongoDB (Mongoose).

## Setup Instructions

### Prerequisites
- Node.js installed.
- MongoDB running locally or a connection string from MongoDB Atlas.

### Backend Setup
1. Navigate to `backend/`
2. Install dependencies: `npm install`
3. Create a `.env` file with:
   ```
   PORT=5000
   MONGODB_URI=your_mongodb_uri
   ```
4. Start the server: `npm run start` (or `nodemon index.js`)

### Frontend Setup
1. Navigate to `frontend/`
2. Install dependencies: `npm install`
3. Start the dev server: `npm run dev`
4. Access the app at `http://localhost:5173`

## API Endpoints
- `POST /bfhl/tasks`: Create task.
- `GET /bfhl/tasks`: List tasks with filters and sorting.
- `PATCH /bfhl/tasks/:id`: Update task.
- `DELETE /bfhl/tasks/:id`: Delete task.
- `GET /bfhl/tasks/stats`: Aggregated stats.
