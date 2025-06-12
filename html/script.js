
//let dragging = false; // true if in dragging mode
//let taskListJson = ""; // previous task list json for optimization reasons
const instanceGuid = guid();
const appEvent = new AppEvent();
const menu = new Menu();

appEvent.isLogEvents = true;
appEvent.onProjectAdd = projectAddOnEvent;
appEvent.onProjectDelete = projectRemoveOnEvent;
appEvent.onProjectUpdate = projectUpdateOnEvent;
appEvent.onGroupAdd = groupAddOnEvent;
appEvent.onGroupDelete = groupRemoveOnEvent;
appEvent.onGroupUpdate = groupUpdateOnEvent;
appEvent.onTaskUpdate = groupUpdateOnEvent;
appEvent.onTaskAdd = taskAddOnEvent;
appEvent.onTaskDelete = onTaskDeleteEvent;
appEvent.onTaskUpdate = taskUpdateOnEvent;

setInterval(() => renewToken(), 3600000); //hourly
renewToken();
projectsFetch();

// Fetches task list from the server 
function taskListFetch(projectId) {
    fetch(`/api/task_list?project_id=${projectId}&json_format=grouped`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getCookieByName("jwtToken")
        }
    }
    )
        .then(response => {
            if (response.status === 401) {
                logger.error("Unauthorized - Redirect to login");
                window.location.href = '/login.html';
                return Promise.reject("Unauthorized");
            } if (!response.ok) {
                return response.text().then(text => {
                    return Promise.reject(text); // Properly reject with the error text
                });
            } else{
                return response.json();
            }
        })
        .then(taskList => {
            taskListPopulate(taskList);
        })
        .catch(error => logger.error(error));
}

function taskListPopulate(taskList) {
    const taskListRegion = document.getElementById("groups-region");
    taskListRegion.innerHTML = "";
    groupInputRegion = document.createElement("div");
    groupInputRegion.className = "group-input-region";
    groupInputRegion.id = "group-input-region";
    taskListRegion.append(groupInputRegion);
    
    groupInput = document.createElement("input");
    groupInput.className = "group-input";
    groupInput.id = "group-input";
    groupInput.placeholder = "New task group";
    groupInput.setAttribute("autocomplete", "off");
    groupInput.addEventListener('focus', groupInputOnFocus);
    groupInput.addEventListener('keydown', groupInputOnKeyDown);
    groupInputRegion.append (groupInput);

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

function renewToken() {
    fetch('/api/token_renew', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getCookieByName("jwtToken")
        }
    })
        .then(response => {
            if (response.status === 401) {
                logger.error("Unauthorized - Redirect to login");
                window.location.href = '/login.html';
                return Promise.reject("Unauthorized");
            } if (!response.ok) {
                return response.text().then(text => {
                    return Promise.reject(text); // Properly reject with the error text
                });
            } else{
                return response.text();
            }
        })
        .then (tokenString => {
            setCookie("jwtToken", tokenString, {})
        })
        .catch(error => logger.error(error));
}

function projectsFetch() {
    fetch('/api/projects', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getCookieByName("jwtToken")
        }
    })
    .then(response => {
        if (response.status === 401) {
            logger.error("Unauthorized - Redirect to login");
            window.location.href = '/login.html';
            return Promise.reject("Unauthorized");
        } if (!response.ok) {
            return response.text().then(text => {
                return Promise.reject(text); // Properly reject with the error text
            });
        } else{
            return response.json();
        }
    })
    .then(projects => {
        //projects = JSON.parse(json);
        prevProjectId = null;
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
    projectRegion.innerText = projectName;
    projectRegion.contentEditable = "true";
    projectRegion.dataset.savedtext = projectName;
    projectRegion.onclick = projectRegionOnClick;
    projectRegion.addEventListener('keydown', projectRegionOnKeyDown);
    projectRegion.addEventListener('blur', projectRegionOnBlur);
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
        projectSelect(projectRegion, false);
    }
    return projectRegion
}

