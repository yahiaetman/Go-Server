import _ from 'lodash';
import Websocket from 'ws';
import GoGame from '../common/go';
import * as MessageCodecs from '../types/server-messages.codec';
import * as MessageTypes from '../types/server-messages.type';
import { Move, Color, GameConfiguration } from '../types/types';
import { PointUtility } from '../types/point.utils';
import * as TimeUtility from '../types/time.utils';
import { flipColor } from '../types/color.utils';
import {
  isMainThread,
  Worker,
  parentPort,
  workerData,
  WorkerOptions
} from 'worker_threads';

if (isMainThread) {
  type ClientEvent =
    | {
        type: 'MESSAGE';
        message: MessageTypes.ServerMessage;
      }
    | {
        type: 'INPUT';
        move: Move;
      }
    | {
        type: 'DISCONNECTION';
        code: number;
        reason: string;
      };

  const name = process.argv[2] ?? `Client-${process.pid}`;
  const url = process.argv[3] ?? 'ws://localhost:8080';

  const game = new GoGame();

  console.log(`Name: ${name}`);
  console.log(`Connecting to ${url} ...`);
  const socket = new Websocket(url);

  enum ClientState {
    INIT,
    READY,
    IDLE,
    THINKING,
    AWAITING_MOVE_RESPONSE
  }

  let state: ClientState = ClientState.INIT;
  let color: Color = Color.NONE;
  let requestedMove: Move;

  socket.on('message', data => {
    const result = MessageCodecs.ServerMessage.decode(
      JSON.parse(data.toString())
    );
    if (result._tag == 'Left') {
      console.log(`Invalid Message: ${result.left}`);
      return;
    }
    const message = result.right;
    processEvent({ type: 'MESSAGE', message: message });
  });

  socket.on('close', (code, reason) => {
    processEvent({ type: 'DISCONNECTION', code: code, reason: reason });
  });

  const workerTs = (file: string, wkOpts: WorkerOptions) => {
    wkOpts.eval = true;
    if (!wkOpts.workerData) {
      wkOpts.workerData = {};
    }
    wkOpts.workerData.__filename = file;
    return new Worker(
      `
                const wk = require('worker_threads');
                require('ts-node').register();
                let file = wk.workerData.__filename;
                delete wk.workerData.__filename;
                require(file);
            `,
      wkOpts
    );
  };

  const agent = workerTs(__filename, {});
  agent.on('message', message => {
    if (state == ClientState.THINKING) {
      const move = JSON.parse(message) as Move;
      requestedMove = move;
      socket.send(JSON.stringify({ type: 'MOVE', move: move }));
      state = ClientState.AWAITING_MOVE_RESPONSE;
    }
  });

  agent.on('online', () => {
    console.log('Agent is ready to play');
  });

  /**
   * Process a client event
   * @param {ClientEvent} event the event to process
   */
  function processEvent(event: ClientEvent) {
    if (event.type == 'DISCONNECTION') {
      console.log(`Disconnetion: ${event.code} - ${event.reason}`);
      process.exit(0);
    }
    if (event.type == 'MESSAGE' && event.message.type == 'END') {
      console.log('Game Ended');
      console.log(`Reason: ${event.message.reason}`);
      console.log(`Winner: ${event.message.winner}`);
      _.forEach(event.message.players, (player, color) => {
        console.log(
          `${color} => Score: ${
            player.score
          }, Remaining Time: ${TimeUtility.format(player.remainingTime)}`
        );
      });
      state = ClientState.READY;
      return;
    }
    if (state == ClientState.INIT) {
      if (event.type == 'MESSAGE') {
        switch (event.message.type) {
          case 'NAME':
            socket.send(JSON.stringify({ type: 'NAME', name: name }));
            state = ClientState.READY;
            console.log('Client is ready to play');
            break;
        }
      }
    } else if (state == ClientState.READY) {
      if (event.type == 'MESSAGE') {
        switch (event.message.type) {
          case 'START':
            game.Configuration = event.message.configuration;
            console.log('Game Start');
            console.log(game.toString(true));
            color = event.message.color;
            if (game.CurrentState.turn == event.message.color)
              state = ClientState.THINKING;
            else state = ClientState.IDLE;
            break;
        }
      }
    } else if (state == ClientState.IDLE) {
      if (event.type == 'MESSAGE') {
        switch (event.message.type) {
          case 'MOVE':
            const deltaTime =
              _.sum(
                _.map(game.CurrentState.players, value => value.remainingTime)
              ) - _.sum(_.map(event.message.remainingTime));
            game.apply(event.message.move, deltaTime);
            switch (event.message.move.type) {
              case 'pass':
                console.log('Opponent passed their turn');
                break;
              case 'resign':
                console.log('Opponent resigned');
                break;
              case 'place':
                console.log(
                  `Opponent placed a stone as ${PointUtility.format(
                    event.message.move.point
                  )}`
                );
                break;
            }
            console.log(game.toString(true));
            state = ClientState.THINKING;
            break;
        }
      }
    } else if (state == ClientState.THINKING) {
      if (event.type == 'INPUT') {
        socket.send(JSON.stringify({ type: 'MOVE', move: event.move }));
        requestedMove = event.move;
        state = ClientState.AWAITING_MOVE_RESPONSE;
      }
    } else if (state == ClientState.AWAITING_MOVE_RESPONSE) {
      if (event.type == 'MESSAGE') {
        switch (event.message.type) {
          case 'INVALID':
            console.log(`Move Rejected: ${event.message.message}`);
            state = ClientState.THINKING;
            break;
          case 'VALID':
            console.log('Move Accepted');
            const deltaTime =
              _.sum(
                _.map(game.CurrentState.players, value => value.remainingTime)
              ) - _.sum(_.map(event.message.remainingTime));
            game.apply(requestedMove, deltaTime);
            console.log(game.toString(true));
            state = ClientState.IDLE;
            break;
        }
      }
    }
    if (state == ClientState.THINKING) {
      console.log("It's my turn");
      agent.postMessage(
        JSON.stringify({ config: game.Configuration, color: color })
      );
    } else {
      if (state == ClientState.IDLE) {
        console.log('Waiting for the opponents move');
      } else if (state == ClientState.AWAITING_MOVE_RESPONSE) {
        console.log('Waiting for the server reponse');
      }
    }
  }
} else {
  /**
   * Evaluate a move
   * @param {GoGame} game the game to evaluate
   * @param {Color} color the color of the player
   * @param {Move} move the move to evaluate
   * @return {number | undefined} the move score
   */
  function evaluate(
    game: GoGame,
    color: Color,
    move: Move
  ): number | undefined {
    const result = game.apply(move, 0);
    if (!result.valid) return undefined;
    if (game.HasGameEnded) {
      const winner = game.EndGameInfo?.winner;
      game.undo();
      return winner == Color.NONE ? 0 : winner == color ? 1e10 : -1e10;
    } else {
      const scores = game.Scores;
      game.undo();
      const difference = scores[color] - scores[flipColor(color)];
      return move.type == 'pass' && difference < 0 ? -1e10 : difference;
    }
  }

  /**
   * Greedily chooses a move to play
   * @param {GoGame} game The game to think about
   * @param {Color} color The color of the player
   * @return {Move} the picked move
   */
  function think(game: GoGame, color: Color): Move {
    const size = game.BoardSize;
    const moves: Move[] = [];
    moves.push({ type: 'pass' }, { type: 'resign' });
    const board = game.CurrentState.board;
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (board[row][col] == Color.NONE)
          moves.push({ type: 'place', point: { row: row, column: col } });
      }
    }
    moves.sort((x, y) => Math.random() - 0.5);
    let bestMove: Move = moves[0];
    let bestValue = evaluate(game, color, bestMove) ?? -1e10;
    for (let i = 1; i < moves.length; i++) {
      const move = moves[i];
      const value = evaluate(game, color, move);
      if (value && value > bestValue) {
        bestMove = move;
        bestValue = value;
      }
    }
    return bestMove;
  }

  parentPort?.on('message', message => {
    const data = JSON.parse(message);
    const color = data.color as Color;
    const config = data.config as GameConfiguration;
    const move = think(new GoGame(config), color);
    parentPort?.postMessage(JSON.stringify(move));
  });
}
