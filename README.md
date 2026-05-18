# MediStock - Smart Medical Inventory Platform
### KronTech Challenge 2026 | Noventi Kronsoft Track

Preventing medical waste through AI-driven inventory prediction and real-time redistribution

---

## Problem Statement

The COVID-19 pandemic exposed a systemic flaw in medical supply chains — hospitals and pharmacies over-ordered vaccines, leading to millions of doses wasted due to expiry. MediStock solves this with an intelligent, interconnected inventory system that facilitates dynamic redistribution of medical supplies before they expire.

---

## Project Architecture

The current project structure consists of a microservices and modular setup, split into three main parts:

```
Krontech_2026/
├── medistock-frontend/        - Angular 21 (Standalone Components & Reactive UI)
│   └── src/app/
│       ├── components/        - Shared visual components (medicament-list, medication-details-modal, transfer-management)
│       ├── interceptors/      - HTTP authentication and request interceptors
│       ├── models/            - TypeScript domain models (Medicament, AuthUser, TransferRecommendation, etc.)
│       ├── pages/             - Page-level containers (login)
│       ├── services/          - Injectable services (auth, batches, inbox, medication, prediction, transfer, user)
│       ├── app.ts             - Core application component shell (tab-based navigation)
│       ├── app.html           - Shell template (Dashboard, Medications, Transfers, Inbox, Alerts)
│       └── app.scss           - Modular custom responsive stylesheets
├── backend_medstock/          - Spring Boot API Core (Java back-end services)
│   └── src/main/resources/    - Application properties and dynamic configurations
└── medistock-engine/          - AI Optimization Engine (Python recommendations)
    └── engine/
        └── generate_transfer_recommendations.py - Script calculating redistribution matrices
```

---

## B2B Portal - For Hospital Managers and Staff

The platform is focused entirely on the B2B portal, which allows healthcare institutions to synchronize inventory and transfer excess stocks dynamically:

| Feature | Description |
|---|---|
| **Operations Dashboard** | Real-time inventory overview, total items in catalog, active and inactive medications, and critical alerts. |
| **Custom Donut Chart Visualization** | Interactive, mathematical SVG-based Donut chart representing real-time potential savings. Calculated dynamically via TypeScript and responsive SCSS. |
| **Inventory Management** | Full catalog control supporting search, categories, activity state filtering, pagination, and deletion. |
| **AI Transfer Suggestions** | Real-time redistribution suggestions calculated by the prediction service based on net savings. |
| **Inter-hospital Transfers** | Integrated workflow enabling users to request and coordinate medical stock transfers between institutions. |
| **Inbox & Notifications** | Live inbox listing incoming and outgoing transfer requests, complete with unread badges and live notification banners. |

Please note: The B2C portal (Patient portal, vaccine booking, etc.) is currently not implemented and is not part of this release.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 21 (Standalone Components, TypeScript, ChangeDetectorRef optimization) |
| Styling | SCSS with tailored CSS Custom Properties (variables) and responsive design |
| State & Reactivity | RxJS (non-blocking Observable streams, BehaviorSubjects, and dynamic interval polling) |
| HTTP & Routing | HttpClient with dynamic query parameters and tab-based conditional navigation |
| Backend | Spring Boot (Java), Supabase PostgreSQL database |
| Optimization Engine | Python 3, UUIDv5 deterministic routing |

---

## Recent System Optimization & AI Integration Updates

Several stability, data-integrity, and backend-integration updates have been engineered to streamline the AI redistribution pipeline:

### 1. Stable, Deterministic AI Recommendation IDs (UUIDv5)
* **Problem**: The periodic AI analysis (every 15s) previously wiped and re-inserted recommendations using new random UUIDs. If a user clicked "Send AI Transfer" after the list refreshed, the request returned a `400 Bad Request` because the original ID was deleted.
* **Solution**: Migrated to deterministic UUIDv5 generation derived from immutable route properties: `(source_hospital_id, destination_hospital_id, medication_id, batch_id)`. IDs remain 100% persistent across runs, preventing runtime expiry errors.

### 2. Selective Database Cleanup & Cascade Prevention
* **Problem**: The AI Engine's refresh script originally performed `TRUNCATE CASCADE` on dynamic tables, which recursively wiped active transfer requests and recipient inbox messages.
* **Solution**: Replaced the truncation with a selective delete query that targets only pending, unreferenced recommendations. Active transfer history, inbox notifications, and stock transactions remain fully persisted in Supabase.

### 3. Dynamic Controlled Medication Rules & Triggers
* **Problem**: Transfer requests were inserted with default storage parameters, causing database constraint failures when controlled substances (e.g., Morphine) were processed.
* **Solution**: Integrated dynamic Java metadata lookup to extract the storage type from the medication schema at initialization. This feeds the SQL parameters correctly, triggering PL/pgSQL database hooks and inbox notification counts successfully.