function projectRegionOnKeyDown(event) {
    const selectedProjectRegion = document.querySelector(".project-region-selected");
    const nextProjectRegion = selectedProjectRegion.nextElementSibling;
    const prevProjectRegion = selectedProjectRegion.previousElementSibling;
    switch(true) {
        case event.key === 'Enter':
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
                if (isCursorAtStartOrNotFocused(selectedProjectRegion))
                {
                    projectSelect(prevProjectRegion, false);
                    event.preventDefault();
                }
            }
            break;
        case event.key === "ArrowDown":
            const newGroupInput = document.getElementById('group-input');
            newGroupInput.focus();
            event.preventDefault();
            break;
    }
}

function projectRegionOnBlur(event) {
    const projectRegion = event.target;
    const projectName = projectRegion.innerText;
    if ( projectName == projectRegion.dataset.savedtext) {
        return;
    }
    const projectId = projectRegion.id;
    const prevProjectRegion = projectRegion.previousElementSibling;
    let prevProjectId = null;
    if (prevProjectRegion != null) {
        prevProjectId = prevProjectRegion;
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

function projectRegionOnClick(event) {
    const projectRegion = event.target;
    projectSelect(projectRegion, false);
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
    taskListFetch(projectRegion.id);
    projectRegion.focus();
    setCursorAtEdge(projectRegion, isSetCursorAtFirstPosition)
}

function projectAddOnEvent(project) {
    const projectRegion = projectAdd(project.id, project.name, project.after);
    projectSelect(projectRegion, false);
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
        if (firstProject!=null) {
            projectSelect(firstProject, false);
        } else {
            let projectName = prompt("Project name:", "");
            while (projectName == null || projectName == "") {
                alert('Working without any projects is prohibited');
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
}

function projectUpdateOnEvent(project) {
    const projectRegion = document.getElementById(project.id);
    const projectsRegion = projectRegion.parentElement;
    const prevProjectRegion = projectRegion.previousElementSibling;
    let   prevProjectId;
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
                projectsRegion.insertBefore(projectRegion, firstProjectRegion )
            }
        }
    }

    projectRegion.innerText = project.name;
}

function projectAddOnClick(event) {
    const addProjectButton = event.target;
    const projectId = addProjectButton.dataset.payload;
    const projectRegion = document.getElementById(projectId);
    const projectName = prompt("Project name:", "");
    if (projectName==null || projectName == "") {
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
    const projectName = prompt("New project name: ",  projectRegion.innerText);
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

    const prevProjectId =  prevProjectRegion.id;

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
    const projectName = projectRegion.innerText
    const nextProjectRegion = projectRegion.nextElementSibling;
    if (nextProjectRegion == null) {
        return;
    }

    const prevProjectId =  nextProjectRegion.id;

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

function groupInputOnKeyDown (event) {
    const groupInput = event.target;
    const projectSelectedRegion = document.querySelector(".project-region-selected");
    const groupListRegion = document.getElementById("group-list-region");
    const firstGroupRegion = groupListRegion.firstElementChild;
    let firstGroupHeaderRegion = firstGroupRegion.querySelector(".group-header-region");
    if (firstGroupHeaderRegion == null) {
        firstGroupHeaderRegion = firstGroupRegion.querySelector(".group-header-region-selected");
    }
    switch(true) {
        case event.key === 'Enter':
            groupNewAddOnClick();
            break;
        case event.key === 'ArrowUp':
            projectSelect(projectSelectedRegion, false);
            event.preventDefault();
            break;
        case event.key === 'ArrowDown':
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
    let   projectId = null;
    if (selectedProjectRegions.length != 0) {
        projectId = selectedProjectRegions[0].id;
    }
    if (groupName==null || groupName == "") {
        return;
    }

    const eventMessage = {
        "type": "group-add",
        "instance": instanceGuid,
        "jwt": getCookieByName("jwtToken"),
        "payload": {
                "name": groupName,
                "id": guid(),
                "project-id": projectId,
                "after": null
            }
        };

    appEvent.send(JSON.stringify(eventMessage));

    groupInput.value = "";
}

function groupAddOnEvent(group) {
    const groupRegion = groupAdd(group, group.after);
}

function groupUpdateOnEvent(group) {
    const groupRegion = document.getElementById(group.id);
    let groupHeaderRegion = groupRegion.querySelector(".group-header-region-selected");
    if (groupHeaderRegion == null) {
        groupHeaderRegion = groupRegion.querySelector(".group-header-region");
    }
    groupHeaderRegion.innerText = group.name;
    if (group.after != null && group.after != "") {
        prevGroupRegion = document.getElementById(group.after)
        prevGroupRegion.after(groupRegion);
    } else {
        const groupListRegion = groupRegion.parentElement;
        groupListRegion.prepend(groupRegion);
    }

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
    
    groupRegion.addEventListener('dragstart', groupDragStart)
    groupRegion.addEventListener('dragend', groupDragEnd)

    const groupHeader = document.createElement("div");
    groupHeader.className = "group-header-region";
    groupHeader.innerText = group.name;
    groupHeader.onclick = groupHeaderOnClick;
    groupHeader.contentEditable = true;
    groupHeader.dataset.savedtext = group.name;    
    groupHeader.addEventListener("blur", groupHeaderBlur);    
    groupHeader.addEventListener('keydown', groupHeaderOnKeyDown);
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
    
    taskInput.addEventListener('keydown', taskInputOnKeyDown);
    taskInput.addEventListener("input", textAreaAutoResize);
    taskInputRegion.append(taskInput);

    const tasks = group.tasks;
    if (tasks != null) {
        tasks.forEach(task => {
            taskAdd(task);
        })
    }
    return groupRegion;
}


function groupDragStart(event) {
    event.stopPropagation();
    const groupRegion = event.target;
    const groupId = groupRegion.id;
    let groupName = groupRegion.innerText;

    const payload = JSON.stringify({
        id: groupId,
        name: groupName
    });

    event.dataTransfer.setData('application/json', payload);

    groupRegion.classList.add("dragging");
    event.dataTransfer.setDragImage(groupRegion, 0, 0);

    setTimeout(() => {
        const groupListRegion = document.getElementById("group-list-region")
        groupListRegion.classList.add("drop");
        groupListRegion.addEventListener('dragover', groupListDragOver);
        groupListRegion.addEventListener('dragenter', groupListDragEnter);
        groupListRegion.addEventListener('dragleave', groupListDragLeave);
        groupListRegion.addEventListener('drop', groupListDrop);        
    }, 0);
}

function groupDragEnd(event) {
    
    const groupRegion = event.target;
    groupRegion.classList.remove("dragging");


    const groupListRegion = document.getElementById("group-list-region")
    groupListRegion.classList.remove("drop");
    groupListRegion.removeEventListener('dragover', groupListDragOver);
    groupListRegion.removeEventListener('dragenter', groupListDragEnter);
    groupListRegion.removeEventListener('dragleave', groupListDragLeave);
    groupListRegion.removeEventListener('drop', groupListDrop);  

    const groupId = groupRegion.id;
    const groupHeaderRegion = 
        groupRegion.querySelector(".group-header-region") ??
        groupRegion.querySelector(".group-header-region-selected");
    const groupName = groupHeaderRegion.innerText;
    const projectId = document.querySelector(".project-region-selected").id;

    const prevGroupRegion = groupRegion.previousElementSibling;
    const prevGroupId = prevGroupRegion?.id || null;

    const eventMessage = {
        "type": "group-update",
        "instance": instanceGuid,
        "jwt": getCookieByName("jwtToken"),
        "payload": {
                "name": groupName,
                "id": groupId,
                "project-id": projectId,
                "after": prevGroupId
            }
        };

    appEvent.send(JSON.stringify(eventMessage));
}


function groupListDragOver(event) {
    event.preventDefault();
    const draggingGroup = document.querySelector('.dragging');
    const container = this;
    const containerRect = container.getBoundingClientRect();
    
    // Calculate relative Y position within container
    const relY = event.clientY - containerRect.top;
    
    // Get all non-dragging group elements
    const groupRegions = [...container.querySelectorAll('.group-region:not(.dragging), .group-region-selected:not(.dragging)')];
    
    // Find closest group element or determine if we're at the end
    let closestGroupRegion = null;
    let closestOffset = Number.NEGATIVE_INFINITY;
    let shouldAppend = true; // Default to appending if below all elements
    
    groupRegions.forEach(groupRegion => {
        const rect = groupRegion.getBoundingClientRect();
        const groupCenter = rect.top + rect.height/2 - containerRect.top;
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


function groupHeaderOnKeyDown(event) {
    const groupHeaderRegion = event.target;
    const groupRegion = groupHeaderRegion.parentElement;
    const taskListRegion = groupRegion.querySelector(".task-list-region");
    const taskFirstRegion = taskListRegion.firstElementChild;
    switch(true) {
        case event.key === 'Enter':
            event.preventDefault();
            if (taskFirstRegion == null) {
                const taskInput = groupRegion.querySelector(".task-input");
                setTimeout(() => taskInput.focus(), 0); // preventDefault block focus
            } else {
                taskInlineInputActivate(taskFirstRegion);
            }
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

function groupHeaderBlur(event){
    const groupHeaderRegion = event.target;
    if(groupHeaderRegion.innerText == groupHeaderRegion.dataset.savedtext) {
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
                "project-id": projectId,
                "after": prevGroupId
            }
        };

    appEvent.send(JSON.stringify(eventMessage));
}

function groupHeaderOnClick(event) {
    const groupHeaderRegion = event.target;
    groupSelect(groupHeaderRegion, false);
}

function groupSelect(groupHeaderRegion, isSetCursorToTheFirstPosition = false) {

    const groupHeaderSelectedList = document.getElementsByClassName("group-header-region-selected");
    const groupRegion = groupHeaderRegion.parentElement;

    Array.from(groupHeaderSelectedList).forEach(groupHeaderSelected => {
        groupHeaderSelected.className = "group-header-region";
    });
    
    const taskRegionsSelected = document.getElementsByClassName("task-region-selected");

    Array.from(taskRegionsSelected).forEach(taskRegionSelected => {
        taskRegionSelected.className= "task-region";
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
                "project-id": projectId,
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
    let   prevGroupId = null;
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
                "project-id": projectId,
                "after": prevGroupId
            }
        };

    appEvent.send(JSON.stringify(eventMessage));
}

function groupRemoveOnEvent(group) {
    const groupRegion = document.getElementById(group.id)
    groupRegion.remove();
}

function groupUpOnClick(event) {
    const upButton =  event.target;
    const groupId = upButton.dataset.payload;
    const groupRegion = document.getElementById(groupId);
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
    if (groupHeaderRegion == null ) {
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
                "project-id": projectId,
                "after": prevPrevGroupId
            }
        };

    appEvent.send(JSON.stringify(eventMessage));
    
}

function groupDownOnClick(event) {
    const upButton =  event.target;
    const groupId = upButton.dataset.payload;
    const groupRegion = document.getElementById(groupId);
    const nextGroupRegion = groupRegion.nextElementSibling;
    if (nextGroupRegion == null) {
        return;
    }
    const nextGroupId = nextGroupRegion.id;

    let groupHeaderRegion = groupRegion.querySelector(".group-header-region-selected");
    if (groupHeaderRegion == null ) {
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
                "project-id": projectId,
                "after": nextGroupId
            }
        };

    appEvent.send(JSON.stringify(eventMessage));
    
}

function taskInputOnFocus(event) {
    const taskInput = event.target;
    menu.showHeader("New Group: ");
    menu.addButton("Add", taskInput.id, taskNewAddOnClick);

    const taskRegionsSelected = document.getElementsByClassName("task-region-selected");

    Array.from(taskRegionsSelected).forEach(taskRegionSelected => {
        taskRegionSelected.className= "task-region";
    })

    const groupHeaderRegionsSelected = document.getElementsByClassName("group-header-region-selected");

    Array.from(groupHeaderRegionsSelected).forEach(groupHeaderRegionSelected => {
        groupHeaderRegionSelected.className= "group-header-region";
    })
}

function taskNewAddOnClick(event) {
    const addTaskButton = event.target;
    const taskInputId = addTaskButton.dataset.payload;
    const taskInput = document.getElementById(taskInputId);
    taskNewAdd(taskInput);

}

function taskNewAdd (taskInput) {
    const taskInputRegion =  taskInput.parentElement;
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
                "status": 1, // todo
                "after": prevTaskId
            }
        };


    appEvent.send(JSON.stringify(eventMessage));

    taskInput.value = "";
    taskInput.focus;
}

function taskAddOnEvent(task) {
    taskAdd(task);
}

function taskUpdateOnEvent(task) {
    const taskRegion = document.getElementById(task.id);
    if (task.after != null && task.after != "") {
        const prevTaskRegion = document.getElementById(task.after);
        prevTaskRegion.after(taskRegion);
    } else {            
        const groupRegion = document.getElementById(task.group);
        const taskListRegion = groupRegion.querySelector(".task-list-region");
        taskListRegion.prepend(taskRegion);
    }
    
    taskRegion.firstElementChild.innerText = task.text;
}

function taskAdd(task) {
    const prevTaskRegionId = task.after;
    let prevTaskRegion = null;
    
    if (prevTaskRegionId != null && prevTaskRegionId != "") {
        prevTaskRegion = document.getElementById(prevTaskRegionId);
    }
    
    taskRegion = document.createElement("div");
    taskRegion.className = "task-region";
    taskRegion.id = task.id;
    taskRegion.onclick = taskRegionOnClick;
    
    taskPre = document.createElement("pre");
    taskPre.className = "task-pre";  
    taskPre.innerText = task.text;
    taskRegion.appendChild(taskPre); 
    taskRegion.draggable = true;
    taskRegion.addEventListener('dragstart', taskDragStart)
    taskRegion.addEventListener('dragend', taskDragEnd)
    
    if (prevTaskRegion != null) {
        prevTaskRegion.after(taskRegion); 
    } else {
        const groupRegion = document.getElementById(task.group);
        const taskListRegion = groupRegion.querySelector(".task-list-region");
        taskListRegion.append(taskRegion);
    }
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
        text: taskText
    });

    event.dataTransfer.setData('application/json', payload);

    taskRegion.classList.add("dragging");
    event.dataTransfer.setDragImage(taskRegion, 0, 0);

    setTimeout(() => {
        const taskLists = document.querySelectorAll('.task-list-region');

        taskLists.forEach(taskList => {
            taskList.classList.add("drop");
            taskList.addEventListener('dragover', taskListDragOver);
            taskList.addEventListener('dragenter', taskListDragEnter);
            taskList.addEventListener('dragleave', taskListDragLeave);
            taskList.addEventListener('drop', taskListDrop);
        });
    }, 0);
}

function taskDragEnd(event) {
    
    const taskRegion = event.target;
    taskRegion.classList.remove("dragging");

    const taskLists = document.querySelectorAll('.task-list-region');

    taskLists.forEach(taskList => {
        taskList.classList.remove("drop");
        taskList.removeEventListener('dragover', taskListDragOver);
        taskList.removeEventListener('dragenter', taskListDragEnter);
        taskList.removeEventListener('dragleave', taskListDragLeave);
        taskList.removeEventListener('drop', taskListDrop);
    });

    const taskId = taskRegion.id;
    const taskPre = taskRegion.querySelector(".task-pre");
    let taskText = null
    if (taskPre != null) {
        taskText = taskPre.innerText;
    } else {
        const taskInlineInput= taskRegion.querySelector(".task-inline-input");
        taskText = taskInlineInput.value;
    }

    const taskGroupRegion = taskRegion.parentElement.parentElement;
    const groupId = taskGroupRegion.id;
    const prevTaskRegion = taskRegion.previousElementSibling;
    let prevTaskId = null;
    if (prevTaskRegion != null) {
        prevTaskId = prevTaskRegion.id;
    }

    const eventMessage = {
        "type": "task-update",
        "instance": instanceGuid,
        "jwt": getCookieByName("jwtToken"),
        "payload": {
                "text": taskText,
                "id": taskId,
                "group": groupId,
                "status": 1, // todo
                "after": prevTaskId
            }
        };

    appEvent.send(JSON.stringify(eventMessage));
}

function taskListDragOver(event) {
    event.preventDefault();
    const draggingTask = document.querySelector('.dragging');
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

function taskRegionOnClick(event) {
    const target = event.target;
    let taskRegion = null;
    if (target.className == "task-region") {
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
        const groupRegionOld = taskRegionOld.parentElement.parentElement;
        const groupIdOld = groupRegionOld.id;
        const prevTaskRegionOld = taskRegionOld.previousElementSibling;
        let prevTaskIdOld = null;
        if (prevTaskRegionOld != null) {
            prevTaksIdOld = prevTaskRegionOld.id;
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
                        "status": 1, // todo
                        "after": prevTaskIdOld
                    }
                };
        
            appEvent.send(JSON.stringify(eventMessage));
        }
    }

    const taskRegionsSelected = document.getElementsByClassName("task-region-selected");

    Array.from(taskRegionsSelected).forEach(taskRegionSelected => {
        taskRegionSelected.className= "task-region";
    })

    const groupHeaderRegionsSelected = document.getElementsByClassName("group-header-region-selected");

    Array.from(groupHeaderRegionsSelected).forEach(groupHeaderRegionSelected => {
        groupHeaderRegionSelected.className= "group-header-region";
    })

    taskRegion.className = "task-region-selected";

    const taskText = taskRegion.firstElementChild.innerText;

    taskRegion.innerHTML = "";

    const taskInlineInput = document.createElement("textarea");
    taskInlineInput.className = "task-inline-input";
    taskInlineInput.id = "task-inline-input";
    taskInlineInput.wrap = "hard";
    taskInlineInput.value = taskText;
    taskInlineInput.addEventListener("input", textAreaAutoResize);
    taskInlineInput.addEventListener('keydown', taskInlineInputOnKeyDown);
    taskInlineInput.addEventListener("blur", taskInlineInputOnBlur);
    taskRegion.append(taskInlineInput);
    taskInlineInput.style.height = '1px';
    taskInlineInput.style.height = `${taskInlineInput.scrollHeight - 20}px`
    taskInlineInput.focus();
    if (isSetCursorFirstPosition) {
        taskInlineInput.setSelectionRange(0, 0);
    }

    menu.showHeader("Task: ");
    menu.addButton("Remove", taskRegion.id, taskRemoveOnClick);
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
    const groupRegion = taskRegion.parentElement.parentElement;
    const groupId = groupRegion.id;
    const prevTaskRegion = taskRegion.previousElementSibling;
    let prevTaskId = null;
    if (prevTaskRegion != null) {
        prevTaskId = prevTaskRegion.id;
    }
    taskRegion.innerHTML = "";
    taskPre = document.createElement("pre");    
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
                "status": 1,
                "after": prevTaskId
            }
        };

    appEvent.send(JSON.stringify(eventMessage));
}

