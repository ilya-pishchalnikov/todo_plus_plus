# todo_plus_plus
A high-performance, real-time task management application combining Go's efficiency on the backend with a lightweight JavaScript frontend and SQLite for robust local storage
## Core Architecture

🚀 **High-Performance Foundation**  
A modern, efficient stack designed for real-time task management:

### Backend Services
- **Event-Driven Go Runtime** - Lightweight goroutines handle high concurrency
- **WebSocket (WSS) Synchronization** - Real-time updates with secure connections
- **JWT Authentication** - Stateless security with token validation

### Frontend Experience
- **Zero-Reload SPA** - Vanilla JS/HTML5 frontend with smooth transitions
- **Responsive Layout** - Works across desktop and mobile devices

### Data Layer
- **SQLite Persistence** - ACID-compliant local storage with crash recovery

## Key Features

### 🎯 Core Task Management
- **Unified Workspace** - Manage all tasks in one centralized web interface accessible anywhere
- **Multi-Level Organization** - Hierarchical structure: Tasks → Groups → Projects
- **Frictionless Editing** - Instantly modify task details without context switching
- **One-Click Actions** - Delete, reorder, etc tasks with a single click for maximum efficiency

### 🔄 Real-Time Collaboration
- **Live Synchronization** - Instant updates across all devices via WebSocket events

### 🛡️ Security & Access
- **JWT Authentication** - Industry-standard token security with configurable sessions
- **CLI User Management** - Administer users through dedicated command-line tool

### 🎨 Interactive Experience
- **Drag & Drop** - Visually reorganize tasks, groups, and projects
- **Keyboard-Centric** - 
  - Quick reordering shortcuts
  - Instant status change
- **Inline Editing** - Rename any element directly in context

### 📊 Task Status System
- **Visual Workflow** - Color-coded status indicators:
  - ⚪ **To Do** (default)
  - 🟡 **In Progress**
  - 🟢 **Done**
  - 🔴 **Cancelled**
- **Flexible Updates** - Change status via:
  - Clickable status icons
  - Dropdown menu
  - Keyboard shortcuts
