import GoGame from '../../src/common/go';
import * as c from '../../src/types/codecs';
import { Color } from '../../src/types/types';

test("Load Configuration 1", ()=>{
    const configString = `{
        "initialState": {
            "board": 19,
            "players": {
                "B": {"remainingTime": "15:00"},
                "W": {"remainingTime": "15:00"}
            },
            "turn": "B"
        },
        "moveLog":[
            {
                "move": {
                    "type": "place",
                    "point": {
                        "row": 18,
                        "column": 0
                    }
                },
                "deltaTime": 1000
            }
        ],
        "komi": 6.5,
        "ko": false,
        "superko": true,
        "mercy": 0,
        "mercyStart": 100,
        "scoringMethod": "area",
        "prisonerScore": 1,
        "passAddsToPrisoners": false,
        "idleDeltaTime": "1:00"
    }`;
    const result = c.GameConfiguration.decode(JSON.parse(configString));
    expect(result._tag).toBe('Right');
    if(result._tag == 'Right'){
        const config = result.right;
        const go = new GoGame(config);
        const state = go.CurrentState;
        expect(state.players[Color.BLACK].remainingTime).toBe((15*60-1)*1000);
        expect(state.players[Color.WHITE].remainingTime).toBe(((15-1)*60)*1000);
    }
});

test("Load Configuration 2", ()=>{
    const configString = `{
        "initialState": {
            "board": 19,
            "players": {
                "B": {"remainingTime": "15:00"},
                "W": {"remainingTime": "15:00"}
            },
            "turn": "B"
        },
        "moveLog":[
            {
                "move": {
                    "type": "place",
                    "point": {
                        "row": 18,
                        "column": 0
                    }
                },
                "deltaTime": "0:01"
            },
            {
                "move": {
                    "type": "place",
                    "point": {
                        "row": 7,
                        "column": 1
                    }
                },
                "deltaTime": "0:02"
            }
        ],
        "komi": 6.5,
        "ko": false,
        "superko": true,
        "mercy": 0,
        "mercyStart": 100,
        "scoringMethod": "area",
        "prisonerScore": 1,
        "passAddsToPrisoners": false,
        "idleDeltaTime": "2:00"
    }`;
    const result = c.GameConfiguration.decode(JSON.parse(configString));
    expect(result._tag).toBe('Right');
    if(result._tag == 'Right'){
        const config = result.right;
        const go = new GoGame(config);
        const state = go.CurrentState;
        expect(state.players[Color.BLACK].remainingTime).toBe(((15-2)*60-1)*1000);
        expect(state.players[Color.WHITE].remainingTime).toBe((15*60-2)*1000);
    }
});