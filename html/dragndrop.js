function projectDragStart(event) {
    event.stopPropagation();
    const projectRegion = event.target;
    const projectId = projectRegion.id;
    let projectName = projectRegion.innerText;

    const payload = JSON.stringify({
        id: projectId,
        name: projectName,
    });

    event.dataTransfer.setData("application/json", payload);

    projectRegion.classList.add("dragging");
    event.dataTransfer.setDragImage(projectRegion, 0, 0);

    setTimeout(() => {
        const projectsRegion = document.getElementById("projects-region");
        projectsRegion.classList.add("drop");
        projectsRegion.addEventListener("dragover", projectListDragOver);
        projectsRegion.addEventListener("dragenter", projectListDragEnter);
        projectsRegion.addEventListener("dragleave", projectListDragLeave);
        projectsRegion.addEventListener("drop", projectListDrop);
    }, 0);
}

function projectDragEnd(event) {
    const projectRegion = event.target;
    projectRegion.classList.remove("dragging");

    const projectsRegion = document.getElementById("projects-region");
    projectsRegion.classList.remove("drop");
    projectsRegion.removeEventListener("dragover", projectListDragOver);
    projectsRegion.removeEventListener("dragenter", projectListDragEnter);
    projectsRegion.removeEventListener("dragleave", projectListDragLeave);
    projectsRegion.removeEventListener("drop", projectListDrop);

    const projectName = projectRegion.innerText;
    const projectId = projectRegion.id;

    const prevProjectRegion = projectRegion.previousElementSibling;
    const prevProjectId = prevProjectRegion?.id || null;

    const eventMessage = {
        type: "project-update",
        instance: instanceGuid,
        jwt: getCookieByName("jwtToken"),
        payload: {
            name: projectName,
            id: projectId,
            after: prevProjectId,
        },
    };

    appEvent.send(JSON.stringify(eventMessage));
}

function projectListDragOver(event) {
    event.preventDefault();
    const container = this;
    const draggingProject = document.querySelector(".dragging");

    const draggableElements = [
        ...container.querySelectorAll(
            ".project-region:not(.dragging), .project-region-selected:not(.dragging)"
        ),
    ];

    const afterElement = draggableElements.reduce(
        (closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = event.clientY - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        },
        { offset: Number.NEGATIVE_INFINITY }
    ).element;

    if (afterElement == null) {
        container.appendChild(draggingProject);
    } else {
        container.insertBefore(draggingProject, afterElement);
    }
}

function projectListDragEnter(event) {
    event.preventDefault();
}

function projectListDragLeave(event) {
    event.preventDefault();
}

function projectListDrop(event) {
    event.preventDefault();
}

function groupDragStart(event) {
    event.stopPropagation();
    const groupRegion = event.target;
    const groupId = groupRegion.id;
    let groupName = groupRegion.innerText;

    const payload = JSON.stringify({
        id: groupId,
        name: groupName,
    });

    event.dataTransfer.setData("application/json", payload);

    groupRegion.classList.add("dragging");
    event.dataTransfer.setDragImage(groupRegion, 0, 0);

    setTimeout(() => {
        const groupListRegion = document.getElementById("group-list-region");
        groupListRegion.classList.add("drop");
        groupListRegion.addEventListener("dragover", groupListDragOver);
        groupListRegion.addEventListener("dragenter", groupListDragEnter);
        groupListRegion.addEventListener("dragleave", groupListDragLeave);
        groupListRegion.addEventListener("drop", groupListDrop);
    }, 0);
}

function groupDragEnd(event) {
    const groupRegion = event.target;

    if (
        groupRegion.className != "group-region dragging" &&
        groupRegion.className != "group-region-selected dragging"
    ) {
        return;
    }

    groupRegion.classList.remove("dragging");

    const groupListRegion = document.getElementById("group-list-region");
    groupListRegion.classList.remove("drop");
    groupListRegion.removeEventListener("dragover", groupListDragOver);
    groupListRegion.removeEventListener("dragenter", groupListDragEnter);
    groupListRegion.removeEventListener("dragleave", groupListDragLeave);
    groupListRegion.removeEventListener("drop", groupListDrop);

    const groupId = groupRegion.id;
    const groupHeaderText = groupRegion.querySelector(".group-header-text");
    const groupName = groupHeaderText.textContent;
    const projectId = document.querySelector(".project-region-selected").id;

    const prevGroupRegion = groupRegion.previousElementSibling;
    const prevGroupId = prevGroupRegion?.id || null;

    const eventMessage = {
        type: "group-update",
        instance: instanceGuid,
        jwt: getCookieByName("jwtToken"),
        payload: {
            name: groupName,
            id: groupId,
            projectid: projectId,
            after: prevGroupId,
        },
    };

    appEvent.send(JSON.stringify(eventMessage));
}

