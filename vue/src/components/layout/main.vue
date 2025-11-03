<template>
  <HeaderLayout @signout="handleSignout"/>

  <div class="content-wrapper">
    <SidebarLayout />
    <ContentLayout />
  </div>

  <div v-if="showPopup" class="popup" id="popup"></div>

</template>

<script>
import HeaderLayout from './header.vue';  
import SidebarLayout from './sidebar.vue';  
import ContentLayout from './content.vue';  
import { defineEmits, ref } from 'vue';
import apiClient from '../../js/utils/apiClient.js';
import IndexedDBDataStore from '../../js/store/datastore.js';

export default {
  name: 'MainLayout',
  components: {
    HeaderLayout,
    SidebarLayout,
    ContentLayout
  },
  setup(props, {emit}) {

    const showPopup = ref(false);

    function handleSignout() {
      console.log("Signing out (main)...");
      emit('signout');
    } 


    /**
     * Fetches complete user data from the server and persists it in IndexedDB.
     *
     * Retrieves the user"s full dataset including projects, groups, and tasks by making a GET request
     * to the "/api/all_user_data" endpoint. The response data is then stored in IndexedDB for offline use.
     * @returns {void}
     */
    async function fetchAllUserData() {
        try {
            const response = await apiClient.get('/all_user_data'); 

            const store = new IndexedDBDataStore("DataStore", 1);

            store.clean();
            if (response.data.projects) {
              store.insertProjects(response.data.projects);
            }
            if (response.data.groups) {
              store.insertTaskGroups(response.data.groups);
            }
            if (response.data.tasks) {
              store.insertTasks(response.data.tasks);
            }
        } catch (error) {
            if (error.response && error.response.status === 401) {
                emit('signout');
            } else {
                console.error("Failed to fetch all data:", error);
            }
        }
    }

    fetchAllUserData();

    return {
      handleSignout,
      showPopup
    }
  }
}
</script>