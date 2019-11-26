import _ from 'lodash';
import readline from 'readline';
import GameManager from '../common/game-manager';
import { Move, Point, Color } from '../types/types';
import { PointUtility } from '../types/point.utils';


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'GO> '
});

const gameManager = new GameManager({
    tick: () => {},
    end: () => {
        console.log("\nGame Over");
        let endInfo = gameManager.EndGameInfo;
        switch(endInfo?.reason){
            case "pass": console.log("Reason: Subsequent Pass Moves"); break;
            case "resign": console.log("Reason: Resignation"); break;
            case "timeout": console.log("Reason: Timeout"); break;
        }
        console.log(`Winner: ${endInfo?.winner==Color.BLACK?"Black":"White"}`);
        console.log(`Black Final Score: ${endInfo?.scores?.[Color.BLACK]}`);
        console.log(`White Final Score: ${endInfo?.scores?.[Color.WHITE]}`);
        process.exit(0);
    }
});
gameManager.start();

console.log(gameManager.toString(true));

rl.prompt();

rl.on("line", (input: string) => {
    let move: Move;
    let args = input.toLowerCase().trim().split(/\s+/, 2);
    if(args.length < 1 || args.length > 2){
        
    }
    switch(args[0] ?? ''){
        case 'pass':
            move = {type: 'pass'};
            break;
        case 'resign':
            move = {type: 'resign'};
            break;
        case 'place':
            if(args.length < 2){
                console.error("Please enter an empty point");
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
        default:
            console.error("Invalid Command");
            rl.prompt();
            return;
    }
    let result = gameManager.apply(move);
    console.log(gameManager.toString(true));
    rl.prompt();
}).on('close', ()=>{
    console.log('Goodbye!'); // Remember to say goodbye to the user before quitting :D
    process.exit(0);
});