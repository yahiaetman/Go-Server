import _ from 'lodash';
import fs from 'fs';
import readline from 'readline';
import winston from 'winston';
import dateFormat from 'dateformat';
import { Server } from '../main/server';
import { Color } from '../types/types';

if (!fs.existsSync('./logs/')) fs.mkdirSync('./logs/');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(
      info => `${info.timestamp} ${info.level}: ${info.message}`
    )
  ),
  transports: [
    new winston.transports.File({
      filename: `./logs/output-${dateFormat(
        new Date(),
        'yyyy-mm-dd-HH-MM-ss'
      )}.log`,
      handleExceptions: true
    })
  ],
  exitOnError: (err: Error) => {
    console.log(`${err.name} occurred. See logs for more info`);
    return false;
  }
});

logger.info('Starting Application ...');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'SERVER> '
});

/**
 * Display game state
 */
function displayGameState() {
  console.log();
  console.log('Game State:');
  console.log(server.GameManager.toString(true));
}

/**
 * Display clients
 */
function displayClients() {
  console.log();
  console.log('Clients:');
  server.Clients.forEach(client => {
    console.log(`   ${client.id}: ${client.name} (${client.address})`);
  });
  console.log('Players:');
  _.forEach(server.Players, (player, color) => {
    if (player == null) {
      console.log(`   ${color}: None`);
    } else {
      console.log(
        `   ${player.color} => ${player.id}: ${player.name} (${player.address})`
      );
    }
  });
}

const server = new Server({
  logger: logger,
  gameUpdate: () => {
    displayGameState();
    rl.prompt();
  },
  serverUpdate: () => {},
  statusUpdate: message => {
    readline.cursorTo(process.stdout, 0);
    console.log(`Status: ${message}`);
    rl.prompt();
  }
});

/**
 * Get client by their ID
 * @param {number} id the ID of the client
 * @return {Client} the client
 */
function getClientByID(id: number) {
  return server.Clients.find(client => client.id == id);
}

rl.on('line', input => {
  const commands = input.trim().split(/\s+/);
  if (commands.length == 0) return;
  switch (commands[0]) {
    case 'j':
    case 'join': {
      const client = getClientByID(Number.parseInt(commands[1]));
      if (client)
        server.join(client, commands[2] === 'w' ? Color.WHITE : Color.BLACK);
      break;
    }
    case 'l':
    case 'leave': {
      const client = getClientByID(Number.parseInt(commands[1]));
      if (client) server.leave(client);
      break;
    }
    case 'd':
    case 'disconnect': {
      const client = getClientByID(Number.parseInt(commands[1]));
      if (client) server.disconnect(client);
      break;
    }
    case 'v':
    case 'view': {
      switch (commands[1]) {
        case 'state':
          displayGameState();
          break;
        case 'clients':
          displayClients();
          break;
        default:
          console.log('Unknown command');
          break;
      }
      rl.prompt();
      break;
    }
    case 'swap': {
      server.swap();
      break;
    }
    case 'start': {
      server.start();
      break;
    }
    case 'stop': {
      server.stop();
      break;
    }
    case 'clear': {
      server.GameManager.clearCheckpoint();
      break;
    }
    case 'h':
    case 'help': {
      console.log('Command List:');
      console.log('   - join <client-id> <color>');
      console.log('   - leave <client-id>');
      console.log('   - disconnect <client-id>');
      console.log('   - swap');
      console.log('   - view <state | clients>');
      console.log('   - start');
      console.log('   - stop');
      console.log('   - clear');
      console.log('   - help');
      console.log('   - exit');
      rl.prompt();
      break;
    }
    case 'exit':
    case 'quit': {
      console.log('Goodbye!'); // Remember to say goodbye to the user before quitting :D
      process.exit(0);
    }
    default: {
      console.log(`Unknown command ${commands[0]}`);
      rl.prompt();
      break;
    }
  }
}).on('close', () => {
  server.close();
  console.log('Good bye');
  process.exit(0);
});
