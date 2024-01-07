import {
    Color3,
    Color4,
  Mesh,
  MeshBuilder,
  PBRBaseSimpleMaterial,
  PBRMaterial,
  Quaternion,
  Scene,
  StandardMaterial,
  Vector3,
  VertexBuffer,
} from "@babylonjs/core";
import { GrowthForm } from "../simulation/Simulator";

export class MeshGenerator {
  scene: Scene;
  size: number;
  offset: number;
  attractorKillRange: number;

  public radialSegments: number = 16;
  public baseRadius: number = 0.15;

  private corals: Coral[] = [];
  private branches: Branch[] = [];

  constructor(scene: Scene, size: number = 1) {
    this.size = size;
    this.offset = this.size / 2;
    this.scene = scene;
    this.attractorKillRange = 0.1;
  }

  AddCorals(corals: number[][]) {
    for (let i = 0; i < corals.length; i++) {
      let cor = corals[i];
      let pos = new Vector3(cor[0] - this.offset, cor[1], cor[2] - this.offset);
      if (this.corals.find((c) => c.id == cor[3])) {
        continue;
      }
      let coral = new Coral(this.scene, pos, cor[3], cor[4]);
      this.corals.push(coral);
    }
  }

  DeadCorals(corals: number[]) {
    this.corals.forEach((coral) => {
      if (corals.includes(coral.id)) {
        coral.Death();
      }
    });
  }

  RemoveCorals(corals: number[]) {
    this.corals.forEach((coral) => {
      if (corals.includes(coral.id)) {
        coral.Remove();
      }
    });
    this.corals = this.corals.filter((_, i) => !corals.includes(i));
  }

  Grow(attractors: number[][]) {
    this.corals.forEach((coral) => {
      if (!coral.alive) return;
      // Filter only attractors that have coral id
        let active = attractors.filter((attractor) => {
            return attractor[3] == coral.id;
        }).map((attractor) => {
            return new Vector3(attractor[0] - this.offset - coral.position.x, attractor[1], attractor[2] - this.offset - coral.position.z);
        });
      coral.Grow(active);
    });
  }
}

class Coral {

  type: GrowthForm;
  position: Vector3;
  mesh: Mesh;
  id: number;
  radSeg: number = 16;
  length: number = 0.5;
  rad: number = 0.28;
  randomGrowth: number = 0.01;

  branches: Branch[] = [];
  extremities: Branch[] = [];
  alive: boolean = true;

  constructor(
    scene: Scene,
    position: Vector3,
    id: number,
    type: GrowthForm = GrowthForm.Branching
  ) {
    this.type = type;
    this.id = id;
    this.position = position;
    this.mesh = new Mesh("coral" + id, scene);
    this.mesh.position = position;

    // Set Initial Branch
    const dir = new Vector3(0, 1, 0);
    this.branches.push(new Branch(new Vector3(0,0,0), dir.scale(this.length), dir));

    // Select Material color based on type
    let colors = [
        new Color3(1, 0, 0),       // red
        new Color3(0.8, 1.0, 0.0), // yellow
        new Color3(0.0, 1.0, 0.4), // green
        new Color3(0.0, 0.4, 1.0), // blue
        new Color3(0.8, 0.0, 1.0), // Foliose
    ]
    let material = new PBRMaterial("coral", scene);
    material.sideOrientation = Mesh.DOUBLESIDE;
    material.metallic = 0.0;
    material.roughness = 0.5;
    material.albedoColor = colors[type];
    material.alpha = 1;
    material.alphaMode = PBRMaterial.PBRMATERIAL_ALPHATESTANDBLEND;
    this.mesh.material = material;

    if (type == GrowthForm.Corymbose) {
      this.rad = 0.28;
      this.length = 0.5;
    } else {
      this.rad = 0.15;
      this.length = 0.4;
    }
  }

  Grow(attractors: Vector3[]) {
    this.branches.forEach((b) => b.attractors = []);
    this.extremities = [];

    // Associate attractors with branches
    attractors.forEach((attractor) => {
      let closest = this.branches.reduce((prev, curr) => {
        let prevDist = prev.end.subtract(attractor).length();
        let currDist = curr.end.subtract(attractor).length();
        return prevDist < currDist ? prev : curr;
      });
      closest.attractors.push(attractor);
    });

    // Grow all branches that have attractors
    let newSegments: Branch[] = [];
    this.branches.forEach((b) => {

      let cond = false;
      if (this.type == GrowthForm.Branching) {
        cond = b.attractors.length > 0 && (b.children.length == 0 || b.end.y > 5);
      } else if (this.type == GrowthForm.Corymbose) {
        cond = b.attractors.length > 0 && (b.children.length < 6);
      }


      if (b.attractors.length > 0 && cond) {
        // Get average attractor position
        let avg = b.attractors.reduce((prev, curr) => prev.add(curr), Vector3.Zero());
        avg = avg.scale(1 / b.attractors.length);

        // Create new branch
        let dir = avg.subtract(b.end);

        dir.addInPlace(Utils.RandomInSphere(this.randomGrowth));

        let start = b.end;
        let end = start.add(dir.scale(this.length));
        let newBranch = new Branch(start, end, dir);
        newBranch.parent = b;
        b.children.push(newBranch);
        newSegments.push(newBranch);
        this.branches.push(newBranch);
        this.extremities.push(newBranch);
      } else {
        if (b.children.length == 0) {
          this.extremities.push(b);
        }
      }
    });
    this.ToMesh();
  }

