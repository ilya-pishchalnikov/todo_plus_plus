<template>
    <div class="add-button-container">
      <div 
        class="add-button" 
        @click="addItem"
        @mouseenter="startHover"
        @mouseleave="resetHover"
        :class="{'expanded': isExpanded, 'expanding': isExpanding, 'collapsing': isCollapsing}"
        :title="text"
      >
        <span class="plus-sign">+</span>
        <span class="button-text" v-if="isExpanded">{{ text }}</span>
      </div>
    </div>
</template>

<script>
import { defineEmits, ref } from 'vue';

export default {
  name: 'AddItemComponent',
  props: {
    text: {
      type: String,
      default: 'Add element'
    },
  },
  setup(props, { emit }) {
    const isExpanded = ref(false);
    const isExpanding = ref(false);
    const isCollapsing = ref(false);

    let hoverTimeout = null;
    let collapseTimeout = null;

    function addItem() {
      emit('add-item');
    }

    function startHover() {
      if (collapseTimeout) {
        clearTimeout(collapseTimeout);
        collapseTimeout = null;
        isCollapsing.value = false;
      }

      hoverTimeout = setTimeout(() =>{
        isExpanding.value = true;
        setTimeout(() => {
          isExpanded.value=true;
          isExpanding.value.false;
        }, 300);
      }, 300);      
    }

    function resetHover() {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
      }
      
      if (isExpanded || isExpanding) {
        isExpanding.value = false;
        isCollapsing.value = true;

        collapseTimeout = setTimeout(() => {
          isExpanded.value = false;
          isCollapsing.value = true;
        }, 300);
      }
    }

    return {
      addItem,
      isExpanded,
      startHover,
      resetHover
    }
  }
}
</script>