### 4. Robust Subprocess Python Executable Scoping
* **Problem**: Spawning the Python AI Engine from Spring Boot threw system-level module lookup warnings.
* **Solution**: Bound the backend configuration specifically to the virtualenv execution directory (`/backend_medstock/venv/bin/python3`), scoping all system executions cleanly.

---

## Installation and Startup Tutorial

This section provides a step-by-step tutorial on how to install, configure, and run the MediStock platform locally.

### Prerequisites
Make sure you have the following environments installed on your machine:
* Java Development Kit (JDK) 17 or higher
* Node.js (v18 or higher) and npm
* Python 3 and virtualenv

---

### Step 1: Setting up the Python Virtual Environment (venv)

The backend application orchestrates a Python AI Optimization Engine. To ensure all required Python packages are installed without interfering with your global Python environment, you must set up a local virtual environment (`venv`) inside the backend directory.

1. Navigate to the backend root directory:
   ```bash
   cd backend_medstock
   ```
2. Create a new virtual environment named `.venv` (or `venv`):
   ```bash
   python3 -m venv .venv
   ```
3. Activate the virtual environment based on your operating system:
   * **macOS / Linux:**
     ```bash
     source .venv/bin/activate
     ```
   * **Windows (Command Prompt):**
     ```cmd
     .venv\Scripts\activate.bat
     ```
   * **Windows (PowerShell):**
     ```powershell
     .venv\Scripts\Activate.ps1
     ```
   *Note: Once activated, your terminal prompt will be prefixed with `(.venv)`.*
4. Upgrade pip and install the required packages from `requirements.txt`:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
5. Leave the virtual environment active in this terminal, or run `deactivate` to exit it.

---

### Step 2: Configuration of the Backend Properties

The backend application requires a configuration file to connect to the Supabase database and run properly. Without this file, the Spring Boot application will fail to start.

1. Navigate to the resources directory in the backend project:
   ```bash
   cd src/main/resources
   ```
   *(Ensure you are inside `backend_medstock/src/main/resources`)*
2. You will find a template file named `application.properties.txt`. Create a copy of this file and rename it to `application.properties`:
   ```bash
   cp application.properties.txt application.properties
   ```
3. Open `application.properties` in your text editor and fill in the placeholders with your actual database credentials:
   * Replace `<YOUR_DATABASE_HOST>`, `<YOUR_PORT>`, and `<YOUR_DATABASE_NAME>` with your PostgreSQL or Supabase instance details.
   * Provide the database username and password.
   * Set your custom secret key in `jwt.secret`.
   * Configure the correct `engine.python-executable` value to point to the python executable in the virtual environment you just created.
     * macOS/Linux: `python3` or the direct path `venv/bin/python3` / `.venv/bin/python3`
     * Windows: `venv\Scripts\python.exe` or `.venv\Scripts\python.exe`

---

### Step 3: Granting Execution Permissions for Maven

When you clone the repository on macOS or Linux, the Maven wrapper script (`mvnw`) inside the backend folder does not have execution permissions by default. You must grant it permission before attempting to launch the server.

1. Navigate back to the backend root directory (`backend_medstock`):
   ```bash
   cd ../../..
   ```
2. Grant execution rights to the Maven wrapper script:
   ```bash
   chmod +x ./mvnw
   ```
   *Note: If you skip this step, executing the run script in the next step will result in a "Permission Denied" error.*

---

### Step 4: Running the Backend Server

Once you have configured the properties, installed the virtual environment, and set the execution permissions, you are ready to start the backend.

1. From the `backend_medstock` directory, run the compile and start command:
   ```bash
   ./mvnw spring-boot:run
   ```
2. The server will start and serve APIs on `http://localhost:8080/`.

*Automation Note: The backend is configured to automatically launch the Python AI Optimization Engine (located in `medistock-engine`) as a subprocess on port 8001. It will run using the virtualenv python interpreter scoped in your properties.*

---

### Step 5: Installing and Running the Frontend Server

The frontend is an Angular 21 application configured to proxy its API requests to the backend server.

1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd medistock-frontend
   ```
2. Install all required Node packages:
   ```bash
   npm install
   ```
3. Launch the local Angular development server:
   ```bash
   npm run start
   ```
4. Once compiled successfully, open your web browser and access the application at `http://localhost:4200/`.

---

## Platform Strengths

1. **Real-world Impact** - Minimizes high-cost medical waste and improves logistics across the pharmaceutical sector.
2. **Technical Depth** - Combines Spring Boot APIs, Supabase PostgreSQL hooks, a Python-based redistribution engine, and a fully reactive Angular 21 client.
3. **Optimized Client Performance** - Custom interactive visual SVG elements bypass heavy third-party graphing libraries for superior performance.
