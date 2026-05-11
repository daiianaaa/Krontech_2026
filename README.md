# MediStock — Smart Medical Inventory Platform
### KronTech Challenge 2026 | Noventi Kronsoft Track

> **Preventing medical waste through AI-driven inventory prediction and real-time redistribution**

---

## 🎯 Problem Statement

The COVID-19 pandemic exposed a systemic flaw in medical supply chains — hospitals and pharmacies over-ordered vaccines, leading to **millions of doses wasted** due to expiry. MediStock solves this with an intelligent, interconnected inventory system.

---

## 🏗️ Project Architecture

```
Krontech_2026/
├── medistock-frontend/        ← Angular 19 (this repo)
│   └── src/app/
│       ├── core/              ← Models, Services, Guards, Interceptors
│       ├── shared/            ← Reusable UI components
│       ├── layout/            ← Auth, B2B, B2C shell layouts
│       └── features/
│           ├── auth/          ← Login, Register
│           ├── b2b/           ← B2B Portal (Staff/Managers)
│           │   ├── dashboard/       ← KPI overview
│           │   ├── inventory/       ← Stock table + filters
│           │   ├── expiry-alerts/   ← AI-suggested transfers
│           │   ├── transfers/       ← Inter-location movements
│           │   ├── predictions/     ← Demand forecasting charts
│           │   └── reports/         ← Waste analytics
│           └── b2c/           ← B2C Portal (Patients)
│               ├── patient-portal/        ← Home dashboard
│               ├── vaccine-booking/       ← Real-time slot booking
│               ├── vaccination-schedule/  ← Dose history + reminders
│               └── pharmacy-locator/      ← Map + live stock
└── (future) medistock-backend/   ← NestJS / Spring Boot API
```

---

## 🔵 B2B Portal — For Hospitals, Pharmacies & Warehouses

| Feature | Description |
|---|---|
| **Operations Dashboard** | Real-time KPIs: total SKUs, expiring soon, critical stock, efficiency score |
| **Inventory Management** | Full stock table with batch tracking, reorder levels, CSV export |
| **Expiry Alerts** | Automatic alerts for products within 30/15/7 days of expiry |
| **AI Transfer Suggestions** | ML-generated redistribution suggestions to prevent waste |
| **Inter-location Transfers** | Approve, track and complete stock movements across the network |
| **Demand Predictions** | ARIMA/ML forecasting to recommend optimal order quantities |
| **Reports & Analytics** | Waste prevented (€), transfer success rate, efficiency trends |

## 🟢 B2C Portal — For Patients

| Feature | Description |
|---|---|
| **Patient Home** | Personalized dashboard with upcoming dose alerts |
| **Vaccine Booking** | Real-time availability + slot reservation at nearby pharmacies |
| **Vaccination Schedule** | Complete dose history with booster reminders |
| **Pharmacy Locator** | Map view with live vaccine stock per pharmacy |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 19 (Standalone Components, Signals, View Transitions) |
| Styling | SCSS with custom dark-mode design system |
| State | Angular Signals (no NgRx needed for this scale) |
| HTTP | Angular HttpClient with functional interceptors |
| Routing | Lazy-loaded routes with functional guards |
| Backend (planned) | NestJS / REST API |

---

## 🚀 Getting Started

```bash
cd medistock-frontend
npm install
npm run start
# → http://localhost:4200
```

---

## 🏆 Why This Wins

1. **Real problem, real stakes** — Vaccine waste post-COVID cost health systems billions
2. **Technical depth** — AI demand prediction + real-time redistribution network
3. **German market alignment** — Cost efficiency and logistics intelligence is core to the DACH pharma sector
4. **Full-stack vision** — B2B + B2C + data layer shows mature system design thinking
