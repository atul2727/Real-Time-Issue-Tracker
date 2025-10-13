require('dotenv').config();
// server.js - Backend for Real-Time Issue Tracker with GitHub Issues Integration
// server.js - Backend for Real-Time Issue Tracker with GitHub Issues Integration
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs').promises;
const { execSync } = require('child_process');
const path = require('path');
const cors = require('cors');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3000;
const ISSUES_FILE = path.join(__dirname, 'issues.json');
const GIT_REPO_PATH = __dirname;

// GitHub Configuration - UPDATE THESE WITH YOUR REPO DETAILS
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''; // Your GitHub Personal Access Token
const GITHUB_OWNER = process.env.GITHUB_OWNER || ''; // Your GitHub username
const GITHUB_REPO = process.env.GITHUB_REPO || ''; // Repository name (without .git)
const SYNC_INTERVAL = 10000; // Sync with GitHub every 10 seconds

// GitHub API base URL
const GITHUB_API = 'https://api.github.com';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize Git repository for local backup
function initGitRepo() {
  try {
    execSync('git rev-parse --git-dir', { cwd: GIT_REPO_PATH, stdio: 'ignore' });
    console.log('✓ Git repository already initialized');
  } catch (error) {
    console.log('Initializing Git repository for local backup...');
    execSync('git init', { cwd: GIT_REPO_PATH });
    execSync('git config user.name "Issue Tracker Bot"', { cwd: GIT_REPO_PATH });
    execSync('git config user.email "bot@issuetracker.com"', { cwd: GIT_REPO_PATH });
    console.log('✓ Git repository initialized');
  }
}

// Initialize issues file
async function initIssuesFile() {
  try {
    await fs.access(ISSUES_FILE);
    const data = await fs.readFile(ISSUES_FILE, 'utf8');
    if (!data || data.trim() === '') {
      throw new Error('Empty file');
    }
    JSON.parse(data);
    console.log('✓ Issues file exists and is valid');
  } catch (error) {
    console.log('Creating issues file...');
    await fs.writeFile(ISSUES_FILE, JSON.stringify({ issues: [] }, null, 2));
    console.log('✓ Issues file created');
  }
}

// Read issues from file
async function readIssues() {
  try {
    const data = await fs.readFile(ISSUES_FILE, 'utf8');
    if (!data || data.trim() === '') {
      const defaultData = { issues: [] };
      await writeIssues(defaultData);
      return defaultData;
    }
    return JSON.parse(data);
  } catch (error) {
    console.log('Error reading issues file, creating new one...');
    const defaultData = { issues: [] };
    await writeIssues(defaultData);
    return defaultData;
  }
}

// Write issues to file
async function writeIssues(data) {
  await fs.writeFile(ISSUES_FILE, JSON.stringify(data, null, 2));
}

// Commit changes to Git (local backup)
function commitToGit(message) {
  try {
    execSync('git add issues.json', { cwd: GIT_REPO_PATH });
    execSync(`git commit -m "${message}"`, { cwd: GIT_REPO_PATH, stdio: 'pipe' });
    console.log(`✓ Local backup: ${message}`);
  } catch (error) {
    if (!error.message.includes('nothing to commit')) {
      console.log('⚠ Backup warning:', error.message.split('\n')[0]);
    }
  }
}

// Broadcast to all connected WebSocket clients
function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Check if GitHub is configured
function isGitHubConfigured() {
  return GITHUB_TOKEN && GITHUB_OWNER && GITHUB_REPO;
}

