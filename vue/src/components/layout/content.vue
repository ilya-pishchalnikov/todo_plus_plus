<template>
    <main class="main-content">
      <GroupsComponent />
    </main>
</template>

<script>
import GroupsComponent from '../business/groups.vue';
export default {
  name: 'ContentLayout',
  components: {
    GroupsComponent
  },
  setup(props, { emit }) {

    return {
    }
  }
}
</script>