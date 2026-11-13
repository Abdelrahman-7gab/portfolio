// One fixed 3D scene behind the page: a generic handheld card terminal that glides to whichever
// chapter anchor ([data-anchor]) is nearest the middle of the screen and prints the receipt out of its
// printer head. Lazy-loaded; the CSS versions stay as fallbacks.
import {
  ACESFilmicToneMapping, AmbientLight, CanvasTexture, Color, DirectionalLight, DoubleSide, Group, Mesh,
  MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, PMREMGenerator,
  SRGBColorSpace, Scene, WebGLRenderer,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface ReceiptData {
  lines: { label: string; value: string; sub?: boolean }[];
  through: string;
}
type Screen = 'idle' | 'printing' | 'printed';
export interface Stage {
  setTheme(theme: 'dark' | 'light'): void;
  reprint(): void;
  dispose(): void;
}

type AnchorKind = 'hello' | 'receipt';
/** How each anchor turns the terminal: its resting yaw and how far it follows the pointer. */
const TURN: Record<AnchorKind, { ry: number; sway: number }> = { hello: { ry: -0.42, sway: 0.5 }, receipt: { ry: -0.1, sway: 0.2 } };
type Pose = { x: number; y: number; s: number; ry: number; rx: number };
const KEYS = ['x', 'y', 's', 'ry', 'rx'] as const;

const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';
const SANS = '"Mona Sans", system-ui, sans-serif';
const PAPER = '#f6f6f2', INK = '#1c1c1a', MUTED = '#6b6b66', SIGNAL = '#F2A13C';

// Terminal dimensions (world units). The paper leaves a slot on top of the printer head.
const BODY = { w: 1, h: 1.9, d: 0.2 };
const HEAD = { h: 0.34, d: 0.42 };
const SLOT_Y = BODY.h / 2 + HEAD.h;
const PW = 0.8; // paper width
const TW = 720, TH = 880; // paper texture size

/* ---------------------------------------------------------------- 2D drawing for the textures */

function paperShape(g: CanvasRenderingContext2D, h: number) {
  const z = 14;
  g.clearRect(0, 0, TW, TH);
  g.fillStyle = PAPER;
  g.beginPath();
  g.moveTo(0, z);
  for (let x = 0; x < TW; x += z * 2) g.lineTo(x + z, 0), g.lineTo(x + z * 2, z);
  g.lineTo(TW, h);
  g.lineTo(0, h);
  g.closePath();
  g.fill();
}

function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, weight: number, color = INK, align: CanvasTextAlign = 'left', spacing = 0) {
  g.font = `${weight} ${size}px ${MONO}`;
  g.fillStyle = color;
  g.textAlign = align;
  g.letterSpacing = `${spacing}px`;
  g.fillText(s, x, y);
}

function rule(g: CanvasRenderingContext2D, y: number) {
  g.strokeStyle = '#9a9a94';
  g.setLineDash([8, 6]);
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(52, y);
  g.lineTo(TW - 52, y);
  g.stroke();
  g.setLineDash([]);
}

function barcode(g: CanvasRenderingContext2D, y: number, h: number) {
  const widths = [3, 1, 2, 1, 1, 3, 2, 1, 3, 1, 1, 2, 3, 1, 2, 2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 3, 1, 1, 2];
  g.fillStyle = INK;
  for (let i = 0, x = 120; x < TW - 120; i++) {
    const w = widths[i % widths.length] * 3;
    if (i % 2 === 0) g.fillRect(x, y, w, h);
    x += w;
  }
}

function drawReceipt(g: CanvasRenderingContext2D, data: ReceiptData) {
  paperShape(g, TH);
  let y = 76;
  text(g, 'SPARE PAYMENTS', TW / 2, y, 30, 700, INK, 'center', 6);
  text(g, 'Since March 2024', TW / 2, (y += 38), 22, 500, MUTED, 'center');
  rule(g, (y += 28));
  y += 44;
  for (const l of data.lines) {
    text(g, l.sub ? l.label : l.label.toUpperCase(), l.sub ? 86 : 52, y, 24, l.sub ? 500 : 600, l.sub ? '#55554f' : INK);
    text(g, l.value, TW - 52, y, 24, l.sub ? 500 : 600, l.sub ? '#55554f' : INK, 'right');
    y += 36;
  }
  rule(g, (y -= 12));
  text(g, 'ENGINEER', 52, (y += 48), 28, 700);
  text(g, 'A. HEGAB', TW - 52, y, 28, 700, INK, 'right');
  text(g, '*** APPROVED ***', TW / 2, (y += 52), 26, 700, INK, 'center', 4);
  text(g, data.through, TW / 2, (y += 34), 19, 500, MUTED, 'center');
  barcode(g, (y += 24), 70);
}