function taskInputOnKeyDown (event){
    const taskInput = event.target;
    const groupRegion = taskInput.parentElement.parentElement;
    switch(true) {
        case event.key === 'Enter' && !event.shiftKey:
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

function taskInlineInputOnKeyDown (event){
    const taskInlineInput = event.target;
    const taskRegion = taskInlineInput.parentElement;
    const nextTaskRegion = taskRegion.nextElementSibling;
    switch(true) {
        case (event.key === 'Enter' && !event.shiftKey) || ((event.key === "ArrowDown" || event.key === "ArrowRight" ) && (event.ctrlKey || isCursorAtEndOrNotFocused(taskInlineInput))):
            if (nextTaskRegion != null)  {
                taskInlineInputActivate(nextTaskRegion, true);
            } else {
                const groupRegion = taskRegion.parentElement.parentElement;
                const taskNewInput = groupRegion.querySelector(".task-input");
                taskNewInput.focus();
            }
            taskInlineInputOnBlur(event);
            event.preventDefault();
            break;
        case (event.key === "ArrowUp" || event.key === "ArrowLeft" ) && (event.ctrlKey || isCursorAtStartOrNotFocused(taskInlineInput)):
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
    }    
}

function taskRemoveOnClick(event) {
    const taskRemoveButton = event.target;
    const taskId = taskRemoveButton.dataset.payload;
    taskRemove (taskId);
}

function taskRemove (taskId) {
    const taskRegion = document.getElementById(taskId);
    const taskPre = taskRegion.firstElementChild;
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
                "status": 1, // todo
                "after": prevTaskId
            }
        };

    appEvent.send(JSON.stringify(eventMessage));
}

