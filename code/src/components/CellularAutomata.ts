import * as THREE from 'three';

import InputNode from 'three/examples/jsm/nodes/core/InputNode';

import { range, MeshBasicNodeMaterial, wgslFn, instancedDynamicBufferAttribute, instanceIndex, attribute } from 'three/examples/jsm/nodes/Nodes.js';

export class CellularAutomata {

    // Grid size
    size: number;
    grid: THREE.InstancedMesh;

    offset: number;
    dummy: THREE.Object3D;
    colors: Float32Array;

    constructor(size: number) {
        console.log('Initializing Cellular Automata');
        this.size = size;

        // Generate grid
        this.offset = (this.size - 1) / 2;
        this.dummy = new THREE.Object3D();
        this.colors = new Float32Array( this.size * this.size * this.size * 3 ); // 3 vertices per face  

        this.grid = this.generateGrid();
    }

    // Generate grid
    generateGrid() {
        const grid = new THREE.Group();

        // Generate cells as InstancedMesh
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new MeshBasicNodeMaterial({transparent: true, opacity: 0.8});

        // Must write a ColorNode see https://discourse.threejs.org/t/currently-does-threejs-fully-support-the-webgpu-api/52592/5 https://github.com/mrdoob/three.js/blob/master/examples/webgpu_instance_mesh.html
        
        const mesh = new THREE.InstancedMesh(geometry, material, this.size * this.size * this.size);

        for ( let i = 0; i < this.colors.length; i += 3 ) {
            this.colors[ i ] = Math.random();
            this.colors[ i + 1 ] = Math.random();
            this.colors[ i + 2 ] = Math.random();
        }
        this.colors[0] = 0;
        this.colors[1] = 0;
        this.colors[2] = 0;
        const instancedColor = instancedDynamicBufferAttribute(this.colors, 'color', 3, 0);
        instancedColor.isInterleav
        const colorNode = wgslFn(`
            fn colorNode(instanceID: u32) -> vec3<f32> {
                return vec3<f32>(color.x, insta, instanceID / 1000.0);      
            }
        `, [instancedColor]);
        material.colorNode = colorNode(instanceIndex);
        return mesh;
    }

    // Get Grid
    getGrid() {
        return this.grid;
    }

    update() {
        if (this.grid) {
            const time = Date.now() * 0.0001;
            let i = 0;

            for ( let x = 0; x < this.size; x ++ ) {

                for ( let y = 0; y < this.size; y ++ ) {

                    for ( let z = 0; z < this.size; z ++ ) {
                        this.dummy.position.set( this.offset - x, this.offset - y, this.offset - z );
                        this.dummy.updateMatrix();
                        this.grid.setMatrixAt( i ++, this.dummy.matrix );
                    }
                }
            }
            this.grid.instanceMatrix.needsUpdate = true;
        }
    }

    setColorAt(i: number, color: THREE.Color) {
        this.colors[ i * 3 ] = color.r;
        this.colors[ i * 3 + 1 ] = color.g;
        this.colors[ i * 3 + 2 ] = color.b;
    }
}