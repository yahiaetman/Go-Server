import _ from 'lodash';
import fs from 'fs';
import websocket from 'ws';
import winston from 'winston';
import * as MessageTypes from '../types/client-messages.type';
import * as MessageCodecs from '../types/client-messages.codec';

enum ServerState {
    INIT,
    READY,
    IDLE
};

enum ServerEvent {
    CONNECT, // A Client wants to connect to the server
    CLOSE, // A Client connection is closed
    MESSAGE, // A Client sent a message
    START, // The User pressed Start
    END, // The game ended for one of the reasons found in enum EndReasons
    ENLIST, // A Client is added as a player
    DISCHARGE, // A Client is removed from the plaer list
    DISCONNECT, // The User pressed disconnect for one of the clients
    SWAP, // The User swapped the order of the clients
}

export class Server {

};