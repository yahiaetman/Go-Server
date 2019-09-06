<template>
    <div class="requests-container">
    </div>    
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop } from 'vue-property-decorator';

@Component
export default class RequestsComponent extends Vue {
    
}
</script>

<style lang="scss" scoped>
.requests-container {
    background-color: green;
    height: 24px;
}
</style>