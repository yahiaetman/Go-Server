import GoGame from './go';
import {
  Color,
  GameConfiguration,
  Move,
  GameState,
  EndGameInfo
} from '../types/types';
import * as c from '../types/codecs';
import fs from 'fs';
import _ from 'lodash';
import Tock from 'tocktimer';
import path from 'path';
import dateFormat from 'dateformat';
import winston from 'winston';

enum ManagerState {
  READY,
  PLAYING
}

interface ManagerOptions {
  logger?: winston.Logger;
  tick?: () => void;
  end?: (reason: 'resign' | 'pass' | 'timeout' | 'mercy') => void;
  reload?: () => void;
}

/**
 * Game Manager used to manage a Go game including details such as timing and checkpoints
 * @class
 */
export default class GameManager {
  private options: ManagerOptions;
  private configLayers: {
    configFile: GameConfiguration | null;
    checkpointFile: GameConfiguration | null;
  } = { configFile: null, checkpointFile: null };

  // eslint-disable-next-line new-cap
  private timer = Tock({
    countdown: true,
    interval: 500,
    callback: () => {
      // eslint-disable-next-line no-invalid-this
      this.clockTick();
    },
    complete: () => {
      // eslint-disable-next-line no-invalid-this
      this.timeout();
    }
  });

  private state: ManagerState;
  private game: GoGame;
  private volatile: boolean;

  private logger?: winston.Logger;

  static readonly CheckpointPath: string = './checkpoints/checkpoint.json';
  static readonly GameConfigPath: string = './game.config.json';

  /**
   * Construct a game manager
   * @constructor
   * @param {ManagerOptions} options manager options
   */
  public constructor(options?: ManagerOptions) {
    this.options = options ?? {};
    this.logger = this.options.logger;
    this.configLayers.configFile = this.readConfig(GameManager.GameConfigPath);
    this.configLayers.checkpointFile = this.readConfig(
      GameManager.CheckpointPath
    );

    fs.watch('.', (event, filename) => {
      if (filename == path.basename(GameManager.GameConfigPath)) {
        this.logger?.info?.(
          `File "./game.config.json" fired a watch event ${event}, reloading configuration`
        );
        this.configLayers.configFile = this.readConfig(
          GameManager.GameConfigPath
        );
      }
      if (this.state !== ManagerState.PLAYING && this.volatile) {
        this.game.Configuration = this.StartingConfiguration;
        this.options?.reload?.();
      }
    });
    const checkpointsFolderPath = path.dirname(GameManager.CheckpointPath);
    if (!fs.existsSync(checkpointsFolderPath))
      fs.mkdirSync(checkpointsFolderPath);
    fs.watch(checkpointsFolderPath, (event, filename) => {
      if (filename == path.basename(GameManager.CheckpointPath)) {
        this.logger?.info?.(
          `File "./checkpoints/checkpoint.json" fired a watch event ${event}, reloading configuration`
        );
        this.configLayers.checkpointFile = this.readConfig(
          GameManager.CheckpointPath
        );
      }
      if (this.state !== ManagerState.PLAYING && this.volatile) {
        this.game.Configuration = this.StartingConfiguration;
        this.options?.reload?.();
      }
    });

    this.game = new GoGame(this.StartingConfiguration);
    this.state = ManagerState.READY;
    this.volatile = true;
    process.nextTick(() => {
      this.options?.reload?.();
    });
  }

  /**
   * read a configuration file
   * @param {string} filePath the path to the configuration
   * @return {GameConfiguration | null} the configuration if reading was successful, null otherwise
   */
  private readConfig(filePath: string): GameConfiguration | null {
    if (fs.existsSync(filePath)) {
      try {
        const configObject = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const result = c.GameConfiguration.decode(configObject);
        if (result._tag != 'Left') return result.right;
        else {
          this.logger?.error?.(`Failed to decode "${filePath}"`);
          return null;
        }
      } catch (error) {
        this.logger?.error?.(
          `Failed to read/parse "${filePath}" due to ${error}`
        );
        return null;
      }
    } else return null;
  }

  /**
   * Saves a checkpoint of the current state
   */
  private saveCheckpoint() {
    this.logger?.info?.(`Saving a checkpoint...`);
    const config = this.game.Configuration;
    fs.writeFileSync(
      GameManager.CheckpointPath,
      JSON.stringify(config, null, 4)
    );
  }

  /**
   * Clears the current checkpoint
   */
  public clearCheckpoint() {
    if (this.state == ManagerState.READY) {
      this.logger?.info?.(`Clearing the checkpoint...`);
      this.volatile = true;
      if (fs.existsSync(GameManager.CheckpointPath)) {
        const discardedPath = path.join(
          path.dirname(GameManager.CheckpointPath),
          `discarded-${dateFormat(new Date(), 'yyyy-mm-dd-HH-MM-ss')}.json`
        );
        fs.renameSync(GameManager.CheckpointPath, discardedPath);
      } else {
        this.game.Configuration = this.StartingConfiguration;
      }
      this.options.reload?.();
    }
  }

