import _ from 'lodash';
import fs from 'fs';
import WebSocket from 'ws';
import winston from 'winston';
import * as codecs from '../types/codecs';
import * as types from '../types/types';
import * as MessageTypes from '../types/client-messages.type';
import * as MessageCodecs from '../types/client-messages.codec';
import { Either } from 'fp-ts/lib/Either';
import { Errors, object, number } from 'io-ts';
import GameManager from '../common/game-manager';
import { flipColor } from '../types/color.utils';
import { PointUtility } from '../types/point.utils';
import * as TimeUtility from '../types/time.utils';

enum ServerState {
  INIT,
  IDLE
}

interface Client {
  id: number;
  name: string;
  address: string;
  socket: WebSocket;
  ready: boolean;
  alive: boolean;
  color: types.Color;
}

type ServerEvent =
  | {
      type: 'CONNECT'; // A Client wants to connect to the server
      client: Client;
    }
  | {
      type: 'CLOSE'; // A Client connection is closed
      client: Client;
    }
  | {
      type: 'MESSAGE'; // A Client sent a message
      client: Client;
      message: MessageTypes.MoveMessage;
    }
  | {
      type: 'START'; // The User pressed Start
    }
  | {
      type: 'END'; // The game ended for one of the reasons found in enum EndReasons
      reason: 'resign' | 'pass' | 'timeout' | 'pause' | 'error' | 'mercy';
    }
  | {
      type: 'JOIN'; // A Client is added as a player
      client: Client;
      color: types.Color;
    }
  | {
      type: 'LEAVE'; // A Client is removed from the player list
      client: Client;
    }
  | {
      type: 'DISCONNECT'; // The User pressed disconnect for one of the clients
      client: Client;
    }
  | {
      type: 'SWAP'; // The User swapped the order of the clients
    };

interface ServerOptions {
  logger?: winston.Logger;
  gameUpdate?: () => void;
  serverUpdate?: () => void;
  statusUpdate?: (message: string) => void;
}

/**
 * Server class handles all the communication with clients
 * @class
 */
export class Server {
  private options: ServerOptions;
  private configuration: types.ServerConfiguration = {
    host: '0.0.0.0',
    port: 8080,
    pingInterval: 1000
  };

  private state: ServerState = ServerState.INIT;
  private server: WebSocket.Server;
  private clients: Client[] = [];
  private heartbeat: NodeJS.Timeout;

  private gameManager: GameManager;

  private logger?: winston.Logger;

  static readonly ConfigPath: string = './server.config.json';

  private static IDCounter: number = 0;
  /**
   * Generates a unique ID for each client
   * @return {number} the ID
   */
  private static generateID(): number {
    return this.IDCounter++;
  }

  /**
   * Construct a Server
   * @constructor
   * @param {ServerOptions} options The server options
   */
  constructor(options?: ServerOptions) {
    this.options = options ?? {};
    this.logger = this.options.logger;

    if (fs.existsSync(Server.ConfigPath)) {
      try {
        const result = codecs.ServerConfiguration.decode(
          JSON.parse(fs.readFileSync(Server.ConfigPath, 'utf8'))
        );
        if (result._tag == 'Right') this.configuration = result.right;
        else {
          this.logger?.error(
            'Failed to decode server configuration, Reverting to default configuration.'
          );
        }
      } catch (error) {
        this.logger?.error(
          'Failed to load server configuration, Reverting to default configuration.'
        );
      }
    }

    this.server = new WebSocket.Server({
      host: this.configuration.host,
      port: this.configuration.port
    });

    this.server.on('listening', () => {
      this.logger?.info(
        `Server is listening to ${this.configuration.host}:${this.configuration.port}`
      );
      this.options.statusUpdate?.(
        `Server is listening to ${this.configuration.host}:${this.configuration.port}`
      );
    });
    this.server.on('connection', (socket, request) => {
      const client: Client = {
        id: Server.generateID(),
        name: '',
        address: request.connection.remoteAddress ?? '',
        socket: socket,
        alive: true,
        ready: false,
        color: types.Color.NONE
      };
      this.logger?.info?.(`Connection request from ${client.address}`);
      socket.on('pong', () => {
        client.alive = true;
      });
      this.logger?.info?.(
        `Sending to ${client.address}: ${JSON.stringify({ type: 'NAME' })}`
      );
      socket.send(JSON.stringify({ type: 'NAME' }));
      socket.on('message', data => {
        this.logger?.info(
          `Received ${data} message from ${client.name} (${client.address})`
        );
        const result: Either<
          Errors,
          MessageTypes.ClientMessage
        > = MessageCodecs.ClientMessage.decode(JSON.parse(data.toString()));
        if (result._tag == 'Right') {
          const message = result.right;
          if (client.ready) {
            if (message.type == 'MOVE') {
              this.processEvent({
                type: 'MESSAGE',
                client: client,
                message: message
              });
            } else {
              this.logger?.error(
                `Unexpected ${message.type} message from ${client.name}@${client.address}`
              );
            }
          } else {
            if (message.type == 'NAME') {
              client.name = message.name;
              client.ready = true;
              this.clients.push(client);
              this.processEvent({ type: 'CONNECT', client: client });
            } else {
              this.logger?.error(
                `Unexpected ${message.type} message from ${client.address}`
              );
            }
          }
        } else {
          this.logger?.error(
            `Undecodable message from ${client.name} (${client.address})`
          );
          this.options.statusUpdate?.(`Invalid message format received`);
        }
      });

      socket.on('close', (code, reason) => {
        this.logger?.warn(
          `Websocket connection closed with ${client.address} (${client.name}): ${code} - ${reason}`
        );
        this.processEvent({ type: 'CLOSE', client: client });
      });

      socket.on('error', err => {
        // Any error will automatically fire a close event after it is done
        this.logger?.error(
          `Websocket error from ${client.address} (${client.name}): ${err.name}: ${err.message}`
        );
      });
    });

    this.heartbeat = setInterval(() => {
      for (const client of this.clients) {
        if (client.alive) {
          client.alive = false;
          client.socket.ping(() => {});
        } else {
          this.logger?.warn(
            `Client ${client.address} (${client.name}) missed the heartbeat. Terminating connection...`
          );
          client.socket.terminate();
        }
      }
    }, this.configuration.pingInterval);

    this.gameManager = new GameManager({
      logger: this.options.logger,
      tick: () => {
        this.options.gameUpdate?.();
      },
      end: reason => {
        this.processEvent({ type: 'END', reason: reason });
      },
      reload: () => {
        this.options.gameUpdate?.();
      }
    });
  }

