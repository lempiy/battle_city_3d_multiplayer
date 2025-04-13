export class SimpleJoystick {
    constructor(options) {
        this.options = Object.assign({
            zone: document.body,
            size: 100,
            position: { left: '50%', top: '50%' },
            restJoystick: true,
            dataOnly: true
        }, options);

        this.zone = typeof this.options.zone === 'string' ? document.querySelector(this.options.zone) : this.options.zone;
        this.size = this.options.size;
        this.nipple = null;
        this.eventHandlers = {};
        this.touchId = null;

        this.init();
    }

    init() {
        if (!this.options.dataOnly) {
            this.createNipple();
        }
        this.bindEvents();
    }

    createNipple() {
        this.nipple = document.createElement('div');
        this.nipple.style.width = `${this.size}px`;
        this.nipple.style.height = `${this.size}px`;
        this.nipple.style.borderRadius = '50%';
        this.nipple.style.background = 'rgba(255, 255, 255, 0.5)';
        this.nipple.style.position = 'absolute';
        this.nipple.style.left = this.options.position.left;
        this.nipple.style.top = this.options.position.top;
        this.nipple.style.transform = 'translate(-50%, -50%)';
        this.zone.appendChild(this.nipple);
    }

    bindEvents() {
        this.zone.addEventListener('touchstart', this.handleStart.bind(this));
        this.zone.addEventListener('touchmove', this.handleMove.bind(this));
        this.zone.addEventListener('touchend', this.handleEnd.bind(this));
    }

    handleStart(event) {
        if (this.touchId !== null) return;
        this.touchId = event.changedTouches[0].identifier;
        const touch = event.changedTouches[0];
        const pos = this.getRelativePosition(touch);
        this.trigger('start', { x: pos.x, y: pos.y });
    }

    handleMove(event) {
        event.preventDefault();
        event.stopPropagation();
        const touch = Array.from(event.changedTouches).find(t => t.identifier === this.touchId);
        if (!touch) return;
        const pos = this.getRelativePosition(touch);
        const data = this.calculateJoystickData(pos);
        this.trigger('move', data);
        if (!this.options.dataOnly) {
            this.updateNipplePosition(data);
        }
    }

    handleEnd(event) {
        const touch = Array.from(event.changedTouches).find(t => t.identifier === this.touchId);
        if (!touch) return;
        this.touchId = null;
        this.trigger('end');
        if (this.options.restJoystick && !this.options.dataOnly) {
            this.resetNipplePosition();
        }
    }

    getRelativePosition(touch) {
        const rect = this.zone.getBoundingClientRect();
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
    }

    calculateJoystickData(pos) {
        const centerX = this.zone.clientWidth / 2;
        const centerY = this.zone.clientHeight / 2;
        const deltaX = pos.x - centerX;
        const deltaY = pos.y - centerY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = this.size / 2;
        const angle = Math.atan2(deltaY, deltaX);
        const force = Math.min(distance / maxDistance, 1);

        return {
            angle: {
                radian: angle,
                degree: angle * (180 / Math.PI)
            },
            force: force,
            position: {
                x: pos.x,
                y: pos.y
            },
            distance: distance
        };
    }

    updateNipplePosition(data) {
        const x = Math.cos(data.angle.radian) * data.force * (this.size / 2);
        const y = Math.sin(data.angle.radian) * data.force * (this.size / 2);
        this.nipple.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    }

    resetNipplePosition() {
        this.nipple.style.transform = 'translate(-50%, -50%)';
    }

    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
    }

    trigger(event, data) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => handler(event, data));
        }
    }

    static create(options) {
        return new SimpleJoystick(options);
    }
}
