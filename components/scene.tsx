"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  Sparkles,
  useGLTF,
  useProgress,
} from "@react-three/drei";
import * as THREE from "three";
import {
  COUNT,
  PRODUCTS,
  SLOTS,
  STEP,
  mod,
  type Product,
} from "@/lib/products";

const MODEL = "/models/soda_cans_-_classic_355ml__free_download.glb";
useGLTF.preload(MODEL);

/* -------------------------------------------------------------------------- */
/*  Layout of the wheel (world units, camera looks down -Z at the origin)     */
/* -------------------------------------------------------------------------- */
const ORBIT_R = 8.6; // radius at which the cans sit
const DISC_R = 8.2; // radius of the big coloured circle
const WHEEL_Y = -8.15; // wheel centre, well below the hero
const CAN_H = 3.4; // hero can height
const CAM_FOV = 28;

export class WheelState {
  /** current wheel position, in "slots" (spring driven) */
  w = 0;
  v = 0;
  /** wanted wheel position, in "slots" */
  target = 0;
  /** extra whirl (radians) applied to every can when the wheel moves */
  whirl = 0;
  whirlV = 0;

  setTarget(index: number) {
    const delta = index - this.target;
    this.target = index;
    if (delta !== 0) this.whirl += (delta > 0 ? -1 : 1) * Math.PI * 2;
  }

  step(dt: number) {
    // slightly under-damped spring => a little overshoot, feels physical
    this.v += (70 * (this.target - this.w) - 12 * this.v) * dt;
    this.w += this.v * dt;
    this.whirlV += (-30 * this.whirl - 7.5 * this.whirlV) * dt;
    this.whirl += this.whirlV * dt;
  }
}

/** shortest signed distance (in slots) around the wheel */
const wrapSlots = (x: number) => mod(x + SLOTS / 2, SLOTS) - SLOTS / 2;

/* -------------------------------------------------------------------------- */
/*  Model helpers                                                             */
/* -------------------------------------------------------------------------- */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function findNode(root: THREE.Object3D, key: string) {
  let found: THREE.Object3D | undefined;
  root.traverse((o) => {
    if (!found && norm(o.name) === key) found = o;
  });
  return found;
}

/**
 * The GLB contains six cans lined up next to each other. This builds a
 * stand-alone, centred and normalised group for one of them (geometry and
 * materials stay shared with the original).
 */
function buildCan(source: THREE.Object3D, key: string) {
  const root = source.clone(true);
  const can = findNode(root, key);
  const wrapper = new THREE.Group();
  if (!can || !can.parent) return wrapper;

  const parent = can.parent;
  for (const child of parent.children.slice()) {
    if (child !== can) parent.remove(child);
  }
  can.position.x = 0;
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  root.position.sub(center);
  wrapper.add(root);
  wrapper.scale.setScalar(CAN_H / size.y);

  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.envMapIntensity = 1.5;
    if (mat.map) mat.map.anisotropy = 8;
  });
  return wrapper;
}

/* -------------------------------------------------------------------------- */
/*  Procedural textures                                                       */
/* -------------------------------------------------------------------------- */
const TEX_SIZE = 4096;
const PX = TEX_SIZE / 2 / DISC_R; // texture pixels per world unit

const RING_TEXT = "SPARKLING MOMENTS • ICE COLD • PURE FIZZ • ";