  /**
   * Gets the game manager
   * @return {GameManager} the game manager
   */
  public get GameManager(): GameManager {
    return this.gameManager;
  }

  /**
   * Gets a list of all connected clients
   * @return {Client[]} list of clients
   */
  public get Clients(): Client[] {
    return [...this.clients];
  }

  /**
   * Get the current players
   * @return {object} an object containing the current players
   */
  public get Players(): { [name: string]: Client | null } {
    return {
      [types.Color.BLACK]:
        this.clients.find(c => c.color == types.Color.BLACK) ?? null,
      [types.Color.WHITE]:
        this.clients.find(c => c.color == types.Color.WHITE) ?? null
    };
  }

  /**
   * Gets whether the server is ready to start a game
   * @return {boolean} true if the server is ready to start a game, false otherwise
   */
  public get Ready(): boolean {
    const players = this.Players;
    return (
      players[types.Color.BLACK] != null && players[types.Color.WHITE] != null
    );
  }

  /**
   * Starts the game
   */
  public start() {
    this.processEvent({ type: 'START' });
  }

  /**
   * Stops the game
   */
  public stop() {
    this.processEvent({ type: 'END', reason: 'pause' });
  }

  /**
   * Add a client as player
   * @param {Client | number} client The client joining the game
   * @param {Color} color The color picked for the client
   */
  public join(client: Client | number, color: types.Color) {
    if (typeof client === 'number') {
      const element: Client | undefined = this.clients.find(
        v => v.id == client
      );
      if (element)
        this.processEvent({ type: 'JOIN', client: element, color: color });
    } else {
      this.processEvent({ type: 'JOIN', client: client, color: color });
    }
  }

  /**
   * Removes a client from the game
   * @param {Client | number} client The client leaving the game
   */
  public leave(client: Client | number) {
    if (typeof client === 'number') {
      const element: Client | undefined = this.clients.find(
        v => v.id == client
      );
      if (element) this.processEvent({ type: 'LEAVE', client: element });
    } else {
      this.processEvent({ type: 'LEAVE', client: client });
    }
  }

  /**
   * Swaps the colors of the players
   */
  public swap() {
    this.processEvent({ type: 'SWAP' });
  }

  /**
   * Disconnect a client from the server
   * @param {Client | number} client The client to disconnect
   */
  public disconnect(client: Client | number) {
    if (typeof client === 'number') {
      const element: Client | undefined = this.clients.find(
        v => v.id == client
      );
      if (element) this.processEvent({ type: 'DISCONNECT', client: element });
    } else {
      this.processEvent({ type: 'DISCONNECT', client: client });
    }
  }

