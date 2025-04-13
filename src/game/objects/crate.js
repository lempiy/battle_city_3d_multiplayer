import * as CANNON from 'cannon';

export default class Crate {
    static objectId = 1;
    constructor(position, size = 2) {

        this.position = position;
        this.size = size;
        this.createPhysicsBody();
    }


    createPhysicsBody() {
        const shape = new CANNON.Box(new CANNON.Vec3(this.size/2, this.size/2, this.size/2));
        this.body = new CANNON.Body({ mass: 0 }); // масса 0 для статичного об'єкта
        this.body.addShape(shape);
        this.body.position.copy(this.position);
    }

    update() { }
}
