

const menu = new Menu()
const popup = new Popup();
const store = new IndexedDBDataStore("DataStore", 5);

menu.checkConnection = checkConnection;

appEvent.isLogEvents = true;
appEvent.onProjectAdd = projectAddOnEvent;
appEvent.onProjectDelete = projectRemoveOnEvent;
appEvent.onProjectUpdate = projectUpdateOnEvent;
appEvent.onGroupAdd = groupAddOnEvent;
appEvent.onGroupDelete = groupRemoveOnEvent;
appEvent.onGroupUpdate = groupUpdateOnEvent;
appEvent.onTaskUpdate = groupUpdateOnEvent;
appEvent.onTaskAdd = taskAddOnEvent;
appEvent.onTaskDelete = taskOnDeleteEvent;
appEvent.onTaskUpdate = taskUpdateOnEvent;

appEvent.onConnect = onConnect;
appEvent.onDisconnect = onDisconnect;

// rennew JWT token
setInterval(() => renewToken(), 3600000); //hourly

//persist state
setInterval(persistState, 1000);
window.addEventListener("beforeunload", persistState);


renewToken();
// Fetch complete user data
allUserDataFetch();
// apply fetched data
userDataApply();

//register service worker
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js");
    });
}

/**
 * Fetches complete user data from the server and persists it in IndexedDB.
 * 
 * Retrieves the user"s full dataset including projects, groups, and tasks by making a GET request
 * to the "/api/all_user_data" endpoint. The response data is then stored in IndexedDB for offline use.
 * @returns {void}  
 */
function allUserDataFetch() {
    fetch("/api/all_user_data", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + getCookieByName("jwtToken")
        }
    })
        .then(response => {
            if (response.status === 401) {
                logger.error("Unauthorized - Redirect to login");
                window.location.href = "/login.html";
                return Promise.reject("Unauthorized");
            } if (!response.ok) {
                return response.text().then(text => {
                    return Promise.reject(text); // Properly reject with the error text
                });
            } else {
                return response.json();
            }
        })
        .then(allData => {
                store.clean();
                store.insertProjects(allData.projects);
                store.insertTaskGroups(allData.groups);
                store.insertTasks(allData.tasks);
            }
        )
        .catch(error => logger.error(error));
}

/**
 * Fetches and displays a project's tasks and groups from IndexedDB.
 * 
 * Retrieves persisted task and group data for the specified project by calling 
 * `store.getTaskGroupsByProjectId()`, then renders them in the UI using 
 * the `taskListPopulate()` function.
 * 
 * @param {string} projectId - The ID of the project to fetch data for
 * @returns {void}  
 */
function taskListApply(projectId) {

    store.getTaskGroupsByProjectId(projectId)
    .then(taskList => {
        taskListPopulate(taskList);
    })
    .catch(error => logger.error(error));
}

/**
 * Renders a task list with groups and tasks in the UI.
 * 
 * Creates DOM elements for the task list, processes each group, and renders them
 * using the `groupAdd` function. Tasks within each group are displayed accordingly.
 * 
 * @param {Object} taskList - Contains tasks and groups data in the format:  
 *   `{ groups: Array<Group>, tasks: Array<Task> }`  
 * @returns {void}  
 * @sideeffects Modifies the DOM by adding task and group elements  
 */
function taskListPopulate(taskList) {
    const taskListRegion = document.getElementById("groups-region");
    taskListRegion.innerHTML = "";
    const groupInputRegion = document.createElement("div");
    groupInputRegion.className = "group-input-region";
    groupInputRegion.id = "group-input-region";
    taskListRegion.append(groupInputRegion);

    const groupInput = document.createElement("input");
    groupInput.className = "group-input";
    groupInput.id = "group-input";
    groupInput.placeholder = "New task group";
    groupInput.setAttribute("autocomplete", "off");
    groupInput.addEventListener("focus", groupInputOnFocus);
    groupInput.addEventListener("keydown", groupInputOnKeyDown);
    groupInputRegion.append(groupInput);

    const groupListRegion = document.createElement("div");
    groupListRegion.className = "group-list-region";
    groupListRegion.id = "group-list-region";
    taskListRegion.append(groupListRegion);

    let currentGroupRegion = null;
    if (taskList != null) {
        taskList.forEach(group => {
            let currentGroupRegionId = null
            if (currentGroupRegion != null) {
                currentGroupRegionId = currentGroupRegion.id
            }
            currentGroupRegion = groupAdd(group, currentGroupRegionId);
        });
    }
}

/**
 * Renews the JWT authentication token before expiration by requesting a new one from the server.
 * 
 * - Sends a GET request to `/api/token_renew` with the current valid token in the `Authorization` header
 * - On success:
 *   - Sets the new token in an HTTP-only cookie for subsequent requests
 * @returns {void}  
 * @sideeffects 
 *   - Updates `jwtToken` cookie with new token
 */
function renewToken() {
    fetch("/api/token_renew", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + getCookieByName("jwtToken")
        }
    })
        .then(response => {
            if (response.status === 401) {
                logger.error("Unauthorized - Redirect to login");
                window.location.href = "/login.html";
                return Promise.reject("Unauthorized");
            } if (!response.ok) {
                return response.text().then(text => {
                    return Promise.reject(text); // Properly reject with the error text
                });
            } else {
                return response.text();
            }
        })
        .then(tokenString => {
            if (/^[a-zA-Z0-9.\-_]+$/.test(tokenString)) {
                setCookie("jwtToken", tokenString, {});
            }
        })
        .catch(error => logger.error(error));
}

/**
 * Synchronizes the UI with the latest application state from IndexedDB.
 * 
 * Performs a complete UI refresh by:
 * 1. Fetching current data from IndexedDB (projects, tasks, and groups)
 * 2. Normalizing data for UI consumption
 * 3. Re-rendering all affected components
 * 4. Restoring saved UI state
 * 
 * Implementation Flow:
 * - Calls `store.getProjects()` to retrieve all projects
 * - For each project:
 *   - Invokes `projectAdd()` to render the project container
 *   - Fetches and renders associated groups/tasks
 * - Applies saved UI state via `applyPersistedState()`
 * 
 * @returns {void}
 * @sideeffects
 *   - Modifies DOM by re-rendering all project elements
 */
function userDataApply() {
    store.getProjects()
        .then(projects => {            
            let prevProjectId = null;
            const projectsRegion = document.getElementById("projects-region");
            projectsRegion.innerHTML = "";
            projectsRegion.innerText = "Projects: "

            if (projects != null && projects.length > 0) {
                Array.from(projects).forEach(project => {
                    projectAdd(project.id, project.name, prevProjectId);
                    prevProjectId = project.id;
                });
            } else {
                const eventMessage = {
                    "type": "project-add",
                    "instance": instanceGuid,
                    "jwt": getCookieByName("jwtToken"),
                    "payload": {
                        "name": "Project1",
                        "id": guid(),
                        "after": null
                    }
                };

                appEvent.send(JSON.stringify(eventMessage));
            }
            setTimeout(() => {
                applyPersistedState();
            }, 50);
        })
        .catch(error => logger.error(error));
}