function onTaskDeleteEvent(task) {
    const taskRegion = document.getElementById(task.id);
    taskRegion.remove();
}

function taskUpOnClick(event){
    const taskUpButton = event.target;
    const taskId = taskUpButton.dataset.payload;
    const taskRegion = document.getElementById(taskId);
    const taskText = taskRegion.firstElementChild.innerText;
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
                "status": 1, // todo
                "after": taskPrevPrevId
            }
        };

    appEvent.send(JSON.stringify(eventMessage));
}


function taskDownOnClick(event){
    const taskUpButton = event.target;
    const taskId = taskUpButton.dataset.payload;
    const taskRegion = document.getElementById(taskId);
    const taskText = taskRegion.firstElementChild.innerText;
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
                "status": 1, // todo
                "after": taskNextRegionid
            }
        };

    appEvent.send(JSON.stringify(eventMessage));
}

function textAreaAutoResize(event) {
    const textArea = event.target;
    textArea.style.height = '1px';
    textArea.style.height = `${textArea.scrollHeight - 20}px`
}

// Generates GUID
function guid() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
}


function setCookie(name, value, options = {}) {
    let cookieString = encodeURIComponent(name) + "=" + encodeURIComponent(value);
  
    // Опции по умолчанию
    const defaults = {
        expires: 1, // days
        path: '/',
        domain: '', 
        secure: true, // https
        sameSite: 'none' 
    };
  
    const optionsToUse = { ...defaults, ...options };
  
    const expiresDate = new Date(Date.now() + optionsToUse.expires * 24 * 60 * 60 * 1000);
    cookieString += "; expires=" + expiresDate.toUTCString();
  
    cookieString += "; path=" + optionsToUse.path;
    cookieString += "; domain=" + optionsToUse.domain;
    if (optionsToUse.secure) cookieString += "; secure";
    if (optionsToUse.sameSite === 'none') cookieString += "; samesite=none";
  
    document.cookie = cookieString;
}

