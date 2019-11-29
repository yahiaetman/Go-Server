import { GameState, LogEntry, EndGameInfo } from '../../types/types'

export interface Client {
    id: number,
    name: string,
    address: string
};

export interface ServerUIState {
    clients: Client[],
    players: {[name: string]: Client | null}
}

export interface GameUIState {
    state: GameState,
    history: LogEntry[],
    scores: {[name: string]: number},
    hasCheckpoint: boolean,
    hasGameEnded: boolean,
    running: boolean
}