function projectAdd(projectId, projectName, previousProjectId) {
    const projectsRegion = document.getElementById("projects-region");
    const projectRegion = document.createElement("div");
    projectRegion.className = "project-region";
    projectRegion.id = projectId;
    if (projectName == "") {
        projectName = "\u00A0"; // &nbsp;
    }
    projectRegion.textContent = projectName;
    projectRegion.contentEditable = "true";
    projectRegion.dataset.savedtext = projectName;
    projectRegion.draggable = true;
    projectRegion.addEventListener("keydown", projectRegionOnKeyDown);
    projectRegion.addEventListener("focus", projectRegionOnFocus);
    projectRegion.addEventListener("blur", projectRegionOnBlur);
    projectRegion.addEventListener("dragstart", projectDragStart)
    projectRegion.addEventListener("dragend", projectDragEnd)
    if (previousProjectId != null && previousProjectId != "") {
        const prevProjectRegion = document.getElementById(previousProjectId);
        if (prevProjectRegion != null) {
            prevProjectRegion.after(projectRegion);
        }
    }
    if (!document.contains(projectRegion)) {
        projectsRegion.append(projectRegion);
    }
    const selectedProjectRegion = document.getElementsByClassName("project-region-selected");
    if (selectedProjectRegion.length == 0) {
        projectSelect(projectRegion, false, false);
    }
    return projectRegion
}

function projectRegionOnKeyDown(event) {
    const selectedProjectRegion = document.querySelector(".project-region-selected");
    const nextProjectRegion = selectedProjectRegion.nextElementSibling;
    const prevProjectRegion = selectedProjectRegion.previousElementSibling;
    switch (true) {
        case event.key === "ArrowRight" && event.altKey:
            projectMoveRight(selectedProjectRegion);
            event.preventDefault()
            break;
        case event.key === "ArrowLeft" && event.altKey:
            projectMoveLeft(selectedProjectRegion);
            event.preventDefault()
            break;
        case event.key === "Enter":
            const groupInput = document.getElementById("group-input");
            groupInput.focus();
            event.preventDefault();
            break;
        case event.key === "ArrowRight" && event.ctrlKey:
            if (nextProjectRegion != null) {
                projectSelect(nextProjectRegion, true);
            }
            event.preventDefault();
            break;
        case event.key === "ArrowRight":
            if (nextProjectRegion != null) {
                if (isCursorAtEndOrNotFocused(selectedProjectRegion)) {
                    projectSelect(nextProjectRegion, true);
                    event.preventDefault();
                }
            }
            break;
        case event.key === "ArrowLeft" && event.ctrlKey:
            if (prevProjectRegion != null) {
                projectSelect(prevProjectRegion, false);
            }
            event.preventDefault();
            break;
        case event.key === "ArrowLeft":
            if (prevProjectRegion != null) {
                if (isCursorAtStartOrNotFocused(selectedProjectRegion)) {
                    projectSelect(prevProjectRegion, false);
                    event.preventDefault();
                }
            }
            break;
        case event.key === "ArrowDown":
            const newGroupInput = document.getElementById("group-input");
            newGroupInput.focus();
            event.preventDefault();
            break;
    }
}

function projectRegionOnFocus(event) {
    projectSelect(event.target, false);
}

function projectRegionOnBlur(event) {
    const projectRegion = event.target;
    const projectName = projectRegion.innerText;
    if (projectName == projectRegion.dataset.savedtext) {
        return;
    }
    const projectId = projectRegion.id;
    const prevProjectRegion = projectRegion.previousElementSibling;
    let prevProjectId = prevProjectRegion?.id;

    const eventMessage = {
        "type": "project-update",
        "instance": instanceGuid,
        "jwt": getCookieByName("jwtToken"),
        "payload": {
            "name": projectName,
            "id": projectId,
            "after": prevProjectId
        }
    };

    appEvent.send(JSON.stringify(eventMessage));

}

function projectSelect(projectRegion, isSetCursorAtFirstPosition = false) {
    const prevSelectedProjectRegion = document.getElementsByClassName("project-region-selected");
    if (prevSelectedProjectRegion.length != 0) {
        prevSelectedProjectRegion[0].className = "project-region";
    }
    projectRegion.className = "project-region-selected";
    menu.showHeader("Project: ");
    menu.addButton("Add", projectRegion.id, projectAddOnClick);
    menu.addButton("Remove", projectRegion.id, projectRemoveOnClick);
    menu.addButton("Rename", projectRegion.id, projectRenameOnClick);
    menu.addButton("〈", projectRegion.id, projectMoveLeftOnClick, "50px");
    menu.addButton("〉", projectRegion.id, projectMoveRightOnClick, "50px");
    taskListApply(projectRegion.id);
    projectRegion.focus();
    setCursorAtEdge(projectRegion, isSetCursorAtFirstPosition);
}

/**
 * Adds project into UI by receiving project-add WebSocket event.
 * 
 * @returns {void} Resolves when the UI update completes
 * @sideeffects
 *   - Modifies DOM by re-rendering project element
 */
function projectAddOnEvent(project) {
    const projectRegion = projectAdd(project.id, project.name, project.after);
    projectSelect(projectRegion, false);
    store.upsertProject(project);
}

function projectRemoveOnEvent(project) {
    const projectRegion = document.getElementById(project.id);
    const projectsRegion = projectRegion.parentElement;
    const prevProjectRegion = projectRegion.previousElementSibling;
    projectRegion.remove();
    if (prevProjectRegion != null) {
        projectSelect(prevProjectRegion, false);
    } else {
        const firstProject = projectsRegion.firstElementChild;
        if (firstProject != null) {
            projectSelect(firstProject, false);
        } else {
            let projectName = prompt("Project name:", "");
            while (projectName == null || projectName == "") {
                alert("Working without any projects is prohibited");
                projectName = prompt("Project name:", "");
            }
            const projectId = guid();
            const eventMessage = {
                "type": "project-add",
                "instance": instanceGuid,
                "jwt": getCookieByName("jwtToken"),
                "payload": {
                    "name": projectName,
                    "id": projectId,
                    "after": null
                }
            };

            appEvent.send(JSON.stringify(eventMessage));
        }

    }
    store.delete("project", project.id);
}

function projectUpdateOnEvent(project) {
    const projectRegion = document.getElementById(project.id);
    const isProjectRegionFocused = (projectRegion == document.activeElement);
    const projectsRegion = projectRegion.parentElement;
    const prevProjectRegion = projectRegion.previousElementSibling;
    let prevProjectId;
    if (prevProjectRegion != null) {
        prevProjectId = prevProjectRegion.id;
    }

    if (prevProjectId != project.after) {
        if (project.after != null && project.after != "") {
            const newPrevProjectRegion = document.getElementById(project.after);
            newPrevProjectRegion.after(projectRegion);
        } else {
            const firstProjectRegion = projectsRegion.firstElementChild;
            if (firstProjectRegion != null) {
                projectsRegion.insertBefore(projectRegion, firstProjectRegion)
            }
        }
    }

    projectRegion.innerText = project.name;
    if (isProjectRegionFocused) {
        projectRegion.focus();
    }
    
    store.upsertProject(project);
}

function projectAddOnClick(event) {
    const addProjectButton = event.target;
    const projectId = addProjectButton.dataset.payload;
    const projectRegion = document.getElementById(projectId);
    const projectName = prompt("Project name:", "");
    if (projectName == null || projectName == "") {
        return;
    }
    const prevProjectRegion = projectRegion.previousElementSibling;

    const eventMessage = {
        "type": "project-add",
        "instance": instanceGuid,
        "jwt": getCookieByName("jwtToken"),
        "payload": {
            "name": projectName,
            "id": guid(),
            "after": projectId
        }
    };

    appEvent.send(JSON.stringify(eventMessage));
}

