<template>
  <div 
    class="more-options-container"
    :class="{ 'is-active': isMenuOpen }"
    @click.stop="toggleMenu"
    v-click-outside="closeMenu"
    ref="buttonRef"
  >
    <div class="more-options-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <Teleport to="body">
      <ContextMenu 
        v-if="isMenuOpen" 
        :menu-items="menuItems"
        @item-clicked="handleItemClicked"
        :position="menuPosition"
      />
    </Teleport>
  </div>
</template>

<script>
import { ref, defineProps, defineEmits, nextTick } from 'vue';
import ContextMenu from './context-menu.vue';

const vClickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = function (event) {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event, el);
      }
    };
    document.body.addEventListener('click', el.clickOutsideEvent);
  },
  unmounted(el) {
    document.body.removeEventListener('click', el.clickOutsideEvent);
  },
};

export default {
  name: 'MoreOptionsButton',
  components: {
    ContextMenu
  },
  directives: {
    'click-outside': vClickOutside,
  },
  props: {
    menuItems: {
      type: Array,
      required: true,
      // Structure example:
      // [{ label: 'Edit', action: handleEdit }, { label: 'Delete', action: handleDelete }]
    },
    sourceId: {
      type: String,
      required: false
    }
  },
  setup(props, { emit }) {
    const isMenuOpen = ref(false);
    const buttonRef = ref(null);
    const menuPosition = ref({top: '0px', left: '0px'});

    const calculatePosition = () => {
      if (buttonRef.value) {
        const rect = buttonRef.value.getBoundingClientRect();
        const top = rect.bottom + window.scrollY;
        const left = rect.right + window.scrollX; 
        menuPosition.value = { 
            top: `${top + 5}px`,
            left: `${left}px`, 
        };
      }
    };

    const toggleMenu = async () => {
      isMenuOpen.value = !isMenuOpen.value;
      await nextTick();
      calculatePosition();
    };

    const closeMenu = () => {
      isMenuOpen.value = false;
    };

    const handleItemClicked = (item) => {
      closeMenu();
      if (typeof item.action === 'function') {
        item.action(props.sourceId);
      }
      emit('action-executed', item.label);
    };

    return {
      isMenuOpen,
      buttonRef,
      menuPosition,
      toggleMenu,
      closeMenu,
      handleItemClicked
    };
  }
};
</script>