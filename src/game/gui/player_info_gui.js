// player_info_gui.js
export default class PlayerInfoGUI {
    constructor(game) {
        this.game = game;
        this.container = document.createElement('div');
        this.container.id = 'scoreboard';

        document.body.appendChild(this.container);

        this.playerInfos = game.tanks.map((tank, index) => {
            const infoElement = document.createElement('div');
            infoElement.style.borderColor = `${this.colorToRGBA(tank.color, 0.7)}`;
            infoElement.className = 'score-item';
            this.container.appendChild(infoElement);
            return { tank, element: infoElement, kills: 0, lastHealth: null, lastKills: null };
        });
    }

    colorToRGBA(color, alpha = 1) {
        const r = (color >> 16) & 255;
        const g = (color >> 8) & 255;
        const b = color & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    update() {
        this.playerInfos.sort((a, b) => b.kills - a.kills);

        this.playerInfos.forEach((info, index) => {
            const { tank, element, kills, lastHealth, lastKills } = info;
            if (lastHealth === tank.health && kills === lastKills ) return;
            const isCPU = this.game.aiPlayers.some(ai => ai.tank.id === tank.id);
            const healthBar = tank.isDestroyed ? '' : this.createHealthBar(tank.health, tank.maxHealth);
            const tankIcon = this.createTankIcon(tank.color, tank.isDestroyed);

            element.innerHTML = `
                <div style="display: flex; align-items: center; flex-grow: 1;">
                    ${tankIcon}
                    <div style="margin-left: 10px; flex-grow: 1;">
                        <div style="font-weight: bold;">${isCPU ? 'CPU': 'P'}${tank.id}</div>
                        ${healthBar}
                    </div>
                </div>
                <div style="margin-left: 15px; display: flex; align-items: center;">
                    <span style="font-size: 16px;">🏆</span>
                    <span style="font-weight: bold; font-size: 16px; margin-left: 5px;">${kills}</span>
                </div>
            `;
            info.lastHealth = tank.health;
            info.lastKills = kills;
            element.style.order = index;
        });
    }

    createHealthBar(health, maxHealth) {
        const percentage = (health / maxHealth) * 100;
        const color = percentage > 50 ? '#4CAF50' : percentage > 25 ? '#FFC107' : '#F44336';
        return `
            <div style="width: 100%; height: 6px; background-color: #333; border-radius: 3px; overflow: hidden; margin-top: 2px;">
                <div style="width: ${percentage}%; height: 100%; background-color: ${color}; transition: width 0.3s ease-in-out;"></div>
            </div>
        `;
    }

    createTankIcon(color, isDestroyed) {
        const tankColor = isDestroyed ? '#888' : this.colorToRGBA(color, 1);
        const opacity = isDestroyed ? '0.5' : '1';
        return `
            <div style="width: 25px; height: 25px; opacity: ${opacity};">
                <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <rect x="10" y="50" width="80" height="30" fill="${tankColor}" />
                    <rect x="20" y="40" width="60" height="20" fill="${tankColor}" />
                    <rect x="30" y="30" width="40" height="20" fill="${tankColor}" />
                    <rect x="45" y="10" width="10" height="40" fill="${tankColor}" />
                    <circle cx="20" cy="80" r="10" fill="#333" />
                    <circle cx="40" cy="80" r="10" fill="#333" />
                    <circle cx="60" cy="80" r="10" fill="#333" />
                    <circle cx="80" cy="80" r="10" fill="#333" />
                </svg>
            </div>
        `;
    }

    updateKills(tank) {
        const info = this.playerInfos.find(info => info.tank === tank);
        if (info) {
            info.kills++;
        }
    }
}