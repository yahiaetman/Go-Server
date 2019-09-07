<template>
    <div class="status-container">
        <div class="status-text">Status Pending...</div>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop } from 'vue-property-decorator';

@Component
export default class StatusBarComponent extends Vue {
}
</script>

<style lang="scss" scoped>
@import '../common.scss';

.status-container {
    position: fixed;
    overflow: hidden;
    bottom: calc(16px + 24px);
    left: 24px;
    right: calc(330px + 24px + 24px);
    z-index: 999;
    height: 30px;
    border-radius: 10px;
    background-color: $color3;
    vertical-align: middle;
    
}

.status-text {
    color: $color2;
    font-size: 14px;
    margin: 7px 0px 0px 8px;
}
</style>