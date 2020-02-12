import { GameState, LogEntry, Color } from '../../types/types';

export interface Client {
  id: number;
  name: string;
  address: string;
}

export interface ServerUIState {
  clients: Client[];
  players: { [name: string]: Client | null };
}

export interface GameUIState {
  state: GameState;
  history: LogEntry[];
  initialTurn: Color;
  scores: { [name: string]: number };
  canClear: boolean;
  hasGameEnded: boolean;
  running: boolean;
}
