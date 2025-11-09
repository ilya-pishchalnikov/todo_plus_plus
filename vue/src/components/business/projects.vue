<template>
  <div class="projects-region" id="projects-region">
    <div v-for="project in projects" :key="project.id" :id="project.id" :class="{
      'project-region': project.id !== selectedProjectId,
      'project-region-selected': project.id === selectedProjectId
    }" @click="onProjectClick">
      <span>{{ project.name }}</span>
      <MoreOptionsButton :menu-items="projectMenuItems" :source-id="project.id" />
    </div>
  </div>
  <AddItemComponent @add-item="addProject" :text="'Add Project'"  />
</template>

<script>
import { ref, inject, watch, computed, defineEmits } from 'vue';
import AddItemComponent from '../common/additembutton.vue';
import { modalService } from '../../js/store/modal-service.js';
import { getBrowserInstanceId } from '../../js/utils/utils.js';
import { AppEventKey } from '../../js/event/appevent-service.js';
import { DataStoreKey } from '../../js/store/datastore-service.js';
import MoreOptionsButton from '../common/more-options-button.vue';

export default {
  name: 'ProjectsComponent',
  components: {
    AddItemComponent,
    MoreOptionsButton
  },
  setup(props, { emit }) {


    const projects = ref([]);
    const selectedProjectId = ref('');
    const projectFields = [
      { name: 'name', label: 'Project Name' }
    ];
    const { instance: appEventInstance } = inject(AppEventKey);
    const { instance: dataStore, isReady } = inject(DataStoreKey);
    const projectMenuItems = computed(() => [
      { label: 'Add', action: addProject },
      { label: 'Rename', action: renameProject },
      { label: 'Remove', action: removeProject },
      { label: 'Move Up', action: moveUpProject},
      { label: 'Move Down', action: moveDownProject}
    ]);
    const browserInstance = getBrowserInstanceId();

    appEventInstance.onProjectAdd = onProjectAddEventRecieved;
    appEventInstance.onProjectDelete = onProjectDeleteEventRecieved;
    appEventInstance.onProjectUpdate = onProjectUpdateEventRecieved;

    watch (()=>selectedProjectId.value, (newSelectedProjectId)=> {
      emit('project-selected', newSelectedProjectId);
    });


    async function onProjectAddEventRecieved(eventPayload) {
      await dataStore.upsertProject(eventPayload);
      await getAllProjects();
      selectedProjectId.value = eventPayload.id;
    }

    async function onProjectDeleteEventRecieved(eventPayload) {
      await dataStore.delete("project",eventPayload.id);
      await getAllProjects();
      if (selectedProjectId.value === eventPayload.id) {
        if (projects.value.length === 0) {
          selectedProjectId.value = "";
        } else {
          selectedProjectId.value = eventPayload.after;
        }
      }
    }

    async function onProjectUpdateEventRecieved (eventPayload) {
      await dataStore.upsertProject(eventPayload);
      await getAllProjects();
    }

    async function getAllProjects() {
      if (isReady.value === false) {
        console.warn("ProjectsComponent: DataStore is not ready yet.");
      } else {
        await dataStore.getProjects().then((storedProjects) => {
          projects.value = storedProjects;
          projects.value.sort((a, b) => a.sequence - b.sequence);
          if (selectedProjectId.value === "" && projects.value.length > 0) {
            selectedProjectId.value = projects.value[0].id || '';
          }           
          if (projects.value.length === 0){
            selectedProjectId.value = '';
          }
        });
      }
    }

    watch(isReady, (isReady) => {
      if (isReady === true) {
          getAllProjects();
      }
    }, { immediate: true });

    function onProjectClick(e) {
      const clickedElement = e.target;
      let clickedProjectId = '';

      if (clickedElement.tagName === "SPAN") {
        clickedProjectId = clickedElement.parentElement.id;
      } else {
        clickedProjectId = clickedElement.id;
      }

      if (selectedProjectId.value !== clickedProjectId) {
        selectedProjectId.value = clickedProjectId;
      }
    }

    async function renameProject(projectId) {
      try {
        const project = projects.value.find(project => project.id === projectId);

        const renameProjectFields = [
          { name: 'name', label: 'Project Name', default: project.name }
        ];

        const result = await modalService.openModal(
          "Rename Project", renameProjectFields
        );

        if (result) {
          let prevProjectId;
          let currentProjectId;

          for (let project of projects.value) {
            if (project.id === projectId) {
              currentProjectId = project.id;
              break;
            }
            prevProjectId = project.id;
          }

          const eventPayload = {
            id: currentProjectId,
            name: result.name,
            after: prevProjectId
          };

          const eventData = {
            type: "project-update",
            instance: browserInstance,
            payload: eventPayload
          };

          const eventDataJson = JSON.stringify(eventData);

          appEventInstance.send(eventDataJson);
        }

      } catch (error) {
        console.error('Error in modal:', error);
      }
    }

    function removeProject(projectId) {
      let prevProjectId = "";
      let projectName = "";

      for (const project of projects.value) {
        if (project.id === projectId) {
          projectName = project.name;
          break;
        }
        prevProjectId = project.id;
      };

      const eventPayload = {
        id: projectId,
        name: projectName,
        after: prevProjectId
      }

      const event = {
        type: "project-delete",
        instance: browserInstance,
        payload: eventPayload
      }

      const eventJson = JSON.stringify(event);

      appEventInstance.send(eventJson);
    }


    async function addProject(prevProjectId) {
      try {
        const result = await modalService.openModal(
          "Add Project", projectFields
        );

        if (result) {

          const eventPayload = {
            id: window.crypto.randomUUID(),
            name: result.name,
            after: prevProjectId || projects.value[projects.value.length - 1]?.id || '',
          };

          const eventData = {
            type: "project-add",
            instance: browserInstance,
            payload: eventPayload
          };

          const eventDataJson = JSON.stringify(eventData);prevPrevProjectId

          appEventInstance.send(eventDataJson);
        }

      } catch (error) {
        console.error('Error in modal:', error);
      }
    }

    async function moveUpProject(projectId) {
      let prevProjectId;
      let prevPrevProjectId;
      let currentProject;

      for (let project of projects.value) {
        if (project.id === projectId) {
          currentProject = project;
          break;
        }
        prevPrevProjectId = prevProjectId;
        prevProjectId = project.id;
      }

      const eventPayload = {
        id: currentProject.id,
        name: currentProject.name,
        after: prevPrevProjectId
      };

      const eventData = {
        type: "project-update",
        instance: browserInstance,
        payload: eventPayload
      };

      const eventDataJson = JSON.stringify(eventData);

      appEventInstance.send(eventDataJson);
    }

    async function moveDownProject(projectId) {
      let currentProject;
      let nextProjectId = "";
      let prevPrevProjectId;

      for (let project of projects.value) {
        if (currentProject) {
          nextProjectId = project.id;
          break;
        }
        if (project.id === projectId) {
          currentProject = project;
        }
        if (!currentProject) {
          prevPrevProjectId = project.id;
        }
      }

      const eventPayload = {
        id: currentProject.id,
        name: currentProject.name,
        after: nextProjectId || prevPrevProjectId
      };

      const eventData = {
        type: "project-update",
        instance: browserInstance,
        payload: eventPayload
      };

      const eventDataJson = JSON.stringify(eventData);

      appEventInstance.send(eventDataJson);
    }



    return {
      projects,
      selectedProjectId,
      onProjectClick,
      addProject,
      projectMenuItems
    }
  }
}
</script>