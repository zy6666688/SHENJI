<template>
  <view class="loading-container" v-if="show">
    <view class="loading-content">
      <view class="spinner"></view>
      <text class="loading-text">{{ text }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  show?: boolean;
  text?: string;
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  text: '加载中...'
});
</script>

<style lang="scss" scoped>
.loading-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-content {
  background: rgba(0, 0, 0, 0.7);
  padding: 40rpx 60rpx;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.spinner {
  width: 60rpx;
  height: 60rpx;
  border: 6rpx solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  margin-top: 20rpx;
  color: #fff;
  font-size: 28rpx;
}
</style>
