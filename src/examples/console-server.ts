import _ from 'lodash';
import readline from 'readline';
import { Server } from "../main/server";
import { Color } from '../types/types';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'SERVER> '
});

let server = new Server({
    gameUpdate: ()=>{
        console.log();
        console.log("Game State:");
        console.log(server.GameManager.toString(true));
        rl.prompt();
    },
    serverUpdate: ()=>{
        console.log();
        console.log("Clients:");
        server.Clients.forEach((client)=>{
            console.log(`${client.id}: ${client.name} (${client.ip})`);
        });
        console.log("Players:");
        const players = server.Players;
        _.forEach(server.Players, (player, color)=>{
            if(player == null){
                console.log(`${color}: None`);
            } else {
                console.log(`${player.color} => ${player.id}: ${player.name} (${player.ip})`);
            }
        });
        rl.prompt();
    },
    statusUpdate: (message)=>{ console.log(`\nStatus: ${message}`); rl.prompt(); }
});

function getClientByID(id: number){ return server.Clients.find((client)=>client.id == id); }

rl.on('line', (input)=>{
    let commands = input.trim().split(/\s+/);
    if(commands.length == 0) return;
    switch(commands[0]){
        case "a": case "enlist":{
            let client = getClientByID(Number.parseInt(commands[1]));
            if(client)
                server.enlist(client, commands[2]==="w"?Color.WHITE:Color.BLACK);
            break;
        }
        case "r": case "discharge":{
            let client = getClientByID(Number.parseInt(commands[1]));
            if(client)
                server.discharge(client);
            break;
        }
        case "d": case "disconnect":{
            let client = getClientByID(Number.parseInt(commands[1]));
            if(client)
                server.disconnect(client);
            break;
        }
        case "swap":{
            server.swap();
            break;
        }
        case "start":{
            server.start();
            break;
        }
        case "stop":{
            server.stop();
            break;
        }
    }
}).on('close', ()=>{
    server.close();
    console.log("Good bye");
    process.exit(0);
});