<template>
    <div class="window">
        <title-bar></title-bar>
        <div class="window-content">
            <div class="main-area"></div>
            <div class="side-area">
                <div class="history-area">
                    <history></history>
                </div>
                <div class="requests-area">
                    <requests></requests>
                </div>
            </div>
        </div>
    </div>  
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop } from 'vue-property-decorator';
import TitleBarComponent from './TitleBar.vue';
import HistoryComponent from './History.vue';
import RequestsComponent from './Requests.vue';
import { importDeclaration } from '@babel/types';

@Component({
    components:{
        'title-bar': TitleBarComponent,
        'history': HistoryComponent,
        'requests': RequestsComponent
    }
})
export default class AppComponent extends Vue {
}
</script>

<style lang="scss" scoped>
@import "../variables.scss";

.window {
    background-color: $color4;
    margin: 0%;
    position: absolute; top: 0; right: 25px; bottom: 25px; left: 0;
    box-shadow: 5px 5px 20px 0px #00000088;
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
    grid-area: 'main';
}

.side-area {
    grid-area: 'side';
    background-color: $color3;
    border-radius: 0px 10px 10px 0px;
    display: flex;
    flex-direction: column;
}

.history-area {
    flex: 1 1 0;
    height: 0;
}

.requests-area {
    flex: 0 1 auto;
}

</style>