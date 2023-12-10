import * as THREE from 'three';

// @ts-ignore
import { MeshBasicNodeMaterial, wgslFn, attribute } from 'three/examples/jsm/nodes/Nodes.js';

export class CellularAutomata {

    // Grid size
    size: number;
    grid: THREE.InstancedMesh;

    offset: number;
    dummy: THREE.Object3D;
    colors: Float32Array;

    constructor(size: number) {
        this.size = size;

        // Generate grid
        this.offset = (this.size - 1) / 2;
        this.dummy = new THREE.Object3D();
        this.colors = new Float32Array( this.size * this.size * this.size * 4 ); // 4 for RGBA

        this.grid = this.generateGrid();
    }

    // Generate grid
    generateGrid() {
        const grid = new THREE.Group();

        // Generate cells as InstancedMesh
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new MeshBasicNodeMaterial({transparent: true});

        // Must write a ColorNode see https://discourse.threejs.org/t/currently-does-threejs-fully-support-the-webgpu-api/52592/5 https://github.com/mrdoob/three.js/blob/master/examples/webgpu_instance_mesh.html
        
        const mesh = new THREE.InstancedMesh(geometry, material, this.size * this.size * this.size);

        // Set positions
        let i = 0
        for ( let x = 0; x < this.size; x ++ ) {
            for ( let y = 0; y < this.size; y ++ ) {
                for ( let z = 0; z < this.size; z ++ ) {
                    this.dummy.position.set( this.offset - x, this.offset - y, this.offset - z );
                    this.dummy.updateMatrix();
                    mesh.setMatrixAt( i ++, this.dummy.matrix );
                }
            }
        }

        for ( let i = 0; i < this.colors.length; i += 4 ) {
            this.colors[ i ] = 1;
            this.colors[ i + 1 ] = 1;
            this.colors[ i + 2 ] = 1;
            this.colors[ i + 3 ] = 0.3;
        }
        const instancedColor = new THREE.InstancedBufferAttribute(this.colors, 4);
        mesh.geometry.setAttribute('color', instancedColor);
        const colorNode = wgslFn(`
            fn colorNode(color: vec4<f32>) -> vec4<f32> {
                return vec4<f32>(color.r, color.g, color.b, color.a);      
            }
        `);
        // @ts-ignore
        material.colorNode = colorNode({color: attribute('color')});

        this.setColorAt(this.size * this.size, [1, 0, 0, 1]);
        return mesh;
    }

    // Get Grid
    getGrid() {
        return this.grid;
    }

    update() {
        if (this.grid) {
        }
    }

    setColorAt(i: number, color: number[]) {
        this.colors[ i * 3 ] = color[0];
        this.colors[ i * 3 + 1 ] = color[1];
        this.colors[ i * 3 + 2 ] = color[2];
        this.colors[ i * 3 + 3 ] = color[3];
    }
}