function projectRemoveOnClick(event) {
    if (!confirm("Warning: This will permanently delete the project and all its contents, including task groups and tasks. This action cannot be undone. Are you sure you want to proceed?")) {
        return
    }
    const addProjectButton = event.target;
    const projectId = addProjectButton.dataset.payload;
    const projectRegion = document.getElementById(projectId);
    const projectName = projectRegion.innerText;

    const eventMessage = {
        "type": "project-delete",
        "instance": instanceGuid,
        "jwt": getCookieByName("jwtToken"),
        "payload": {
            "name": projectName,
            "id": projectId,
            "after": null
        }
    };

    appEvent.send(JSON.stringify(eventMessage));
}

function projectRenameOnClick(event) {
    const addProjectButton = event.target;
    const projectId = addProjectButton.dataset.payload;
    const projectRegion = document.getElementById(projectId);
    const projectName = prompt("New project name: ", projectRegion.innerText);
    const prevProjectRegion = projectRegion.previousElementSibling;
    let prevProjectId = null;

    if (projectName == projectRegion.innerText) {
        return;
    }

    if (prevProjectRegion != null) {
        prevProjectId = prevProjectRegion.id;
    }


    const eventMessage = {
        "type": "project-update",
        "instance": instanceGuid,
        "jwt": getCookieByName("jwtToken"),
        "payload": {
            "name": projectName,
            "id": projectId,
            "after": prevProjectId
        }
    };

    appEvent.send(JSON.stringify(eventMessage));
}

function projectMoveLeftOnClick(event) {
    const addProjectButton = event.target;
    const projectId = addProjectButton.dataset.payload;
    const projectRegion = document.getElementById(projectId);
    projectMoveLeft(projectRegion);
}

function projectMoveLeft(projectRegion) {
    const projectId = projectRegion.id;
    const projectName = projectRegion.innerText
    const prevProjectRegion = projectRegion.previousElementSibling;
    if (prevProjectRegion == null) {
        return;
    }

    const prevPrevProjectRegion = prevProjectRegion.previousElementSibling;
    let prevPrevProjectId = null;
    if (prevPrevProjectRegion != null) {
        prevPrevProjectId = prevPrevProjectRegion.id;
    }

    const prevProjectId = prevProjectRegion.id;

    const eventMessage = {
        "type": "project-update",
        "instance": instanceGuid,
        "jwt": getCookieByName("jwtToken"),
        "payload": {
            "name": projectName,
            "id": projectId,
            "after": prevPrevProjectId
        }
    };

    appEvent.send(JSON.stringify(eventMessage));
}

function projectMoveRightOnClick(event) {
    const addProjectButton = event.target;
    const projectId = addProjectButton.dataset.payload;
    const projectRegion = document.getElementById(projectId);
    projectMoveRight(projectRegion);
}

function projectMoveRight(projectRegion) {
    const projectId = projectRegion.id;
    const projectName = projectRegion.innerText
    const nextProjectRegion = projectRegion.nextElementSibling;
    if (nextProjectRegion == null) {
        return;
    }

    const prevProjectId = nextProjectRegion.id;

    const eventMessage = {
        "type": "project-update",
        "instance": instanceGuid,
        "jwt": getCookieByName("jwtToken"),
        "payload": {
            "name": projectName,
            "id": projectId,
            "after": prevProjectId
        }
    };

    appEvent.send(JSON.stringify(eventMessage));
}


function groupInputOnFocus(event) {
    menu.showHeader("New Group: ");
    menu.addButton("Add", null, groupNewAddOnClick);
}

function groupInputOnKeyDown(event) {
    const groupInput = event.target;
    const projectSelectedRegion = document.querySelector(".project-region-selected");
    const groupListRegion = document.getElementById("group-list-region");
    const firstGroupRegion = groupListRegion.firstElementChild;
    let firstGroupHeaderRegion = firstGroupRegion?.querySelector(".group-header-region");
    if (firstGroupHeaderRegion == null) {
        firstGroupHeaderRegion = firstGroupRegion?.querySelector(".group-header-region-selected");
    }
    switch (true) {
        case event.key === "Enter":
            groupNewAddOnClick();
            break;
        case event.key === "ArrowUp":
            projectSelect(projectSelectedRegion, false);
            event.preventDefault();
            break;
        case event.key === "ArrowDown":
            if (firstGroupRegion == null) {
                return;
            }
            groupSelect(firstGroupHeaderRegion, true);
            event.preventDefault();
            break;
        case event.key === "ArrowLeft":
            if (isCursorAtStartOrNotFocused(groupInput)) {
                projectSelect(projectSelectedRegion, false);
                event.preventDefault();
            }
            break;
        case event.key === "ArrowRight":
            if (isCursorAtEndOrNotFocused(groupInput)) {
                if (firstGroupRegion == null) {
                    return;
                }
                groupSelect(firstGroupHeaderRegion, true);
                event.preventDefault();
            }
            break;
    }
}

function groupNewAddOnClick(event) {
    const groupInput = document.getElementById("group-input");
    const groupName = groupInput.value;
    const selectedProjectRegions = document.getElementsByClassName("project-region-selected");
    let projectId = null;
    if (selectedProjectRegions.length != 0) {
        projectId = selectedProjectRegions[0].id;
    }
    if (groupName == null || groupName == "") {
        return;
    }

    const eventMessage = {
        "type": "group-add",
        "instance": instanceGuid,
        "jwt": getCookieByName("jwtToken"),
        "payload": {
            "name": groupName,
            "id": guid(),
            "projectid": projectId,
            "after": null
        }
    };

    appEvent.send(JSON.stringify(eventMessage));

    groupInput.value = "";
}

function groupAddOnEvent(group) {
    const groupRegion = groupAdd(group, group.after);
    store.upsertGroup(group);
}

function groupUpdateOnEvent(group) {
    const groupRegion = document.getElementById(group.id);
    if (!groupRegion) {
        return;
    }
    let groupHeaderRegion = groupRegion.querySelector(".group-header-region-selected");
    if (groupHeaderRegion == null) {
        groupHeaderRegion = groupRegion.querySelector(".group-header-region");
    }
    const isFocused = (groupHeaderRegion == document.activeElement);
    groupHeaderRegion.innerText = group.name;
    if (group.after != null && group.after != "") {
        const prevGroupRegion = document.getElementById(group.after)
        prevGroupRegion.after(groupRegion);
    } else {
        const groupListRegion = groupRegion.parentElement;
        groupListRegion.prepend(groupRegion);
    }
    if (isFocused) {
        groupHeaderRegion.focus();
    }
    store.upsertGroup(group);
}

function groupAdd(group, prevGroupId) {
    const groupListRegion = document.getElementById("group-list-region");
    const groupRegion = document.createElement("div");
    groupRegion.className = "group-region";
    groupRegion.id = group.id;
    groupRegion.draggable = true;
    if (prevGroupId != null && prevGroupId != "") {
        const prevGroupRegion = document.getElementById(prevGroupId);
        prevGroupRegion.after(groupRegion);
    } else {
        groupListRegion.prepend(groupRegion);
    }

    groupRegion.addEventListener("dragstart", groupDragStart)
    groupRegion.addEventListener("dragend", groupDragEnd)

    const groupHeader = document.createElement("div");
    groupHeader.className = "group-header-region";
    groupHeader.innerText = group.name;
    groupHeader.contentEditable = true;
    groupHeader.dataset.savedtext = group.name;
    groupHeader.addEventListener("focus", groupHeaderOnFocus);
    groupHeader.addEventListener("blur", groupHeaderOnBlur);
    groupHeader.addEventListener("keydown", groupHeaderOnKeyDown);
    groupRegion.append(groupHeader);

    const taskListRegion = document.createElement("div");
    taskListRegion.className = "task-list-region";
    groupRegion.append(taskListRegion);

    const taskInputRegion = document.createElement("div");
    taskInputRegion.className = "task-input-region";
    groupRegion.append(taskInputRegion);

    const taskInput = document.createElement("textarea")
    taskInput.className = "task-input";
    taskInput.placeholder = "New task text";
    taskInput.wrap = "hard";
    taskInput.id = guid();
    taskInput.dataset.groupid = group.id
    taskInput.onfocus = taskInputOnFocus;

    taskInput.addEventListener("keydown", taskInputOnKeyDown);
    taskInput.addEventListener("input", textAreaAutoResize);
    taskInputRegion.append(taskInput);

    store.getTasksByGroupId(group.id)
    .then(tasks => {
        if (tasks != null) {
            tasks.forEach(task => {
                taskAdd(task);
            })
        }
    })
    .catch(error => logger.error(error));

    return groupRegion;
}