  /**
   * Process a server event
   * @param {ServerEvent} event The event to process
   */
  private processEvent(event: ServerEvent) {
    if (this.state == ServerState.INIT) {
      switch (event.type) {
        case 'CONNECT': {
          this.logger?.info(
            `Welcome, ${event.client.name}@${event.client.address}`
          );
          this.options.statusUpdate?.(
            `Welcome, ${event.client.name}@${event.client.address}`
          );
          this.options.serverUpdate?.();
          break;
        }
        case 'CLOSE': {
          const index = this.clients.findIndex(v => v === event.client);
          if (index != -1) {
            this.clients.splice(index, 1);
          }
          this.logger?.info(
            `Goodbye, ${event.client.name}@${event.client.address}`
          );
          this.options.statusUpdate?.(
            `Goodbye, ${event.client.name}@${event.client.address}`
          );
          this.options.serverUpdate?.();
          break;
        }
        case 'JOIN': {
          const players = this.Players;
          const colorHolder = players[event.color];
          if (colorHolder != null) colorHolder.color = types.Color.NONE;
          event.client.color = event.color;
          this.logger?.info(
            `${event.client.name}@${event.client.address} joined as Player ${event.color}`
          );
          this.options.statusUpdate?.(
            `${event.client.name}@${event.client.address} joined as Player ${event.color}`
          );
          this.options.serverUpdate?.();
          break;
        }
        case 'LEAVE': {
          this.logger?.info(
            `${event.client.name}@${event.client.address} left their position as a Player ${event.client.color}`
          );
          this.options.statusUpdate?.(
            `${event.client.name}@${event.client.address} left their position as a Player ${event.client.color}`
          );
          event.client.color = types.Color.NONE;
          this.options.serverUpdate?.();
          break;
        }
        case 'DISCONNECT': {
          this.logger?.info(
            `Server forcefully disconnected ${event.client.name}@${event.client.address}`
          );
          event.client.socket.close(1000, 'Server disconnected you');
          break;
        }
        case 'SWAP': {
          for (const client of this.clients) {
            if (client.color == types.Color.BLACK)
              client.color = types.Color.WHITE;
            else if (client.color == types.Color.WHITE)
              client.color = types.Color.BLACK;
          }
          this.logger?.info(`Server swapped the players' colors`);
          this.options.statusUpdate?.(`Server swapped the players' colors`);
          this.options.serverUpdate?.();
          break;
        }
        case 'START': {
          this.logger?.info(`Server requested to start a game`);
          if (this.Ready) {
            this.state = ServerState.IDLE;
            const players = this.Players;
            _.forEach(players, (player, color) => {
              const config = this.gameManager.CurrentConfiguration;
              this.send(player, {
                type: 'START',
                configuration: config,
                color: color
              });
            });
            this.gameManager.start();
            this.logger?.info('\n' + _.repeat(_.repeat('#', 80) + '\n', 4));
            this.logger?.info('Starting a game');
            _.forEach(players, (player, color) => {
              if (player != null)
                this.logger?.info(
                  `Player ${color}: ${player.name}@${player.address}`
                );
            });
            this.logger?.info('\n' + this.gameManager.toString());
            this.options.statusUpdate?.(`Game started`);
            this.options.gameUpdate?.();
          } else {
            this.logger?.warn(`Cannot start a game without 2 players.`);
          }
          break;
        }
        default: {
          this.logger?.warn(`Unexpected ${event.type} event in state INIT`);
        }
      }
    } else if (this.state == ServerState.IDLE) {
      switch (event.type) {
        case 'CONNECT': {
          this.logger?.info(
            `Welcome, ${event.client.name}@${event.client.address}`
          );
          this.options.statusUpdate?.(
            `Welcome, ${event.client.name}@${event.client.address}`
          );
          this.options.serverUpdate?.();
          break;
        }
        case 'CLOSE': {
          const index = this.clients.findIndex(v => v === event.client);
          if (index != -1) {
            this.clients.splice(index, 1);
          }
          if (event.client.color != types.Color.NONE) {
            this.logger?.info(
              `Player ${event.client.color} is disconnected, Have to stop the game.`
            );
            process.nextTick(() => {
              this.processEvent({ type: 'END', reason: 'error' });
            });
          }
          this.logger?.info(
            `Goodbye, ${event.client.name}@${event.client.address}`
          );
          this.options.statusUpdate?.(
            `Goodbye, ${event.client.name}@${event.client.address}`
          );
          this.options.serverUpdate?.();
          break;
        }
        case 'DISCONNECT': {
          if (event.client.color == types.Color.NONE)
            event.client.socket.close(1000, 'Server disconnected you');
          break;
        }
        case 'END': {
          const message: {
            type: 'END';
            reason: string;
            winner: types.Color;
            players: {
              [name: string]: { score: number; remainingTime: number };
            };
          } = {
            type: 'END',
            reason: event.reason,
            winner: types.Color.NONE,
            players: {}
          };
          if (event.reason == 'error' || event.reason == 'pause') {
            this.gameManager.stop();
            const scores = this.gameManager.Scores;
            const state = this.gameManager.CurrentState;
            message.players = {
              [types.Color.BLACK]: {
                score: scores[types.Color.BLACK],
                remainingTime: state.players[types.Color.BLACK].remainingTime
              },
              [types.Color.WHITE]: {
                score: scores[types.Color.WHITE],
                remainingTime: state.players[types.Color.WHITE].remainingTime
              }
            };
          } else {
            const endGameInfo = this.gameManager.EndGameInfo;
            const scores = endGameInfo?.scores ?? {
              [types.Color.BLACK]: 0,
              [types.Color.WHITE]: 0
            };
            const state = this.gameManager.Game.CurrentState;
            message.winner = endGameInfo?.winner ?? types.Color.NONE;
            message.players = {
              [types.Color.BLACK]: {
                score: scores[types.Color.BLACK],
                remainingTime: state.players[types.Color.BLACK].remainingTime
              },
              [types.Color.WHITE]: {
                score: scores[types.Color.WHITE],
                remainingTime: state.players[types.Color.WHITE].remainingTime
              }
            };
          }
          const players = this.Players;
          // eslint-disable-next-line guard-for-in
          for (const color in players) {
            const player = players[color];
            if (player != null) {
              this.send(player, message);
            }
          }
          this.state = ServerState.INIT;
          this.logger?.info?.(`Game ending for the reason: ${message.reason}`);
          this.logger?.info?.('\n' + this.gameManager.toString());
          this.logger?.info?.(`Winner: ${message.winner}`);
          this.logger?.info?.(
            `B => Score: ${
              message.players[types.Color.BLACK].score
            }, Remaining Time: ${TimeUtility.format(
              message.players[types.Color.BLACK].remainingTime
            )}`
          );
          this.logger?.info?.(
            `W => Score: ${
              message.players[types.Color.WHITE].score
            }, Remaining Time: ${TimeUtility.format(
              message.players[types.Color.WHITE].remainingTime
            )}`
          );
          this.options.statusUpdate?.(
            `Game ending for the reason: ${message.reason}`
          );
          this.options.gameUpdate?.();
          break;
        }
        case 'MESSAGE': {
          const turn = this.gameManager.CurrentState.turn;
          let status = '';
          if (event.client.color == turn) {
            switch (event.message.move.type) {
              case 'pass':
                this.logger?.info?.(
                  `Player ${event.client.color} (${event.client.name}@${event.client.address}) passed their turn`
                );
                status = `Player ${event.client.color}: Pass`;
                break;
              case 'resign':
                this.logger?.info?.(
                  `Player ${event.client.color} (${event.client.name}@${event.client.address}) resigned`
                );
                status = `Player ${event.client.color}: Resign`;
                break;
              case 'place':
                this.logger?.info?.(
                  `Player ${event.client.color} (${event.client.name}@${
                    event.client.address
                  }) placed a stone at ${PointUtility.format(
                    event.message.move.point
                  )}`
                );
                status = `Player ${
                  event.client.color
                }: Stone at ${PointUtility.format(event.message.move.point)}`;
                break;
            }
            const other = flipColor(turn);
            const players = this.Players;
            const result = this.gameManager.apply(event.message.move);
            const remainingTime = _.mapValues(
              result.state.players,
              value => value.remainingTime
            );
            if (result.valid) {
              this.logger?.info('Move accepted');
              status += ` (Accepted)`;
              this.logger?.info?.('\n' + this.gameManager.toString());
              this.send(players[turn], {
                type: 'VALID',
                remainingTime: remainingTime
              });
              this.send(players[other], {
                type: 'MOVE',
                move: event.message.move,
                remainingTime: remainingTime
              });
            } else {
              status += ` (Rejected: ${result.message})`;
              this.logger?.info(
                `Move rejected for the reason: ${result.message}`
              );
              this.send(players[turn], {
                type: 'INVALID',
                message: result.message,
                remainingTime: remainingTime
              });
            }
            this.options.statusUpdate?.(status);
            this.options.gameUpdate?.();
          } else {
            this.logger?.warn?.(
              `Received a MOVE message from ${event.client.color} => ${event.client.name}@${event.client.address} outside their turn`
            );
          }
          break;
        }
        default: {
          this.logger?.warn?.(`Unexpected ${event.type} event in state IDLE.`);
        }
      }
    }
  }

  /**
   * Sends a message to a client
   * @param {Client | null} client the client to recieve the message
   * @param {any} message the message
   */
  private send(client: Client | null, message: any) {
    if (client) {
      const messageJSON = JSON.stringify(message);
      this.logger?.info?.(
        `Sending to ${client.name}@${client.address}: ${messageJSON}`
      );
      client.socket.send(messageJSON);
    }
  }

  /**
   * Closes the server
   */
  public close() {
    clearInterval(this.heartbeat);
    this.server.close();
    this.logger?.info?.(`Closing Server...`);
  }
}
