HNG Stage 1: Identity & Classification API

A robust Node.js backend that aggregates data from multiple identity APIs, applies custom classification logic, and persists the results in a Supabase PostgreSQL database.
🚀 Features

    Parallel Data Fetching: Utilizes Promise.all to fetch from three external APIs simultaneously, maintaining a sub-500ms response time.

    Data Persistence: Stores unique profiles in Supabase to avoid redundant external API calls.

    Idempotency: Automatically detects existing names and returns the stored record instead of creating duplicates.

    Advanced Filtering: Supports case-insensitive filtering by gender, country, and age group.

    Strict Error Handling: Implements precise 502 handling for upstream failures as per HNG requirements.

🛠️ Tech Stack

    Runtime: Node.js (ES Modules)

    Framework: Express.js

    Database: PostgreSQL (via Supabase)

    ID Standard: UUID v7

    Deployment: Vercel

📖 API Documentation

1. Create/Retrieve Profile

Endpoint: POST /api/profiles

Body: { "name": "ella" }
Status Scenario Response
201 New Profile Returns the full classified profile object.
201 Existing Returns existing record with "message": "Profile already exists".
400 Input Error Returned if name is missing or empty.
502 API Failure Returned if Genderize, Agify, or Nationalize fail. 2. Get All Profiles

Endpoint: GET /api/profiles

Optional Query Params: gender, country_id, age_group (Case-insensitive)

Example: /api/profiles?gender=male&country_id=NG 3. Get Single Profile

Endpoint: GET /api/profiles/:id

Response: 200 OK with profile data, or 404 if not found. 4. Delete Profile

Endpoint: DELETE /api/profiles/:id

Response: 204 No Content on success, or 404 if not found.
⚙️ Local Setup

1
Clone & Install
Get the code ready
Bash

git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
npm install

2
Configure Environment
Setup your secrets

Create a .env file in the root directory:
env

SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
PORT=3000

3
Database Setup
Prepare the schema

Run the SQL schema provided in the /database folder (or the SQL snippet from the task instructions) in your Supabase SQL editor.
4
Start the Server
Launch locally
Bash

npm run dev

🗺️ Classification Rules

    Age Groups: Child (0–12), Teenager (13–19), Adult (20–59), Senior (60+).

    Nationality: Selected based on the highest probability returned by the Nationalize API.

📝 License

This project is licensed under the MIT License.
