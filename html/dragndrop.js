class DragAndDrop {
    constructor() {
        this.projectDragStart = this.projectDragStart.bind(this);
        this.projectDragEnd = this.projectDragEnd.bind(this);
        this.projectListDragOver = this.projectListDragOver.bind(this);
        this.projectListDrop = this.projectListDrop.bind(this);
        this.groupDragStart = this.groupDragStart.bind(this);
        this.groupDragEnd = this.groupDragEnd.bind(this);
        this.groupListDragOver = this.groupListDragOver.bind(this);
        this.groupListDrop = this.groupListDrop.bind(this);
        this.taskDragStart = this.taskDragStart.bind(this);
        this.taskDragEnd = this.taskDragEnd.bind(this);
        this.taskListDragOver = this.taskListDragOver.bind(this);
        this.taskListDrop = this.taskListDrop.bind(this);
    }

    projectDragStart(event) {
        event.stopPropagation();
        const projectRegion = event.target;
        const projectId = projectRegion.id;
        const projectName = projectRegion.innerText;

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
            projectsRegion.addEventListener(
                "dragover",
                this.projectListDragOver
            );
            projectsRegion.addEventListener("drop", this.projectListDrop);
        }, 0);
    }

    projectDragEnd(event) {
        const projectRegion = event.target;
        projectRegion.classList.remove("dragging");

        const projectsRegion = document.getElementById("projects-region");
        projectsRegion.classList.remove("drop");
        projectsRegion.removeEventListener(
            "dragover",
            this.projectListDragOver
        );
        projectsRegion.removeEventListener("drop", this.projectListDrop);

        const projectName = projectRegion.innerText;
        const projectId = projectRegion.id;
        const prevProjectRegion = projectRegion.previousElementSibling;
        const prevProjectId = prevProjectRegion?.id || null;

        const eventMessage = {
            type: "project-update",
            instance: instanceGuid,
            jwt: Utils.getCookieByName("jwtToken"),
            payload: {
                name: projectName,
                id: projectId,
                after: prevProjectId,
            },
        };

        appEvent.send(JSON.stringify(eventMessage));
    }

    projectListDragOver(event) {
        event.preventDefault();
        const container = event.currentTarget;
        const draggingProject = document.querySelector(".dragging");
        const afterElement = this.getDragAfterElement(
            container,
            event.clientY,
            ".project-region:not(.dragging), .project-region-selected:not(.dragging)"
        );

        if (afterElement == null) {
            container.appendChild(draggingProject);
        } else {
            container.insertBefore(draggingProject, afterElement);
        }
    }

    projectListDrop(event) {
        event.preventDefault();
    }

    groupDragStart(event) {
        event.stopPropagation();
        const groupRegion = event.target;
        const groupId = groupRegion.id;
        const groupName =
            groupRegion.querySelector(".group-header-text").textContent;

        const payload = JSON.stringify({
            id: groupId,
            name: groupName,
        });

        event.dataTransfer.setData("application/json", payload);
        groupRegion.classList.add("dragging");
        event.dataTransfer.setDragImage(groupRegion, 0, 0);

        setTimeout(() => {
            const groupListRegion =
                document.getElementById("group-list-region");
            groupListRegion.classList.add("drop");
            groupListRegion.addEventListener(
                "dragover",
                this.groupListDragOver
            );
            groupListRegion.addEventListener("drop", this.groupListDrop);
        }, 0);
    }

    groupDragEnd(event) {
        const groupRegion = event.target;
        if (!groupRegion.classList.contains("dragging")) {
            return;
        }
        groupRegion.classList.remove("dragging");

        const groupListRegion = document.getElementById("group-list-region");
        groupListRegion.classList.remove("drop");
        groupListRegion.removeEventListener("dragover", this.groupListDragOver);
        groupListRegion.removeEventListener("drop", this.groupListDrop);

        const groupId = groupRegion.id;
        const groupName =
            groupRegion.querySelector(".group-header-text").textContent;
        const projectId = document.querySelector(".project-region-selected").id;
        const prevGroupRegion = groupRegion.previousElementSibling;
        const prevGroupId = prevGroupRegion?.id || null;

        const eventMessage = {
            type: "group-update",
            instance: instanceGuid,
            jwt: Utils.getCookieByName("jwtToken"),
            payload: {
                name: groupName,
                id: groupId,
                projectid: projectId,
                after: prevGroupId,
            },
        };
        appEvent.send(JSON.stringify(eventMessage));
    }

    groupListDragOver(event) {
        event.preventDefault();
        const container = event.currentTarget;
        const draggingGroup = document.querySelector(".dragging");
        const afterElement = this.getDragAfterElement(
            container,
            event.clientY,
            ".group-region:not(.dragging)"
        );

        if (afterElement == null) {
            container.appendChild(draggingGroup);
        } else {
            container.insertBefore(draggingGroup, afterElement);
        }
    }

    groupListDrop(event) {
        event.preventDefault();
    }

    taskDragStart(event) {
        event.stopPropagation();
        const taskRegion = event.target;
        const taskId = taskRegion.id;
        const taskTextElement = taskRegion.querySelector(
            ".task-pre, .task-inline-input"
        );
        const taskText =
            taskTextElement.tagName === "PRE"
                ? taskTextElement.innerText
                : taskTextElement.value;

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
                taskList.addEventListener("dragover", this.taskListDragOver);
                taskList.addEventListener("drop", this.taskListDrop);
            });
        }, 0);
    }

    taskDragEnd(event) {
        const taskRegion = event.target;
        taskRegion.classList.remove("dragging");

        const taskLists = document.querySelectorAll(".task-list-region");
        taskLists.forEach((taskList) => {
            taskList.classList.remove("drop");
            taskList.removeEventListener("dragover", this.taskListDragOver);
            taskList.removeEventListener("drop", this.taskListDrop);
        });

        const taskId = taskRegion.id;
        const taskStatus = taskRegion.dataset.status;
        const taskTextElement = taskRegion.querySelector(
            ".task-pre, .task-inline-input"
        );
        const taskText =
            taskTextElement.tagName === "PRE"
                ? taskTextElement.innerText
                : taskTextElement.value;
        const groupId = taskRegion.closest(".group-region").id;
        const prevTaskRegion = taskRegion.previousElementSibling;
        const prevTaskId = prevTaskRegion?.id || null;

        const eventMessage = {
            type: "task-update",
            instance: instanceGuid,
            jwt: Utils.getCookieByName("jwtToken"),
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

    taskListDragOver(event) {
        event.preventDefault();
        const container = event.currentTarget;
        const draggingTask = document.querySelector(".dragging");
        const afterElement = this.getDragAfterElement(
            container,
            event.clientY,
            ".task-region:not(.dragging)"
        );

        if (afterElement) {
            container.insertBefore(draggingTask, afterElement);
        } else {
            container.appendChild(draggingTask);
        }
    }

    taskListDrop(event) {
        event.preventDefault();
    }

    getDragAfterElement(container, y, selector) {
        const draggableElements = [...container.querySelectorAll(selector)];

        return draggableElements.reduce(
            (closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            },
            { offset: Number.NEGATIVE_INFINITY }
        ).element;
    }
}
