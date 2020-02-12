<template>
  <div :class="['tag', { black: IsBlack }, { white: !IsBlack }]">
    {{ IsBlack ? 'BLACK' : 'WHITE' }}
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Component, Prop } from 'vue-property-decorator';
import { Color } from '../../types/types';

@Component
/**
 * The color tag component
 * @class
 */
export default class ColorTagComponent extends Vue {
  // eslint-disable-next-line new-cap
  @Prop()
  color!: Color;

  /**
   * Gets whether the tag is Black
   * @return {boolean}
   */
  get IsBlack(): Boolean {
    return this.color == Color.BLACK;
  }
}
</script>

<style lang="scss" scoped>
@import '../variables.scss';

.tag {
  border-radius: 10px;
  width: 80px;
  font-size: 16px;
  font-weight: bold;
  box-shadow: 0 0 5px 0 #00000044;
  text-align: center;
  display: inline-block;
}

.tag.black {
  background-color: $color1;
  color: $color5;
}

.tag.white {
  background-color: $color5;
  color: $color1;
}
</style>
