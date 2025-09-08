#!/usr/bin/env node

import { Client } from 'ssh2';
import fs from 'fs';

const config = {
  host: '192.168.0.101',
  port: 22,
  username: 'fasciahub',
  privateKey: '/home/guillermo/.ssh/id_rsa'
};

console.log('Testing SSH connection with ssh2 library...');
console.log('Config:', {
  host: config.host,
  port: config.port,
  username: config.username,
  privateKey: config.privateKey
});

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
  console.error('Error level:', err.level);
  console.error('Full error:', err);
});

client.on('keyboard-interactive', (name, instructions, instructionsLang, prompts, finish) => {
  console.log('Keyboard-interactive authentication requested');
  console.log('Name:', name);
  console.log('Instructions:', instructions);
  console.log('Prompts:', prompts);
  finish([]);
});

// Try to read the private key
let privateKeyContent;
try {
  privateKeyContent = fs.readFileSync(config.privateKey, 'utf8');
  console.log('Private key loaded successfully');
  console.log('Key starts with:', privateKeyContent.substring(0, 50));
} catch (err) {
  console.error('Failed to read private key:', err.message);
  process.exit(1);
}

// Connect with all authentication methods
const sshConfig = {
  host: config.host,
  port: config.port,
  username: config.username,
  privateKey: privateKeyContent,
  debug: (info) => {
    console.log('DEBUG:', info);
  },
  algorithms: {
    serverHostKey: ['ssh-ed25519', 'ecdsa-sha2-nistp256', 'rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa'],
    kex: ['curve25519-sha256', 'ecdh-sha2-nistp256', 'ecdh-sha2-nistp384', 'ecdh-sha2-nistp521'],
    cipher: ['aes128-gcm@openssh.com', 'aes256-gcm@openssh.com', 'aes128-ctr', 'aes192-ctr', 'aes256-ctr'],
    hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1']
  },
  tryKeyboard: true,
  authHandler: ['publickey']
};

console.log('Connecting...');
client.connect(sshConfig);