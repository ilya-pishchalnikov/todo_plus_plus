class Menu {

    checkConnection;

    constructor () {

    }

    showHeader(menuHeader) {
        const menuMain = document.getElementById("menu-main");
        menuMain.innerText = menuHeader;
        const onlineIndicator = document.createElement("div");
        onlineIndicator.className = "online-indicator-region";
        menuMain.append(onlineIndicator);
        this.setOnlineIndicator(this.checkConnection());
    }

    addButton(name, payload, onclick, width = null) {
        const menuMain = document.getElementById("menu-main");
        const button = document.createElement("button");
        button.className = "menu-main-button";
        button.innerText = name;
        button.dataset.payload = payload;
        if (width != null) {
            button.style.width = width;
        }
        button.onclick = onclick;
        menuMain.append(button);
    }

    addDropDownButton (name, payload, options, onOptionSelect, width = null) {
        const menuMain = document.getElementById("menu-main");
        const button = document.createElement("button");
        button.className = "menu-main-button";
        button.classList.add("dropdown");
        button.innerText = name + "▼";
        button.dataset.payload = payload;
        button.id = guid();
        if (width != null) {
            button.style.width = width;
        }
        button.onclick = this.dropdownButtonOnClick;
        menuMain.append(button);

        const dropdownContent = document.createElement("div");
        dropdownContent.className= "dropdown-region";
        dropdownContent.id = "content-" + button.id;

        options.forEach(option => {
            const optionRegion = document.createElement("div");
            optionRegion.className = "dropdown-option-region";
            optionRegion.dataset.payload = JSON.stringify(option.payload);
            optionRegion.innerText = option.name;
            optionRegion.onclick = onOptionSelect;
            dropdownContent.append(optionRegion);
        });

        menuMain.appendChild(dropdownContent);
        showElementUnder(button, dropdownContent);

        window.addEventListener('click', this.windowOnClick);
    }

    dropdownButtonOnClick(event) {
        const buttonId = event.target.id;
        const content = document.getElementById("content-" + buttonId);
        content.classList.toggle("dropdown-show");
    }

    windowOnClick(event) {
        const elementId = event.target.id;
        const dropdownShown = document.querySelectorAll (".dropdown-show");
        dropdownShown.forEach(element => {
            if (element.id != "content-" + elementId) { 
                element.classList.remove("dropdown-show");
            }
        });
    }

    setOnlineIndicator(isOnline = false) {
        const onlineIndicator = document.querySelector(".online-indicator-region");
        if (onlineIndicator == null) {
            return;
        }
        if (isOnline) {
            onlineIndicator.textContent = "🟢";
        } else {
            onlineIndicator.textContent = "🔴";
        }
    }

}