function groupListDragOver(event) {
    event.preventDefault();
    const draggingGroup = document.querySelector(".dragging");
    const container = this;
    const containerRect = container.getBoundingClientRect();

    // Calculate relative Y position within container
    const relY = event.clientY - containerRect.top;

    // Get all non-dragging group elements
    const groupRegions = [
        ...container.querySelectorAll(
            ".group-region:not(.dragging), .group-region-selected:not(.dragging)"
        ),
    ];

    // Find closest group element or determine if we're at the end
    let closestGroupRegion = null;
    let closestOffset = Number.NEGATIVE_INFINITY;
    let shouldAppend = true; // Default to appending if below all elements

    groupRegions.forEach((groupRegion) => {
        const rect = groupRegion.getBoundingClientRect();
        const groupCenter = rect.top + rect.height / 2 - containerRect.top;
        const offset = relY - groupCenter;

        if (offset < 0) {
            // Dragging above this element's center
            if (offset > closestOffset) {
                closestOffset = offset;
                closestGroupRegion = groupRegion;
            }
            shouldAppend = false;
        } else if (relY > rect.bottom - containerRect.top) {
            // Dragging below this element
            shouldAppend = true;
        } else {
            shouldAppend = false;
        }
    });

    // Insert at appropriate position
    if (closestGroupRegion) {
        container.insertBefore(draggingGroup, closestGroupRegion);
    } else if (shouldAppend || groupRegions.length > 0) {
        // If dragging below last element, append
        container.appendChild(draggingGroup);
    } else {
        // Default to prepending
        container.insertBefore(draggingGroup, container.firstChild);
    }
}

function groupListDragEnter(event) {
    event.preventDefault();
}

function groupListDragLeave(event) {
    event.preventDefault();
}

function groupListDrop(event) {
    event.preventDefault();
}

function taskDragStart(event) {
    event.stopPropagation();
    const taskRegion = event.target;
    const taskId = taskRegion.id;
    let taskText = null;
    const taskPre = taskRegion.querySelector(".task-pre");
    if (taskPre != null) {
        taskText = taskPre.innerText;
    } else {
        const taskInlineInput = taskRegion.querySelector(".task-inline-input");
        taskText = taskInlineInput.value;
    }

    const payload = JSON.stringify({
        id: taskId,
        text: taskText,
    });

    event.dataTransfer.setData("application/json", payload);

    taskRegion.classList.add("dragging");
    event.dataTransfer.setDragImage(taskRegion, 0, 0);

    setTimeout(() => {
        const taskLists = document.querySelectorAll(".task-list-region");

        taskLists.forEach((taskList) => {
            taskList.classList.add("drop");
            taskList.addEventListener("dragover", taskListDragOver);
            taskList.addEventListener("dragenter", taskListDragEnter);
            taskList.addEventListener("dragleave", taskListDragLeave);
            taskList.addEventListener("drop", taskListDrop);
        });
    }, 0);
}

function taskDragEnd(event) {
    const taskRegion = event.target;
    taskRegion.classList.remove("dragging");

    const taskLists = document.querySelectorAll(".task-list-region");

    taskLists.forEach((taskList) => {
        taskList.classList.remove("drop");
        taskList.removeEventListener("dragover", taskListDragOver);
        taskList.removeEventListener("dragenter", taskListDragEnter);
        taskList.removeEventListener("dragleave", taskListDragLeave);
        taskList.removeEventListener("drop", taskListDrop);
    });

    const taskId = taskRegion.id;
    const taskStatus = taskRegion.dataset.status;
    const taskPre = taskRegion.querySelector(".task-pre");
    let taskText = null;
    if (taskPre != null) {
        taskText = taskPre.innerText;
    } else {
        const taskInlineInput = taskRegion.querySelector(".task-inline-input");
        taskText = taskInlineInput.value;
    }

    const taskGroupRegion =
        taskRegion.parentElement.parentElement.parentElement;
    const groupId = taskGroupRegion.id;
    const prevTaskRegion = taskRegion.previousElementSibling;
    let prevTaskId = null;
    if (prevTaskRegion != null) {
        prevTaskId = prevTaskRegion.id;
    }

    const eventMessage = {
        type: "task-update",
        instance: instanceGuid,
        jwt: getCookieByName("jwtToken"),
        payload: {
            text: taskText,
            id: taskId,
            group: groupId,
            status: taskStatus,
            after: prevTaskId,
        },
    };

    appEvent.send(JSON.stringify(eventMessage));
}

function taskListDragOver(event) {
    event.preventDefault();
    const draggingTask = document.querySelector(".dragging");
    const afterTask = getDragAfterElement(this, event.clientY);

    if (afterTask) {
        this.insertBefore(draggingTask, afterTask);
    } else {
        this.appendChild(draggingTask);
    }
}

function taskListDragEnter(event) {
    event.preventDefault();
}

function taskListDragLeave(event) {
    event.preventDefault();
}

function taskListDrop(event) {
    event.preventDefault();
}