function groupHeaderOnKeyDown(event) {
    const groupHeaderRegion = event.target;
    const groupRegion = groupHeaderRegion.parentElement;
    const taskListRegion = groupRegion.querySelector(".task-list-region");
    const taskFirstRegion = taskListRegion.firstElementChild;
    switch (true) {
        case event.key === "Enter":
            event.preventDefault();
            if (taskFirstRegion == null) {
                const taskInput = groupRegion.querySelector(".task-input");
                setTimeout(() => taskInput.focus(), 0); // preventDefault block focus
            } else {
                taskInlineInputActivate(taskFirstRegion);
            }
            break;
        case event.key === "ArrowUp" && event.altKey:
            groupMoveUp(groupRegion);
            event.preventDefault();
            break;
        case event.key === "ArrowDown" && event.altKey:
            groupMoveDown(groupRegion);
            event.preventDefault();
            break;
        case event.key === "ArrowUp" || (event.key === "ArrowLeft" && isCursorAtStartOrNotFocused(groupHeaderRegion)):
            const prevGroupRegion = groupRegion.previousElementSibling;
            if (prevGroupRegion == null) {
                const groupInput = document.getElementById("group-input");
                groupInput.focus();
            } else {
                const prevGroupTaskInput = prevGroupRegion.querySelector(".task-input");
                prevGroupTaskInput.focus();
            }
            event.preventDefault();
            break;
        case event.key === "ArrowDown" || (event.key === "ArrowRight" && isCursorAtEndOrNotFocused(groupHeaderRegion)):
            if (taskFirstRegion == null) {
                const taskInput = groupRegion.querySelector(".task-input");
                taskInput.focus();
            } else {
                taskInlineInputActivate(taskFirstRegion, true);
            }
            event.preventDefault();
            break;
    }
}

function groupHeaderOnFocus(event) {
    const groupHeaderRegion = event.target;
    groupSelect(groupHeaderRegion, false);
}

function groupHeaderOnBlur(event) {
    const groupHeaderRegion = event.target;
    if (groupHeaderRegion.innerText == groupHeaderRegion.dataset.savedtext) {
        return;
    }
    const groupName = groupHeaderRegion.innerText;
    groupHeaderRegion.dataset.savedtext = groupName;
    const groupRegion = groupHeaderRegion.parentElement;
    const groupId = groupRegion.id;
    const projectRegion = document.querySelector(".project-region-selected");
    const projectId = projectRegion.id;
    const prevGroupRegion = groupRegion.previousElementSibling;
    let prevGroupId = null;
    if (prevGroupRegion != null) {
        prevGroupId = prevGroupRegion.id
    }

    const eventMessage = {
        "type": "group-update",
        "instance": instanceGuid,
        "jwt": getCookieByName("jwtToken"),
        "payload": {
            "name": groupName,
            "id": groupId,
            "projectid": projectId,
            "after": prevGroupId
        }
    };

    appEvent.send(JSON.stringify(eventMessage));
}


function groupSelect(groupHeaderRegion, isSetCursorToTheFirstPosition = false) {

    const groupHeaderSelectedList = document.getElementsByClassName("group-header-region-selected");
    const groupRegion = groupHeaderRegion.parentElement;

    Array.from(groupHeaderSelectedList).forEach(groupHeaderSelected => {
        groupHeaderSelected.className = "group-header-region";
    });

    const taskRegionsSelected = document.querySelectorAll(".task-region.selected");

    Array.from(taskRegionsSelected).forEach(taskRegionSelected => {
        taskRegionSelected.classList.remove("selected");
    })

    groupHeaderRegion.className = "group-header-region-selected";
    menu.showHeader("Group: ");
    menu.addButton("Add", groupRegion.id, groupAddOnClick);
    menu.addButton("Remove", groupRegion.id, groupRemoveOnClick);
    menu.addButton("∧", groupRegion.id, groupUpOnClick, "50px");
    menu.addButton("∨", groupRegion.id, groupDownOnClick, "50px");
    groupHeaderRegion.focus();
    setCursorAtEdge(groupHeaderRegion, isSetCursorToTheFirstPosition)
}

function groupAddOnClick(event) {
    const button = event.target;
    const prevGroupId = button.dataset.payload;
    const groupName = prompt("New group name: ", "");
    const projectRegionsSelected = document.getElementsByClassName("project-region-selected")

    if (groupName == null || groupName == "") {
        return;
    }

    if (projectRegionsSelected == null || projectRegionsSelected.length == 0) {
        return;
    }

    const projectId = projectRegionsSelected[0].id;

    const eventMessage = {
        "type": "group-add",
        "instance": instanceGuid,
        "jwt": getCookieByName("jwtToken"),
        "payload": {
            "name": groupName,
            "id": guid(),
            "projectid": projectId,
            "after": prevGroupId
        }
    };

    appEvent.send(JSON.stringify(eventMessage));
}

function groupRemoveOnClick(event) {
    const button = event.target;
    const groupId = button.dataset.payload;
    const groupRegion = document.getElementById(groupId);
    const prevGroupRegion = groupRegion.previousElementSibling;
    let prevGroupId = null;
    const groupHeaderRegion = groupRegion.querySelector(".group-header-region-selected").parentElement;
    const groupName = groupHeaderRegion.innerText;

    const projectRegionsSelected = document.getElementsByClassName("project-region-selected")

    if (projectRegionsSelected == null || projectRegionsSelected.length == 0) {
        return;
    }

    const projectId = projectRegionsSelected[0].id;

    if (prevGroupRegion != null) {
        prevGroupId = prevGroupRegion.id;
    }

    const eventMessage = {
        "type": "group-delete",
        "instance": instanceGuid,
        "jwt": getCookieByName("jwtToken"),
        "payload": {
            "name": groupName,
            "id": groupId,
            "projectid": projectId,
            "after": prevGroupId
        }
    };

    appEvent.send(JSON.stringify(eventMessage));
}

function groupRemoveOnEvent(group) {
    const groupRegion = document.getElementById(group.id)
    groupRegion.remove();    
    store.delete("task_group", group.id);
}

function groupUpOnClick(event) {
    const upButton = event.target;
    const groupId = upButton.dataset.payload;
    const groupRegion = document.getElementById(groupId);
    groupMoveUp(groupRegion);
}

function groupMoveUp(groupRegion) {
    const groupId = groupRegion.id;
    const prevGroupRegion = groupRegion.previousElementSibling;
    if (prevGroupRegion == null) {
        return;
    }
    const prevPrevGroupRegion = prevGroupRegion.previousElementSibling;
    let prevPrevGroupId = null;
    if (prevPrevGroupRegion != null) {
        prevPrevGroupId = prevPrevGroupRegion.id;
    }
    let groupHeaderRegion = groupRegion.querySelector(".group-header-region-selected");
    if (groupHeaderRegion == null) {
        groupHeaderRegion = groupRegion.querySelector(".group-header-region");
    }
    const groupName = groupHeaderRegion.innerText;
    const projectRegion = document.querySelector(".project-region-selected");
    const projectId = projectRegion.id;


    const eventMessage = {
        "type": "group-update",
        "instance": instanceGuid,
        "jwt": getCookieByName("jwtToken"),
        "payload": {
            "name": groupName,
            "id": groupId,
            "projectid": projectId,
            "after": prevPrevGroupId
        }
    };

    appEvent.send(JSON.stringify(eventMessage));
}

