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
        <div class="history-list">
            <div v-for="(move, index) in moves" :key="index" class="history-item">
                <span>{{(index+1).toString().padStart(3, "0")}}:</span>
                <color-tag :color="index%2==0?'B':'W'"></color-tag>
                <span>{{format(move)}}</span>
            </div>
        </div>
    </div>    
</template>

<script lang="ts">
import Vue from 'vue'
import { Component, Prop } from 'vue-property-decorator';
import ColorTagComponent from './ColorTag.vue';
import Move from '../../types/move';

@Component({
    components: {
        'color-tag': ColorTagComponent
    }
})
export default class HistoryComponent extends Vue {
    synced: boolean = true;

    moves: Move[] = [
        {type: "play", point:{row:0, column:0}},
        {type: "play", point:{row:3, column:11}},
        {type: "play", point:{row:11, column:5}},
        {type: "pass"},
        {type: "play", point:{row:18, column:17}},
        {type: "resign"},
    ];
    
    private syncClick():void {
        this.synced = !this.synced;
    }

    private format(move: Move): string {
        if(move.type == "play"){
            let column: string = ['A','B','C','D','E','F','G','H','J','K','L','M','N','O','P','Q','R','S','T'][move.point.column];
            return `Played ${column}${move.point.row+1}`;
        } else if(move.type == "pass"){
            return "Passed";
        } else if(move.type == "resign"){
            return "Resigned";
        } else {
            return "";
        }
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
</style>