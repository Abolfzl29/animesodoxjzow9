#!/usr/bin/env node
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const rl = readline.createInterface({ input, output });
const password = process.argv[2] || await rl.question('Admin password (never commit this): ');
rl.close();

if (!password || password.length < 12) {
    console.error('Password must contain at least 12 characters.');
    process.exit(1);
}

const salt = crypto.randomBytes(16).toString('hex');
const digest = crypto.scryptSync(password, salt, 32).toString('hex');
const sessionSecret = crypto.randomBytes(32).toString('hex');

console.log('\nAdd these values to your hosting provider environment variables:');
console.log(`ADMIN_PASSWORD_HASH=scrypt$${salt}$${digest}`);
console.log(`SESSION_SECRET=${sessionSecret}`);
console.log('ADMIN_USERNAME=admin');