function groupDownOnClick(event) {
    const downButton = event.target;
    const groupId = downButton.dataset.payload;
    const groupRegion = document.getElementById(groupId);
    groupMoveDown(groupRegion);
}

function groupMoveDown(groupRegion) {
    const groupId = groupRegion.id;
    const nextGroupRegion = groupRegion.nextElementSibling;
    if (nextGroupRegion == null) {
        return;
    }
    const nextGroupId = nextGroupRegion.id;

    let groupHeaderRegion = groupRegion.querySelector(".group-header-region-selected");
    if (groupHeaderRegion == null) {
        groupHeaderRegion = groupRegion.querySelector(".group-header-region");
    }
    const groupName = groupHeaderRegion.innerText;
    const projectRegion = document.querySelector(".project-region-selected");
    const projectId = projectRegion.id;

    const eventMessage = {
        "type": "group-update",
        "instance": instanceGuid,
        "jwt": getCookieByName("jwtToken"),
        "payload": {
            "name": groupName,
            "id": groupId,
            "projectid": projectId,
            "after": nextGroupId
        }
    };

    appEvent.send(JSON.stringify(eventMessage));
}

function taskInputOnFocus(event) {
    const taskInput = event.target;
    menu.showHeader("New Group: ");
    menu.addButton("Add", taskInput.id, taskNewAddOnClick);

    const taskRegionsSelected = document.querySelectorAll(".task-region.selected");

    Array.from(taskRegionsSelected).forEach(taskRegionSelected => {
        taskRegionSelected.className = "task-region";
    })

    const groupHeaderRegionsSelected = document.getElementsByClassName("group-header-region-selected");

    Array.from(groupHeaderRegionsSelected).forEach(groupHeaderRegionSelected => {
        groupHeaderRegionSelected.className = "group-header-region";
    })
}

function taskNewAddOnClick(event) {
    const addTaskButton = event.target;
    const taskInputId = addTaskButton.dataset.payload;
    const taskInput = document.getElementById(taskInputId);
    taskNewAdd(taskInput);

}

function taskNewAdd(taskInput) {
    const taskInputRegion = taskInput.parentElement;
    const groupId = taskInput.dataset.groupid;
    const taskText = taskInput.value;
    if (taskText == null || taskText == "") {
        return
    }

    const groupRegion = document.getElementById(groupId);
    const taskListRegion = groupRegion.querySelector(".task-list-region");
    const lastTaskRegion = taskListRegion.lastElementChild;
    let prevTaskId = null;
    if (lastTaskRegion != null) {
        prevTaskId = lastTaskRegion.id;
    }

    const eventMessage = {
        "type": "task-add",
        "instance": instanceGuid,
        "jwt": getCookieByName("jwtToken"),
        "payload": {
            "text": taskText,
            "id": guid(),
            "group": groupId,
            "status": "1", // todo
            "after": prevTaskId
        }
    };


    appEvent.send(JSON.stringify(eventMessage));

    taskInput.value = "";
    taskInput.focus;
}

function taskAddOnEvent(task) {
    taskAdd(task);
    store.upsertTask(task);
}

function taskUpdateOnEvent(task) {
    const taskRegion = document.getElementById(task.id);
    const textElement = taskRegion.querySelector(".task-inline-input,.task-pre");
    if (textElement.tagName === "TEXTAREA") {
        textElement.removeEventListener("blur", taskInlineInputOnBlur);
    }
    if (task.after != null && task.after != "") {
        const prevTaskRegion = document.getElementById(task.after);
        prevTaskRegion.after(taskRegion);
    } else {
        const groupRegion = document.getElementById(task.group);
        const taskListRegion = groupRegion.querySelector(".task-list-region");
        taskListRegion.prepend(taskRegion);
    }

    const classesToKeep = ["task-region", "selected"];
    Array.from(taskRegion.classList)
        .filter(className => !classesToKeep.includes(className))
        .forEach(className => taskRegion.classList.remove(className));

    taskRegion.dataset.status = task.status;

    const taskStatusIcon = taskRegion.querySelector(".task-status-img");
    switch (true) {
        case task.status == 1:
            taskStatusIcon.src = "/html/img/todo.svg";
            taskStatusIcon.alt = "☐";
            taskRegion.classList.add("todo");
            break;
        case task.status == 2:
            taskStatusIcon.src = "/html/img/inprogress.svg";
            taskStatusIcon.alt = "☐";
            taskRegion.classList.add("inprogress");
            break;
        case task.status == 3:
            taskStatusIcon.src = "/html/img/done.svg";
            taskStatusIcon.alt = "✔";
            taskRegion.classList.add("done");
            break;
        case task.status == 4:
            taskStatusIcon.src = "/html/img/cancelled.svg";
            taskStatusIcon.alt = "✘";
            taskRegion.classList.add("cancelled");
            break;
        default:
            taskStatusIcon.src = "/html/img/question.svg";
            taskStatusIcon.alt = "☐";
            break;
    }

    textElement.innerText = task.text;
    textElement.focus();

    if (textElement.tagName === "TEXTAREA") {
        textElement.addEventListener("blur", taskInlineInputOnBlur);
    }

    ensureVisible(taskRegion);

    store.upsertTask(task);
}

function taskAdd(task) {
    if (document.getElementById(task.id)) {
        return;
    }
    const prevTaskRegionId = task.after;
    let prevTaskRegion = null;

    if (prevTaskRegionId != null && prevTaskRegionId != "") {
        prevTaskRegion = document.getElementById(prevTaskRegionId);
    }

    const taskRegion = document.createElement("div");
    taskRegion.className = "task-region";
    taskRegion.id = task.id;
    taskRegion.dataset.status = task.status;
    switch (true) {
        case task.status == 1:
            taskRegion.classList.add("todo");
            break;
        case task.status == 2:
            taskRegion.classList.add("inprogress");
            break;
        case task.status == 3:
            taskRegion.classList.add("done");
            break;
        case task.status == 4:
            taskRegion.classList.add("cancelled");
            break;
    }
    taskRegion.onclick = taskRegionOnClick;

    const taskStatusIcon = document.createElement("img");
    switch (true) {
        case task.status == 1:
            taskStatusIcon.src = "/html/img/todo.svg";
            taskStatusIcon.alt = "☐";
            break;
        case task.status == 2:
            taskStatusIcon.src = "/html/img/inprogress.svg";
            taskStatusIcon.alt = "☐";
            break;
        case task.status == 3:
            taskStatusIcon.src = "/html/img/done.svg";
            taskStatusIcon.alt = "✔";
            break;
        case task.status == 4:
            taskStatusIcon.src = "/html/img/cancelled.svg";
            taskStatusIcon.alt = "✘";
            break;
        default:
            taskStatusIcon.src = "/html/img/question.svg";
            taskStatusIcon.alt = "☐";
            break;
    }
    taskStatusIcon.width = 30;
    taskStatusIcon.height = 30;
    taskStatusIcon.className = "task-status-img";
    taskStatusIcon.onclick = taskStatusImgOnClick;
    taskRegion.appendChild(taskStatusIcon);

    const taskPre = document.createElement("pre");
    taskPre.className = "task-pre";
    taskPre.innerText = task.text;
    taskRegion.appendChild(taskPre);
    taskRegion.draggable = true;
    taskRegion.addEventListener("dragstart", taskDragStart)
    taskRegion.addEventListener("dragend", taskDragEnd)

    if (prevTaskRegion != null) {
        prevTaskRegion.after(taskRegion);
    } else {
        const groupRegion = document.getElementById(task.group);
        const taskListRegion = groupRegion.querySelector(".task-list-region");
        taskListRegion.append(taskRegion);
    }
}

