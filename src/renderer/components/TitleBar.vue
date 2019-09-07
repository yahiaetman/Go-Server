<template>
    <div class="title-bar">
        <i class="title-button material-icons md-24" @click="minimize">remove</i>
       <!-- <i class="title-button material-icons md-24" @click="maximize">aspect_ratio</i> -->
        <i class="title-button material-icons md-24" @click="close">close</i>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop } from 'vue-property-decorator';
import Electron, { BrowserWindow } from 'electron';

@Component
export default class TitleBarComponent extends Vue {
    
    private close() : void { 
        Electron.remote.getCurrentWindow().close();
    }
    
    private minimize() : void {
        Electron.remote.getCurrentWindow().minimize();
    }
    
    private maximize() : void {
        //TODO: See if this can be done better
        const window: BrowserWindow = Electron.remote.getCurrentWindow();
        if(window.isMaximized()){
            window.unmaximize();    
        } else {
            window.maximize();
        }
    }
    
}
</script>

<style lang="scss" scoped>
@import '../common.scss';

.title-bar {
    position: fixed;
    overflow: hidden;
    top: 0;
    left: 0;
    right: 25px;
    z-index: 999;
    padding-top: 10px;
    padding-right: 10px;
    height: 24px;
    -webkit-user-select: none;
    cursor: default;
    pointer-events: none;
    -webkit-app-region: drag;
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
}

.title-button {
    @extend .md-dark;
    -webkit-app-region: no-drag;
    cursor: default;
    pointer-events: all;
    margin-left: 7px;
}

.title-button:hover {
    color: $color2;
}

.title-button:active {
    color: $color1;
    text-shadow: 0px 0px 5px #00000022;
}
</style>