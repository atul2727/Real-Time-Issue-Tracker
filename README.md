# 🎯 Real-Time Issue Tracker

A full-stack real-time issue tracking system with **WebSocket communication**, **Git version control**, and **GitHub Issues integration**. Built with Node.js, Express, WebSocket, and React.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)
![GitHub Issues](https://img.shields.io/badge/GitHub-Issues_Integration-orange.svg)

## ✨ Features

### Core Features
- 🔴 **Real-time Updates** - WebSocket broadcasts for instant synchronization across all clients
- 🐙 **GitHub Issues Integration** - Bi-directional sync with real GitHub Issues
- 📝 **Issue Management** - Create, update, and track issues with status workflow
- 💬 **Comment System** - Real-time collaborative discussions on issues
- 🔄 **Auto-sync** - Automatic synchronization with GitHub every 10 seconds
- 📊 **Git Version Control** - Local backup with full commit history
- 🎨 **Modern UI** - Beautiful, responsive React interface with Tailwind CSS

### Status Workflow
- **Open** - New issues start here
- **In Progress** - Work has begun
- **Closed** - Issue resolved

### Real-time Capabilities
- ⚡ Instant updates across all connected clients
- 🔗 No page refresh required
- 👥 Multi-user collaboration support
- 🌐 Works across different devices and locations

## 🚀 Quick Start

### Prerequisites

- **Node.js** v14 or higher ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))
- **GitHub Account** ([Sign up](https://github.com/join))

### Installation

1. **Clone or create project directory:**
```bash
mkdir issue-tracker
cd issue-tracker
```

2. **Create package.json:**
```json
{
  "name": "real-time-issue-tracker",
  "version": "1.0.0",
  "description": "Real-time issue tracking with WebSocket and GitHub Issues",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.14.2",
    "cors": "^2.8.5",
    "axios": "^1.6.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

3. **Install dependencies:**
```bash
npm install
```

4. **Create project structure:**
```bash
mkdir public
touch server.js
touch public/index.html
touch .env
touch .gitignore
```

5. **Copy the code:**
   - Copy `server.js` code from the backend artifact
   - Copy `index.html` code from the frontend artifact

6. **Configure .gitignore:**
```
node_modules/
.env
.DS_Store
issues.json
```

## ⚙️ Configuration

### GitHub Integration Setup

#### Step 1: Create GitHub Repository

1. Go to [GitHub New Repo](https://github.com/new)
2. Create repository:
   - **Name:** `issue-tracker` (or your preferred name)
   - **Visibility:** Public or Private
   - **Initialize:** ✅ Check "Add a README file"
3. Click "Create repository"

#### Step 2: Generate Personal Access Token

1. Go to [GitHub Tokens](https://github.com/settings/tokens)
2. Click "Generate new token" → "Generate new token (classic)"
3. Configure:
   - **Note:** `Issue Tracker App`
   - **Expiration:** 90 days (recommended)
   - **Scopes:** ✅ Check `repo` (full control of repositories)
4. Click "Generate token"
5. **Copy the token** (starts with `ghp_`)

#### Step 3: Configure Environment Variables

Create `.env` file with your details:

```env
# GitHub Personal Access Token
GITHUB_TOKEN=ghp_your_actual_token_here

# Your GitHub Username
GITHUB_OWNER=your_github_username

# Repository Name (without .git)
GITHUB_REPO=issue-tracker
```

**Example:**
```env
GITHUB_TOKEN=ghp_abc123xyz789def456ghi
GITHUB_OWNER=johndoe
GITHUB_REPO=issue-tracker
```

#### Step 4: Add dotenv to server.js

Add this line at the **very top** of `server.js`:

```javascript
require('dotenv').config();
```

## 🎮 Usage

### Start the Server

```bash
npm start
```

Expected output:
```
Starting Issue Tracker Server with GitHub Integration...

✓ Git repository already initialized
✓ Issues file exists and is valid

✓ Server running on http://localhost:3000
✓ WebSocket server ready
✓ Local Git backup enabled
✓ GitHub Issues sync enabled (every 10s)
✓ Watching: your_username/your_repo

Waiting for connections...
```

### Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

### Create Issues

1. Go to your GitHub repo
2. Click "Issues" tab
3. Click "New issue"
4. Fill in details
5. Submit
6. Wait ~10 seconds
7. Issue appears in app automatically!

### Update Issue Status

**In App:**
- Use the status dropdown on any issue
- Changes sync to GitHub

**On GitHub:**
- Click "Close issue" or "Reopen issue"
- Changes sync to app in ~10 seconds

### Add Comments

**In App:**
1. Click "View" on any issue
2. Type comment at bottom
3. Click "Post"
4. Comment syncs to GitHub

**On GitHub:**
1. Open issue page
2. Add comment
3. Submit
4. Comment syncs to app in ~10 seconds

## 📁 Project Structure

```
issue-tracker/
├── server.js              # Backend Node.js server with WebSocket & GitHub API
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables (GitHub config)
├── .gitignore            # Git ignore rules
├── issues.json           # Local backup of issues (auto-generated)
├── .git/                 # Local Git repository (auto-initialized)
└── public/
    └── index.html        # Frontend React application
```

## 🔍 Troubleshooting

### GitHub Not Syncing

**Problem:** Issues created on GitHub don't appear in app

**Solutions:**
1. Check `.env` file has correct values
2. Verify GitHub token has `repo` scope
3. Check server console for error messages
4. Test token manually: `curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user`

### WebSocket Connection Failed

**Problem:** "Disconnected" status in app

**Solutions:**
1. Ensure server is running (`npm start`)
2. Check port 3000 is not in use
3. Look for errors in browser console (F12)
4. Restart server and refresh page

### Token Expired

**Problem:** "401 Unauthorized" errors

**Solution:**
1. Go to [GitHub Tokens](https://github.com/settings/tokens)
2. Generate new token
3. Update `GITHUB_TOKEN` in `.env`
4. Restart server

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.