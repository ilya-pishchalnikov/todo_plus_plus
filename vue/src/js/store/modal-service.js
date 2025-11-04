import { reactive, readonly } from 'vue';

const state = reactive({
  isVisible: false,
  title: '',
  fields: [],
  resolver: null,
});


function openModal(title, fields) {
  return new Promise((resolve) => {
    state.title = title;
    state.fields = fields;
    state.isVisible = true;
    
    state.resolver = resolve;
  });
}

function close(data) {
  if (state.resolver) {
    state.resolver(data);
  }

  state.isVisible = false;
  state.title = '';
  state.fields = [];
  state.resolver = null;
}

export const modalService = {
  state: readonly(state), 
  openModal,
  handleSave: (data) => close(data), 
  handleCancel: () => close(null),
};