# Dentine 🦷

### **DSOLVE 2026** · DRISHTI · College of Engineering Trivandrum (CET)

**BUILD. SOLVE. DEMONSTRATE.**

|                   |                                           |
| ----------------- | ----------------------------------------- |
| **Problem:**      | Problem 7 —    Real-Time Clinical Measurement             |
| **Team Name:**    | Nova                                      |
| **Team Members:** | Sara Nisam , Fida Noushad CT , Arun Mathews , Anlet ER |
| **Institution:**  | Rajiv Gandhi Institute of Technology, Kottayam |
| **Live Demo:**    | [Demo link goes here]                     |
| **Pitch Video:**  | [Social media pitch video link]           |

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Our Solution](#our-solution)
- [How It Works](#how-it-works)
- [Key Features](#key-features)
- [Periodontal Data Structure](#periodontal-data-structure)
- [Screenshots & Demo](#screenshots--demo)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage / Demo Script](#usage--demo-script)
- [Limitations & Future Scope](#limitations--future-scope)
- [Team](#team)
- [Submission Checklist](#submission-checklist)

---

## Problem Statement

> ## Problem 7: Real-Time Clinical Measurement 
>
> Develop a real-time or near-real-time voice solution that enables dental professionals to capture and record clinical measurements with minimal delay.

The solution should process spoken measurements such as pocket depth, bleeding, recession, and other periodontal findings, converting them into structured data and reflecting them in the application almost instantly. It should explore ways to combine speech recognition, rule-based processing, and AI while handling corrections, repeated measurements, and natural variations in speech.

The goal is to reduce processing latency and manual data entry, creating a fast, seamless, hands-free clinical documentation experience.


### Why this matters

Periodontal charting involves recording multiple measurements for individual
teeth during a dental examination. Manually entering these measurements can be
time-consuming and may interrupt the dentist's workflow.

Dentine aims to simplify this process by allowing dentists to record
periodontal findings through voice and automatically convert them into
structured digital records.

---

## Our Solution

**Dentine** is an AI-assisted voice-based periodontal charting system designed
to make dental data entry faster and easier.

Instead of manually entering every periodontal measurement, the dentist can
speak the findings naturally. Dentine uses **Whisper Speech-to-Text** to
convert the voice into text and **Groq LLM** to extract the relevant
periodontal information into a structured JSON format.

The extracted data then passes through a strict validation layer before being
stored in the database. This prevents incomplete or invalid information from
being silently saved.

The system also detects missing or unclear information and prompts the dentist
to provide the required correction.

---

## How It Works

Dentine follows a simple **voice-to-database workflow**.
🎙️ Dentist Voice Input
          ↓
📝 Whisper Speech-to-Text
          ↓
📄 Transcribed Text
          ↓
🤖 Groq LLM Processing
          ↓
📋 Structured JSON
          ↓
✅ Data Validation
          ↓
     ┌───────────────┐
     │  Valid Data?  │
     └───────┬───────┘
             │
       ┌─────┴─────┐
       ↓           ↓
      YES           NO
       ↓            ↓
💾 Database    ⚠️ Error Message
       ↓            ↓
🦷 Periodontal  🔄 Correction
   Chart             ↓
                Re-validation

### 1. 🎙️ Voice Input

The dentist records periodontal findings naturally through voice, including
tooth number, pocket depth, recession, bleeding, and mobility.

### 2. 📝 Speech-to-Text

The recorded voice is processed using **Whisper Speech-to-Text**, which
converts the dentist's speech into text.

### 3. 🤖 AI-Powered Data Extraction

The transcribed text is sent to the **Groq API** using an LLM. The AI
identifies the periodontal information and converts it into structured JSON.

### 4. 📋 Structured JSON Generation

The extracted information is organized into a standardized periodontal data
structure.

```json
{
  "tooth": 16,
  "pocket_depth": [3, 2, 4],
  "recession": [1, 0, 1],
  "bleeding": [true, false, true],
  "mobility": 0
}
5. ✅ Data Validation

Before updating the database, Dentine validates the extracted information.

Tooth number must be valid.
Pocket depth must contain exactly 3 values when provided.
Recession must contain exactly 3 values when provided.
Bleeding must contain exactly 3 boolean values when provided.
Mobility must contain a valid numeric value.
Missing or incomplete information is detected.
Unclear or incorrectly transcribed terms are flagged.
6. ⚠️ Error Detection & Correction
Dentist:
"Tooth 16, pocket depth 3, 2."

Dentine:
"Error: Pocket depth requires exactly 3 values.
Please provide the missing value."

Dentist:
"The third pocket depth is 4."
7. 💾 Database Update

Only after successful validation, the periodontal data is stored in the
database and used to update the patient's periodontal chart.

🔄 Complete Workflow
🎙️ Dentist Voice Input
          ↓
📝 Whisper Speech-to-Text
          ↓
📄 Transcribed Text
          ↓
🤖 Groq LLM Processing
          ↓
📋 Structured JSON
          ↓
✅ Data Validation
          ↓
     ┌───────────────┐
     │  Valid Data?  │
     └───────┬───────┘
             │
       ┌─────┴─────┐
       ↓           ↓
      YES           NO
       ↓            ↓
💾 Database    ⚠️ Error Message
       ↓            ↓
🦷 Periodontal  🔄 Correction
   Chart             ↓
                Re-validation
## Key Features
Features
🎙️ Voice-Based Periodontal Charting
Allows dentists to record periodontal findings using natural voice input
instead of manually entering every value.
📝 Speech-to-Text Conversion
Converts the dentist's voice into text using Whisper.
🤖 AI-Powered Data Extraction
Uses Groq API with LLM to understand the transcript and extract
periodontal findings.
📋 Structured JSON Generation
Converts extracted information into a standardized periodontal JSON format.
✅ Strict Data Validation
Validates all extracted values before they are stored.
⚠️ Missing Value Detection
Detects incomplete information such as missing pocket-depth or recession
measurements.
🗣️ Speech Recognition Error Handling
Handles possible transcription errors and flags unclear terminology instead
of silently storing incorrect data.
🔄 Interactive Correction
Allows the dentist to provide missing or corrected information.
💾 Database Integration
Stores validated periodontal records in the database.
🔒 Validation Before Database Update
Ensures that incomplete or invalid data is not directly written to the
database.
##Periodontal Data Structure

Dentine stores periodontal examination findings in a structured format for
each tooth.
{
  "tooth": 16,
  "pocket_depth": [3, 2, 4],
  "recession": [1, 0, 1],
  "bleeding": [true, false, true],
  "mobility": 0
}
## Screenshots & Demo

| Screenshot                                            | Description                          |
| ----------------------------------------------------- | ------------------------------------ |
| [Screenshot 1](https://drive.google.com/file/d/1vQr74DbJeh-Njm6oTXnltAqIaAuknIx9/view?usp=drivesdk) | [What it shows]                      |
| [Screenshot 2](https://drive.google.com/file/d/1LXrqvYOMDgt0kFmIRUbn3RCdkOruTuYV/view?usp=drivesdk) | [What it shows]                      |
| [Pitch Video](https://drive.google.com/drive/folders/1gWClxKhs-VdYSyI8gFADTjk2ZM58ehpz)               | Link to your >30s social pitch video |

---

## Tech Stack

| Layer           | Technology                         | Why we chose it |
| --------------- | ---------------------------------- | --------------- |
| Frontend        | HTML, CSS, Typescript              | Provides a simple and responsive interface for dentists |
| Backend         | Python, Flask                      | Handles API requests, voice processing, AI integration, validation, and database operations |
| Database        | Supabase                           | Stores validated patient and periodontal examination data |
| ML / AI         | Groq API – `openai/gpt-oss-20b`    |Extracts periodontal information from transcribed text and converts it into structured data |
| Infra / Hosting | [where your solution runs]         | [reason]        |

> **Only a sample** — fill in the **"Technology"** column with your own choices.
> No language, framework, architecture, or project structure is prescribed; use
> whatever works best for your team.

---

## Getting Started

### Prerequisites

Python 3.x
MySQL
Git
A Groq API key
Microphone access for voice input


### Installation

> Clone the Repository
git clone https://github.com/SARANISAM/dentine.git
cd dentine
Create a Virtual Environment
python -m venv .venv
.venv\Scripts\activate
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
CREATE DATABASE dentine;

### Environment Variables

| Variable       | Description                       | Example                           |
| -------------- | --------------------------------- | --------------------------------- |
| `API_KEY`      | API key for a third-party service | `sk-xxxxxxxxxxxxxxxxxx`           |
| `DATABASE_URL` | Database connection string        | `your-database-connection-string` |
| `PORT`         | Port the backend listens on       | `8000`                            |



## Usage / Demo Script


1. login page for doctors
2. after authentication dashboard for voice recording
3. voice is further transcribed into text and it is validated
4. after validation ,text is converted into json structure 
5. peridontic chart and report is displayed

---

## Limitations & Future Scope

### Known Limitations

- 🎙️ **Speech Recognition Errors**  
  Whisper may occasionally misinterpret words because of pronunciation,
  accents, background noise, or unclear speech.
- 🌐 **Internet Dependency**  
  AI processing through the Groq API requires an active internet connection.
- 📋 **Limited Data Structure**  
  The current system focuses on the periodontal fields supported by the
  implemented chart, such as tooth number, pocket depth, recession, bleeding,
  and mobility.

### Future Scope

 🎙️ **Improved Dental Speech Recognition**  
  Develop specialized speech recognition and terminology handling for dental
  and periodontal vocabulary.

- 🌍 **Multilingual Voice Support**  
  Support multiple languages and regional accents for easier adoption.
 🦷 **Complete Periodontal Charting**  
  Expand support for additional periodontal and dental examination fields.

- 👤 **Patient Management**  
  Add patient registration, medical history, previous examination records,
  and longitudinal periodontal tracking
- 📊 **Analytics & Reporting**  
  Provide visual reports and historical comparisons to help dentists track
  periodontal findings over time.

---

## Team

| Name     | Role(s)                         | GitHub    | Email   |
| -------- | ------------------------------- | --------- | ------- |
|Sara Nisam | Backend |https://github.com/SARANISAM|Saranisam04@gmail.com|
|Fida Noushad CT |Text to Json formaat|https://github.com/fiidanoushad|fidanoushad18@gmail.com|                                 |           |         |
|Anlet ER |Speech to text|https://github.com/Anleter|anleterer94@gmail.com|
|Arun Mathews|Frontend|https://www.github.com/arun-mathews|arunmathews989@gmail.com|

## Submission Checklist

**Before 6:00 AM (Code Freeze) – Sat, Sept 19th:**

- [ ] Clean, runnable source code committed to this **public** repo
- [ ] `README.md` fully filled in (all sections above)
- [ ] Pitch video (>30s, English) posted on team member's social profile
      tagging **@DrishtiCET** & **@CareStack** and link added above
- [ ] All secrets/API keys removed from the repo
- [ ] Quick-start verified from a fresh clone (`git clone` → run)

---

**[Problem Statements](./docs/problem-statements.md)** ·
**[Submission Checklist](./SUBMISSION_CHECKLIST.md)** ·
**DSOLVE 2026 Guidelines**
