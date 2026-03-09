#!/usr/bin/env node
/**
 * Firebase Realtime Database Helper
 * Workaround for broken MCP tools: realtimedatabase_get_data, realtimedatabase_set_data
 *
 * Root Cause: MCP plugin uses wrong URL (missing region)
 * Correct URL: https://<project>-default-rtdb.<region>.firebasedatabase.app
 *
 * Usage:
 *   node rtdb-helper.js get /path
 *   node rtdb-helper.js set /path '{"key":"value"}'
 *   node rtdb-helper.js delete /path
 */

const https = require('https');
const { execSync } = require('child_process');

// Configuration - Update these for your project
const CONFIG = {
  projectId: 'benxe-management-20251218',
  databaseInstance: 'benxe-management-20251218-default-rtdb',
  region: 'asia-southeast1' // CRITICAL: Must match your RTDB region
};

function getAccessToken() {
  try {
    return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
  } catch (error) {
    console.error('Error getting access token. Make sure gcloud is installed and authenticated.');
    console.error('Run: gcloud auth login');
    process.exit(1);
  }
}

function getDatabaseUrl() {
  return `${CONFIG.databaseInstance}.${CONFIG.region}.firebasedatabase.app`;
}

async function rtdbRequest(method, path, data = null) {
  const token = getAccessToken();
  const hostname = getDatabaseUrl();

  // Ensure path starts with /
  if (!path.startsWith('/')) {
    path = '/' + path;
  }

  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path: `${path}.json`,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseData));
          } catch {
            resolve(responseData);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function getData(path) {
  console.log(`Getting data from: ${path}`);
  const result = await rtdbRequest('GET', path);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

async function setData(path, data) {
  console.log(`Setting data at: ${path}`);
  const result = await rtdbRequest('PUT', path, data);
  console.log('Success:', JSON.stringify(result, null, 2));
  return result;
}

async function updateData(path, data) {
  console.log(`Updating data at: ${path}`);
  const result = await rtdbRequest('PATCH', path, data);
  console.log('Success:', JSON.stringify(result, null, 2));
  return result;
}

async function deleteData(path) {
  console.log(`Deleting data at: ${path}`);
  const result = await rtdbRequest('DELETE', path);
  console.log('Deleted successfully');
  return result;
}

async function getRules() {
  console.log('Getting RTDB security rules...');
  const token = getAccessToken();
  const hostname = getDatabaseUrl();

  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path: '/.settings/rules.json',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(data);
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// CLI Handler
async function main() {
  const [,, command, path, dataArg] = process.argv;

  if (!command) {
    console.log(`
Firebase Realtime Database Helper
==================================
Workaround for broken MCP tools

Commands:
  get <path>              - Get data at path
  set <path> <json>       - Set data at path (overwrites)
  update <path> <json>    - Update data at path (merges)
  delete <path>           - Delete data at path
  rules                   - Get security rules
  info                    - Show configuration

Examples:
  node rtdb-helper.js get /users
  node rtdb-helper.js set /test '{"hello":"world"}'
  node rtdb-helper.js update /users/123 '{"name":"John"}'
  node rtdb-helper.js delete /test
  node rtdb-helper.js rules
`);
    return;
  }

  try {
    switch (command.toLowerCase()) {
      case 'get':
        if (!path) throw new Error('Path required');
        await getData(path);
        break;

      case 'set':
        if (!path || !dataArg) throw new Error('Path and JSON data required');
        await setData(path, JSON.parse(dataArg));
        break;

      case 'update':
        if (!path || !dataArg) throw new Error('Path and JSON data required');
        await updateData(path, JSON.parse(dataArg));
        break;

      case 'delete':
        if (!path) throw new Error('Path required');
        await deleteData(path);
        break;

      case 'rules':
        await getRules();
        break;

      case 'info':
        console.log('Configuration:');
        console.log(`  Project: ${CONFIG.projectId}`);
        console.log(`  Database: ${CONFIG.databaseInstance}`);
        console.log(`  Region: ${CONFIG.region}`);
        console.log(`  URL: https://${getDatabaseUrl()}`);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