  ToMesh() {
    let vertices = new Float32Array((this.branches.length + 1) * this.radSeg * 3);
    let indices: Uint16Array = new Uint16Array(this.radSeg * this.branches.length * 6 + this.extremities.length * (this.radSeg - 2) * 3);

    // Compute the size of each branch
    for (let i = this.branches.length - 1; i >= 0; i--) {
      let size = 0;
      let b = this.branches[i];
      if (b.children.length == 0) {
        size = this.rad;
      } else {
        b.children.forEach((c) => {
          if (this.type == GrowthForm.Branching) {
            size += c.size ** 3;
          } else {
            size += c.size * c.size;
          }
        });
        if (this.type == GrowthForm.Branching) {
          size = Math.pow(size, 1/3);
        } else {
          size = Math.pow(size, 1/2);
        }
      }
      b.size = size;
    }

    // Construct vertices
    this.branches.forEach((b, i) => {
      let quat = new Quaternion();
      Quaternion.FromUnitVectorsToRef(new Vector3(0, 1, 0), b.dir, quat);

      let vid = i * this.radSeg;
      b.vid = vid;
      let size = b.size;

      for (let s = 0; s < this.radSeg; s++) {
        if (b.children.length == 0) {
          size = this.rad * 0.8;
        }

        let alpha = (2 * Math.PI * s) / this.radSeg;b
        let pos = new Vector3(Math.cos(alpha) * size,0,Math.sin(alpha) * size);
        pos = pos.applyRotationQuaternion(quat);
        pos.addInPlace(b.end);
        vertices[(vid + s) * 3 + 0] = pos.x;
        vertices[(vid + s) * 3 + 1] = pos.y;
        vertices[(vid + s) * 3 + 2] = pos.z;
      }
    });

    // Construct indices
    this.branches.forEach((b, i) => {
      let fid = i * this.radSeg * 6;
      let bid = b.parent ? b.parent.vid : this.branches.length * this.radSeg;
      let tid = b.vid;

      for (let s = 0; s < this.radSeg; s++) {
        indices[fid + s * 6] = bid + s;
        indices[fid + s * 6 + 1] = tid + s;
        if (s == this.radSeg - 1) {
          indices[fid + s * 6 + 2] = tid;
          indices[fid + s * 6 + 3] = bid+s;
          indices[fid + s * 6 + 4] = tid;
          indices[fid + s * 6 + 5] = bid;
        } else {
          indices[fid + s * 6 + 2] = tid + s + 1;
          indices[fid + s * 6 + 3] = bid + s;
          indices[fid + s * 6 + 4] = tid + s + 1;
          indices[fid + s * 6 + 5] = bid + s + 1;
        }
      }
    });

    // Construct faces for extremities
    this.extremities.forEach((_, i) => {
      let fid = this.branches.length * this.radSeg * 6 + i * (this.radSeg - 2) * 3;
      let bid = this.extremities[i].vid;

      for (let s = 0; s < this.radSeg - 2; s++) {
        indices[fid + s * 3] = bid;
        indices[fid + s * 3 + 1] = bid + s + 1;
        indices[fid + s * 3 + 2] = bid + s + 2;
      }
    });

    // Update mesh
    this.mesh.setVerticesData(VertexBuffer.PositionKind, vertices);
    this.mesh.setVerticesData(VertexBuffer.NormalKind, []);
    this.mesh.setIndices(indices);
    this.mesh.createNormals(true);
  }

  Death() {
    (this.mesh.material as PBRMaterial).albedoColor = new Color3(1, 1, 1);
    this.mesh.material.alpha = 0.8;
    this.mesh.material.markDirty();
  }

  Remove() {
    this.mesh.dispose();
  }
}

class Branch {
  start: Vector3;
  end: Vector3;
  dir: Vector3;
  size: number = 0.1;
  parent: Branch | null = null;
  children: Branch[] = [];

  vid: number = 0;
  attractors: Vector3[] = [];

  constructor(start: Vector3, end: Vector3, direction: Vector3) {
    this.start = start;
    this.end = end;
    this.dir = direction;
    this.children = [];
    this.attractors = [];
  }
}


class Utils {
  static RandomInSphere(radius: number): Vector3 {
    while (true) {
      let x = Math.random() * 2 * radius - radius;
      let y = Math.random() * 2 * radius - radius;
      let z = Math.random() * 2 * radius - radius;
      let v = new Vector3(x, y, z);
      if (v.length() <= radius) {
          return v;
      }
    }
  }
}
