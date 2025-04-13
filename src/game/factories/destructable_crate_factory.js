import * as THREE from 'three';
import DestructibleCrate from '../objects/destructible_crate';

export class DestructibleCrateFactory {
    constructor(scene, game, size = 2, resolution = 6, basicCount = 50) {
        this.scene = scene;
        this.game = game;
        this.size = size;
        this.resolution = resolution;
        this.basicCount = basicCount;
        this.cubeSize = size / resolution;
        this.offset = 0;
        const lego = this.game.loader.getModel("red_crate");
        const legoTexture = this.game.loader.getTexture("red_crate");
        const legoTextureNormal = this.game.loader.getTexture("red_crate_normal");
        const material = new THREE.MeshStandardMaterial({
            map: legoTexture,
            normalMap: legoTextureNormal,
            roughness: 1,
            metalness: 0.1,
        });
 
        lego.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.material = material;
        }
        });
        const sz = new THREE.Vector3();
        lego.children[0].geometry.computeBoundingBox();
        lego.children[0].geometry.boundingBox.getSize(sz);
        this.geometryScale = new THREE.Vector3(this.cubeSize*2/sz.x,this.cubeSize/sz.y,this.cubeSize/sz.z);
        this.material = lego.children[0].material;
        this.geometry = lego.children[0].geometry;
    }

    produceCrates(crates) {
        const count = crates.reduce((acc, {height}) => acc + (this.resolution ** 2 / 2) * height, 0);
        this.mesh = new THREE.InstancedMesh(this.geometry, this.material, count);
        this.mesh.castShadow = true;
        this.mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
        //this.mesh.instanceMatrix.needsUpdate = true;
        this.scene.add(this.mesh);
        const result = crates.map((options) => {
            const {position, height, isDirty} = options;
            const c = 0xf6a076;
            const crate = new DestructibleCrate(this.scene, this.game, position, this.mesh, this.offset, this.geometryScale, c, this.size, this.resolution, height);
            if (isDirty) {
                crate.applyState(options);
            }
            this.offset += crate.cubes.length;
            return crate;
        })
        
        return result;
    }
}
