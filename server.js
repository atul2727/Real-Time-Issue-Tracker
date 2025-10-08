// server.js - Backend for Real-Time Issue Tracker
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs').promises;
const { execSync } = require('child_process');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3000;
const ISSUES_FILE = path.join(__dirname, 'issues.json');
const GIT_REPO_PATH = __dirname;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize Git repository
function initGitRepo() {
  try {
    execSync('git rev-parse --git-dir', { cwd: GIT_REPO_PATH, stdio: 'ignore' });
    console.log('✓ Git repository already initialized');
  } catch (error) {
    console.log('Initializing Git repository...');
    execSync('git init', { cwd: GIT_REPO_PATH });
    execSync('git config user.name "Issue Tracker"', { cwd: GIT_REPO_PATH });
    execSync('git config user.email "tracker@example.com"', { cwd: GIT_REPO_PATH });
    console.log('✓ Git repository initialized');
  }
}

// Initialize issues file
async function initIssuesFile() {
  try {
    await fs.access(ISSUES_FILE);
    // Verify the file is valid JSON
    const data = await fs.readFile(ISSUES_FILE, 'utf8');
    if (!data || data.trim() === '') {
      throw new Error('Empty file');
    }
    JSON.parse(data); // Test if valid JSON
    console.log('✓ Issues file exists and is valid');
  } catch (error) {
    console.log('Creating/fixing issues file...');
    await fs.writeFile(ISSUES_FILE, JSON.stringify({ nextId: 1, issues: [] }, null, 2));
    console.log('✓ Issues file created');
  }
}

// Read issues from file
async function readIssues() {
  try {
    const data = await fs.readFile(ISSUES_FILE, 'utf8');
    if (!data || data.trim() === '') {
      console.log('Empty issues file, reinitializing...');
      const defaultData = { nextId: 1, issues: [] };
      await writeIssues(defaultData);
      return defaultData;
    }
    return JSON.parse(data);
  } catch (error) {
    console.log('Error reading issues file, creating new one...');
    const defaultData = { nextId: 1, issues: [] };
    await writeIssues(defaultData);
    return defaultData;
  }
}

// Write issues to file
async function writeIssues(data) {
  await fs.writeFile(ISSUES_FILE, JSON.stringify(data, null, 2));
}

// Commit changes to Git
function commitToGit(message) {
  try {
    execSync('git add issues.json', { cwd: GIT_REPO_PATH });
    execSync(`git commit -m "${message}"`, { cwd: GIT_REPO_PATH });
    console.log(`✓ Git commit: ${message}`);
  } catch (error) {
    console.error('Git commit error:', error.message);
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

// WebSocket connection handler
wss.on('connection', async (ws) => {
  console.log('New client connected');

  // Send current issues to new client
  try {
    const data = await readIssues();
    ws.send(JSON.stringify({
      type: 'INITIAL_DATA',
      data: data.issues
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
  const data = await readIssues();
  
  const newIssue = {
    id: data.nextId,
    title: issueData.title,
    description: issueData.description,
    status: 'Open',
    createdBy: issueData.createdBy,
    comments: [],
    createdAt: new Date().toISOString()
  };

  data.issues.push(newIssue);
  data.nextId++;
  
  await writeIssues(data);
  commitToGit(`Issue #${newIssue.id} created: "${newIssue.title}" by ${newIssue.createdBy}`);
  
  broadcast({
    type: 'ISSUE_CREATED',
    data: newIssue
  });
}

// Handle status update
async function handleUpdateStatus(issueId, newStatus, user) {
  const data = await readIssues();
  const issue = data.issues.find(i => i.id === issueId);
  
  if (issue) {
    const oldStatus = issue.status;
    issue.status = newStatus;
    issue.updatedAt = new Date().toISOString();
    
    await writeIssues(data);
    commitToGit(`Issue #${issueId} status changed from "${oldStatus}" to "${newStatus}" by ${user}`);
    
    broadcast({
      type: 'STATUS_UPDATED',
      issueId,
      status: newStatus
    });
  }
}

// Handle comment addition
async function handleAddComment(issueId, comment) {
  const data = await readIssues();
  const issue = data.issues.find(i => i.id === issueId);
  
  if (issue) {
    const newComment = {
      user: comment.user,
      text: comment.text,
      timestamp: new Date().toISOString()
    };
    
    issue.comments.push(newComment);
    issue.updatedAt = new Date().toISOString();
    
    await writeIssues(data);
    commitToGit(`Comment added to Issue #${issueId} by ${comment.user}`);
    
    broadcast({
      type: 'COMMENT_ADDED',
      issueId,
      comment: newComment
    });
  }
}

// REST API endpoints (optional, for non-WebSocket clients)
app.get('/api/issues', async (req, res) => {
  try {
    const data = await readIssues();
    res.json(data.issues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/issues', async (req, res) => {
  try {
    await handleCreateIssue(req.body);
    res.status(201).json({ message: 'Issue created' });
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
    // No commits yet
    res.json({ log: [] });
  }
});

// Initialize and start server
async function startServer() {
  console.log('Starting Issue Tracker Server...\n');
  
  initGitRepo();
  await initIssuesFile();
  
  server.listen(PORT, () => {
    console.log(`\n✓ Server running on http://localhost:${PORT}`);
    console.log(`✓ WebSocket server ready`);
    console.log(`✓ Git versioning enabled`);
    console.log('\nWaiting for connections...\n');
  });
}

startServer().catch(console.error);