<template>
  <ul 
    class="context-menu"
    :style="menuStyle">    
    <li 
      v-for="(item, index) in menuItems"
      :key="index"
      @click.stop="handleItemClick(item)"
    >
      {{ item.label }}
    </li>
  </ul>
</template>

<script>
import { defineProps, defineEmits, computed } from 'vue';

export default {
  name: 'ContextMenu',
  props: {
    menuItems: {
      type: Array,
      required: true
    },
    position: {
      type: Object,
      default: () => ({top: '0px', left: '0px'})
    }
  },
  setup(props, { emit }) {
    const menuStyle = computed(() => ({
      top: props.position.top,
      left: props.position.left,
      transform: 'translateX(-100%)'
    }));

    const handleItemClick = (item) => {
      emit('item-clicked', item);
    };

    return {
      handleItemClick,
      menuStyle
    };
  }
};
</script>

