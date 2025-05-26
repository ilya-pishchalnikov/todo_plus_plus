
let dragging = false; // true if in dragging mode
let taskListJson = ""; // previous task list json for optimization reasons



// start polling
setInterval(() => fetchTasksFromServer (document.getElementById('task-list')), 500);
fetchTasksFromServer(document.getElementById('task-list'))
setTimeout(() => addInput(), 500);


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
    input.addEventListener('keydown', (event) => newTaskInputKeyDown(event));
    input.addEventListener('focus', (event) => newTaskInputFocus(event));    
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

function addBtnOnClick(e) {
    const taskInput = document.getElementById("new-task");
    const taskText = taskInput.value.trim();
    if (taskText === "") return;
    addTask(taskText, document.getElementById('input-task-li'))
    taskInput.value = '';
}

function newTaskInputKeyDown(event) {
    switch (true) {
        case (event.key === 'Enter' && !event.shiftKey):
            addBtnOnClick();
            break
        case (event.key === 'ArrowUp' && !event.ctrlKey):
            inputTaskLi = document.getElementById("input-task-li");
            previousSibling = inputTaskLi.previousElementSibling;
            if (previousSibling != null) {
                document.getElementById("task-list").insertBefore(inputTaskLi, previousSibling);
            }
            document.getElementById("new-task").focus()
            break;
        case (event.key === 'ArrowDown' && !event.ctrlKey):
            inputTaskLi = document.getElementById("input-task-li");
            nextSibling = inputTaskLi.nextElementSibling;
            if (nextSibling != null) {
                document.getElementById("task-list").insertBefore(inputTaskLi, nextSibling.nextElementSibling);
            }
            document.getElementById("new-task").focus()
            break;
        case (event.key === 'ArrowUp' && event.ctrlKey):
            inputTaskLi = document.getElementById("input-task-li");
            previousSibling = inputTaskLi.previousElementSibling;
            if (previousSibling != null) {
                taskSelect(previousSibling);
                previousSibling.focus();
            }
            break;
    }
}

function newTaskInputFocus(event) {
    taskList = event.target.parentElement.parentElement;
    for (const task of taskList.children) {
        task.dataset.selected = false;
        task.style.border = "none";
    }
}

//Add a task function
function addTask(taskText, insertBefore = null, isFetchToServer = true, id = null) {
    const taskList = document.getElementById("task-list")
    const li = document.createElement('li');
    li.textContent = taskText;
    li.className = "task";
    if (id == null) {
        li.id = guid();
    }
    else {
        li.id = id;
    }
    li.draggable = true;
    addDragAndDropHandlers(li);
    li.onclick = (event) => taskOnClick(event);
    li.ondblclick = (event) => taskOnDblClick(event);
    li.onkeydown = (event) => taskOnKeyDown(event);
    li.tabIndex = 0; // Make focusable
    RemoveBtnCreate(li);
    taskList.insertBefore(li, insertBefore);
    if (isFetchToServer) {
        postTaskList(taskList);
    }
}

function RemoveBtnCreate(parent) {
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'remove-btn';
    removeBtn.onclick = () => remove(li);
    parent.appendChild(removeBtn);
    return removeBtn
}

function taskOnClick(event) {
    taskSelect(event.target)
}

function taskSelect(task) {
    taskList = task.parentElement;

    if (taskList == null) {
        return;
    }

    for (const task of taskList.children) {
        if (task.dataset.selected == "true" && task.querySelector(".update-task") != null) {
            task.querySelector(".update-task").focus();
            return;
        }
        task.dataset.selected = false;
        task.style.border = "none";
    }

    task.dataset.selected = true;
    task.style.borderWidth = '1px';
    task.style.borderStyle = 'solid';
    task.style.borderColor = 'red'; 
    task.focus();
}

function taskOnDblClick(event) {
    taskStartUpdate (event.target)
}

function taskStartUpdate (task) {
    taskList = task.parentElement;
    taskSelect(task);
    for (const task of taskList.children) {
        if (task.dataset.selected == "true" && task.querySelector(".update-task") != null) {
            task.querySelector(".update-task").focus();
            return;
        }
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
    task.removeChild(removeBtn);
    task.firstChild.nodeValue = "";
    document.getElementById("input-task-li").remove()
}

function taskOnKeyDown(event) {
    currentTask = event.target;
    taskList = currentTask.parentElement;
    switch (true) {
        case (event.key === 'Enter' && !event.ctrlKey):
            taskStartUpdate (currentTask);
            break
        case (event.key === 'ArrowUp'):
            previousSibling = currentTask.previousElementSibling;
            if (previousSibling != null && previousSibling.className == "task") {    
                taskSelect(previousSibling);
            }
            if (previousSibling != null && previousSibling.className != "task") {    
                prePreviousSibling = previousSibling.previousElementSibling;
                if (prePreviousSibling != null) {
                    taskSelect(prePreviousSibling);
                }
            }
            break;            
        case (event.key === 'ArrowDown'):
            nextSibling = currentTask.nextElementSibling;
            if (nextSibling != null && nextSibling.className == "task") {     
                taskSelect(nextSibling);
            }
            if (nextSibling != null && nextSibling.className != "task") {    
                nextNextSibling = nextSibling.nextElementSibling;
                if (nextNextSibling != null) {
                    taskSelect(nextNextSibling);
                }
            }
            break;
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
    taskLi.dataset.selected = false;
    taskLi.style.border = "none";
    postTaskList(taskList);
    document.getElementById("new-task").focus();
}

// Fetches task list from the server 
function fetchTasksFromServer(taskList) {
    if (!dragging) {
        fetch('/api/task_list', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        }
        )
            .then(response => response.json())
            .then(taskListResponse => {
                const json = JSON.stringify(taskListResponse);
                if (json != taskListJson) {

                    const lis = taskList.querySelectorAll('li');

                    Array.from(lis).forEach(li => {
                        if (li.className == "task") {
                            taskList.removeChild(li);
                        }
                    });

                    taskListResponse.forEach(item => {
                        addTask(item.name, null, false, item.id)
                    })
                }
                taskListJson = json;
            })
            .catch(error => console.error(error));

    }
}

// removes Task (li)
function remove(li) {
    li.remove();
    postTaskList(document.getElementById('task-list'));
}

// Uploads task list to the server
function postTaskList(taskList) {
    const jsonBody = taskListToJson(taskList);
    fetch('/api/task_list', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: jsonBody
    }
    )
        .catch(error => console.error(error));
}

// Serializes task list to JSON for server upload
function taskListToJson(taskList) {
    const items = [];

    taskList.querySelectorAll('li').forEach(li => {
        if (li.className == "task") {
            items.push({ id: li.id, name: li.firstChild.nodeValue.trim() });
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


