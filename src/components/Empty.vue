<template>
  <view class="empty-container">
    <view class="empty-icon">📭</view>
    <text class="empty-text">{{ text }}</text>
    <slot></slot>
  </view>
</template>

<script setup lang="ts">
interface Props {
  text?: string;
}

const props = withDefaults(defineProps<Props>(), {
  text: '暂无数据'
});
</script>

<style lang="scss" scoped>
.empty-container {
  padding: 100rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 20rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}
</style>