function getCookieByName(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) {
        return match[2];
    }
    return null;
}

function isCursorAtEndOrNotFocused(editableElement) {
    if (editableElement.tagName === "INPUT" || editableElement.tagName === "TEXTAREA"){
        return editableElement.selectionStart === editableElement.value.length && editableElement.selectionStart === editableElement.selectionEnd;
    }

    const selection = window.getSelection();
    
    // No selection or no focus on the div
    if (!selection.rangeCount) return true;
    
    const range = selection.getRangeAt(0);
    const cursorPosition = range.startOffset;
    const currentNode = range.startContainer;
  
    // Check if the cursor is inside the editable div
    if (!editableElement.contains(currentNode)) return true;
  
    // Case 1: Cursor is in a text node
    if (currentNode.nodeType === Node.TEXT_NODE) {
      return (
        cursorPosition === currentNode.length &&  // Cursor at end of text
        currentNode === editableElement.lastChild &&  // Last text node in div
        range.endOffset === cursorPosition       // No selection, just cursor
      );
    }
    // Case 2: Cursor is between elements (e.g., after last <br> or <div>)
    else {
      const lastChild = editableElement.lastChild;
      return (
        lastChild && 
        range.startContainer === editableElement && 
        range.startOffset === editableElement.childNodes.length
      );
    }
}