function taskRegionOnClick(event) {
    const target = event.target;
    let taskRegion = null;
    if (target.classList.contains("task-region")) {
        taskRegion = target;
    } else if (target.className == "task-pre") {
        taskRegion = target.parentElement;
    } else {
        return;
    }
    taskInlineInputActivate(taskRegion);
}

function taskInlineInputActivate(taskRegion, isSetCursorFirstPosition = false) {

    const groupRegion = taskRegion.parentElement;
    const groupId = groupRegion.id;

    const taskInlineInputOld = document.getElementById("task-inline-input");
    if (taskInlineInputOld != null) {
        const taskTextOld = taskInlineInputOld.value;
        const taskRegionOld = taskInlineInputOld.parentElement;
        const taskIdOld = taskRegionOld.id
        const taskStatusOld = taskRegionOld.dataset.status;

        const groupRegionOld = taskRegionOld.parentElement.parentElement;
        const groupIdOld = groupRegionOld.id;
        const prevTaskRegionOld = taskRegionOld.previousElementSibling;
        let prevTaskIdOld = null;
        if (prevTaskRegionOld != null) {
            prevTaskIdOld = prevTaskRegionOld.id;
        }
        if (taskTextOld == "") {
            taskRemove(taskIdOld);
        } else {
            const eventMessage = {
                "type": "task-update",
                "instance": instanceGuid,
                "jwt": getCookieByName("jwtToken"),
                "payload": {
                    "text": taskTextOld,
                    "id": taskIdOld,
                    "group": groupIdOld,
                    "status": taskStatusOld,
                    "after": prevTaskIdOld
                }
            };

            appEvent.send(JSON.stringify(eventMessage));
        }
    }

    const taskRegionsSelected = document.querySelectorAll(".task-region.selected");

    Array.from(taskRegionsSelected).forEach(taskRegionSelected => {
        taskRegionSelected.classList.remove("selected");
    })

    const groupHeaderRegionsSelected = document.getElementsByClassName("group-header-region-selected");

    Array.from(groupHeaderRegionsSelected).forEach(groupHeaderRegionSelected => {
        groupHeaderRegionSelected.className = "group-header-region";
    })

    taskRegion.classList.add("selected");

    const taskText = taskRegion.querySelector(".task-inline-input,.task-pre").innerText;

    const taskStatus = taskRegion.dataset.status;

    taskRegion.innerHTML = "";

    const taskStatusIcon = document.createElement("img");
    switch (true) {
        case taskStatus == 1:
            taskStatusIcon.src = "/html/img/todo.svg";
            taskStatusIcon.alt = "☐";
            break;
        case taskStatus == 2:
            taskStatusIcon.src = "/html/img/inprogress.svg";
            taskStatusIcon.alt = "☐";
            break;
        case taskStatus == 3:
            taskStatusIcon.src = "/html/img/done.svg";
            taskStatusIcon.alt = "✔";
            break;
        case taskStatus == 4:
            taskStatusIcon.src = "/html/img/cancelled.svg";
            taskStatusIcon.alt = "✘";
            break;
        default:
            taskStatusIcon.src = "/html/img/question.svg";
            taskStatusIcon.alt = "☐";
            break;
    }
    taskStatusIcon.width = 30;
    taskStatusIcon.height = 30;
    taskStatusIcon.className = "task-status-img";
    taskStatusIcon.onclick = taskStatusImgOnClick;
    taskRegion.append(taskStatusIcon);

    const taskInlineInput = document.createElement("textarea");
    taskInlineInput.className = "task-inline-input";
    taskInlineInput.id = "task-inline-input";
    taskInlineInput.wrap = "hard";
    taskInlineInput.value = taskText;
    taskInlineInput.addEventListener("input", textAreaAutoResize);
    taskInlineInput.addEventListener("keydown", taskInlineInputOnKeyDown);
    taskInlineInput.addEventListener("blur", taskInlineInputOnBlur);
    taskRegion.append(taskInlineInput);
    taskInlineInput.style.height = "1px";
    taskInlineInput.style.height = `${taskInlineInput.scrollHeight - 20}px`
    taskInlineInput.focus();
    if (isSetCursorFirstPosition) {
        taskInlineInput.setSelectionRange(0, 0);
    }

    menu.showHeader("Task: ");
    menu.addButton("Remove", taskRegion.id, taskRemoveOnClick);
    const statusOptions = [
        { name: "To Do", payload: { status: "1", taskid: taskRegion.id } },
        { name: "In Progress", payload: { status: "2", taskid: taskRegion.id } },
        { name: "Done", payload: { status: "3", taskid: taskRegion.id } },
        { name: "Cancelled", payload: { status: "4", taskid: taskRegion.id } },
    ];
    menu.addDropDownButton("Status", taskRegion.id, statusOptions, dropdownStatusOnSelect)
    menu.addButton("∧", taskRegion.id, taskUpOnClick, "50px");
    menu.addButton("∨", taskRegion.id, taskDownOnClick, "50px");
}

function taskInlineInputOnBlur(event) {
    const taskInlineInput = event.target;
    const taskRegion = taskInlineInput.parentElement;
    if (taskRegion == null) { // detached from DOM (removed)
        return;
    }
    const taskText = taskInlineInput.value;
    const taskId = taskRegion.id;
    const taskStatus = taskRegion.dataset.status;
    const groupRegion = taskRegion.parentElement.parentElement;
    const groupId = groupRegion.id;
    const prevTaskRegion = taskRegion.previousElementSibling;
    let prevTaskId = null;
    if (prevTaskRegion != null) {
        prevTaskId = prevTaskRegion.id;
    }
    taskRegion.innerHTML = "";
    const taskStatusIcon = document.createElement("img");

    switch (true) {
        case taskStatus == 1:
            taskStatusIcon.src = "/html/img/todo.svg";
            taskStatusIcon.alt = "☐";
            break;
        case taskStatus == 2:
            taskStatusIcon.src = "/html/img/inprogress.svg";
            taskStatusIcon.alt = "☐";
            break;
        case taskStatus == 3:
            taskStatusIcon.src = "/html/img/done.svg";
            taskStatusIcon.alt = "✔";
            break;
        case taskStatus == 4:
            taskStatusIcon.src = "/html/img/cancelled.svg";
            taskStatusIcon.alt = "✘";
            break;
        default:
            taskStatusIcon.src = "/html/img/question.svg";
            taskStatusIcon.alt = "☐";
            break;
    }
    taskStatusIcon.width = 30;
    taskStatusIcon.height = 30;
    taskStatusIcon.className = "task-status-img";
    taskStatusIcon.onclick = taskStatusImgOnClick;
    taskRegion.append(taskStatusIcon);
    const taskPre = document.createElement("pre");
    taskPre.className = "task-pre";
    taskPre.innerText = taskText;
    taskRegion.appendChild(taskPre);

    const eventMessage = {
        "type": "task-update",
        "instance": instanceGuid,
        "jwt": getCookieByName("jwtToken"),
        "payload": {
            "text": taskText,
            "id": taskId,
            "group": groupId,
            "status": taskStatus,
            "after": prevTaskId
        }
    };

    appEvent.send(JSON.stringify(eventMessage));
}