function drawScreen(g: CanvasRenderingContext2D, s: Screen) {
  const W = g.canvas.width, H = g.canvas.height;
  g.fillStyle = '#0c0d0f';
  g.fillRect(0, 0, W, H);
  // Status bar.
  g.font = `500 22px ${MONO}`;
  g.fillStyle = '#7a8087';
  g.textAlign = 'left';
  g.letterSpacing = '3px';
  g.fillText(s === 'idle' ? 'READY' : 'PRINTER', 36, 54);
  g.fillRect(W - 78, 36, 40, 20);
  g.fillStyle = '#0c0d0f';
  g.fillRect(W - 74, 40, 26, 12);
  g.letterSpacing = '0px';

  const cx = W / 2;
  const title = (t: string, y: number, size = 44) => {
    g.font = `700 ${size}px ${SANS}`;
    g.fillStyle = '#f2f2f3';
    g.textAlign = 'center';
    g.fillText(t, cx, y);
  };
  const sub = (t: string, y: number) => {
    g.font = `500 28px ${MONO}`;
    g.fillStyle = '#9aa0a6';
    g.textAlign = 'center';
    g.fillText(t, cx, y);
  };

  if (s !== 'idle') {
    g.strokeStyle = '#f2f2f3';
    g.lineWidth = 8;
    g.strokeRect(cx - 60, 220, 120, 150);
    for (let i = 0; i < 4; i++) g.fillStyle = '#9aa0a6', g.fillRect(cx - 36, 250 + i * 26, i === 3 ? 44 : 72, 8);
    title(s === 'printing' ? 'Printing…' : 'Receipt printed', 470, 40);
    sub('My work, itemised', 520);
    return;
  }
  // Idle: the contactless symbol.
  g.strokeStyle = SIGNAL;
  g.lineCap = 'round';
  g.lineWidth = 12;
  [46, 82, 118].forEach((r, i) => {
    g.globalAlpha = 1 - i * 0.18;
    g.beginPath();
    g.arc(cx - 70, 310, r, -Math.PI / 4, Math.PI / 4);
    g.stroke();
  });
  g.globalAlpha = 1;
  title('Tap wristband', 500);
  sub('or card', 548);
}

/* ---------------------------------------------------------------- the scene */

