import _ from 'lodash';
import fs from 'fs';
import winston from 'winston';
import dateFormat from 'dateformat';
import { app, BrowserWindow, ipcMain } from 'electron';
import { Server } from './server';
import { Color } from '../types/types';

interface Size {
  width: number;
  height: number;
}

/**
 * the Application class
 * @class
 */
class App {
  private window!: Electron.BrowserWindow | null;
  private server!: Server;
  private logger!: winston.Logger;

  /**
   * Creates a window
   */
  private createWindow() {
    if (!fs.existsSync('./logs/')) fs.mkdirSync('./logs/');

    this.logger = winston.createLogger({
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
        this.window?.webContents.send(
          'status-update',
          `${err.name} occurred. See logs for more info`
        );
        return false;
      }
    });

    this.logger.info('Starting Application ...');

    const contentSize: Size = { width: 1280, height: 720 };
    const shadowSize: Size = { width: 25, height: 25 };
    this.window = new BrowserWindow({
      width: contentSize.width + shadowSize.width,
      height: contentSize.height + shadowSize.height,
      resizable: false,
      frame: false,
      transparent: true,
      hasShadow: false,
      webPreferences: { nodeIntegration: true }
    });
    // this.window.loadFile('public/renderer/index.html');
    this.window.loadURL(`file://${__dirname}/../renderer/index.html`);
    this.window.setMenu(null);
    // this.window.webContents.openDevTools();

    this.window.webContents.on('did-finish-load', () => {
      this.server = new Server({
        logger: this.logger,
        gameUpdate: () => {
          const config = this.server.GameManager.Game.Configuration;
          this.window?.webContents.send('game-update', {
            state: this.server.GameManager.CurrentState,
            history: config.moveLog,
            initialTurn: config.initialState.turn,
            scores: this.server.GameManager.Scores,
            canClear: this.server.GameManager.CanClear,
            hasGameEnded: this.server.GameManager.HasGameEnded,
            running: this.server.GameManager.GameRunning
          });
        },
        serverUpdate: () => {
          const clients = _.map(
            _.filter(this.server.Clients, client => client.color == Color.NONE),
            client => {
              return {
                id: client.id,
                name: client.name,
                address: client.address
              };
            }
          );
          const players = _.mapValues(this.server.Players, player => {
            return player == null
              ? null
              : { id: player.id, name: player.name, address: player.address };
          });
          this.window?.webContents.send('server-update', {
            clients: clients,
            players: players
          });
        },
        statusUpdate: message => {
          this.window?.webContents.send('status-update', message);
        }
      });

      ipcMain.on('action-start', event => {
        this.server.start();
      });
      ipcMain.on('action-stop', event => {
        this.server.stop();
      });

      ipcMain.on('action-join', (event, id: number, color: Color) => {
        this.server.join(id, color);
      });
      ipcMain.on('action-disconnect', (event, id: number) => {
        this.server.disconnect(id);
      });
      ipcMain.on('action-leave', (event, id: number) => {
        this.server.leave(id);
      });
      ipcMain.on('action-swap', event => {
        this.server.swap();
      });
      ipcMain.on('action-start', event => {
        this.server.start();
      });
      ipcMain.on('action-stop', event => {
        this.server.stop();
      });
      ipcMain.on('action-clear', event => {
        this.server.GameManager.clearCheckpoint();
      });
    });

    this.window.on('closed', () => {
      this.window = null;
    });
  }

  /**
   * Constructs an Application
   * @constructor
   */
  constructor() {
    app.on('ready', () => {
      this.createWindow();
    });
    app.on('window-all-closed', () => {
      app.quit();
    });
    app.on('activate', () => {
      if (this.window == null) this.createWindow();
    });
  }
}

new App();
