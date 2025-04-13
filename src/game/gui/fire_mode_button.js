export class FireModeButton {
    constructor() {
        this.button = document.createElement('div');
        this.button.classList.add('mode-button');
        this.toggleMode(false);
        this.visible = false;
        this.button.style.display = 'none';
        document.body.appendChild(this.button);
    }

    setVisible(isVisible) {
        this.visible = isVisible;
        this.button.style.display = isVisible ? 'block' : 'none';
    }

    toggleMode(isIndirect) {
        if (!isIndirect) {
            this.button.classList.add('direct-fire');
            this.button.classList.remove('indirect-fire');
            this.button.textContent = "T";
        } else {
            this.button.classList.add('indirect-fire');
            this.button.classList.remove('direct-fire');
            this.button.textContent = "A";
        }
    }
}
