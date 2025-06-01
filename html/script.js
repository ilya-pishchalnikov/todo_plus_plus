
let dragging = false; // true if in dragging mode
let taskListJson = ""; // previous task list json for optimization reasons
const instanceGuid = guid();
appEvent = new AppEvent();
appEvent.onTaskAdd = (event) => {console.log(JSON.stringify(event));}

setInterval(() => renewToken(), 3600000); //hourly
renewToken()

// start polling
setInterval(() => fetchTasksFromServer (document.getElementById('task-list')), 500);
fetchTasksFromServer(document.getElementById('task-list'))


function addInput() {
    const taskList = document.getElementById("task-list");
    // Add li element for input
    const li = document.createElement('li');
    li.className = "input-task";
    li.id = "input-task-li";
    li.draggable = true;

    taskList.appendChild(li);
    addDragAndDropHandlers(li);
    addInputElements(li);
    return li;
}

function addInputElements(li) {
    const input = document.createElement("input");
    input.type = "text";
    input.id = "new-task";
    input.className = "new-task";
    input.placeholder = "Enter new task";// Add new task on enter
    input.setAttribute("autocomplete", "off");
    input.addEventListener('keydown', (event) => newTaskInputKeyDown(event));
    const btnAdd = document.createElement("button");
    btnAdd.id = "add-btn";
    btnAdd.className = "add-btn";
    btnAdd.innerText = "Add";
    btnAdd.onclick = () => addBtnOnClick();
    li.appendChild(input);
    li.appendChild(btnAdd);
    input.focus();
    return input;
}

function addBtnOnClick(event) {
    const taskInput = document.getElementById("new-task");
    const taskText = taskInput.value.trim();
    const taskInputLi = taskInput.parentElement;
    const prevTaskLi = taskInputLi.previousElementSibling;
    let prevTaskId = null
    if (prevTaskLi != null && prevTaskLi.className == "task") {
        prevTaskId = prevTaskLi.id;
    }
    if (taskText === "") return;
    const eventMessage = {
        "type": "task-add",
        "instance": instanceGuid,
        "jwt": getCookieByName("jwtToken"),
        "payload": {
                "text": taskText,
                "id": guid(),
                "group": null,
                "after": prevTaskId
            }
        };
    
    appEvent.send(JSON.stringify(eventMessage));
    addTask(taskText, document.getElementById("input-task-li"));
    taskInput.value = '';
}

function newTaskInputKeyDown(event) {
    switch (true) {
        case (event.key === 'Enter' && !event.shiftKey):
            addBtnOnClick();
            break
        case (event.key === 'ArrowUp'):
            inputTaskLi = document.getElementById("input-task-li");
            previousSibling = inputTaskLi.previousElementSibling;
            if (previousSibling != null) {
                taskStartUpdate(previousSibling);
            }
            break;
        case (event.key === 'ArrowDown'):
            inputTaskLi = document.getElementById("input-task-li");
            nextSibling = inputTaskLi.nextElementSibling;
            if (nextSibling != null) {                
                taskStartUpdate(nextSibling);
            }
            break;      
    }
}
//Add a task function
function addTask(taskText, insertBefore = null, isFetchToServer = true, id = null) {
    const taskList = document.getElementById("task-list")
    const newTask = document.createElement("li");
    newTask.textContent = taskText;
    newTask.className = "task";
    if (id == null) {
        newTask.id = guid();
    }
    else {
        newTask.id = id;
    }
    newTask.draggable = true;
    addDragAndDropHandlers(newTask);
    newTask.onclick = (event) => taskOnClick(event);
    RemoveBtnCreate(newTask);
    taskList.insertBefore(newTask, insertBefore);
    newTask.focus();
    if (isFetchToServer) {
        postTaskList(taskList);
    }
}

function RemoveBtnCreate(parent) {
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'remove-btn';
    removeBtn.onclick = () => remove(parent);
    parent.appendChild(removeBtn);
    return removeBtn
}

function taskOnClick(event) {
    taskStartUpdate (event.target)
}

function taskStartUpdate (task) {

    taskList = task.parentElement;

    const taskUpdateBtn = document.getElementById("update-btn");
    if (taskUpdateBtn != null){
        taskUpdateBtn.onclick();
    }

    // add input elements
    const input = document.createElement("input");
    input.type = "text";
    input.id = "update-task";
    input.className = "update-task";
    input.placeholder = "Enter task content";// Add new task on enter
    input.setAttribute("autocomplete", "off");
    input.addEventListener('keydown', (event) => updateInputkeyDown(event));
    const btnAdd = document.createElement("button");
    btnAdd.id = "update-btn";
    btnAdd.className = "update-btn";
    btnAdd.innerText = "Update";
    btnAdd.onclick = () => btnUpdateOnClick();
    task.appendChild(input);
    task.appendChild(btnAdd);
    input.focus();
    input.value = task.firstChild.nodeValue;
    input.dataset =
    removeBtn = task.querySelector(".remove-btn");
    if (removeBtn != null) {
        removeBtn.remove();
    }
    task.firstChild.nodeValue = "";
    inputTaskLi = document.getElementById("input-task-li")
    if (inputTaskLi != null) {
        inputTaskLi.remove();
    }
}

