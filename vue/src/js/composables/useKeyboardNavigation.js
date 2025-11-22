import { onMounted, onUnmounted } from 'vue';
import { modalService } from '../store/modal-service.js';

export function useKeyboardNavigation(
    selectedElementType,
    sidebarRef,
    contentRef
) {

    function handleKeydown(event) {
        console.log(event.key);
        if (event.key === 'Escape') {
            if (modalService.state.isVisible) {
                modalService.handleCancel();
            } else {
                navigateOut();
            }
        }

        if (event.key === "ArrowUp") {
            navigatePrevious();
        }

        if (event.key === "ArrowDown") {
            navigateNext();
        }

        if (event.key === "ArrowLeft") {
            navigateOut();
        }

        if (event.key === "ArrowRight") {
            navigateInto();
        }

        if (event.key === "Enter") {
            event.preventDefault();
            navigateEdit();
        }
    }

    function navigateInto() {
        if (selectedElementType.value === "project") {
            selectedElementType.value = sidebarRef.value.navigateIntoProject();
            if (selectedElementType.value === "group") {
                contentRef.value.navigateIntoGroup();
            }
        } else if (selectedElementType.value === "group") {
            selectedElementType.value = contentRef.value.navigateIntoTask();
        }
    }

    function navigateOut() {
        if (selectedElementType.value === "group") {
            contentRef.value.navigateOutGroup();
            selectedElementType.value = "project";
            sidebarRef.value.scrollToSelectedProject();
        }
        if (selectedElementType.value === "task") {
            contentRef.value.navigateOutTask();
            selectedElementType.value = "group";
        }
    }

    function navigateNext() {
        if (selectedElementType.value === "project") {
            sidebarRef.value.selectNextProject();
        } else if (selectedElementType.value === "group") {
            contentRef.value.navigateNextGroup();
        } else if (selectedElementType.value === "task") {
            contentRef.value.navigateNextTask();
        }
    }

    function navigatePrevious() {
        if (selectedElementType.value === "project") {
            sidebarRef.value.selectPreviousProject();
        } else if (selectedElementType.value === "group") {
            contentRef.value.navigatePreviousGroup();
        } else if (selectedElementType.value === "task") {
            contentRef.value.navigatePreviousTask();
        }
    }

    function navigateEdit() {
        if (selectedElementType.value === "project") {
            sidebarRef.value.editProject();
        } else if (selectedElementType.value === "group") {
            contentRef.value.editGroup();
        } else if (selectedElementType.value === "task") {
            contentRef.value.editTask();
        }
    }
    return {
        handleKeydown
    };
}
