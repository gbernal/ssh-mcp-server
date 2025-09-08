#!/usr/bin/env node

import { Client } from 'ssh2';
import fs from 'fs';

const config = {
  host: '192.168.0.101',
  port: 22,
  username: 'fasciahub'
};

console.log('Testing SSH connection with ssh-agent...');
console.log('Config:', config);

const client = new Client();

client.on('ready', () => {
  console.log('SUCCESS: SSH connection established!');
  client.exec('echo "Test successful"', (err, stream) => {
    if (err) {
      console.error('Command execution error:', err);
      client.end();
      return;
    }
    
    let output = '';
    stream.on('data', (data) => {
      output += data.toString();
    });
    
    stream.on('close', () => {
      console.log('Command output:', output);
      client.end();
    });
  });
});

client.on('error', (err) => {
  console.error('SSH connection error:', err.message);
  console.error('Full error:', err);
});

// Connect using ssh-agent
const sshConfig = {
  host: config.host,
  port: config.port,
  username: config.username,
  agent: process.env.SSH_AUTH_SOCK,
  debug: (info) => {
    console.log('DEBUG:', info);
  }
};

console.log('Using SSH agent at:', process.env.SSH_AUTH_SOCK);
console.log('Connecting...');
client.connect(sshConfig);