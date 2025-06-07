class Menu {

    constructor () {

    }

    showHeader(menuHeader) {
        const menuMain = document.getElementById("menu-main");
        menuMain.innerText = menuHeader;
    }

    addButton(name, payload, onclick, width = null) {
        const menuMain = document.getElementById("menu-main");
        const buttonElement = document.createElement("button");
        buttonElement.className = "menu-main-button";
        buttonElement.innerText = name;
        buttonElement.dataset.payload = payload;
        if (width != null) {
            buttonElement.style.width = width;
        }
        buttonElement.onclick = onclick;
        menuMain.append(buttonElement);
    }
}