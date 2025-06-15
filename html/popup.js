class Popup {
    timeoutId;
    
    showPopup(text) {
        logger.log("showPopup");
        const popup = document.getElementById('popup');
        popup.textContent = text;
        popup.classList.add('active');

        if (this.timeoutId != null) {
            clearTimeout(this.timeoutId);
        } 

        this.timeoutId = setTimeout(this.hidePopup, 3000);
    }

    hidePopup() {
        logger.log("hidePopup");
        logger.trace();
        document.getElementById('popup').classList.remove('active');
        if (this.timeoutId != null) {
            clearTimeout(this.timeoutId);
        } 
    }

}