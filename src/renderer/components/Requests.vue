<template>
    <div class="requests-container">
        <div class="requests-header">
            <div class="requests-title">
                <span class="requests-title-text">REQUESTS</span>
                <span class="requests-count">{{requests.length}}</span>
            </div>
            <i class="requests-burger material-icons" @click="toggleExpansion">
                menu
            </i>
        </div>
        <transition name="collapse">
            <div class="requests-list" v-show="expanded">
                <div v-for="(request, index) in requests" :key="index" class="request-item">
                    <div :class="['request-marker', index%2==0?'dark':'light']"></div>
                    <div class="request-name">{{request.name}}</div>
                    <div class="request-ip">{{request.ip}}</div>
                    <div class="request-buttons">
                        <div class="request-accept-button" v-show="free[0]" @click="accept(request, 0)">
                            <i class="material-icons">
                                check
                            </i>
                            <span>1</span>
                        </div>
                        <div class="request-accept-button" v-show="free[1]" @click="accept(request, 1)">
                            <i class="material-icons">
                                check
                            </i>
                            <span>2</span>
                        </div>
                        <div class="request-reject-button" @click="reject(request)">
                            <i class="material-icons">
                                close
                            </i>
                        </div>
                    </div>
                </div>
            </div>
        </transition>
    </div>    
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop } from 'vue-property-decorator';

interface Request {
    name:string,
    ip:string
};

@Component
export default class RequestsComponent extends Vue {
    expanded: Boolean = false;
    requests: Request[] = [
        {name: "Spartans", ip:"127.0.0.1"},
        {name: "Exodia", ip:"192.256.0.16"},
        {name: "Dragon Warrior", ip:"132.90.121.13"},
        {name: "PewDiePie", ip:"666.666.666.666"}
    ];
    free: boolean[] = [true, true];

    private toggleExpansion() : void {
        this.expanded = !this.expanded;
    }

    private accept(request: Request, player: number){}
    private reject(request: Request){}
}
</script>

<style lang="scss" scoped>
@import '../common.scss';

.requests-container {
    margin: 16px;
    padding: 8px 16px 8px 16px;
    border-radius: 10px;
    background-color: $color1;
    box-shadow: 0 0 5px 0 #00000044;
    display: flex;
    flex-direction: column;
}

.requests-header {
    flex: 0 1 auto;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
}

.requests-title {
    align-self: flex-start;
    font-size: 14px;
    vertical-align: middle;
    user-select: none;
    color: $color4;
}

.requests-title-text {
    vertical-align: middle;
    user-select: none;
}

.requests-count {
    font-size: 12px;
    font-weight: bold;
    text-align: center;
    vertical-align: middle;
    display: inline-block;
    width: 30px;
    height: 14px;
    user-select: none;
    background-color: $color4;
    border-radius: 10px;
    color: $color1;
    margin-left: 8px;
}

.requests-burger {
    align-self: flex-end;
    vertical-align: middle;
    margin-top: -4px;
    cursor: pointer;
    user-select: none;
    color: $color3;
}

.requests-burger:hover {
    color: $color5;
}

.requests-list {
    flex: 1 1 auto;
    height: 160px;
    overflow-y: scroll;
    margin-top: 8px;
}

.collapse-enter-active, .collapse-leave-active {
  transition: height .5s;
}

.collapse-enter, .collapse-leave-to {
  height: 0;
}

.requests-list::-webkit-scrollbar {
    width: 8px;
}
.requests-list::-webkit-scrollbar-track {
    background-color: $color4;
    border-radius: 4px;
}
.requests-list::-webkit-scrollbar-corner {
    background-color: transparent;
}
.requests-list::-webkit-scrollbar-thumb {
    background-color: $color2;
    border-radius: 4px;
}

.request-item {
    display: grid;
    grid-template-columns: 8px 120px 120px;
    grid-template-rows: 24px 24px;
    grid-template-areas:
    'marker name name'
    'marker ip buttons';
    width: 248px;
    height: 48px;
    font-size: 14px;
    color: $color5;
}

.request-marker {
    grid-area: marker;
    border-radius: 4px; 
}
.request-marker.dark {
    background-color: $color2;
}
.request-marker.light {
    background-color: $color4;
}

.request-name {
    grid-area: name;
    padding: 4px 0px 4px 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.request-ip {
    grid-area: ip;
    padding: 4px 0px 4px 8px;
}

.request-buttons {
    grid-area: buttons;
    text-align: end;
}

.request-accept-button {
    background-color: $color3;
    border-radius: 10px;
    color: $color1;
    width: 36px;
    height: 20px;
    display: inline-block;
    text-align: center;
    vertical-align: middle;
}

.request-accept-button:hover {
    background-color: $color5;
}

.request-reject-button {
    background-color: $color3;
    border-radius: 10px;
    color: $color1;
    width: 20px;
    height: 20px;
    display: inline-block;
    text-align: center;
    vertical-align: middle;
}

.request-reject-button:hover {
    background-color: $color5;
}

.request-accept-button > i {
    font-size: 16px;
    vertical-align: middle !important;
    cursor: pointer;
    user-select: none;
    margin-top: 1px;
}

.request-reject-button > i {
    font-size: 16px;
    vertical-align: middle !important;
    cursor: pointer;
    user-select: none;
    margin-top: 1px;
}

.request-accept-button > span {
    font-size: 14px;
    vertical-align: middle !important;
    user-select: none;
    margin-left: -2px;
    margin-right: 2px;
    margin-top: 4px;
}

</style>