<template>
  <div class="projects-region" id="projects-region" @dragover.prevent @drop="onDrop" @drag-over.prevent>
    <div v-for="project in projects" :key="project.id" :id="project.id" :class="{
      'project-region': project.id !== selectedProjectId,
      'project-region-selected': project.id === selectedProjectId
    }" 
      @click="onProjectClick"
      draggable="true" 
      @dragstart="onDragStart($event, project.id)"
      @dragenter.prevent
      @dragover="dragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @dragend="onDragEnd"
      >
      <span>{{ project.name }}</span>
      <MoreOptionsButton :menu-items="projectMenuItems" :source-id="project.id" />
    </div>
  </div>
  <AddItemComponent @add-item="addProject" :text="'Add Project'"  ref="addProjectComponent"/>
</template>

<script>
import { ref, inject, watch, computed, defineEmits, nextTick } from 'vue';
import AddItemComponent from '../common/additembutton.vue';
import { modalService } from '../../js/store/modal-service.js';
import { getBrowserInstanceId } from '../../js/utils/utils.js';
import { AppEventKey } from '../../js/event/appevent-service.js';
import { DataStoreKey } from '../../js/store/datastore-service.js';
import MoreOptionsButton from '../common/more-options-button.vue';
import { scrollElementIntoView } from '../../js/utils/utils.js'

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
    const draggingProjectId = ref(null);
    const addProjectComponent = ref(null);

    appEventInstance.onProjectAdd.push(onProjectAddEventRecieved);
    appEventInstance.onProjectDelete.push(onProjectDeleteEventRecieved);
    appEventInstance.onProjectUpdate.push(onProjectUpdateEventRecieved);

    watch (()=>selectedProjectId.value, (newSelectedProjectId)=> {
      emit('project-selected', newSelectedProjectId);
    });


    async function onProjectAddEventRecieved(eventPayload) {
      await dataStore.upsertProject(eventPayload);
      await getAllProjects();
      addProjectComponent.value.deselect();
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

    watch(isReady, (isReady) => {
      if (isReady === true) {
        getAllProjects();
      }
    }, { immediate: true });


    watch(selectedProjectId, () => {
      nextTick(() => {
        scrollToSelectedProject();
      });
    });

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

    function onProjectClick(e) {
      const projectId = e.target.closest('.project-region, .project-region-selected').id;
      if (projectId) {
        emit('project-clicked');
        selectedProjectId.value = projectId;
      }
    }

    function selectPreviousProject() {
      if (selectedProjectId.value) {
        let previousProjectId = "";
        for (let project of projects.value) {
          if (project.id === selectedProjectId.value) {
            break;
          }
          previousProjectId = project.id;
        }
        if (previousProjectId) {
          selectedProjectId.value = previousProjectId;
        }
      }
      else {
        if (projects.value.length > 0) {
          selectedProjectId.value = projects.value[projects.value.length - 1].id;
          addProjectComponent.value.deselect();
        }
      }
    }

    function selectNextProject() {
      if (selectedProjectId.value) {
        let nextProjectId = "";
        let currentProjectFound = false;
        for (let project of projects.value) {
          if (currentProjectFound) {
            nextProjectId = project.id;
            break;
          }
          if (project.id === selectedProjectId.value) {
            currentProjectFound = true;
          }
        }
        selectedProjectId.value = nextProjectId;
        if (!nextProjectId) {
          addProjectComponent.value.select();
        }
      }
    }

    function navigateIntoProject() {
      if (selectedProjectId.value) {
        return "group";
      } else {
        addProject();
        return "project";
      }
    }

    function editProject() {
      if (selectedProjectId.value) {
        renameProject(selectedProjectId.value);
      } else {
        addProject();
      }
    }

    function scrollToSelectedProject() {
      const element = document.getElementById(selectedProjectId.value); 
      
      if (element) {
        scrollElementIntoView(element);
      } else {
        addProjectComponent.value.scrollTo();
      }
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

          const eventDataJson = JSON.stringify(eventData);

          appEventInstance.send(eventDataJson);
        }

      } catch (error) {
        console.error('Error in modal:', error);
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



    async function moveUpProject(projectId) {
      let currentProject;
      let prevPrevProjectId = "";
      let prevProjectId = "";

      for (const project of projects.value) {
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

      for (const project of projects.value) {
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


    async function onDragStart(event, projectId) {
      draggingProjectId.value = projectId;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('projectId', projectId);
      await nextTick();
      event.target.classList.add('dragging');
      event.target.style.opacity = '0.5';
    }

    function onDragLeave(event) {
      event.target.classList.remove('drag-over');
    }

    function onDrop(event) {
      event.preventDefault();
      
      document.querySelectorAll('.dragging').forEach(el => {
        el.classList.remove('dragging');
        el.style.opacity = '1';
      });

      document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });

      const groupId = event.dataTransfer.getData('groupId');
      const sourceProjectId = event.dataTransfer.getData('sourceProjectId');
      const taskId = event.dataTransfer.getData('taskId');

      const target = event.target.closest('.project-region, .project-region-selected');
      const targetProjectId = target ? target.id : '';

      if (taskId) {
        return;
      }
      
      if (groupId) {        
        if (targetProjectId && targetProjectId !== sourceProjectId) {
          moveGroupToNewProject(groupId, targetProjectId);
        }        
        return;
      }

      const draggedId = event.dataTransfer.getData('projectId');
      
      if (!draggedId || draggedId === targetId) {
        draggingProjectId.value = null;
        return;
      }
      let newAfterId = "";
      const targetIndex = projects.value.findIndex(p => p.id === targetId);
      const draggingIndex = projects.value.findIndex(p => p.id === draggedId);

      if (draggingIndex != -1 && targetIndex != -1) {
        if (draggingIndex < targetIndex) {
          newAfterId = targetId;
        } else {
          newAfterId = projects.value[targetIndex - 1]?.id || '';
        }
      }

      moveProjectToNewPosition(draggedId, newAfterId);
      draggingProjectId.value = null;
    }
    
    async function moveGroupToNewProject(groupId, newProjectId) {
      let group;

      await dataStore.getTaskGroups().then((groups) => {
        group = groups.find(group => group.id === groupId)
      });

      const eventPayload = {
          id: group.id,
          name: group.name, 
          projectid: newProjectId,
          after: '' 
      };

      const eventData = {
          type: "group-update",
          instance: browserInstance,
          payload: eventPayload
      };

      const eventDataJson = JSON.stringify(eventData);
      appEventInstance.send(eventDataJson);
    }

    function moveProjectToNewPosition(projectId, afterId) {
      const project = projects.value.find(p => p.id === projectId);
      if (project) {
        const eventPayload = {
          id: projectId,
          name: project.name,
          after: afterId
        };

        const eventData = {
          type: "project-update",
          instance: browserInstance,
          payload: eventPayload
        };

        const eventDataJson = JSON.stringify(eventData);

        appEventInstance.send(eventDataJson);
      }
    }

    function dragOver(event) {
      event.preventDefault();
      const target = event.target.closest('.project-region, .project-region-selected');
      const isProjectDrag = event.dataTransfer.types.includes('projectId');
      const isGroupDrag = event.dataTransfer.types.includes('groupId');
      const isTaskDrag = event.dataTransfer.getData('dragType') === 'task';
      
      if (target && (isGroupDrag || isTaskDrag || (isProjectDrag && target.id !== draggingProjectId.value))) {
        document.querySelectorAll('.drag-over').forEach(el => {
          el.classList.remove('drag-over');
        });
        target.classList.add('drag-over');
      }
    }

    function onDragEnd(event) {
      event.target.classList.remove('dragging');
      event.target.style.opacity = '1';

      document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });

      draggingProjectId.value = null;
    }

    return {
      projects,
      selectedProjectId,
      addProjectComponent,
      projectMenuItems,
      onProjectClick,
      addProject,
      onDragStart,
      onDragLeave,
      onDrop,
      dragOver,
      onDragEnd,
      selectPreviousProject,
      selectNextProject,
      navigateIntoProject,
      scrollToSelectedProject,
      editProject
    }
  }
}
</script>