function updateInputkeyDown(event) {
    currentTask = event.target.parentElement;
    taskList = currentTask.parentElement;
    switch (true) {
        case (event.key === 'Enter' && !event.shiftKey):
            btnUpdateOnClick();
            break
        case (event.key === 'Escape'):
            btnUpdateOnClick();
            break
        case (event.key === 'ArrowUp'):
            previousSibling = currentTask.previousElementSibling;
            if (previousSibling != null) {    
                btnUpdateOnClick();            
                taskStartUpdate (previousSibling)
            }
            break;            
        case (event.key === 'ArrowDown'):
            nextSibling = currentTask.nextElementSibling;
            if (nextSibling != null) {    
                btnUpdateOnClick();            
                taskStartUpdate (nextSibling)
            }
            break;
    }
}

function btnUpdateOnClick() {
    const taskUpdateInput = document.getElementById("update-task");
    const taskText = taskUpdateInput.value.trim();
    const taskLi = taskUpdateInput.parentElement;
    const taskList = taskLi.parentElement;
    const nextTaskLi = taskLi.nextElementSibling;
    if (taskText === "") {
        taskLi.remove();
    } else {
        taskLi.innerText = taskText;
        taskUpdateInput.remove();
        RemoveBtnCreate(taskLi);
    }
    inputLi = addInput();
    taskList.insertBefore(inputLi, nextTaskLi);  
    postTaskList(taskList);
    document.getElementById("new-task").focus();
}

// removes Task (li)
function remove(li) {
    li.remove();
    postTaskList(document.getElementById('task-list'));
}

// Fetches task list from the server 
function fetchTasksFromServer(taskList) {
    if (!dragging) {
        fetch('/api/task_list', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + getCookieByName("jwtToken")
            }
        }
        )
            .then(response => {
                if (response.status === 401) {
                    console.error("Unauthorized - Redirect to login");
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
            .then(taskListResponse => {
                const json = JSON.stringify(taskListResponse);
                if (json != taskListJson) {

                    const taskLiList = taskList.querySelectorAll('li');
                    const inputTask = document.getElementById("input-task-li");
                    const input = document.getElementById("new-task");
                    let updateInput = document.getElementById("update-task");
                    let inputTaskNext = null;
                    let inputTaskNextId = null;
                    let updateInputTasktId = null;
                    let updateInputValue = null;

                    if (inputTask!=null) {
                        inputTaskNext = inputTask.nextElementSibling
                        if (inputTaskNext != null) {
                            inputTaskNextId = inputTaskNext.id;
                        }
                    }

                    if (updateInput != null) {
                        updateInputTasktId = updateInput.parentElement.id;
                        updateInputValue = updateInput.value;
                    }


                    Array.from(taskLiList).forEach(task => {
                        if (task.className == "task") {
                            taskList.removeChild(task);
                        }
                    });

                    taskListResponse.forEach(item => {
                        addTask(item.name, null, false, item.id)
                    })

                    if (updateInputTasktId != null) {
                        updateTask = document.getElementById(updateInputTasktId);
                        if (updateTask == null) {
                            alert ("The editing task has been removed")
                        }
                        else {
                            taskStartUpdate(updateTask);
                            updateInput = document.getElementById("update-task");
                            updateInput.value = updateInputValue;
                        }
                    }
                    
                    if (inputTask != null) {
                        taskList.insertBefore(inputTask, document.getElementById(inputTaskNextId));
                    }

                    if (input != null) {
                        input.focus()
                    }

                    if (inputTask == null && updateInput == null) {
                        addInput();
                    }
                }
                taskListJson = json;
            })
            .catch(error => console.error(error));

    }
}

// Uploads task list to the server
function postTaskList(taskList) {
    const jsonBody = taskListToJson(taskList);
    fetch('/api/task_list', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getCookieByName("jwtToken")
        },
        body: jsonBody
    })
    .then(response => {
        if (response.status === 401) {
        console.error("Unauthorized - Redirect to login");
        window.location.href = '/login.html';
        }
        return response.json();
    })
        .catch(error => console.error(error));
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
                console.error("Unauthorized - Redirect to login");
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
        .catch(error => console.error(error));
}

// Serializes task list to JSON for server upload
function taskListToJson(taskList) {
    const items = [];

    taskList.querySelectorAll('li').forEach(li => {
        if (li.className == "task") {
            updateInput = li.querySelector("#update-task");
            let taskName = null;
            if (updateInput == null ){
                taskName = li.firstChild.nodeValue.trim();
            } else {
                taskName= updateInput.value;
            }
            items.push({ id: li.id, name: taskName});
        }
    });

    return JSON.stringify(items);
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

