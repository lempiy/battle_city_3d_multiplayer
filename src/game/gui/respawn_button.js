// player_info_gui.js
export default class PlayerRespawnButton {
    constructor(game) {
        this.game = game;
        this.container = document.createElement('div');
        this.container.id = 'respawn-btn';
        this.visible = false;
        this.container.style.visibility = 'hidden';

        document.body.appendChild(this.container);

        const tank = game.tanks.find((t) => t.id === +game.playerTankId);
        const infoElement = document.createElement('div');
        infoElement.style.borderColor = `${this.colorToRGBA(tank.color, 0.7)}`;
        infoElement.className = 'respawn-item';
        infoElement.textContent = "RESPAWN";
        this.container.appendChild(infoElement);
        this.data = { tank, element: infoElement };

    }

    colorToRGBA(color, alpha = 1) {
        const r = (color >> 16) & 255;
        const g = (color >> 8) & 255;
        const b = color & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    setVisible(visible) {
        this.visible = visible;
        this.container.style.visibility = visible ? 'visible' : 'hidden';
    }
}
