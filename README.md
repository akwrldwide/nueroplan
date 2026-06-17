# Nuero Plan

A Curriculum-Aware Adaptive Academic Planning System using custom weighted decision logic for intelligent course priority allocation and risk evaluation.

A detailed, styled version of this tech stack summary is available in the generated [Nueroplan_Tech_Stack.pdf](Nueroplan_Tech_Stack.pdf) file.

## Architecture
- **Frontend**: React (v19.2), Vite (v7.3), TypeScript, Tailwind CSS (v4.2), React Router Dom (v7.13), Axios, Recharts (v3.7), Framer Motion (v12.34), Lucide React.
- **Backend**: Node.js, Express (v5.2), Google Generative AI (Gemini v0.24), Prisma ORM (v5.22), JWT authentication, bcryptjs, pdf-parse (v2.4).
- **Database**: PostgreSQL (pg v8.18).

## Run Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL server installed and running locally
- Git

### 1. Database Setup
Ensure PostgreSQL is running. Create a database named `nueroplan`.

### 2. Backend Setup
Navigate to the `backend` folder:
```bash
cd backend
```
Install dependencies:
```bash
npm install
```
Update `.env` in the backend folder with your PostgreSQL credentials:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/nueroplan?schema=public"
JWT_SECRET="nueroplan_super_secret_key"
PORT=5000
```
Push the schema and seed the database:
```bash
npx prisma db push
node prisma/seed.js
```
Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
Open a new terminal and navigate to the `frontend` folder:
```bash
cd frontend
```
Install dependencies:
```bash
npm install
```
Start the frontend development server:
```bash
npm run dev
```
The application will be available at `http://localhost:5173`.

---

## API Documentation

### Authentication (`/api/auth`)
- `POST /register`: Register a new user (`name`, `email`, `password`). Returns JWT + user obj.
- `POST /login`: Authenticate an existing user (`email`, `password`). Returns JWT + user obj.
- `GET /me`: Get the current authenticated user's profile info. Requires Auth header.

### Academic Profile (`/api/profile`)
- `POST /`: Create academic profile (`program`, `level`, `curriculum_type`, `current_cgpa`, `academic_goal`).
- `GET /`: Get current user's academic profile.
- `PUT /`: Update current user's academic profile.

### Courses & Curriculum (`/api/courses`)
- `GET /curriculum`: Fetch available curriculum from seed data. Query params: `program`, `level`.
- `POST /`: Save selected courses to user's profile (`courses` array).
- `GET /`: Get all courses added to the user's profile.
- `PUT /:id`: Update a specific user course (e.g. `difficulty`, `exam_date`).

### Study Availability (`/api/availability`)
- `POST /`: Submit user's weekly study time preferences (`availabilities` array).
- `GET /`: Retrieve current user's saved availabilities.

### Study Plan Allocation Engine (`/api/plan`)
- `POST /generate`: Triggers custom priority logic to calculate PriorityScore and RiskFactor. Generates study plan sessions for the week.
- `GET /current`: Retrieves the most recently generated study plan and its active sessions.

### Quiz Module (`/api/quiz`)
- `GET /:course_id`: Fetch MCQs for a specified course.
- `POST /:course_id`: Submit answers and calculate score percentage.

### Progress & Dashboard (`/api/progress`)
- `GET /dashboard`: Aggregate statistics (Total Courses, High Risk Courses, Next Exam Countdown, AI Insight explanation).
- `POST /session/complete`: Mark a `study_session` as complete and update internal logging stats.
