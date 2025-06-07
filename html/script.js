
//let dragging = false; // true if in dragging mode
//let taskListJson = ""; // previous task list json for optimization reasons
const instanceGuid = guid();
const appEvent = new AppEvent();
const menu = new Menu();

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
renewToken()

// start polling
//setInterval(() => fetchTasksFromServer (document.getElementById('task-list')), 500);
projectsFetch()
//fetchTasksFromServer(document.getElementById('task-list'))


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

    projectRegion.onclick = (event) => projectRegionOnClick(event);
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
        projectSelect(projectRegion);
    }
    return projectRegion
}

function projectRegionOnClick(event) {
    const projectRegion = event.target;
    projectSelect(projectRegion);
}

function projectSelect(projectRegion) {
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
}

function projectAddOnEvent(project) {
    const projectRegion = projectAdd(project.id, project.name, project.after);
    projectSelect(projectRegion);
}

function projectRemoveOnEvent(project) {
    const projectRegion = document.getElementById(project.id);
    const projectsRegion = projectRegion.parentElement;
    const prevProjectRegion = projectRegion.previousElementSibling;
    projectRegion.remove();
    if (prevProjectRegion != null) {
        projectSelect(prevProjectRegion);
    } else {
        const firstProject = projectsRegion.firstElementChild;
        if (firstProject!=null) {
            projectSelect(firstProject);
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

    if (prevGroupId != null && prevGroupId != "") {
        const prevGroupRegion = document.getElementById(prevGroupId);
        prevGroupRegion.after(groupRegion);
    } else {
        groupListRegion.prepend(groupRegion);
    }

    const groupHeader = document.createElement("div");
    groupHeader.className = "group-header-region";
    groupHeader.innerText = group.name;
    groupHeader.onclick = groupHeaderOnClick;
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
    taskInputRegion.append(taskInput);

    const tasks = group.tasks;
    if (tasks != null) {
        tasks.forEach(task => {
            taskAdd(task);
        })
    }
    return groupRegion;
}

function groupHeaderOnClick(event) {
    const groupHeaderRegion = event.target;
    groupSelect(groupHeaderRegion);
}

function groupSelect(groupHeaderRegion) {

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
    // menu.addButton("Rename", projectRegion.id, projectRenameOnClick);
    // menu.addButton("〈", projectRegion.id, projectMoveLeftOnClick, "50px");
    // menu.addButton("〉", projectRegion.id, projectMoveRightOnClick, "50px");
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
    taskPre.className = "task";  // Fixed: className instead of class
    taskPre.innerText = task.text;
    taskRegion.appendChild(taskPre);  // Or taskPre.appendChild(taskRegion) depending on your needs
    
    if (prevTaskRegion != null) {
        prevTaskRegion.after(taskRegion);  // Fixed: added element to insert
    } else {
        const groupRegion = document.getElementById(task.group);
        const taskListRegion = groupRegion.querySelector(".task-list-region");
        taskListRegion.append(taskRegion);
    }


}

function taskRegionOnClick(event) {
    const target = event.target;
    let taskRegion = null;
    if (target.className == "task-region") {
        taskRegion = target;
    } else if (target.className == "task") {
        taskRegion = target.parentElement;
    } else {
        return;
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

    menu.showHeader("Task: ");
    menu.addButton("Remove", taskRegion.id, taskRemoveOnClick);
    menu.addButton("∧", taskRegion.id, taskUpOnClick, "50px");
    menu.addButton("∨", taskRegion.id, taskDownOnClick, "50px");
}

function taskRemoveOnClick(event) {
    const taskRemoveButton = event.target;
    const taskId = taskRemoveButton.dataset.payload;
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


    logger.log (JSON.stringify(eventMessage));
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

