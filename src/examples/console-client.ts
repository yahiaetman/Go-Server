import _ from 'lodash';
import readline from 'readline';
import Websocket from 'ws';
import GoGame from '../common/go';
import * as MessageCodecs from '../types/server-messages.codec';
import * as MessageTypes from '../types/server-messages.type';
import { Move } from '../types/types';
import { PointUtility } from '../types/point.utils';
import * as TimeUtility from '../types/time.utils';

// Client event represents every possible event that could affect the client
type ClientEvent = {
    type: "MESSAGE", // This event interface represents websocket message arrival
    message: MessageTypes.ServerMessage
} | {
    type: "INPUT", // This event interface represents user input
    move: Move
} | {
    type: "DISCONNECTION", // This event interface represents websocket disconnection
    code: number,
    reason: string
};

const name = process.argv[2] ?? `Client-${process.pid}`; // Get the user name from the command line arguments if defined (default: 'client-' + process-id)
const url = process.argv[3] ?? 'ws://localhost:8080'; // Get the websocket url from the command line arguments if defined (default: ws://localhost:8080)
const protocol = process.argv[4] ?? null; // Get the protocol version requested by the client (Note: this is ignored by the client code and is added only for debugging purposes)

const game = new GoGame(); // Create a go game to track the game state

// Print some info to the user
console.log(`Name: ${name}`);
console.log(`Connecting to ${url} ...`);

// Initiate a websocket connection with the server
const socket = new Websocket(url);

// This enum represents the client states
enum ClientState {
    INIT, // The client is initializing the connection with the server
    READY, // The client is ready to start a game
    IDLE, // The client is waiting for the opponent's move
    THINKING, // The client is thinking of a move
    AWAITING_MOVE_RESPONSE // The client is awaiting the server's response about the move (VALID or INVALID)
};

let state: ClientState = ClientState.INIT; // Initially, the client is trying to initialize a connection with the server

let requestedMove: Move; // This will store the requested move, and if the server responds with VALID, it will be verified

// This callback is called whenever the client receives a message from the server
socket.on("message", (data)=>{
    try {
        let result = MessageCodecs.ServerMessage.decode(JSON.parse(data.toString())); // Parse the message and try to decode it
        if(result._tag == 'Left'){ // If the message is undecodable, ignore it
            console.log(`Invalid Message: ${result.left}`);
            return;
        }
        let message = result.right;
        processEvent({ type:"MESSAGE", message: message });  // Send the decoded message for processing
    } catch (error) {
        console.log(`Failed to decode the message: ${error}`); // If an exception in the parsing occurs, ignore it
        return;
    }
});

// This callback is called whenever the client is disconnected
socket.on("close", (code, reason)=>{
    processEvent({ type:"DISCONNECTION", code:code, reason:reason });
});