function isCursorAtStartOrNotFocused(editableElement) {
    if (editableElement.tagName === "INPUT" || editableElement.tagName === "TEXTAREA"){
        return editableElement.selectionStart === 0 && editableElement.selectionEnd === 0;
    }

    const selection = window.getSelection();

    
    // No selection or no focus on the div
    if (!selection.rangeCount) return true;
    
    const range = selection.getRangeAt(0);
    const cursorPosition = range.startOffset;
    const currentNode = range.startContainer;
  
    // Check if cursor is inside the editable div
    if (!editableElement.contains(currentNode)) return true;
  
    // Case 1: Cursor is in a text node (first character)
    if (currentNode.nodeType === Node.TEXT_NODE) {
      return (
        cursorPosition === 0 &&                  // Cursor at the start of text
        currentNode === editableElement.firstChild && // First text node in div
        range.endOffset === cursorPosition       // No selection, just cursor
      );
    }
    // Case 2: Cursor is before the first element (e.g., at the very beginning)
    else {
      return (
        range.startContainer === editableElement &&
        range.startOffset === 0
      );
    }
}

function setCursorAtEdge(editableDiv, isFirst) {
    const range = document.createRange();
    const selection = window.getSelection();
  
    // Set range at the end of the editable div
    range.selectNodeContents(editableDiv); // Select all contents
    range.collapse(isFirst); // Collapse to the end
  
    // Clear existing selections and apply the new range
    selection.removeAllRanges();
    selection.addRange(range);
  
    // Focus the div (optional, if not already focused)
    editableDiv.focus();
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.task-region:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}
