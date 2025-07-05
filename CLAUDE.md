# CodeViz Research Context

> **Note**: This file contains research context from CodeViz. Most recent contexts are at the bottom.

---

## Research Query

i want a diagram interactive from this frontend

*Session: 47d748656d515af1f6c329f91e0afa47 | Generated: 7/4/2025, 2:58:36 PM*

### Analysis Summary

# Frontend Architecture Overview

This document outlines the architecture of the frontend application, focusing on its structure, key components, and their interactions. The application is built using **Next.js** and **React**, leveraging a component-based approach for modularity and reusability.

## High-Level Architecture

The application follows a typical Next.js structure, organizing code by pages, components, and services.

### Core Layers

*   **Presentation Layer (UI):** Handled by [React components](components/) and [Next.js pages](app/). This layer is responsible for rendering the user interface and handling user interactions.
*   **Application Logic/Routing:** Managed by [Next.js's file-system based routing](app/) and [middleware](middleware.ts) for authentication checks.
*   **State Management:** Primarily uses [React Context API](context/UserContext.tsx) for global state like user authentication.
*   **Data Access Layer (Services):** Encapsulated in [service files](services/) that interact with backend APIs.

### Main Components and Relationships

The application's core revolves around:
*   **Pages:** Defined within the [app/ directory](app/), each representing a distinct route.
*   **Shared UI Components:** Located in [components/](components/) and [components/ui/](components/ui/), providing reusable UI elements.
*   **Authentication System:** Manages user sessions, login, and protected routes.
*   **Data Services:** Facilitate communication with the backend.

## Mid-Level Component Interaction & Detailed Flows

### 1. Authentication Flow

The authentication system is central to the application, controlling access to protected routes.

*   **Login/Registration:** Users interact with the [Login page](app/login/page.tsx) and [Register page](app/register/page.tsx). These pages utilize the [authService](services/authService.ts) to send credentials to the backend.
*   **User Context:** Upon successful authentication, user information is stored and made globally available via the [UserContext](context/UserContext.tsx). This context wraps the entire application in [layout.tsx](app/layout.tsx).
*   **Protected Routes:** The [ProtectedRoute component](components/ProtectedRoute.tsx) (and potentially [middleware.ts](middleware.ts)) is used to guard routes, redirecting unauthenticated users to the login page.

### 2. Navigation and Layout

The overall application layout and navigation are managed at the root level.

*   **Root Layout:** The [app/layout.tsx](app/layout.tsx) file defines the main structure, including the `<html>` and `<body>` tags, and integrates global styles from [globals.css](app/globals.css). It also wraps the application with the [UserContext](context/UserContext.tsx) and [ThemeProvider](components/theme-provider.tsx).
*   **Navbar:** The [Navbar component](components/Navbar.tsx) provides consistent navigation across different parts of the application.

### 3. Data Services

Interaction with the backend API is abstracted through service files.

*   **HTTP Service:** The [httpService](services/httpService.ts) provides a base for making HTTP requests, potentially handling headers, error logging, and base URLs.
*   **Auth Service:** The [authService](services/authService.ts) specifically handles authentication-related API calls (login, register, logout).
*   **Other Services:** Services like [plantService](src/services/plantService.js) and [reportService](src/services/reportService.js) (found in the `src` directory, indicating potential legacy or separate modules) handle data related to specific domain entities.

### 4. UI Component System

The application utilizes a set of reusable UI components, likely based on a framework like Shadcn UI.

*   **Atomic Components:** The [components/ui/](components/ui/) directory contains a variety of basic UI elements such as [button](components/ui/button.tsx), [input](components/ui/input.tsx), [dialog](components/ui/dialog.tsx), and [table](components/ui/table.tsx). These are the building blocks for more complex interfaces.
*   **Complex Components:** Components like [MesureTable](components/MesureTable.tsx) and [SensorTimeSeriesChart](components/SensorTimeSeriesChart.tsx) combine these atomic UI elements to create specific application features.

## Low-Level Implementation Details

### File Structure and Responsibilities

*   **app/:** Contains [Next.js pages](app/page.tsx) and their associated layouts. Each subdirectory within `app/` typically represents a route segment (e.g., [app/dashboard/page.tsx](app/dashboard/page.tsx)).
*   **components/:** Houses [reusable React components](components/Navbar.tsx) that are not directly tied to a specific route.
*   **components/ui/:** Dedicated to [UI primitives](components/ui/button.tsx) and design system components.
*   **context/:** Stores [React Context providers](context/UserContext.tsx) for global state management.
*   **services/:** Contains [modules for interacting with backend APIs](services/authService.ts).
*   **lib/:** For [utility functions](lib/utils.ts) and helper modules.
*   **public/:** For [static assets](public/logo.svg) like images.
*   **styles/:** Global [CSS files](styles/globals.css).
*   **types/:** [TypeScript type definitions](types/index.ts).

### Example Component Interaction: Dashboard

The [Dashboard page](app/dashboard/page.tsx) would likely:
1.  Fetch data using a relevant service (e.g., `plantService` or `reportService`).
2.  Display this data using components like [MesureTable](components/MesureTable.tsx) or [SensorTimeSeriesChart](components/SensorTimeSeriesChart.tsx).
3.  Utilize UI components from [components/ui/](components/ui/) for layout, buttons, and other interactive elements.

