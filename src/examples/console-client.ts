import _ from 'lodash';
import readline from 'readline';
import Websocket from 'ws';
import GoGame from '../common/go';
import * as MessageCodecs from '../types/server-messages.codec';
import * as MessageTypes from '../types/server-messages.type';
import { Move } from '../types/types';
import { PointUtility } from '../types/point.utils';
import * as TimeUtility from '../types/time.utils';

type ClientEvent = {
    type: "MESSAGE",
    message: MessageTypes.ServerMessage
} | {
    type: "INPUT",
    move: Move
} | {
    type: "DISCONNECTION",
    code: number,
    reason: string
};

const name = process.argv[2] ?? `Client-${process.pid}`;
const url = process.argv[3] ?? 'ws://localhost:8080'

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
};

let state: ClientState = ClientState.INIT;

let requestedMove: Move;

socket.on("message", (data)=>{
    let result = MessageCodecs.ServerMessage.decode(JSON.parse(data.toString()));
    if(result._tag == 'Left'){
        console.log(`Invalid Message: ${result.left}`);
        return;
    }
    let message = result.right;
    processEvent({ type:"MESSAGE", message: message });
});

socket.on("close", (code, reason)=>{
    processEvent({ type:"DISCONNECTION", code:code, reason:reason });
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${name}> `
});


rl.on("line", (input)=>{
    let move: Move;
    let args = input.toLowerCase().trim().split(/\s+/, 2);
    switch(args[0] ?? ''){
        case 'p': case 'pass':
            move = {type: 'pass'};
            break;
        case 'r': case 'resign':
            move = {type: 'resign'};
            break;
        case 'place':{
            if(args.length < 2){
                console.error("Please enter a point");
                rl.prompt();
                return;
            }
            let point = PointUtility.Parse(args[1]);
            if(point == null){
                console.error("point format is invalid");
                rl.prompt();
                return;
            }
            move = {type: 'place', point: point};
            break;
        }
        case 'h': case 'help':{
            console.log("Commands:");
            console.log("   - pass");
            console.log("   - resign");
            console.log("   - place <point>");
            console.log("   - help");
            console.log("   - exit");
            rl.prompt();
            return;
        }
        case 'exit': case 'quit':{
            console.log('Goodbye!'); // Remember to say goodbye to the user before quitting :D
            process.exit(0);
        }
        default:{
            let point = PointUtility.Parse(args[1]);
            if(point == null){
                console.error("Invalid Command");
                rl.prompt();
                return;
            }
            move = {type: 'place', point: point};
            break;
        }
    }
    processEvent({ type: "INPUT", move: move });
}).on("close", ()=>{
    console.log('Goodbye!'); // Remember to say goodbye to the user before quitting :D
    process.exit(0);
})

function processEvent(event: ClientEvent){
    if(event.type == "DISCONNECTION"){
        console.log(`Disconnetion: ${event.code} - ${event.reason}`);
        process.exit(0);
    }
    if(event.type == "MESSAGE" && event.message.type == "END"){
        console.log("Game Ended");
        console.log(`Reason: ${event.message.reason}`);
        console.log(`Winner: ${event.message.winner}`);
        _.forEach(event.message.players, (player, color)=>{
            console.log(`${color} => Score: ${player.score}, Remaining Time: ${TimeUtility.Format(player.remainingTime)}`);
        });
        state = ClientState.READY;
        return;
    }
    if(state == ClientState.INIT){
        if(event.type == "MESSAGE"){
            switch(event.message.type){
                case "NAME":
                    socket.send(JSON.stringify({type:"NAME", name:name}));
                    state = ClientState.READY;
                    console.log("Client is ready to play");
                    break;
            }
        }
    } else if(state == ClientState.READY){
        if(event.type == "MESSAGE"){
            switch(event.message.type){
                case "START":
                    game.Configuration = event.message.configuration;
                    console.log("Game Start");
                    console.log(game.toString(true));
                    if(game.CurrentState.turn == event.message.color) state = ClientState.THINKING;
                    else state = ClientState.IDLE;
                    break;
            }
        }
    } else if(state == ClientState.IDLE){
        if(event.type == "MESSAGE"){
            switch(event.message.type){
                case "MOVE":
                    let deltaTime = _.sum(_.map(game.CurrentState.players, (value)=>value.remainingTime)) - _.sum(_.map(event.message.remainingTime))
                    game.apply(event.message.move, deltaTime);
                    switch(event.message.move.type){
                        case 'pass': console.log("Opponent passed their turn"); break;
                        case 'resign': console.log("Opponent resigned"); break;
                        case 'place': console.log(`Opponent placed a stone as ${PointUtility.Format(event.message.move.point)}`); break;
                    }
                    console.log(game.toString(true));
                    state = ClientState.THINKING;
                    break;
            }
        }
    } else if(state == ClientState.THINKING){
        if(event.type == "INPUT"){
            socket.send(JSON.stringify({type:"MOVE", move: event.move}));
            requestedMove = event.move;
            state = ClientState.AWAITING_MOVE_RESPONSE;
        }
    } else if(state == ClientState.AWAITING_MOVE_RESPONSE){
        if(event.type == "MESSAGE"){
            switch(event.message.type){
                case "INVALID":
                    console.log(`Move Rejected: ${event.message.message}`);
                    state = ClientState.THINKING;
                    break;
                case "VALID":
                    console.log("Move Accepted");
                    let deltaTime = _.sum(_.map(game.CurrentState.players, (value)=>value.remainingTime)) - _.sum(_.map(event.message.remainingTime))
                    game.apply(requestedMove, deltaTime);
                    console.log(game.toString(true));
                    state = ClientState.IDLE;
                    break;
            }
        }
    }
    if(state == ClientState.THINKING) { 
        console.log("It's my turn");
    } 
    else {
        if(state == ClientState.IDLE) {
           console.log("Waiting for the opponents move");
        } else if(state == ClientState.AWAITING_MOVE_RESPONSE) {
            console.log("Waiting for the server reponse");
         }
    }
    rl.prompt(); 
}