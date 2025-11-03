class Popup {
    timeoutId;
    
    showPopup(text, color = null) {
        const popup = document.getElementById('popup');
        popup.textContent = text;
        if (color != null) {
            popup.style.backgroundColor = color;
        }
        
        popup.classList.add('active');


        if (this.timeoutId != null) {
            clearTimeout(this.timeoutId);
        } 

        this.timeoutId = setTimeout(this.hidePopup, 3000);
    }

    hidePopup() {
        document.getElementById('popup').classList.remove('active');
        if (this.timeoutId != null) {
            clearTimeout(this.timeoutId);
        } 
    }

    getText() {
        return document.getElementById('popup')?.textContent || null;
    }

}