// Create a user interface on the terminal
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${name}> `
});

// This callback is called whenever the user enters a new line
rl.on("line", (input)=>{
    let move: Move;
    let args = input.toLowerCase().trim().split(/\s+/, 2); // Clean and split the input
    switch(args[0] ?? ''){
        case 'p': case 'pass': // If the command is pass, then.... the move is a pass I believe
            move = {type: 'pass'};
            break;
        case 'r': case 'resign': // Also, If the command is resign, then.... the move is a resign I think
            move = {type: 'resign'};
            break;
        case 'place':{ // This is a place move
            if(args.length < 2){ // The must be a point with the `place` command
                console.error("Please enter a point");
                rl.prompt();
                return;
            }
            let point = PointUtility.Parse(args[1]); // Parse the point
            if(point == null){
                console.error("point format is invalid"); // If the point is invalid, return
                rl.prompt();
                return;
            }
            move = {type: 'place', point: point};
            break;
        }
        case 'h': case 'help':{ // Just a typical help command
            console.log("Commands:");
            console.log("   - pass");
            console.log("   - resign");
            console.log("   - place <point>");
            console.log("   - help");
            console.log("   - exit");
            rl.prompt();
            return;
        }
        case 'exit': case 'quit':{ // The goodbye command
            rl.close();
        }
        default:{
            let point = PointUtility.Parse(args[0]); // If it is neither of the above, the user may have entered a point only meaning to do a place, so we will try to parse it
            if(point == null){
                console.error("Invalid Command"); // Nah, it was not a point afterall
                rl.prompt();
                return;
            }
            move = {type: 'place', point: point};
            break;
        }
    }
    processEvent({ type: "INPUT", move: move }); // Send the user input for processing
}).on("close", ()=>{ // The client is closing
    console.log('Goodbye!'); // Remember to say goodbye to the user before quitting :D
    process.exit(0);
})

// This will process all the client events
function processEvent(event: ClientEvent){
    if(event.type == "DISCONNECTION"){ // The client was disconnected, so we bail out.
        console.log(`Disconnetion: ${event.code} - ${event.reason}`);
        process.exit(0);
    }
    if(event.type == "MESSAGE" && event.message.type == "END"){ // The game has ended so we display, the end-game info
        console.log("Game Ended");
        console.log(`Reason: ${event.message.reason}`);
        console.log(`Winner: ${event.message.winner}`);
        _.forEach(event.message.players, (player, color)=>{
            console.log(`${color} => Score: ${player.score}, Remaining Time: ${TimeUtility.Format(player.remainingTime)}`);
        });
        state = state==ClientState.INIT?ClientState.INIT:ClientState.READY; // Return to READY to wait for a new game (stay in INIT if the initialization didn't ended)
        rl.prompt();
        return;
    }
    // Here we will start the main part of our finite state machine
    if(state == ClientState.INIT){ // While the client is initializing
        if(event.type == "MESSAGE"){ // If this is a server message
            switch(event.message.type){
                case "NAME": // And the message type is NAME
                    let protocolFragment = protocol==null?{}:{protocol:protocol}
                    socket.send(JSON.stringify({type:"NAME", name:name, ...protocolFragment})); // We reply with our name
                    state = ClientState.READY; // Then go to ready
                    console.log("Client is ready to play");
                    break;
            }
        }
    } else if(state == ClientState.READY){ // While the client is ready to play a game
        if(event.type == "MESSAGE"){ // If this is a server message
            switch(event.message.type){
                case "START": // And the message type is NAME
                    game.Configuration = event.message.configuration; // set the game config to match the message config
                    console.log("Game Start");
                    console.log(game.toString(true));
                    if(game.CurrentState.turn == event.message.color) state = ClientState.THINKING; // If it is my turn, go to THINKING
                    else state = ClientState.IDLE; // otherwise, go to IDLE
                    break;
            }
        }
    } else if(state == ClientState.IDLE){ // While the client is wating for the opponent's move
        if(event.type == "MESSAGE"){ // If this is a server message
            switch(event.message.type){
                case "MOVE": // And the message type is MOVE
                    let deltaTime = _.sum(_.map(game.CurrentState.players, (value)=>value.remainingTime)) - _.sum(_.map(event.message.remainingTime)); // Get the difference in time
                    game.apply(event.message.move, deltaTime); // Update the game state
                    switch(event.message.move.type){ // Print a message about the opponent's move
                        case 'pass': console.log("Opponent passed their turn"); break;
                        case 'resign': console.log("Opponent resigned"); break;
                        case 'place': console.log(`Opponent placed a stone as ${PointUtility.Format(event.message.move.point)}`); break;
                    }
                    console.log(game.toString(true));
                    state = ClientState.THINKING; // Go to thinking
                    break;
            }
        }
    } else if(state == ClientState.THINKING){ // While the client is thinking of a move
        if(event.type == "INPUT"){ // If this is a user input
            socket.send(JSON.stringify({type:"MOVE", move: event.move})); // Send the move to the server
            requestedMove = event.move; // Store the move
            state = ClientState.AWAITING_MOVE_RESPONSE; // Then await the server response
        }
    } else if(state == ClientState.AWAITING_MOVE_RESPONSE){ // While the client is awaiting the server response
        if(event.type == "MESSAGE"){ // If this is a server message
            switch(event.message.type){
                case "INVALID": // If the move was invalid
                    console.log(`Move Rejected: ${event.message.message}`);
                    state = ClientState.THINKING; // Go back to thinking
                    break;
                case "VALID":
                    console.log("Move Accepted"); // If the move was accepted
                    let deltaTime = _.sum(_.map(game.CurrentState.players, (value)=>value.remainingTime)) - _.sum(_.map(event.message.remainingTime))
                    game.apply(requestedMove, deltaTime); // Update the game state
                    console.log(game.toString(true));
                    state = ClientState.IDLE; // Then go to IDLE to wwait for thr opponent's move
                    break;
            }
        }
    }
    // Print some message to denote the client state
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
    rl.prompt(); // Prompt the user for input
}