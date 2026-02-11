#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const captureDir = path.join(root, 'data', 'system', 'capture');
const chatDir = path.join(root, 'data', 'chat');
const inboxPath = path.join(captureDir, 'inbox.json');
const commandsPath = path.join(captureDir, 'commands.json');
const chatEventsPath = path.join(chatDir, 'chatui-events.jsonl');

fs.mkdirSync(captureDir, { recursive: true });
fs.mkdirSync(chatDir, { recursive: true });

if (!fs.existsSync(inboxPath)) {
  fs.writeFileSync(inboxPath, `${JSON.stringify({ inbox: [], autoRules: [], captureStats: {}, settings: {} }, null, 2)}\n`);
}

if (!fs.existsSync(commandsPath)) {
  fs.writeFileSync(commandsPath, `${JSON.stringify({ queue: [], stats: { totalQueued: 0, pending: 0, byCommand: {}, lastQueuedAt: null } }, null, 2)}\n`);
}

if (!fs.existsSync(chatEventsPath)) {
  fs.writeFileSync(chatEventsPath, '');
}

console.log('jarvis-workspace bootstrapped:', root);
