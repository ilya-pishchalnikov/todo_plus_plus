<template>
  <div class="modal-overlay">
    
    <div class="modal-content">
      <h2 class="modal-header">{{ title }}</h2>

      <form @submit.prevent="handleSave" class="modal-form">
        
        <div v-for="field in fields" :key="field.name" class="form-field">
          <label :for="field.name">{{ field.label || field.name }}:</label>
          <input
            :id="field.name"
            class="input-field"
            type="text"
            v-model="formData[field.name]"
            required
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
import { defineProps, ref, watch, defineEmits } from 'vue';

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

    watch(() => props.fields, (newFields) =>{
      formData.value = {};
      if (newFields && newFields.length > 0) {
            newFields.forEach(field => {
                formData.value[field.name] = '';
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

    return {
      formData,
      handleSave,
      handleCancel,
    };
  }
}
</script>