/** Draws the decorative dial (ticks, rings and curved text) of the wheel. */
function paintWheel(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const c = TEX_SIZE / 2;
  ctx.clearRect(0, 0, TEX_SIZE, TEX_SIZE);

  // soft top light
  const glow = ctx.createRadialGradient(
    c,
    c - 7.4 * PX,
    0,
    c,
    c - 7.4 * PX,
    6.5 * PX,
  );
  glow.addColorStop(0, "rgba(255,255,255,0.28)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(c, c, DISC_R * PX, 0, Math.PI * 2);
  ctx.fill();

  // rings
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 5;
  for (const r of [DISC_R - 0.14, DISC_R - 0.5]) {
    ctx.beginPath();
    ctx.arc(c, c, r * PX, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 4;
  for (const r of [5.3, 3.4]) {
    ctx.beginPath();
    ctx.arc(c, c, r * PX, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ticks
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineCap = "round";
  const ticks = 240;
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * Math.PI * 2;
    const long = i % 10 === 0;
    const r0 = (DISC_R - 0.5) * PX;
    const r1 = (DISC_R - (long ? 0.95 : 0.78)) * PX;
    ctx.lineWidth = long ? 7 : 4;
    ctx.beginPath();
    ctx.moveTo(c + Math.sin(a) * r0, c - Math.cos(a) * r0);
    ctx.lineTo(c + Math.sin(a) * r1, c - Math.cos(a) * r1);
    ctx.stroke();
  }

  // curved text, stretched so it closes up perfectly around the circle
  const base = 6.55 * PX;
  const fontSize = (0.95 * PX) / 0.7;
  ctx.font = `900 ${fontSize}px WheelFont, Montserrat, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const chars = RING_TEXT.split("");
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const unit = widths.reduce((a, b) => a + b, 0);
  const circumference = Math.PI * 2 * base;
  const reps = Math.max(1, Math.round(circumference / unit));
  const extra = (circumference - unit * reps) / (chars.length * reps);

  ctx.fillStyle = "rgba(255,255,255,0.17)";
  let s = 0;
  for (let rep = 0; rep < reps; rep++) {
    for (let i = 0; i < chars.length; i++) {
      const w = widths[i];
      const phi = (s + w / 2) / base;
      ctx.save();
      ctx.translate(c + Math.sin(phi) * base, c - Math.cos(phi) * base);
      ctx.rotate(phi);
      ctx.fillText(chars[i], 0, 0);
      ctx.restore();
      s += w + extra;
    }
  }
}

function repaintWheel(tex: THREE.CanvasTexture) {
  paintWheel(tex.image as HTMLCanvasElement);
  tex.needsUpdate = true;
}

function makeShadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(0,0,0,0.55)");
  g.addColorStop(0.5, "rgba(0,0,0,0.22)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* -------------------------------------------------------------------------- */
/*  Scene pieces                                                              */
/* -------------------------------------------------------------------------- */

/** Spring that drives the wheel. Mounted before the wheel so it updates first. */
function WheelDriver({
  index,
  wheel,
}: {
  index: number;
  wheel: React.RefObject<WheelState>;
}) {
  useEffect(() => {
    wheel.current.setTarget(index);
  }, [index, wheel]);

  useFrame((_, rawDt) => {
    wheel.current.step(Math.min(rawDt, 1 / 30));
  });
  return null;
}

function CameraRig() {
  useFrame((state, dt) => {
    const { camera, size, pointer } = state;
    const aspect = size.width / size.height;
    const halfTan = Math.tan(THREE.MathUtils.degToRad(CAM_FOV / 2));
    const z = Math.max(16, 8.6 / (2 * halfTan * aspect));
    camera.position.x = THREE.MathUtils.damp(
      camera.position.x,
      pointer.x * 0.45,
      3,
      dt,
    );
    camera.position.y = THREE.MathUtils.damp(
      camera.position.y,
      pointer.y * 0.25,
      3,
      dt,
    );
    camera.position.z = THREE.MathUtils.damp(camera.position.z, z, 4, dt);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function Disc({
  product,
  wheelTexture,
}: {
  product: Product;
  wheelTexture: THREE.Texture;
}) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const target = useMemo(() => new THREE.Color(product.disc), [product.disc]);
  useFrame((_, dt) => {
    mat.current?.color.lerp(target, 1 - Math.exp(-dt * 4));
  });
  return (
    <group>
      <mesh>
        <circleGeometry args={[DISC_R, 160]} />
        <meshBasicMaterial
          ref={mat}
          color={PRODUCTS[0].disc}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0, 0.01]}>
        <circleGeometry args={[DISC_R, 160]} />
        <meshBasicMaterial
          map={wheelTexture}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function Slot({
  slot,
  proto,
  wheel,
  shadow,
  onPick,
}: {
  slot: number;
  proto: THREE.Object3D;
  wheel: React.RefObject<WheelState>;
  shadow: THREE.Texture;
  onPick: (slot: number) => void;
}) {
  const hold = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const can = useMemo(() => proto.clone(true), [proto]);

  useFrame(({ clock, pointer }) => {
    const h = hold.current;
    const sp = spin.current;
    if (!h || !sp) return;
    const s = wheel.current;
    const d = wrapSlots(slot - s.w);
    const ad = Math.abs(d);
    h.visible = ad < 3.7;
    if (!h.visible) return;

    const t = clock.elapsedTime;
    const f = Math.min(ad, 2); // 0 = hero, 2+ = far away
    const focus = 1 - f * 0.5;

    h.scale.setScalar(1 - f * 0.15);
    h.position.set(
      0,
      ORBIT_R - f * 0.55 + Math.sin(t * 1.1 + slot) * 0.07 * focus,
      1.3 - f * 0.12,
    );
    sp.rotation.set(
      -pointer.y * 0.14 * focus + Math.sin(t * 0.7 + slot) * 0.02,
      PRODUCTS[slot % COUNT].yaw +
        Math.sin(t * 0.5 + slot) * 0.3 -
        d * 0.55 +
        s.whirl +
        pointer.x * 0.35 * focus,
      0,
    );
  });

  return (
    <group rotation={[0, 0, -slot * STEP]}>
      <group
        ref={hold}
        onClick={(e) => {
          if (e.delta > 8) return;
          e.stopPropagation();
          onPick(slot);
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        {/* soft drop shadow, like the `filter: drop-shadow` on the reference */}
        <mesh position={[0.45, -0.5, -0.85]} scale={[3, 5.4, 1]}>
          <planeGeometry />
          <meshBasicMaterial
            map={shadow}
            transparent
            opacity={0.5}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <group ref={spin}>
          <primitive object={can} />
        </group>
      </group>
    </group>
  );
}

function Wheel({
  wheel,
  product,
  onPick,
}: {
  wheel: React.RefObject<WheelState>;
  product: Product;
  onPick: (slot: number) => void;
}) {
  const gltf = useGLTF(MODEL);
  const group = useRef<THREE.Group>(null);
  const protos = useMemo(
    () => PRODUCTS.map((p) => buildCan(gltf.scene, p.node)),
    [gltf.scene],
  );
  const [wheelTexture] = useState(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = TEX_SIZE;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  });
  const [shadow] = useState(makeShadowTexture);

  useEffect(() => {
    let alive = true;
    const repaint = () => repaintWheel(wheelTexture);
    repaint();
    const face = new FontFace("WheelFont", "url(/fonts/Montserrat-Black.ttf)", {
      weight: "900",
    });
    face
      .load()
      .then((loaded) => {
        if (!alive) return;
        document.fonts.add(loaded);
        repaint();
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [wheelTexture]);

  useFrame(() => {
    if (group.current) group.current.rotation.z = wheel.current.w * STEP;
  });

  return (
    <group ref={group} position={[0, WHEEL_Y, 0]}>
      <Disc product={product} wheelTexture={wheelTexture} />
      {Array.from({ length: SLOTS }, (_, k) => (
        <Slot
          key={k}
          slot={k}
          proto={protos[k % COUNT]}
          wheel={wheel}
          shadow={shadow}
          onPick={onPick}
        />
      ))}
    </group>
  );
}

function World({
  index,
  wheel,
  onPick,
}: {
  index: number;
  wheel: React.RefObject<WheelState>;
  onPick: (slot: number) => void;
}) {
  const product = PRODUCTS[mod(index, COUNT)];
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.setClearColor(0x000000, 0);
  }, [gl]);

  return (
    <>
      <CameraRig />
      <WheelDriver index={index} wheel={wheel} />

      {/* Studio lighting without any network requests */}
      <Environment resolution={256}>
        <Lightformer
          form="rect"
          intensity={6}
          position={[0, 6, 3]}
          scale={[14, 3, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={4}
          position={[-7, 1, 3]}
          scale={[2.5, 9, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={4}
          position={[7, 1, 3]}
          scale={[2.5, 9, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={3}
          position={[0, -4, 6]}
          scale={[12, 2, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="ring"
          intensity={3}
          position={[0, 1, -7]}
          scale={10}
          target={[0, 0, 0]}
        />
      </Environment>
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 6, 9]} intensity={1.6} />
      <directionalLight position={[-6, 2, -3]} intensity={1.2} />

      <Wheel wheel={wheel} product={product} onPick={onPick} />

      <Sparkles
        count={70}
        scale={[15, 8, 3]}
        position={[0, 0.2, 2.5]}
        size={3.2}
        speed={0.35}
        opacity={0.55}
        color="#ffffff"
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Loading screen                                                            */
/* -------------------------------------------------------------------------- */
function Loader({ onDone }: { onDone: () => void }) {
  const { progress } = useProgress();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (progress < 100) return;
    const t = setTimeout(() => {
      setHidden(true);
      onDone();
    }, 450);
    return () => clearTimeout(t);
  }, [progress, onDone]);

  return (
    <div
      aria-hidden={hidden}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#f6ece4] transition-opacity duration-700 ${
        hidden ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <p className="font-display text-4xl font-black tracking-tight text-[#e11d2b]">
        FIZZ<span className="text-neutral-900">·</span>LAB
      </p>
      <div className="h-[3px] w-56 overflow-hidden rounded-full bg-neutral-900/10">
        <div
          className="h-full rounded-full bg-[#e11d2b] transition-[width] duration-300"
          style={{ width: `${Math.max(4, progress)}%` }}
        />
      </div>
      <p className="font-sans text-xs tracking-[0.3em] text-neutral-900/50">
        LOADING {Math.round(progress)}%
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Public component                                                          */
/* -------------------------------------------------------------------------- */
type SceneProps = {
  /** unbounded index of the active product (wraps around the wheel) */
  index: number;
  onPick: (slot: number) => void;
  onReady: () => void;
};

export default function Scene({ index, onPick, onReady }: SceneProps) {
  const wheel = useRef(new WheelState());

  return (
    <>
      <div className="absolute inset-0 touch-none">
        <Canvas
          dpr={[1, 2]}
          camera={{ fov: CAM_FOV, near: 0.1, far: 100, position: [0, 0, 16] }}
          gl={{
            alpha: true,
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
          }}
        >
          <World index={index} wheel={wheel} onPick={onPick} />
        </Canvas>
      </div>
      <Loader onDone={onReady} />
    </>
  );
}