// Fetch issues from GitHub
async function fetchGitHubIssues() {
  if (!isGitHubConfigured()) {
    console.log('⚠ GitHub not configured. Using local mode.');
    return null;
  }

  try {
    const response = await axios.get(
      `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        },
        params: {
          state: 'all',
          per_page: 100
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('⚠ GitHub fetch error:', error.response?.data?.message || error.message);
    return null;
  }
}

// Convert GitHub issue to our format
function convertGitHubIssue(ghIssue) {
  return {
    id: ghIssue.number,
    githubId: ghIssue.id,
    title: ghIssue.title,
    description: ghIssue.body || 'No description',
    status: ghIssue.state === 'open' ? 'Open' : 'Closed',
    createdBy: ghIssue.user.login,
    comments: [],
    commentsCount: ghIssue.comments,
    createdAt: ghIssue.created_at,
    updatedAt: ghIssue.updated_at,
    githubUrl: ghIssue.html_url
  };
}

// Sync issues from GitHub
async function syncFromGitHub() {
  if (!isGitHubConfigured()) {
    return;
  }

  try {
    const ghIssues = await fetchGitHubIssues();
    
    if (ghIssues) {
      const convertedIssues = ghIssues.map(convertGitHubIssue);
      
      await writeIssues({ issues: convertedIssues });
      commitToGit(`Synced ${convertedIssues.length} issues from GitHub`);
      
      broadcast({
        type: 'SYNC_UPDATE',
        data: convertedIssues
      });
      
      console.log(`✓ Synced ${convertedIssues.length} issues from GitHub`);
    }
  } catch (error) {
    console.error('⚠ Sync error:', error.message);
  }
}

// Create issue on GitHub
async function createGitHubIssue(title, description, createdBy) {
  if (!isGitHubConfigured()) {
    console.log('⚠ GitHub not configured - cannot create issue on GitHub');
    console.log(`   Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO in .env`);
    return null;
  }

  console.log(`📤 Creating GitHub issue: "${title}"`);
  console.log(`   Repo: ${GITHUB_OWNER}/${GITHUB_REPO}`);

  try {
    const response = await axios.post(
      `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`,
      {
        title: title,
        body: `${description}\n\n---\n*Created by: ${createdBy} via Issue Tracker*`
      },
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    console.log(`✓ Created GitHub issue #${response.data.number}: ${title}`);
    console.log(`   URL: ${response.data.html_url}`);
    return response.data;
  } catch (error) {
    console.error('❌ GitHub create error:');
    console.error('   Message:', error.response?.data?.message || error.message);
    console.error('   Status:', error.response?.status);
    console.error('   Details:', error.response?.data);
    return null;
  }
}

// Update GitHub issue status
async function updateGitHubIssueStatus(issueNumber, status) {
  if (!isGitHubConfigured()) {
    return null;
  }

  try {
    const state = status === 'Closed' ? 'closed' : 'open';
    const response = await axios.patch(
      `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueNumber}`,
      { state },
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    console.log(`✓ Updated GitHub issue #${issueNumber} status to ${status}`);
    return response.data;
  } catch (error) {
    console.error('⚠ GitHub update error:', error.response?.data?.message || error.message);
    return null;
  }
}

// Add comment to GitHub issue
async function addGitHubComment(issueNumber, comment, user) {
  if (!isGitHubConfigured()) {
    return null;
  }

  try {
    const response = await axios.post(
      `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueNumber}/comments`,
      {
        body: `**${user}:** ${comment}`
      },
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    console.log(`✓ Added comment to GitHub issue #${issueNumber}`);
    return response.data;
  } catch (error) {
    console.error('⚠ GitHub comment error:', error.response?.data?.message || error.message);
    return null;
  }
}

// Fetch comments for a specific issue
async function fetchGitHubComments(issueNumber) {
  if (!isGitHubConfigured()) {
    return [];
  }

  try {
    const response = await axios.get(
      `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues/${issueNumber}/comments`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    return response.data.map(comment => ({
      user: comment.user.login,
      text: comment.body,
      timestamp: comment.created_at
    }));
  } catch (error) {
    console.error('⚠ GitHub comments fetch error:', error.message);
    return [];
  }
}

// WebSocket connection handler
wss.on('connection', async (ws) => {
  console.log('New client connected');

  // Send current issues to new client
  try {
    const data = await readIssues();
    ws.send(JSON.stringify({
      type: 'INITIAL_DATA',
      data: data.issues,
      githubConfigured: isGitHubConfigured()
    }));
  } catch (error) {
    console.error('Error sending initial data:', error);
  }

  // Handle messages from clients
  ws.on('message', async (message) => {
    try {
      const payload = JSON.parse(message);
      
      switch (payload.type) {
        case 'CREATE_ISSUE':
          await handleCreateIssue(payload.data);
          break;
        
        case 'UPDATE_STATUS':
          await handleUpdateStatus(payload.issueId, payload.status, payload.user);
          break;
        
        case 'ADD_COMMENT':
          await handleAddComment(payload.issueId, payload.comment);
          break;
        
        case 'FETCH_COMMENTS':
          await handleFetchComments(ws, payload.issueId);
          break;
        
        default:
          console.log('Unknown message type:', payload.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Handle issue creation
async function handleCreateIssue(issueData) {
  // Create on GitHub first
  const ghIssue = await createGitHubIssue(
    issueData.title,
    issueData.description,
    issueData.createdBy
  );

  if (ghIssue) {
    // Sync immediately after creation
    setTimeout(syncFromGitHub, 2000);
  } else {
    // Fallback to local if GitHub fails
    const data = await readIssues();
    const newIssue = {
      id: data.issues.length + 1,
      title: issueData.title,
      description: issueData.description,
      status: 'Open',
      createdBy: issueData.createdBy,
      comments: [],
      createdAt: new Date().toISOString()
    };

    data.issues.push(newIssue);
    await writeIssues(data);
    commitToGit(`Issue #${newIssue.id} created: "${newIssue.title}" by ${newIssue.createdBy}`);
    
    broadcast({
      type: 'ISSUE_CREATED',
      data: newIssue
    });
  }
}

// Handle status update
async function handleUpdateStatus(issueId, newStatus, user) {
  await updateGitHubIssueStatus(issueId, newStatus);
  
  // Sync after update
  setTimeout(syncFromGitHub, 2000);
}

// Handle comment addition
async function handleAddComment(issueId, comment) {
  await addGitHubComment(issueId, comment.text, comment.user);
  
  // Sync after comment
  setTimeout(syncFromGitHub, 2000);
}

// Handle fetch comments request
async function handleFetchComments(ws, issueId) {
  const comments = await fetchGitHubComments(issueId);
  
  ws.send(JSON.stringify({
    type: 'COMMENTS_FETCHED',
    issueId,
    comments
  }));
}

// REST API endpoints
app.get('/api/issues', async (req, res) => {
  try {
    const data = await readIssues();
    res.json(data.issues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sync', async (req, res) => {
  try {
    await syncFromGitHub();
    res.json({ message: 'Synced successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/git-log', (req, res) => {
  try {
    const log = execSync('git log --pretty=format:"%h %s" -30', { 
      cwd: GIT_REPO_PATH,
      encoding: 'utf8'
    });
    const commits = log.split('\n').filter(Boolean);
    res.json({ log: commits });
  } catch (error) {
    res.json({ log: [] });
  }
});

app.get('/api/config', (req, res) => {
  res.json({
    githubConfigured: isGitHubConfigured(),
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    syncInterval: SYNC_INTERVAL
  });
});

// Start periodic sync
function startGitHubSync() {
  if (isGitHubConfigured()) {
    console.log(`✓ GitHub Issues sync enabled (every ${SYNC_INTERVAL/1000}s)`);
    console.log(`✓ Watching: ${GITHUB_OWNER}/${GITHUB_REPO}`);
    
    // Do initial sync
    syncFromGitHub();
    
    // Start periodic sync
    setInterval(syncFromGitHub, SYNC_INTERVAL);
  } else {
    console.log('⚠ GitHub not configured - running in local mode');
    console.log('⚠ Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO in .env');
  }
}

// Initialize and start server
async function startServer() {
  console.log('Starting Issue Tracker Server with GitHub Integration...\n');
  
  initGitRepo();
  await initIssuesFile();
  
  server.listen(PORT, () => {
    console.log(`\n✓ Server running on http://localhost:${PORT}`);
    console.log(`✓ WebSocket server ready`);
    console.log(`✓ Local Git backup enabled`);
    startGitHubSync();
    console.log('\nWaiting for connections...\n');
  });
}

startServer().catch(console.error);