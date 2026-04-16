**HNG Stage 1:** Identity & Classification API

A robust Node.js backend that aggregates data from multiple identity APIs, applies custom classification logic, and persists the results in a Supabase PostgreSQL database.

🚀 Features

    Parallel Data Fetching: Utilizes Promise.all to fetch from three external APIs simultaneously, maintaining a sub-500ms response time.

    Data Persistence: Stores unique profiles in Supabase to avoid redundant external API calls.

    Idempotency: Automatically detects existing names and returns the stored record instead of creating duplicates.

    Advanced Filtering: Supports case-insensitive filtering by gender, country, and age group.

    Strict Error Handling: Implements precise 502 handling for upstream failures as per HNG requirements.

🛠️ Tech Stack

    Runtime: Node.js

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
    502 API Failure Returned if Genderize, Agify, or Nationalize fail.

2. Get All Profiles

Endpoint: GET /api/profiles

    Optional Query Params: gender, country_id, age_group

    Example: /api/profiles?gender=male&country_id=NG

3. Get Single Profile

Endpoint: GET /api/profiles/:id

    Response: 200 OK with profile data, or 404 if not found. 4. Delete Profile

    Endpoint: DELETE /api/profiles/:id

    Response: 204 No Content on success, or 404 if not found.


⚙️ Local Setup

1. Clone & Install
Get the code ready

        git clone https://github.com/mariioox/hng-stage-1-backend
        cd hng-stage-1-backend
        npm install

2. Configure Environment
Setup your secrets

Create a .env file in the root directory:

    SUPABASE_URL=your_supabase_url
    SUPABASE_ANON_KEY=your_anon_key
    PORT=3000

3. Database Setup
Prepare the schema

Create the profiles table

    CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY, -- We generate UUID v7 in the backend
        name TEXT NOT NULL UNIQUE,
        gender TEXT,
        gender_probability FLOAT,
        sample_size INTEGER,
        age INTEGER,
        age_group TEXT,
        country_id TEXT,
        country_probability FLOAT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

Create an index for faster filtering

    CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles(name);    
    CREATE INDEX IF NOT EXISTS idx_profiles_filters ON profiles(gender, country_id, age_group);


4. Start the Server
Launch locally

        npm run dev

🗺️ Classification Rules

    Age Groups: Child (0–12), Teenager (13–19), Adult (20–59), Senior (60+).

    Nationality: Selected based on the highest probability returned by the Nationalize API.

📝 License

This project is licensed under the MIT License.
