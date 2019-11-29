<template>
    <div class="history-container">
        <div class="history-header">
            <div class="history-title">HISTORY</div>
            <div class="history-sync">
                <i class="material-icons md-18" @click="syncClick">
                    {{synced?'check_box':'check_box_outline_blank'}}
                </i>
                <span>SYNC</span>
            </div>
        </div>
        <div class="history-list" ref="history-list" @scroll="onScroll">
            <div v-show="!end && moves.length==0" class="empty-history">No Moves Yet</div>
            <div v-for="(move, index) in moves" :key="index" class="history-item">
                <span>{{(index+1).toString().padStart(3, "0")}}:</span>
                <color-tag :color="turn(index)"></color-tag>
                <span>{{format(move)}}</span>
            </div>
            <div v-show="end" class="history-item">
                <span>RESULT:</span>
                <color-tag v-show="Winner!='.'" :color="Winner"></color-tag>
                <span v-show="Winner!='.'">WON</span>
                <span v-show="Winner=='.'">DRAW</span>
            </div>
        </div>
    </div>    
</template>

<script lang="ts">
import Vue from 'vue'
import { Component, Prop, Ref, Watch } from 'vue-property-decorator';
import ColorTagComponent from './ColorTag.vue';
import { Move, EndGameInfo, Color } from '../../types/types';
import { PointUtility } from '../../types/point.utils';
import { FlipColor } from '../../types/color.utils';

@Component({
    components: {
        'color-tag': ColorTagComponent
    }
})
export default class HistoryComponent extends Vue {
    synced: boolean = true;
    haltUnsync: boolean = false;

    @Prop({default:Color.BLACK})
    initialTurn!: Color;

    @Prop({default:[]})
    moves!: Move[];

    @Prop()
    end?: EndGameInfo;

    @Ref('history-list')
    historyList!: HTMLDivElement;

    private format(move: Move): string {
        if(move.type == "place"){
            return `Played ${PointUtility.Format(move.point)}`;
        } else if(move.type == "pass"){
            return "Passed";
        } else if(move.type == "resign"){
            return "Resigned";
        } else {
            return "";
        }
    }

    private turn(index: number): Color {
        return index%2==0?this.initialTurn:FlipColor(this.initialTurn);
    }

    get Winner() {
        if(this.end) return this.end.winner;
        else return Color.NONE;
    }

    private onScroll(){
        if(this.haltUnsync) this.haltUnsync = false;
        else this.synced = false;
    }

    private syncClick():void {
        this.synced = !this.synced;
        this.scollToBottom();
    }

    private scollToBottom(){
        if(this.synced){
            this.haltUnsync = true;
            this.historyList.scrollTop = this.historyList.scrollHeight;
        }
    }

    @Watch('moves')
    onMoveListChange(){
        this.scollToBottom();
    }

    private mounted(){
        this.scollToBottom();
        // @ts-ignore
        new ResizeObserver(()=>{
            this.scollToBottom();
        }).observe(this.historyList);
    }
    
}
</script>

<style lang="scss" scoped>
@import '../common.scss';

.history-container {
    margin-top: 48px;
    margin-bottom: 8px;
    margin-left: 24px;
    margin-right: 24px;
    height: calc(100% - 48px - 8px);
    display: flex;
    flex-direction: column;
}

.history-header {
    flex: 0 1 auto;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 16px;
}

.history-title {
    align-self: flex-start;
    font-size: 24px;
    margin-bottom: -8px;
    user-select: none;
    color: $color1;
}

.history-sync {
    align-self: flex-end;
    background-color: $color4;
    padding: 2px;
    border-radius: 4px;
}

.history-sync > span {
    font-size: 16px;
    color: $color2;
    margin: 0;
    margin-right: 2px;
    padding: 0;
    vertical-align: middle !important;
    user-select: none;
}

.history-sync > i {
    font-size: 24px;
    color: $color2;
    margin: 0px;
    margin-right: 2px;
    padding-bottom: 1px;
    vertical-align: middle !important;
    cursor: pointer;
    user-select: none;
}

.history-sync > i:hover {
    color: $color1;
}

.history-list {
    flex: 1 1 0;
    height: 0;
    overflow-y: scroll;
}

.history-list::-webkit-scrollbar {
    width: 8px;
}
.history-list::-webkit-scrollbar-track {
    background-color: $color4;
    border-radius: 4px;
}
.history-list::-webkit-scrollbar-corner {
    background-color: transparent;
}
.history-list::-webkit-scrollbar-thumb {
    background-color: $color2;
    border-radius: 4px;
}

.history-item {
    margin: 8px;
}

.empty-history {
    width: 100%;
    padding: 32px 0;
    text-align: center;
    font-style: oblique;
    color: $color2;
}
</style>