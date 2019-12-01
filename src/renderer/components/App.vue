<template>
    <div class="window">
        <title-bar></title-bar>
        <div class="window-content">
            <div class="main-area">
                <game 
                :players="serverState.players" 
                @leave="leave"
                @swap="swap"
                @start="start"
                @stop="stop"
                @clear="clear"
                :state="gameState.state"
                :scores="gameState.scores"
                :can-clear="gameState.canClear"
                :ended="gameState.hasGameEnded"
                :running="gameState.running"
                :winner="Winner"
                >
                </game>
            </div>
            <div class="side-area">
                <div class="history-area">
                    <history :moves="MoveLog" :end="EndGameInfo" :initial-turn="gameState.initialTurn"></history>
                </div>
                <div class="requests-area">
                    <requests :clients="serverState.clients" @join="join" @disconnect="disconnect"></requests>
                </div>
            </div>
        </div>
        <status-bar></status-bar>
    </div>  
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop } from 'vue-property-decorator';
import TitleBarComponent from './TitleBar.vue';
import HistoryComponent from './History.vue';
import RequestsComponent from './Requests.vue';
import StatusBarComponent from './StatusBar.vue';
import GameComponent from './Game.vue';
import { Color, Move } from '../../types/types';
import { ServerUIState, Client, GameUIState } from './renderer-types';
import { ipcRenderer } from 'electron';

@Component({
    components:{
        'title-bar' : TitleBarComponent,
        'history' : HistoryComponent,
        'requests' : RequestsComponent,
        'status-bar' : StatusBarComponent,
        'game' : GameComponent
    }
})
export default class AppComponent extends Vue {
    serverState: ServerUIState = {
        clients: [],
        players: {[Color.BLACK]: null, [Color.WHITE]: null}
    };

    gameState: GameUIState = {
        state: {board:[], players:{[Color.BLACK]: {prisoners:0, remainingTime:0}, [Color.WHITE]: {prisoners:0, remainingTime:0}}, turn:Color.NONE},
        history: [],
        initialTurn: Color.BLACK,
        scores: {[Color.BLACK]: 0, [Color.WHITE]: 0},
        canClear: false,
        hasGameEnded: false,
        running: false
    };

    get Winner(): Color {
        if(this.gameState.running || !this.gameState.hasGameEnded) return Color.NONE;
        let endInfo = this.gameState.history[this.gameState.history.length-1].end;
        if(endInfo) return endInfo.winner;
        else return Color.NONE;
    }

    get MoveLog(): Move[] {
        return this.gameState.history.map((v)=>v.move).filter((v)=>v) as Move[];
    }

    get EndGameInfo() {
        if(this.gameState.hasGameEnded && this.gameState.history.length > 0){
            return this.gameState.history[this.gameState.history.length-1].end;
        } else return undefined;
    }

    private join(id: number, color: Color){
        ipcRenderer.send("action-join", id, color);
    }

    private disconnect(id: number){
        ipcRenderer.send("action-disconnect", id);
    }

    private leave(id: number){
        ipcRenderer.send("action-leave", id);
    }

    private swap(){
        ipcRenderer.send("action-swap");
    }

    private start(){
        ipcRenderer.send("action-start");
    }

    private stop(){
        ipcRenderer.send("action-stop");
    }

    private clear(){
        ipcRenderer.send("action-clear");
    }

    mounted(){
        ipcRenderer.on("server-update", (event, state: ServerUIState)=>{
            this.serverState = state;
        });
        ipcRenderer.on("game-update", (event, state: GameUIState)=>{
            this.gameState = state;
        });
    }
}
</script>

<style lang="scss" scoped>
@import "../variables.scss";

.window {
    background-color: $color4;
    margin: 0%;
    position: absolute; top: 0; right: 25px; bottom: 25px; left: 0;
    box-shadow: 10px 10px 10px 0px #00000044;
    border-radius: 10px;
    font-family: 'Roboto', sans-serif;
};

.window-content {
    margin: 0%;
    padding: 0;
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: auto 330px;
    grid-template-areas:
    'main side';
};

.main-area {
    grid-area: main;
    margin-bottom: 48px;
}

.side-area {
    grid-area: side;
    background-color: $color3;
    border-radius: 0px 10px 10px 0px;
    display: flex;
    flex-direction: column;
    margin-bottom: 8px;
}

.history-area {
    flex: 1 1 0;
    height: 0;
}

.requests-area {
    flex: 0 1 auto;
}

</style>