  /**
   * Archives the current checkpoint
   */
  private archiveCheckpoint() {
    const filepath = path.join(
      path.dirname(GameManager.CheckpointPath),
      `archive-${dateFormat(new Date(), 'yyyy-mm-dd-HH-MM-ss')}.json`
    );
    this.logger?.info?.(`Archiving the checkpoint to ${filepath}`);
    fs.writeFileSync(
      filepath,
      JSON.stringify(this.game.Configuration, null, 4)
    );
    if (fs.existsSync(GameManager.CheckpointPath)) {
      fs.unlinkSync(GameManager.CheckpointPath);
    }
  }

  /**
   * Gets the Starting Configuration (used when starting a game)
   * @return {GameConfiguration}
   */
  public get StartingConfiguration(): GameConfiguration {
    if (this.configLayers.checkpointFile !== null)
      return this.configLayers.checkpointFile;
    else if (this.configLayers.configFile !== null)
      return this.configLayers.configFile;
    else return GoGame.DefaultConfiguration;
  }

  /**
   * Gets the current configuration (built the ongoing game if it is running, otherwise it is the starting configuration)
   * @return {GameConfiguration}
   */
  public get CurrentConfiguration(): GameConfiguration {
    if (this.state == ManagerState.PLAYING) {
      const config = this.game.Configuration;
      config.idleDeltaTime =
        this.game.CurrentState.players[this.game.CurrentState.turn]
          .remainingTime - this.timer.lap();
      return config;
    } else {
      return this.StartingConfiguration;
    }
  }

  /**
   * Gets the game
   * @return {GoGame}
   */
  public get Game(): GoGame {
    return this.game;
  }

  /**
   * Gets whether a checkpoint exists
   * @return {boolean}
   */
  public get HasCheckpoint(): boolean {
    return this.configLayers.checkpointFile !== null;
  }

  /**
   * Gets whether a checkpoint can be cleared if any
   * @return {boolean}
   */
  public get CanClear(): boolean {
    return (
      this.state != ManagerState.PLAYING &&
      (!this.volatile || this.configLayers.checkpointFile !== null)
    );
  }

  /**
   * Gets whether the game is running
   * @return {boolean}
   */
  public get GameRunning(): boolean {
    return this.state == ManagerState.PLAYING;
  }

  /**
   * starts a game
   */
  public start() {
    if (this.state == ManagerState.PLAYING) return;

    const config = this.StartingConfiguration;
    this.game.Configuration = config;
    this.timer.start(
      this.game.CurrentState.players[this.game.CurrentState.turn].remainingTime
    );
    this.state = ManagerState.PLAYING;
    this.volatile = false;
  }

  /**
   * Stops the game
   */
  public stop() {
    this.state = ManagerState.READY;
    this.timer.pause();
    const state = this.game.CurrentState;
    this.game.pause(state.players[state.turn].remainingTime - this.timer.lap());
    this.saveCheckpoint();
  }

  /**
   * Applies a move to the game
   * @param {Move} move the move to apply
   * @return {object}
   */
  public apply(move: Move) {
    if (this.state != ManagerState.PLAYING)
      return {
        valid: false,
        state: this.game.CurrentState,
        message: 'No Game'
      };

    this.timer.pause();
    const result = this.game.apply(
      move,
      this.game.CurrentState.players[this.game.CurrentState.turn]
        .remainingTime - this.timer.lap()
    );
    if (result.valid) {
      this.saveCheckpoint();
      this.timer.reset();
      this.timer.start(
        this.game.CurrentState.players[this.game.CurrentState.turn]
          .remainingTime
      );
    } else {
      this.timer.pause();
    }
    if (this.game.HasGameEnded) {
      this.state = ManagerState.READY;
      this.logger?.info?.(`Game has ended.`);
      this.timer.stop();
      this.archiveCheckpoint();
      process.nextTick(() =>
        this.options.end?.(this.game.EndGameInfo?.reason ?? 'pass')
      );
    }
    return result;
  }

  /**
   * Ticks the game clock
   */
  private clockTick() {
    this.options.tick?.();
  }

  /**
   * Signals a timeout
   */
  private timeout() {
    if (this.state == ManagerState.PLAYING) {
      this.logger?.info?.(`Timeout.`);
      this.timer.stop();
      this.game.timeout();
      this.archiveCheckpoint();
      this.state = ManagerState.READY;
      this.options.end?.('timeout');
    }
  }

  /**
   * Gets the current game state
   * @return {GameState}
   */
  public get CurrentState(): GameState {
    const state = _.cloneDeep(this.game.CurrentState);
    if (this.state == ManagerState.PLAYING)
      state.players[state.turn].remainingTime = this.timer.lap();
    return state;
  }

  /**
   * Gets the game history
   */
  public get History() {
    return this.game.Configuration.moveLog;
  }

  /**
   * Gets the end game information
   * @return {EndGameInfo | null}
   */
  public get EndGameInfo(): EndGameInfo | null {
    return this.game.EndGameInfo;
  }

  /**
   * Gets whether the game has ended
   * @return {boolean}
   */
  public get HasGameEnded(): boolean {
    return this.game.HasGameEnded;
  }

  /**
   * Gets the player scores
   */
  public get Scores() {
    return this.game.Scores;
  }

  /**
   * Gets a string that represents the current game state
   * @param {boolean} showTerritories whether to show the territories
   * @return {string}
   */
  public toString(showTerritories: boolean = false): string {
    return this.game.toString(showTerritories, this.CurrentState);
  }
}
