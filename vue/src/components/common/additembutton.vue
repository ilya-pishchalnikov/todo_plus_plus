<template>
    <div class="add-button-container">
      <div 
        class="add-button" 
        @click="addItem"
        title="Добавить новый элемент"
      >
        <span class="plus-sign">+</span>
      </div>
    </div>
</template>

<script>
import { defineEmits, ref } from 'vue';

export default {
  name: 'AddItemComponent',
  setup(props, { emit }) {

    function addItem() {
      emit('add-item');
    }

    return {
      addItem
    }
  }
}
</script>