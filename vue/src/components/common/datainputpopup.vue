<template>
  <div class="modal-overlay">
    
    <div class="modal-content">
      <h2 class="modal-header">{{ title }}</h2>

      <form @submit.prevent="handleSave" @keydown="handleKeydown" class="modal-form" >
        
        <div v-for="(field, index) in fields" :key="field.name" class="form-field">
          <label :for="field.name">{{ field.label || field.name }}:</label>
          <input
            :id="field.name"
            :autofocus="index === 0"
            class="input-field"
            type="text"
            v-model="formData[field.name]"
            required
            ref="inputRef"
          />
        </div>

        <div class="modal-actions">
          <button type="button" @click="handleCancel" class="btn btn-cancel">
            Cancel
          </button>
          <button type="submit" class="btn btn-save">
            Save
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { defineProps, ref, watch, defineEmits, nextTick } from 'vue';

export default {
  name: 'DataInputPopup',
  
  props: {
    title: {
      type: String,
      default: 'Input Data',
    },
    fields: {
      type: Array,
      required: true,
    },
  },
  
  emits: ['data-saved', 'cancel'],

  setup(props, { emit }) {
    
    const formData = ref({});
    const inputRef = ref([]);
    const formRef = ref(null);

    watch(() => props.fields, (newFields) =>{
      formData.value = {};
      if (newFields && newFields.length > 0) {
            newFields.forEach(field => {
                formData.value[field.name] = field.default;
            });
            nextTick(() => {
                if (inputRef.value.length > 0 && inputRef.value[0]) {
                    inputRef.value[0].focus();
                } else {
                    console.warn("Could not focus the first input element.");
                }
            });
        } else {
             console.warn("DataInputPopup initialized with no fields defined."); 
        }
      
    }, { immediate: true});

    function handleSave() {
      emit('data-saved', { ...formData.value });
    }

    function handleCancel() {
      emit('cancel', null);
    }

    function handleKeydown(event) {
      if (event.key === "Enter") {
        console.log("Enter key pressed");
        event.preventDefault();
        event.stopPropagation();
        handleSave();
      }
    }

    return {
      formData,
      inputRef,
      handleSave,
      handleCancel,
      handleKeydown
    };
  }
}
</script>