export async function mountStage(host: HTMLElement, data: ReceiptData): Promise<Stage> {
  await Promise.all([document.fonts.load(`600 24px ${MONO}`), document.fonts.load(`700 44px ${SANS}`)]).catch(() => {});

  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  // Lighting: soft fill, a warm key for highlights, two cool rims so the dark silhouette reads on a dark page.
  scene.add(new AmbientLight(0xffffff, 0.35));
  const key = new DirectionalLight(0xfff4e8, 3.2);
  key.position.set(-3, 5, 6);
  const rimL = new DirectionalLight(0xdfe8ff, 2.6);
  rimL.position.set(-5, 1, -3);
  const rimR = new DirectionalLight(0xdfe8ff, 2.2);
  rimR.position.set(5, 3, -2);
  scene.add(key, rimL, rimR);

  // --- the terminal: clear-coated graphite body, matte two-tone printer head, piano-black glass
  const shell = new MeshPhysicalMaterial({ color: new Color('#1c1f23'), roughness: 0.28, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.4 });
  const headMat = new MeshPhysicalMaterial({ color: new Color('#3a3f46'), roughness: 0.55, metalness: 0.15, clearcoat: 0.35, clearcoatRoughness: 0.4, envMapIntensity: 1.1 });
  const piano = new MeshPhysicalMaterial({ color: new Color('#050607'), roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6 });
  const trim = new MeshStandardMaterial({ color: new Color('#0d0e10'), roughness: 0.7 });
  const terminal = new Group();
  const body = new Mesh(new RoundedBoxGeometry(BODY.w, BODY.h, BODY.d, 8, 0.09), shell);
  const head = new Mesh(new RoundedBoxGeometry(BODY.w + 0.02, HEAD.h + 0.12, HEAD.d, 8, 0.1), headMat);
  head.position.set(0, BODY.h / 2 + HEAD.h / 2 - 0.06, -(HEAD.d - BODY.d) / 2);
  const slot = new Mesh(new RoundedBoxGeometry(PW + 0.08, 0.025, 0.09, 2, 0.012), trim);
  slot.position.set(0, SLOT_Y, 0);
  const bezel = new Mesh(new RoundedBoxGeometry(0.92, 1.46, 0.024, 6, 0.05), piano);
  bezel.position.set(0, 0.14, BODY.d / 2);

  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 512;
  screenCanvas.height = 760;
  const sg = screenCanvas.getContext('2d')!;
  const screenTex = new CanvasTexture(screenCanvas);
  screenTex.colorSpace = SRGBColorSpace;
  const screen = new Mesh(new PlaneGeometry(0.82, 1.22), new MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  screen.position.set(0, 0.14, BODY.d / 2 + 0.013);
  // Glass over the screen: nearly clear, but it picks up reflections from the environment.
  const glass = new Mesh(
    new PlaneGeometry(0.88, 1.42),
    new MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, roughness: 0.02, metalness: 0.6, clearcoat: 1, envMapIntensity: 2.4 }),
  );
  glass.position.set(0, 0.14, BODY.d / 2 + 0.015);
  const homeKey = new Mesh(new RoundedBoxGeometry(0.24, 0.045, 0.02, 3, 0.02), piano);
  homeKey.position.set(0, -0.76, BODY.d / 2 + 0.002);
  const lens = new Mesh(new RoundedBoxGeometry(0.035, 0.035, 0.01, 2, 0.017), trim);
  lens.position.set(0, 0.82, BODY.d / 2 + 0.014);
  // Side keys (power and volume) on the right edge.
  const power = new Mesh(new RoundedBoxGeometry(0.03, 0.16, 0.06, 2, 0.014), headMat);
  power.position.set(BODY.w / 2 + 0.008, 0.45, 0);
  const volume = new Mesh(new RoundedBoxGeometry(0.03, 0.26, 0.06, 2, 0.014), headMat);
  volume.position.set(BODY.w / 2 + 0.008, 0.1, 0);

  // A soft drop shadow on the page behind the terminal: a blurred blob, cheap and always soft.
  const blob = document.createElement('canvas');
  blob.width = blob.height = 128;
  const bg = blob.getContext('2d')!;
  const grad = bg.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  bg.fillStyle = grad;
  bg.fillRect(0, 0, 128, 128);
  const shadowTex = new CanvasTexture(blob);
  const shadow = new Mesh(new PlaneGeometry(2.1, 3.1), new MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.position.set(0.22, -0.28, -0.9);
  terminal.add(shadow, body, head, slot, bezel, screen, glass, homeKey, lens, power, volume);

  // --- the paper: drawn on a canvas, bent per frame, fed upward out of the slot
  const paperCanvas = document.createElement('canvas');
  paperCanvas.width = TW;
  paperCanvas.height = TH;
  const pg = paperCanvas.getContext('2d')!;
  const paperTex = new CanvasTexture(paperCanvas);
  paperTex.colorSpace = SRGBColorSpace;
  paperTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const PH = (PW * TH) / TW;
  const paperGeo = new PlaneGeometry(PW, PH, 16, 70);
  paperGeo.translate(0, -PH / 2, 0); // top edge at local y = 0
  const base = Float32Array.from(paperGeo.attributes['position'].array);
  const paperMat = new MeshStandardMaterial({ map: paperTex, roughness: 0.95, alphaTest: 0.5, side: DoubleSide, transparent: true });
  const paper = new Mesh(paperGeo, paperMat);
  // A soft shadow behind the paper so its edges read on a light page too; it rides along with the paper.
  const ps = document.createElement('canvas');
  ps.width = 128;
  ps.height = 256;
  const psg = ps.getContext('2d')!;
  psg.filter = 'blur(10px)';
  psg.fillStyle = 'rgba(0,0,0,0.5)';
  psg.fillRect(22, 22, 84, 212);
  const paperShadowTex = new CanvasTexture(ps);
  const paperShadow = new Mesh(new PlaneGeometry(PW + 0.24, PH + 0.24), new MeshBasicMaterial({ map: paperShadowTex, transparent: true, depthWrite: false }));
  paperShadow.position.set(0.04, -PH / 2 - 0.05, -0.28);
  paper.add(paperShadow);
  terminal.add(paper);

  const rig = new Group();
  rig.add(terminal);
  rig.visible = false;
  scene.add(rig);

  /* ---- state */
  let screenState: Screen = 'idle';
  const setScreen = (s: Screen) => {
    screenState = s;
    drawScreen(sg, s);
    screenTex.needsUpdate = true;
  };
  setScreen('idle');
  drawReceipt(pg, data);

  let printed = false; // is a receipt out of the printer (or on its way)
  let feedStart = -1, tearStart = -1;
  const FEED_MS = 1200, TEAR_MS = 450;
  // 0 -> 1, fast and eased out, like paper shooting out of the printer then settling.
  const feedNow = (now: number) => (feedStart < 0 ? 0 : 1 - Math.pow(1 - Math.min(1, (now - feedStart) / FEED_MS), 3));

  const startPrint = () => {
    printed = true;
    feedStart = performance.now();
    tearStart = -1;
    paperMat.opacity = 1;
    setScreen('printing');
  };
  const tear = () => {
    if (printed && tearStart < 0) tearStart = performance.now();
  };

  // Shadows read much stronger on the light page, so they are lighter there.
  let shadowK = 1, paperShadowK = 0.9;
  const setTheme = (theme: 'dark' | 'light') => {
    shadowK = theme === 'light' ? 0.45 : 1;
    paperShadowK = theme === 'light' ? 0.7 : 0.9;
    (shadow.material as MeshBasicMaterial).opacity = shadowK;
  };

  /* ---- where the terminal should be: the anchor nearest the middle of the screen */
  const anchors = [...document.querySelectorAll<HTMLElement>('[data-anchor]')]; // static template nodes
  let active: AnchorKind | null = null;
  let pointerX = 0, pointerY = 0;
  const onPointer = (e: PointerEvent) => ((pointerX = e.clientX / innerWidth - 0.5), (pointerY = e.clientY / innerHeight - 0.5));
  addEventListener('pointermove', onPointer, { passive: true });

  const cur = { x: 6, y: 0, s: 0.6, ry: 0.8, rx: 0.1 };
  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();

  /** Where the terminal sits for one anchor box: the whole device in the hero, a paper close-up for the receipt. */
  const poseFor = (r: DOMRect, at: AnchorKind, wpp: number): Pose => {
    const x = (r.left + r.width / 2 - innerWidth / 2) * wpp;
    let s: number, y: number;
    if (at === 'receipt') {
      // Close-up: the paper fills the box so the numbers are readable; the body runs off below.
      s = Math.min((r.width * wpp * 0.94) / PW, (r.height * wpp * 0.94) / (PH + 0.12));
      y = -(r.bottom - innerHeight / 2) * wpp - SLOT_Y * s + 0.06 * s;
    } else {
      s = Math.min((r.height * wpp * 0.92) / (BODY.h + HEAD.h + 0.2), (r.width * wpp * 0.9) / 1.3);
      y = -(r.top + r.height / 2 - innerHeight / 2) * wpp;
    }
    return { x, y, s, ry: TURN[at].ry + pointerX * TURN[at].sway, rx: 0.08 + pointerY * 0.25 };
  };

  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const wpp = (2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360)) / innerHeight; // world units per CSS px

    // Every laid-out anchor near the middle of the screen pulls the terminal toward its pose; the weights fade
    // smoothly with distance, so the terminal blends between chapters instead of snapping. Leftover weight
    // sends it off to the right.
    const poses: { kind: AnchorKind; w: number; p: Pose }[] = [];
    for (const el of anchors) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const d = Math.abs(r.top + r.height / 2 - innerHeight / 2);
      const lin = Math.max(0, 1 - d / (innerHeight * 1.1));
      if (!lin) continue;
      const kindOf = el.dataset['anchor'] as AnchorKind;
      poses.push({ kind: kindOf, w: lin * lin * (3 - 2 * lin), p: poseFor(r, kindOf, wpp) });
    }
    const sum = poses.reduce((a, b) => a + b.w, 0);
    const lead = poses.reduce<(typeof poses)[number] | null>((a, b) => (!a || b.w > a.w ? b : a), null);
    // Hysteresis: keep the current anchor until it clearly fades or another clearly leads, so a slow scroll
    // across a boundary does not flip back and forth.
    const held = active ? (poses.find((p) => p.kind === active)?.w ?? 0) : 0;
    const next = active && held >= 0.4 && !(lead && lead.kind !== active && lead.w >= 0.6) ? active : lead && lead.w >= 0.5 ? lead.kind : null;
    if (next !== active) {
      active = next;
      if (active === 'receipt' && (!printed || tearStart >= 0)) startPrint(); // also restarts a receipt that was tearing off
      if (active !== 'receipt' && printed) tear();
      if (active === 'hello') setScreen('idle');
    }
    // Off-screen means past the right edge by the terminal's own (scaled) width, however big it currently is.
    const offS = lead ? lead.p.s : cur.s;
    const off: Pose = { x: (innerWidth / 2 + 60) * wpp + 1.6 * offS, y: lead ? lead.p.y : cur.y, s: offS, ry: 0.9, rx: 0.1 };
    const norm = Math.max(1, sum);
    const rest = 1 - Math.min(1, sum);
    const target: Pose = { x: 0, y: 0, s: 0, ry: 0, rx: 0 };
    const k = 1 - Math.exp(-dt * 5); // damped easing toward the blended target
    for (const key of KEYS) {
      target[key] = poses.reduce((a, b) => a + (b.w / norm) * b.p[key], 0) + rest * off[key];
      cur[key] += (target[key] - cur[key]) * k;
    }
    // Parked off-screen with nothing pulling it back: hide it, clear the canvas once, and stop the loop.
    // A scroll or resize wakes it again.
    if (!poses.length && Math.abs(target.x - cur.x) < 0.01) {
      if (tearStart >= 0) ((printed = false), (feedStart = -1), (tearStart = -1), (paperMat.opacity = 1)); // finish any tear-off
      rig.visible = false;
      renderer.render(scene, camera);
      renderer.setAnimationLoop(null);
      running = false;
      return;
    }
    rig.position.set(cur.x, cur.y + Math.sin(now / 1100) * 0.03 * cur.s, 0);
    rig.scale.setScalar(cur.s);
    rig.rotation.set(cur.rx, cur.ry, Math.sin(now / 1700) * 0.015);
    rig.visible = true;
    (paperShadow.material as MeshBasicMaterial).opacity = paperShadowK * paperMat.opacity;

    // Paper: feed, tear, and bend.
    let fed = feedNow(now);
    if (printed && now - feedStart > FEED_MS && screenState === 'printing') setScreen('printed');
    let lift = 0;
    if (tearStart >= 0) {
      const p = Math.min(1, (now - tearStart) / TEAR_MS);
      lift = p * p * 0.8;
      paperMat.opacity = 1 - p;
      if (p >= 1) ((printed = false), (feedStart = -1), (tearStart = -1), (fed = 0), (lift = 0), (paperMat.opacity = 1));
    }
    const L = fed * PH;
    paper.position.set(0, SLOT_Y + L + lift, lift * 0.4);
    paper.visible = L > 0.002;
    if (paper.visible) {
      // Bend the paper: it leans back a little and ripples, more the further it is from the slot.
      const pos = paperGeo.attributes['position'];
      const t = now / 1000;
      for (let i = 0; i < pos.count; i++) {
        const s = base[i * 3 + 1] + L; // distance above the slot; hidden inside the head when negative
        const d = s / PH;
        pos.setZ(i, s <= 0 ? 0 : -0.1 * d * d + Math.sin(s * 7 - t * 2.2) * 0.01 * d);
      }
      pos.needsUpdate = true;
      paperGeo.computeVertexNormals();
    }

    renderer.render(scene, camera);
  };
  let running = false;
  const wake = () => {
    if (running) return;
    running = true;
    last = performance.now();
    renderer.setAnimationLoop(frame);
  };
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', wake);
  wake();

  return {
    setTheme,
    reprint: startPrint,
    dispose: () => {
      renderer.setAnimationLoop(null);
      removeEventListener('pointermove', onPointer);
      removeEventListener('resize', resize);
      removeEventListener('scroll', wake);
      removeEventListener('resize', wake);
      scene.traverse((o) => {
        if (!(o instanceof Mesh)) return;
        o.geometry.dispose();
        (o.material as MeshStandardMaterial).map?.dispose();
        (o.material as MeshStandardMaterial).dispose();
      });
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