function taskInputOnKeyDown(event) {
    const taskInput = event.target;
    const groupRegion = taskInput.parentElement.parentElement;
    switch (true) {
        case event.key === "Enter" && !event.shiftKey:
            taskNewAdd(taskInput);
            event.preventDefault();
            break
        case ((event.key === "ArrowDown" || event.key === "ArrowRight") && (event.ctrlKey || isCursorAtEndOrNotFocused(taskInput))):
            taskNewAdd(taskInput);
            const nextGroupRegion = groupRegion.nextElementSibling;
            if (nextGroupRegion == null) {
                return;
            }
            const nextGroupHeaderRegion = nextGroupRegion.querySelector(".group-header-region");
            nextGroupHeaderRegion.focus();
            event.preventDefault();
            break;
        case (event.key === "ArrowUp" || event.key === "ArrowLeft") && (event.ctrlKey || isCursorAtStartOrNotFocused(taskInput)):
            taskNewAdd(taskInput);
            const taskListRegion = groupRegion.querySelector(".task-list-region");
            const lastTaskRegion = taskListRegion.lastElementChild;
            if (lastTaskRegion != null) {
                taskInlineInputActivate(lastTaskRegion);
            } else {
                const groupHeaderRegion = groupRegion.querySelector(".group-header-region")
                groupSelect(groupHeaderRegion, false);
            }
            event.preventDefault();
            break;

    }
}

function taskInlineInputOnKeyDown(event) {
    const taskInlineInput = event.target;
    const taskRegion = taskInlineInput.parentElement;
    const nextTaskRegion = taskRegion.nextElementSibling;
    switch (true) {
        case event.key === "ArrowDown" && event.altKey:
            taskMoveDown(taskRegion);
            event.preventDefault();
            break;
        case event.key === "ArrowUp" && event.altKey:
            taskMoveUp(taskRegion);
            event.preventDefault();
            break;
        case (event.key === "Enter" && !event.shiftKey && !event.ctrlKey) || ((event.key === "ArrowDown" || event.key === "ArrowRight") && (event.ctrlKey || isCursorAtEndOrNotFocused(taskInlineInput))):

            if (nextTaskRegion != null) {
                taskInlineInputActivate(nextTaskRegion, true);
            } else {
                const groupRegion = taskRegion.parentElement.parentElement;
                const taskNewInput = groupRegion.querySelector(".task-input");
                taskNewInput.focus();
            }
            taskInlineInputOnBlur(event);
            event.preventDefault();
            break;
        case (event.key === "ArrowUp" || event.key === "ArrowLeft") && (event.ctrlKey || isCursorAtStartOrNotFocused(taskInlineInput)):
            const prevTaskRegion = taskRegion.previousElementSibling;
            if (prevTaskRegion != null) {
                taskInlineInputActivate(prevTaskRegion);
            } else {
                const groupRegion = taskRegion.parentElement.parentElement;
                const groupHeaderRegion = groupRegion.querySelector(".group-header-region");
                groupSelect(groupHeaderRegion, false);
            }
            event.preventDefault();
            break;
        case (event.key === "Enter" && event.ctrlKey) || (event.key.toLowerCase() === "t" && event.altKey):
            taskStatusSet(taskRegion.id, "1");
            event.preventDefault();
            break;
        case event.key.toLowerCase() === "p" && event.altKey:
            taskStatusSet(taskRegion.id, "2");
            event.preventDefault();
            break;
        case event.key.toLowerCase() === "d" && event.altKey:
            taskStatusSet(taskRegion.id, "3");
            event.preventDefault();
            break;
        case event.key.toLowerCase() === "c" && event.altKey:
            taskStatusSet(taskRegion.id, "4");
            event.preventDefault();
            break;
    }
}

function taskRemoveOnClick(event) {
    const taskRemoveButton = event.target;
    const taskId = taskRemoveButton.dataset.payload;
    taskRemove(taskId);
}

function taskRemove(taskId) {
    const taskRegion = document.getElementById(taskId);
    const taskPre = taskRegion.querySelector(".task-inline-input,.task-pre");
    const taskText = taskPre.innerText;
    const groupRegion = taskRegion.parentElement;
    const groupId = groupRegion.id;
    const prevTaskRegion = taskRegion.previousElementSibling;
    let prevTaskId = null;

    if (prevTaskRegion != null) {
        prevTaskId = prevTaskRegion.id;
    }

    const eventMessage = {
        "type": "task-delete",
        "instance": instanceGuid,
        "jwt": getCookieByName("jwtToken"),
        "payload": {
            "text": taskText,
            "id": taskId,
            "group": groupId,
            "status": "1", // todo
            "after": prevTaskId
        }
    };

    appEvent.send(JSON.stringify(eventMessage));
}

function taskOnDeleteEvent(task) {
    const taskRegion = document.getElementById(task.id);
    taskRegion.remove();
    
    store.delete("task", task.id);
}

function taskUpOnClick(event) {
    const taskUpButton = event.target;
    const taskId = taskUpButton.dataset.payload;
    const taskRegion = document.getElementById(taskId);
    taskMoveUp(taskRegion);
}

function taskMoveUp(taskRegion) {
    const taskId = taskRegion.id;
    const taskStatus = taskRegion.dataset.status;
    const taskText = taskRegion.querySelector(".task-inline-input,.task-pre").innerText;
    let groupId = taskRegion.parentElement.parentElement.id;
    const taskPrevRegion = taskRegion.previousElementSibling;
    let taskPrevPrevId = null;
    if (taskPrevRegion == null) {
        const groupRegion = taskRegion.parentElement.parentElement;
        const prevGroupRegion = groupRegion.previousElementSibling;
        if (prevGroupRegion == null) {
            return;
        }
        groupId = prevGroupRegion.id;
        const taskListRegion = prevGroupRegion.querySelector(".task-list-region");
        const lastTaskRegion = taskListRegion.lastElementChild;
        if (lastTaskRegion != null) {
            taskPrevPrevId = lastTaskRegion.id;
        }

    } else {
        const taskPrevPrevRegion = taskPrevRegion.previousElementSibling;
        if (taskPrevPrevRegion != null) {
            taskPrevPrevId = taskPrevPrevRegion.id;
        }
    }

    const eventMessage = {
        "type": "task-update",
        "instance": instanceGuid,
        "jwt": getCookieByName("jwtToken"),
        "payload": {
            "text": taskText,
            "id": taskId,
            "group": groupId,
            "status": taskStatus,
            "after": taskPrevPrevId
        }
    };

    appEvent.send(JSON.stringify(eventMessage));
}

function taskDownOnClick(event) {
    const taskDownButton = event.target;
    const taskId = taskDownButton.dataset.payload;
    const taskRegion = document.getElementById(taskId);
    taskMoveDown(taskRegion);
}

function taskMoveDown(taskRegion) {
    const taskId = taskRegion.id;
    const taskStatus = taskRegion.dataset.status;
    const taskText = taskRegion.querySelector(".task-inline-input,.task-pre").innerText;
    let groupId = taskRegion.parentElement.parentElement.id;
    const taskNextRegion = taskRegion.nextElementSibling;
    let taskNextRegionid = null;
    if (taskNextRegion == null) {
        const groupRegion = taskRegion.parentElement.parentElement;
        const nextGroupRegion = groupRegion.nextElementSibling;
        if (nextGroupRegion == null) {
            return;
        }
        groupId = nextGroupRegion.id;
    } else {
        taskNextRegionid = taskNextRegion.id;
    }

    const eventMessage = {
        "type": "task-update",
        "instance": instanceGuid,
        "jwt": getCookieByName("jwtToken"),
        "payload": {
            "text": taskText,
            "id": taskId,
            "group": groupId,
            "status": taskStatus,
            "after": taskNextRegionid
        }
    };

    appEvent.send(JSON.stringify(eventMessage));
}

