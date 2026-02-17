#!/usr/bin/env node
/**
 * Generate low-poly 3D tree GLB models for each canopy shape.
 * Pure Node.js -- no dependencies. Constructs valid GLB (binary glTF 2.0) files.
 *
 * Each model is a simple trunk (brown cylinder) + canopy (green shape).
 * Models are normalized so trunk base sits at y=0 and total height ~1.0.
 * Mapbox `model-scale` will scale them to real-world meters at runtime.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'models');
mkdirSync(OUT_DIR, { recursive: true });

// ─── Geometry generators ──────────────────────────────────────────────────

function generateCylinder(rTop, rBot, height, yOffset = 0, segs = 8) {
  const pos = [], norm = [], idx = [];

  // Side vertices: two rings
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    // bottom
    pos.push(rBot * c, yOffset, rBot * s);
    norm.push(c, 0, s);
    // top
    pos.push(rTop * c, yOffset + height, rTop * s);
    norm.push(c, 0, s);
  }
  for (let i = 0; i < segs; i++) {
    const b = i * 2;
    idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
  }

  // Top cap
  const tc = pos.length / 3;
  pos.push(0, yOffset + height, 0);
  norm.push(0, 1, 0);
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    pos.push(rTop * Math.cos(a), yOffset + height, rTop * Math.sin(a));
    norm.push(0, 1, 0);
  }
  for (let i = 0; i < segs; i++) idx.push(tc, tc + 1 + i, tc + 2 + i);

  // Bottom cap
  const bc = pos.length / 3;
  pos.push(0, yOffset, 0);
  norm.push(0, -1, 0);
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    pos.push(rBot * Math.cos(a), yOffset, rBot * Math.sin(a));
    norm.push(0, -1, 0);
  }
  for (let i = 0; i < segs; i++) idx.push(bc, bc + 2 + i, bc + 1 + i);

  return { positions: new Float32Array(pos), normals: new Float32Array(norm), indices: new Uint16Array(idx) };
}

function generateSphere(radius, yCenter, wSegs = 10, hSegs = 8) {
  const pos = [], norm = [], idx = [];
  for (let y = 0; y <= hSegs; y++) {
    const phi = (y / hSegs) * Math.PI;
    for (let x = 0; x <= wSegs; x++) {
      const theta = (x / wSegs) * Math.PI * 2;
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);
      pos.push(radius * nx, yCenter + radius * ny, radius * nz);
      norm.push(nx, ny, nz);
    }
  }
  for (let y = 0; y < hSegs; y++) {
    for (let x = 0; x < wSegs; x++) {
      const a = y * (wSegs + 1) + x;
      const b = a + wSegs + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { positions: new Float32Array(pos), normals: new Float32Array(norm), indices: new Uint16Array(idx) };
}

function generateEllipsoid(rx, ry, rz, yCenter, wSegs = 10, hSegs = 8) {
  const pos = [], norm = [], idx = [];
  for (let y = 0; y <= hSegs; y++) {
    const phi = (y / hSegs) * Math.PI;
    for (let x = 0; x <= wSegs; x++) {
      const theta = (x / wSegs) * Math.PI * 2;
      const nx = Math.sin(phi) * Math.cos(theta);
      const ny = Math.cos(phi);
      const nz = Math.sin(phi) * Math.sin(theta);
      pos.push(rx * nx, yCenter + ry * ny, rz * nz);
      // Approximate normal for ellipsoid
      const len = Math.sqrt((nx/rx)**2 + (ny/ry)**2 + (nz/rz)**2) || 1;
      norm.push(nx / (rx * len), ny / (ry * len), nz / (rz * len));
    }
  }
  for (let y = 0; y < hSegs; y++) {
    for (let x = 0; x < wSegs; x++) {
      const a = y * (wSegs + 1) + x;
      const b = a + wSegs + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { positions: new Float32Array(pos), normals: new Float32Array(norm), indices: new Uint16Array(idx) };
}

function generateCone(rBottom, height, yOffset = 0, segs = 10) {
  // A cone is just a cylinder with rTop = 0, but we add a proper tip
  const pos = [], norm = [], idx = [];
  const slope = rBottom / height;

  // Base ring + apex
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    // Base vertex
    pos.push(rBottom * c, yOffset, rBottom * s);
    const ny = slope / Math.sqrt(1 + slope * slope);
    const nxz = 1 / Math.sqrt(1 + slope * slope);
    norm.push(nxz * c, ny, nxz * s);
  }
  // Apex vertex (one for each segment for smooth normals)
  const apexStart = pos.length / 3;
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    pos.push(0, yOffset + height, 0);
    const ny = slope / Math.sqrt(1 + slope * slope);
    const nxz = 1 / Math.sqrt(1 + slope * slope);
    norm.push(nxz * c, ny, nxz * s);
  }
  // Side triangles
  for (let i = 0; i < segs; i++) {
    idx.push(i, apexStart + i, i + 1);
  }

  // Base cap
  const bc = pos.length / 3;
  pos.push(0, yOffset, 0);
  norm.push(0, -1, 0);
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    pos.push(rBottom * Math.cos(a), yOffset, rBottom * Math.sin(a));
    norm.push(0, -1, 0);
  }
  for (let i = 0; i < segs; i++) idx.push(bc, bc + 2 + i, bc + 1 + i);

  return { positions: new Float32Array(pos), normals: new Float32Array(norm), indices: new Uint16Array(idx) };
}

// ─── GLB builder ──────────────────────────────────────────────────────────

function buildGLB(meshes) {
  // meshes: [{ geometry, material: [r,g,b,a], transform: {translation?, scale?} }, ...]

  // Build binary buffer from all meshes
  const bufParts = [];
  let byteOffset = 0;
  const accessors = [];
  const bufferViews = [];
  const gltfMeshes = [];
  const nodes = [];
  const materials = [];

  meshes.forEach((m, mi) => {
    const geo = m.geometry;
    const matIdx = mi; // one material per mesh

    materials.push({
      pbrMetallicRoughness: {
        baseColorFactor: m.material,
        metallicFactor: 0,
        roughnessFactor: 0.8,
      },
    });

    // Positions
    const posBuf = Buffer.from(geo.positions.buffer);
    const posViewIdx = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset, byteLength: posBuf.length, target: 34962 });
    const posAccIdx = accessors.length;
    const posBounds = computeBounds(geo.positions, 3);
    accessors.push({
      bufferView: posViewIdx, componentType: 5126, count: geo.positions.length / 3,
      type: 'VEC3', min: posBounds.min, max: posBounds.max,
    });
    bufParts.push(posBuf);
    byteOffset += posBuf.length;

    // Normals
    const normBuf = Buffer.from(geo.normals.buffer);
    const normViewIdx = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset, byteLength: normBuf.length, target: 34962 });
    const normAccIdx = accessors.length;
    accessors.push({
      bufferView: normViewIdx, componentType: 5126, count: geo.normals.length / 3, type: 'VEC3',
    });
    bufParts.push(normBuf);
    byteOffset += normBuf.length;

    // Indices
    const idxBuf = Buffer.from(geo.indices.buffer);
    // Pad indices to 4-byte alignment
    const idxPad = (4 - (idxBuf.length % 4)) % 4;
    const idxBufPadded = idxPad ? Buffer.concat([idxBuf, Buffer.alloc(idxPad)]) : idxBuf;
    const idxViewIdx = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset, byteLength: idxBuf.length, target: 34963 });
    const idxAccIdx = accessors.length;
    accessors.push({
      bufferView: idxViewIdx, componentType: 5123, count: geo.indices.length, type: 'SCALAR',
    });
    bufParts.push(idxBufPadded);
    byteOffset += idxBufPadded.length;

    gltfMeshes.push({
      primitives: [{
        attributes: { POSITION: posAccIdx, NORMAL: normAccIdx },
        indices: idxAccIdx,
        material: matIdx,
      }],
    });

    const node = { mesh: mi };
    if (m.transform) {
      if (m.transform.translation) node.translation = m.transform.translation;
      if (m.transform.scale) node.scale = m.transform.scale;
    }
    nodes.push(node);
  });

  // Root node that parents all mesh nodes
  const rootIdx = nodes.length;
  nodes.push({ children: Array.from({ length: meshes.length }, (_, i) => i) });

  const gltf = {
    asset: { version: '2.0', generator: 'canopyviz-tree-generator' },
    scene: 0,
    scenes: [{ nodes: [rootIdx] }],
    nodes,
    meshes: gltfMeshes,
    accessors,
    bufferViews,
    buffers: [{ byteLength: byteOffset }],
    materials,
  };

  const binBuffer = Buffer.concat(bufParts);

  // Construct GLB
  const jsonStr = JSON.stringify(gltf);
  const jsonPad = (4 - (jsonStr.length % 4)) % 4;
  const jsonBuf = Buffer.from(jsonStr + ' '.repeat(jsonPad), 'utf8');

  const binPad = (4 - (binBuffer.length % 4)) % 4;
  const binPadded = binPad ? Buffer.concat([binBuffer, Buffer.alloc(binPad)]) : binBuffer;

  const totalLength = 12 + 8 + jsonBuf.length + 8 + binPadded.length;

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546C67, 0); // glTF magic
  header.writeUInt32LE(2, 4);           // version
  header.writeUInt32LE(totalLength, 8);

  const jsonChunkHdr = Buffer.alloc(8);
  jsonChunkHdr.writeUInt32LE(jsonBuf.length, 0);
  jsonChunkHdr.writeUInt32LE(0x4E4F534A, 4); // JSON

  const binChunkHdr = Buffer.alloc(8);
  binChunkHdr.writeUInt32LE(binPadded.length, 0);
  binChunkHdr.writeUInt32LE(0x004E4942, 4); // BIN

  return Buffer.concat([header, jsonChunkHdr, jsonBuf, binChunkHdr, binPadded]);
}

function computeBounds(arr, stride) {
  const min = Array(stride).fill(Infinity);
  const max = Array(stride).fill(-Infinity);
  for (let i = 0; i < arr.length; i++) {
    const c = i % stride;
    if (arr[i] < min[c]) min[c] = arr[i];
    if (arr[i] > max[c]) max[c] = arr[i];
  }
  return { min, max };
}

// ─── Tree model definitions ──────────────────────────────────────────────

const TRUNK_COLOR = [0.40, 0.26, 0.13, 1.0];
const CANOPY_COLOR = [0.22, 0.52, 0.18, 1.0];

const treeTypes = {
  // Round: Oak/Maple style -- sphere canopy on short trunk
  'tree-round': () => [
    { geometry: generateCylinder(0.04, 0.055, 0.30, 0, 6), material: TRUNK_COLOR },
    { geometry: generateSphere(0.32, 0.58, 10, 8), material: CANOPY_COLOR },
  ],

  // Oval: Upright deciduous -- taller ellipsoid canopy
  'tree-oval': () => [
    { geometry: generateCylinder(0.04, 0.05, 0.28, 0, 6), material: TRUNK_COLOR },
    { geometry: generateEllipsoid(0.24, 0.36, 0.24, 0.60, 10, 8), material: CANOPY_COLOR },
  ],

  // Conical: Pine/Fir -- cone canopy
  'tree-conical': () => [
    { geometry: generateCylinder(0.035, 0.045, 0.25, 0, 6), material: TRUNK_COLOR },
    { geometry: generateCone(0.28, 0.65, 0.22, 10), material: [0.13, 0.38, 0.12, 1.0] },
  ],

  // Columnar: Cypress -- tall narrow canopy
  'tree-columnar': () => [
    { geometry: generateCylinder(0.03, 0.04, 0.15, 0, 6), material: TRUNK_COLOR },
    { geometry: generateEllipsoid(0.10, 0.42, 0.10, 0.55, 8, 8), material: [0.15, 0.40, 0.12, 1.0] },
  ],

  // Vase: Elm -- wider at top, narrow at trunk
  'tree-vase': () => [
    { geometry: generateCylinder(0.04, 0.05, 0.30, 0, 6), material: TRUNK_COLOR },
    { geometry: generateCylinder(0.35, 0.12, 0.45, 0.28, 10), material: CANOPY_COLOR },
  ],

  // Weeping: Willow -- large droopy sphere
  'tree-weeping': () => [
    { geometry: generateCylinder(0.045, 0.06, 0.28, 0, 6), material: TRUNK_COLOR },
    { geometry: generateEllipsoid(0.38, 0.30, 0.38, 0.48, 12, 8), material: [0.28, 0.55, 0.20, 1.0] },
  ],

  // Spreading: Live Oak -- very wide flat canopy
  'tree-spreading': () => [
    { geometry: generateCylinder(0.06, 0.07, 0.22, 0, 6), material: TRUNK_COLOR },
    { geometry: generateEllipsoid(0.45, 0.20, 0.42, 0.42, 12, 8), material: CANOPY_COLOR },
  ],

  // Fan: Palm -- tall thin trunk with compact canopy at top
  'tree-fan': () => [
    { geometry: generateCylinder(0.035, 0.05, 0.65, 0, 6), material: [0.50, 0.38, 0.22, 1.0] },
    { geometry: generateEllipsoid(0.22, 0.15, 0.22, 0.78, 10, 6), material: [0.18, 0.50, 0.14, 1.0] },
  ],
};

// ─── Generate all models ─────────────────────────────────────────────────

console.log('Generating tree GLB models...');
for (const [name, factory] of Object.entries(treeTypes)) {
  const meshes = factory();
  const glb = buildGLB(meshes);
  const path = join(OUT_DIR, `${name}.glb`);
  writeFileSync(path, glb);
  console.log(`  ${name}.glb (${glb.length} bytes)`);
}
console.log(`Done! ${Object.keys(treeTypes).length} models written to public/models/`);
