# LendingClub Credit Risk Underwriting Engine (v4.2)

An interactive, regulatory-compliant (IFRS 9) credit risk underwriting dashboard and Probability of Default (PD) simulation engine. This application allows users to execute macro stress-testing scenarios, explore features using Weights of Evidence (WoE), and interact with real-time financial models.

Link to live project: [View Live Production App](https://netlify.app)

---

## Key Features
* **Interactive Underwriting Sandbox:** Dynamically test credit scenarios with adjustable parameters like income, loan size, and credit grades.
* **Macro Stress-Testing Simulator:** Evaluate portfolio resilience against baseline states, recession shocks, and inflation liquidity strains.
* **Multicurrency Support:** Toggle instantly between INR (₹), USD ($), and EUR (€) formatting.
* **Feature Exploration:** In-depth visual breakdowns of Weight of Evidence (WoE) and Information Value (IV) metrics.
* **Compliance Coach:** Built-in section for domain-specific tracking and AI guidance.

---

## Tech Stack
* **Frontend:** React 19, Vite, TypeScript
* **Styling:** Tailwind CSS v3, Motion (Framer Motion)
* **Charts and Data Visuals:** Recharts
* **Icons:** Lucide React
* **Backend Utilities:** Express, Dotenv, Esbuild, Google GenAI

---

## How to Run Locally

### 1. Prerequisites
Ensure you have Node.js installed on your system.

### 2. Installation
Clone the repository and install the project dependencies:
```bash
npm install
```

### 3. Environment Setup
Create a `.env` or `.env.local` file in the root directory and insert your Google Gemini API key:
```env
GEMINI_API_KEY=your_api_key_here
```

### 4. Start Development Server
```bash
npm run dev
```