function taskStatusImgOnClick(event) {
    const taskRegion = event.target.parentElement;
    const taskId = taskRegion.id;
    let taskStatusId = taskRegion.dataset.status;
    const taskText = taskRegion.querySelector(".task-inline-input,.task-pre").innerText;
    const groupId = taskRegion.parentElement.parentElement.id;
    const prevTaskId = taskRegion.previousElementSibling?.id || null;

    switch (true) {
        case taskStatusId == 1:
            taskStatusId = "2";
            break;
        case taskStatusId == 2:
            taskStatusId = "3";
            break;
        case taskStatusId == 3:
            taskStatusId = "4";
            break;
        case taskStatusId == 4:
            taskStatusId = "1";
            break;
    }

    const eventMessage = {
        "type": "task-update",
        "instance": instanceGuid,
        "jwt": getCookieByName("jwtToken"),
        "payload": {
            "text": taskText,
            "id": taskId,
            "group": groupId,
            "status": taskStatusId,
            "after": prevTaskId
        }
    };

    appEvent.send(JSON.stringify(eventMessage));

}

function dropdownStatusOnSelect(event) {
    const dropdownOptionRegion = event.target;
    const payload = JSON.parse(dropdownOptionRegion.dataset.payload);
    const taskId = payload.taskid;
    const taskStatus = payload.status;
    taskStatusSet(taskId, taskStatus);
}

function taskStatusSet(taskId, taskStatus) {
    const taskRegion = document.getElementById(taskId);
    const taskText = taskRegion.querySelector(".task-inline-input,.task-pre").innerText;
    const groupId = taskRegion.parentElement.parentElement.id;
    const prevTaskId = taskRegion.previousElementSibling?.id || null;
    const eventMessage = {
        "type": "task-update",
        "instance": instanceGuid,
        "jwt": getCookieByName("jwtToken"),
        "payload": {
            "text": taskText,
            "id": taskId,
            "group": groupId,
            "status": taskStatus,
            "after": prevTaskId
        }
    };

    appEvent.send(JSON.stringify(eventMessage));
}

function persistState() {
    const selectedProjectId = document.querySelector(".project-region-selected").id;
    localStorage.setItem("selected-project-id", selectedProjectId);
    const focusedElement = document.activeElement;
    let focusedElementInfo = null;
    let selection = null;
    switch (true) {
        case focusedElement.classList.contains("project-region"):
        case focusedElement.classList.contains("project-region-selected"):
            selection = getEditableSelection(focusedElement);
            focusedElementInfo = { type: "project", id: focusedElement.id, text: focusedElement.innerText, selStart: selection.start, selEnd: selection.end };
            break;
        case focusedElement.classList.contains("group-input"):
            focusedElementInfo = { type: "group-input", id: "", text: focusedElement.value, selStart: focusedElement.selectionStart, selEnd: focusedElement.selectionEnd };
            break;
        case focusedElement.classList.contains("group-header-region"):
        case focusedElement.classList.contains("group-header-region-selected"):
            selection = getEditableSelection(focusedElement);
            focusedElementInfo = { type: "group", id: focusedElement.parentElement.id, text: focusedElement.innerText, selStart: selection.start, selEnd: selection.end };
            break;
        case focusedElement.classList.contains("task-input"):
            focusedElementInfo = { type: "task-input", id: focusedElement.parentElement.parentElement.id, text: focusedElement.value, selStart: focusedElement.selectionStart, selEnd: focusedElement.selectionEnd };
            break;
        case focusedElement.classList.contains("task-inline-input"):
            focusedElementInfo = { type: "task-inline-input", id: focusedElement.parentElement.id, text: focusedElement.value, selStart: focusedElement.selectionStart, selEnd: focusedElement.selectionEnd };
            break;
    }
    if (focusedElementInfo != null) {
        localStorage.setItem("focused-element", JSON.stringify(focusedElementInfo));
    } else {
        localStorage.removeItem("focused-element");
    }
    localStorage.setItem("scroll-position", window.scrollY);
}

function applyPersistedState() {
    const selectedProjectId = localStorage.getItem("selected-project-id");
    const focusedElementInfo = JSON.parse(localStorage.getItem("focused-element"));
    if (selectedProjectId != null) {
        const selectedProjectRegion = document.getElementById(selectedProjectId);
        if (selectedProjectRegion != null) {
            projectSelect(selectedProjectRegion);
        }
    }

    if (focusedElementInfo) {
        setTimeout(() => {
            let groupRegion = null;

            switch (true) {
                case focusedElementInfo.type == "project":
                    const projectRegion = document.getElementById(focusedElementInfo.id);
                    projectRegion?.focus();
                    if (projectRegion) {
                        projectRegion.innerText = focusedElementInfo.text;
                        setContentEditableSelection(projectRegion, focusedElementInfo.selStart, focusedElementInfo.selEnd);
                    }
                    break;
                case focusedElementInfo.type == "group-input":
                    document.querySelector(".group-input").focus();
                    document.querySelector(".group-input").value = focusedElementInfo.text;
                    document.querySelector(".group-input").setSelectionRange(focusedElementInfo.selStart, focusedElementInfo.selEnd);
                    break;
                case focusedElementInfo.type == "group":
                    groupRegion = document.getElementById(focusedElementInfo.id);
                    if (groupRegion != null) {
                        const groupHeaderRegion = groupRegion.querySelector(".group-header-region,.group-header-region-selected");
                        groupSelect(groupHeaderRegion);
                        groupHeaderRegion.innerText = focusedElementInfo.text;
                        setContentEditableSelection(groupHeaderRegion, focusedElementInfo.selStart, focusedElementInfo.selEnd);
                    }
                    break;
                case focusedElementInfo.type == "task-input":
                    groupRegion = document.getElementById(focusedElementInfo.id);
                    if (groupRegion) {
                        groupRegion.querySelector(".task-input").focus();
                        groupRegion.querySelector(".task-input").value = focusedElementInfo.text;
                        groupRegion.querySelector(".task-input").setSelectionRange(focusedElementInfo.selStart, focusedElementInfo.selEnd);
                    }
                    break;
                case focusedElementInfo.type == "task-inline-input":
                    const taskRegion = document.getElementById(focusedElementInfo.id);
                    if (taskRegion) {
                        taskInlineInputActivate(taskRegion);
                        taskRegion.querySelector(".task-inline-input").value = focusedElementInfo.text;
                        taskRegion.querySelector(".task-inline-input").setSelectionRange(focusedElementInfo.selStart, focusedElementInfo.selEnd);
                    }
                    break;
            }

            const savedPosition = localStorage.getItem("scroll-position");
            if (savedPosition) {
                window.scrollTo(0, parseInt(savedPosition));
                localStorage.removeItem("scroll-position");
            }
        }, 50);
    }
}


function onConnect(event) {
    menu.setOnlineIndicator(true);
    popup.showPopup("Connected", "lightgreen");
    appEvent.resendEvents();
    allUserDataFetch();
    userDataApply();
}

function onDisconnect(event) {
    menu.setOnlineIndicator(false);
    if (popup.getText() != "Disconnected") {
        popup.showPopup("Disconnected", "red");
    }
}

function checkConnection() {
    return appEvent.eventSocket.readyState == WebSocket.OPEN;
}