// One fixed 3D scene behind the page: a generic handheld card terminal that glides to whichever
// chapter anchor ([data-anchor]) is nearest the middle of the screen. It idles in the hero, prints the
// receipt, and takes a wristband payment (then refunds it) in the payments chapter.
// Lazy-loaded; the CSS versions stay as fallbacks.
import {
  ACESFilmicToneMapping, AmbientLight, CanvasTexture, Color, DirectionalLight, DoubleSide, Group, Mesh,
  MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, PMREMGenerator,
  LinearFilter, SRGBColorSpace, Scene, WebGLRenderer, BufferGeometry, Float32BufferAttribute,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface ReceiptData {
  lines: { label: string; value: string; sub?: boolean }[];
  through: string;
}
type Screen = 'idle' | 'printing' | 'printed' | 'charge' | 'approved' | 'refund';
export interface Stage {
  setTheme(theme: 'dark' | 'light'): void;
  reprint(): void;
  dispose(): void;
}

type AnchorKind = 'hello' | 'receipt' | 'payments';
/** How each anchor turns the terminal (resting yaw, how far it follows the pointer), and whether it is glued to its
 *  box on wide screens too instead of blending with its neighbours (phones glue everything). */
const TURN: Record<AnchorKind, { ry: number; sway: number; glue?: boolean }> = {
  hello: { ry: -0.42, sway: 0.5 },
  receipt: { ry: -0.1, sway: 0.2 },
  payments: { ry: 0.42, sway: 0.4, glue: true },
};
type Pose = { x: number; y: number; s: number; ry: number; rx: number; rz: number };
const KEYS = ['x', 'y', 's', 'ry', 'rx', 'rz'] as const;
/** One-column layouts (phones): the same media query as the 900px breakpoint in styles.css. */
const NARROW = matchMedia('(max-width: 900px)');

const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';
const SANS = '"Mona Sans", system-ui, sans-serif';
const PAPER = '#f6f6f2', INK = '#1c1c1a', MUTED = '#6b6b66', SIGNAL = '#F2A13C';

// Terminal dimensions (world units). The paper leaves a slot on top of the printer head.
const BODY = { w: 1, h: 1.9, d: 0.2 };
const HEAD = { h: 0.34, d: 0.42 };
const SLOT_Y = BODY.h / 2 + HEAD.h;
const PW = 0.8; // paper width
const TW = 600, TH = 880; // paper texture size (narrow, so the text is large once the paper is fitted to its box)
// Phones: a strip that feeds out sideways. It is as wide as the paper (PW, across the slot) and SL long; the receipt is
// drawn on it turned a quarter, so with the terminal on its side every line reads left to right.
const SW_TEX = 500; // the strip's receipt layout width, in texture pixels (narrower than TW, so the text is larger)
const SL = (PW * SW_TEX) / TH;

/* ---------------------------------------------------------------- 2D drawing for the textures */

/** Thermal paper with a torn, zigzag edge: on top for the upright receipt, on the left for the sideways strip
 *  (its far end once it is fed out to the left). */
function paperShape(g: CanvasRenderingContext2D, w: number, h: number, torn: 'top' | 'left') {
  const z = 14;
  g.clearRect(0, 0, w, h);
  g.fillStyle = PAPER;
  g.beginPath();
  if (torn === 'top') {
    g.moveTo(0, z);
    for (let x = 0; x < w; x += z * 2) g.lineTo(x + z, 0), g.lineTo(x + z * 2, z);
    g.lineTo(w, h);
    g.lineTo(0, h);
  } else {
    g.moveTo(z, 0);
    g.lineTo(w, 0);
    g.lineTo(w, h);
    g.lineTo(z, h);
    for (let y = h; y > 0; y -= z * 2) g.lineTo(0, y - z), g.lineTo(z, y - z * 2);
  }
  g.closePath();
  g.fill();
  // A subtle thermal-paper texture, inside the paper only: fine grain (seeded, so it is the same every time) and a
  // touch of shading toward the long edges, where real paper curls away from the light.
  g.save();
  g.clip();
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // Soft flecks (big enough to survive being scaled down to the screen) and a few faint fibres, in one colour.
  g.fillStyle = g.strokeStyle = 'rgb(110, 104, 90)';
  for (let i = 0; i < (w * h) / 300; i++) {
    g.globalAlpha = 0.05 + rnd() * 0.06;
    g.beginPath();
    g.arc(rnd() * w, rnd() * h, 1.5 + rnd() * 3.5, 0, Math.PI * 2);
    g.fill();
  }
  g.lineWidth = 1.2;
  for (let i = 0; i < (w * h) / 2500; i++) {
    const x = rnd() * w, y = rnd() * h, a = rnd() * Math.PI, l = 8 + rnd() * 22;
    g.globalAlpha = 0.05 + rnd() * 0.06;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  g.globalAlpha = 1;
  const shade = g.createLinearGradient(0, 0, w, 0);
  shade.addColorStop(0, 'rgba(60, 55, 45, 0.08)');
  shade.addColorStop(0.1, 'rgba(60, 55, 45, 0)');
  shade.addColorStop(0.9, 'rgba(60, 55, 45, 0)');
  shade.addColorStop(1, 'rgba(60, 55, 45, 0.08)');
  g.fillStyle = shade;
  g.fillRect(0, 0, w, h);
  g.restore();
}

function text(g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, weight: number, color = INK, align: CanvasTextAlign = 'left', spacing = 0) {
  g.font = `${weight} ${size}px ${MONO}`;
  g.fillStyle = color;
  g.textAlign = align;
  g.letterSpacing = `${spacing}px`;
  g.fillText(s, x, y);
}

function rule(g: CanvasRenderingContext2D, y: number, w: number, m: number) {
  g.strokeStyle = '#9a9a94';
  g.setLineDash([8, 6]);
  g.lineWidth = 2.5;
  g.beginPath();
  g.moveTo(m, y);
  g.lineTo(w - m, y);
  g.stroke();
  g.setLineDash([]);
}

function barcode(g: CanvasRenderingContext2D, y: number, h: number, w: number) {
  const widths = [3, 1, 2, 1, 1, 3, 2, 1, 3, 1, 1, 2, 3, 1, 2, 2, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 3, 1, 1, 2];
  g.fillStyle = INK;
  for (let i = 0, x = 120; x < w - 120; i++) {
    const bw = widths[i % widths.length] * 3;
    if (i % 2 === 0) g.fillRect(x, y, bw, h);
    x += bw;
  }
}

/** The receipt, laid out upright in a w x TH box (w is TW for the upright paper, narrower for the sideways strip). */
function drawReceipt(g: CanvasRenderingContext2D, data: ReceiptData, w = TW, torn: 'top' | 'left' = 'top') {
  paperShape(g, w, TH, torn);
  const m = torn === 'left' ? 36 : 52; // side margin; tighter on the narrow sideways strip
  let y = 76;
  text(g, 'SPARE PAYMENTS', w / 2, y, 30, 700, INK, 'center', 6);
  text(g, 'Since March 2024', w / 2, (y += 38), 22, 500, MUTED, 'center');
  rule(g, (y += 28), w, m);
  y += 44;
  for (const l of data.lines) {
    text(g, l.sub ? l.label : l.label.toUpperCase(), l.sub ? m + 34 : m, y, 24, l.sub ? 500 : 600, l.sub ? '#45453f' : INK);
    text(g, l.value, w - m, y, 24, l.sub ? 500 : 600, l.sub ? '#45453f' : INK, 'right');
    y += 36;
  }
  rule(g, (y -= 12), w, m);
  text(g, 'ENGINEER', m, (y += 48), 28, 700);
  text(g, 'A. HEGAB', w - m, y, 28, 700, INK, 'right');
  text(g, '*** APPROVED ***', w / 2, (y += 52), 26, 700, INK, 'center', 4);
  text(g, data.through, w / 2, (y += 34), 19, 500, MUTED, 'center');
  barcode(g, (y += 24), 70, w);
}

/** The wristband as one thin piece of silicone (like Spare's own): a strap round an oval wrist whose outline is a
 *  superellipse, so its front is a flat face, a little wider where the Spare mark sits. Front is +z. */
const BAND = { a: 0.36, b: 0.27, p: 2.6 }; // half width, half depth, superellipse exponent of the wrist outline
function bandGeometry(U = 220, V = 24) {
  const pos: number[] = [], idx: number[] = [];
  const pw = (v: number) => Math.sign(v) * Math.abs(v) ** (2 / BAND.p);
  for (let i = 0; i <= U; i++) {
    const th = (i / U) * Math.PI * 2;
    let d = Math.abs(th - Math.PI / 2); // angular distance from the front
    d = Math.min(d, Math.PI * 2 - d);
    const f = Math.exp(-((d / 0.55) ** 2)); // 1 at the face, 0 round the back
    const h = 0.26 + 0.1 * f, t = 0.035 + 0.02 * f; // strap width along the wrist, and thickness
    const cx = BAND.a * pw(Math.cos(th)), cz = BAND.b * pw(Math.sin(th));
    // Outward direction, from the outline's tangent.
    const e = 1e-3;
    const tx = BAND.a * pw(Math.cos(th + e)) - BAND.a * pw(Math.cos(th - e));
    const tz = BAND.b * pw(Math.sin(th + e)) - BAND.b * pw(Math.sin(th - e));
    const tl = Math.hypot(tx, tz) || 1, nx = tz / tl, nz = -tx / tl;
    for (let j = 0; j <= V; j++) {
      const ph = (j / V) * Math.PI * 2;
      // A squarish section with soft edges, like moulded silicone.
      const sx = Math.sign(Math.cos(ph)) * Math.abs(Math.cos(ph)) ** 0.4;
      const sy = Math.sign(Math.sin(ph)) * Math.abs(Math.sin(ph)) ** 0.4;
      pos.push(cx + (nx * sx * t) / 2, (sy * h) / 2, cz + (nz * sx * t) / 2);
    }
  }
  for (let i = 0; i < U; i++)
    for (let j = 0; j < V; j++) {
      const a = i * (V + 1) + j, b = a + V + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}
/** The band's front face, from its centre (see bandGeometry). */
const BAND_FACE = BAND.b + 0.055 / 2;

/** The Spare mark: two slanted pieces with a thin diagonal gap between them, in Spare's cyan. */
function drawSpareMark(g: CanvasRenderingContext2D) {
  const k = g.canvas.width / 440;
  const a = [[80, 178], [140, 118], [140, 212], [275, 78], [352, 78], [80, 350]];
  const grad = g.createLinearGradient(0, 440 * k, 440 * k, 0);
  grad.addColorStop(0, '#22d3e6');
  grad.addColorStop(1, '#1aa6cf');
  g.fillStyle = grad;
  for (const piece of [a, a.map(([x, y]) => [440 - x, 440 - y])]) {
    g.beginPath();
    piece.forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k)));
    g.closePath();
    g.fill();
  }
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
  g.fillText({ idle: 'READY', printing: 'PRINTER', printed: 'PRINTER', charge: 'PAYMENT', approved: 'PAYMENT', refund: 'REFUND' }[s], 36, 54);
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

  const contactless = (x: number, y: number, k = 1) => {
    g.strokeStyle = SIGNAL;
    g.lineCap = 'round';
    g.lineWidth = 12 * k;
    [46, 82, 118].forEach((r, i) => {
      g.globalAlpha = 1 - i * 0.18;
      g.beginPath();
      g.arc(x, y, r * k, -Math.PI / 4, Math.PI / 4);
      g.stroke();
    });
    g.globalAlpha = 1;
  };
  // A white ring with a mark inside: a tick for approved, a return arrow for refunded.
  const badge = (mark: 'tick' | 'back') => {
    g.strokeStyle = '#f2f2f3';
    g.lineWidth = 10;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    g.arc(cx, 300, 82, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    if (mark === 'tick') g.moveTo(cx - 36, 302), g.lineTo(cx - 10, 328), g.lineTo(cx + 38, 274);
    else g.arc(cx + 4, 306, 34, -Math.PI * 0.85, Math.PI * 0.55), g.moveTo(cx - 44, 262), g.lineTo(cx - 28, 290), g.lineTo(cx - 2, 276);
    g.stroke();
  };

  if (s === 'charge') {
    contactless(cx - 52, 290, 0.8);
    title('45.00', 470, 72);
    sub('Tap wristband', 530);
    return;
  }
  if (s === 'approved' || s === 'refund') {
    const [mark, head, line] = s === 'approved' ? (['tick', 'Approved', '45.00 paid'] as const) : (['back', 'Refunded', '45.00 back'] as const);
    badge(mark);
    title(head, 470);
    sub(line, 520);
    return;
  }
  if (s !== 'idle') {
    g.strokeStyle = '#f2f2f3';
    g.lineWidth = 8;
    g.strokeRect(cx - 60, 220, 120, 150);
    for (let i = 0; i < 4; i++) g.fillStyle = '#9aa0a6', g.fillRect(cx - 36, 250 + i * 26, i === 3 ? 44 : 72, 8);
    title(s === 'printing' ? 'Printing…' : 'Receipt printed', 470, 40);
    sub('Spare, since March 2024', 520);
    return;
  }
  // Idle: the contactless symbol.
  contactless(cx - 70, 310);
  title('Tap wristband', 500);
  sub('or card', 548);
}

/* ---------------------------------------------------------------- the scene */

export async function mountStage(host: HTMLElement, data: ReceiptData): Promise<Stage> {
  await Promise.all([document.fonts.load(`600 24px ${MONO}`), document.fonts.load(`700 44px ${SANS}`)]).catch(() => {});

  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
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

  // A Spare wristband for the payments chapter: one thin moulded strap (bandGeometry) with the Spare mark on its flat
  // face. It swings in, taps the screen and leaves. The wrist runs up and down; the face (and the mark) faces the viewer.
  const silicone = new MeshPhysicalMaterial({ color: new Color('#16191c'), roughness: 0.72, clearcoat: 0.2, clearcoatRoughness: 0.55, envMapIntensity: 0.9, side: DoubleSide });
  const band = new Group();
  const logoCanvas = document.createElement('canvas');
  logoCanvas.width = logoCanvas.height = 256;
  drawSpareMark(logoCanvas.getContext('2d')!);
  const logoTex = new CanvasTexture(logoCanvas);
  logoTex.colorSpace = SRGBColorSpace;
  const logo = new Mesh(new PlaneGeometry(0.13, 0.13), new MeshBasicMaterial({ map: logoTex, transparent: true, opacity: 0.85, toneMapped: false }));
  logo.position.z = BAND_FACE + 0.002;
  band.add(new Mesh(bandGeometry(), silicone), logo);
  band.visible = false;
  terminal.add(band);
  // Its path in the terminal's own space, around a tap just in front of the screen: [from, in, out, to]. Wide screens
  // keep it within the terminal's column (up from below and in front, away to the upper left); phones use the open
  // right side of the screen.
  // The tap stops at the glass: the band's centre sits far enough out that, turned as it is, its back edge (and the
  // little press) never reach the screen.
  const BAND_TAP = [0.04, 0.1, BODY.d / 2 + 0.42];
  const BAND_PATH = {
    wide: [[0.6, -1.05, 1.5], [0.55, -0.45, 1.15], [-0.3, 0.5, 0.95], [-0.6, 0.95, 1.1]],
    narrow: [[1.2, -0.5, 1.2], [0.85, -0.2, 1.05], [0.7, 0.45, 1.0], [1.25, 0.75, 1.1]],
  };

  // --- the receipt paper. Wide screens feed an upright sheet; phones a sideways strip (see SL) with the receipt
  // drawn on it turned a quarter, so it reads upright on screen once the terminal lies on its side. Each is built the
  // first time its layout needs it, so a visitor only pays for one.
  const PH = (PW * TH) / TW;
  type Sheet = { mesh: Mesh; geo: PlaneGeometry; mat: MeshStandardMaterial; base: Float32Array; len: number; bentAt: number };
  const sheet = (canvas: HTMLCanvasElement, len: number, segX: number, segY: number): Sheet => {
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    // No mipmaps: the paper is shown close to its texture size, and blending mip levels is what blurred the text.
    tex.generateMipmaps = false;
    tex.minFilter = LinearFilter;
    const geo = new PlaneGeometry(PW, len, segX, segY);
    geo.translate(0, -len / 2, 0); // the far end at local y = 0
    // Not tone-mapped: the filmic curve lifts dark ink toward grey, and the receipt text should stay crisp and dark.
    const mat = new MeshStandardMaterial({ map: tex, roughness: 0.95, alphaTest: 0.5, side: DoubleSide, transparent: true, toneMapped: false });
    const mesh = new Mesh(geo, mat);
    mesh.visible = false;
    terminal.add(mesh);
    return { mesh, geo, mat, base: Float32Array.from(geo.attributes['position'].array), len, bentAt: NaN };
  };
  let paperShadow: Mesh | undefined; // a soft shadow behind the upright sheet, so its edges read on a light page too
  const sheets: { upright?: Sheet; side?: Sheet } = {};
  const sheetFor = (narrow: boolean): Sheet => {
    if (narrow) {
      if (sheets.side) return sheets.side;
      const c = document.createElement('canvas');
      c.width = TH * 2;
      c.height = SW_TEX * 2;
      const g = c.getContext('2d')!;
      g.setTransform(0, 2, -2, 0, c.width, 0); // screen right is canvas down, screen down is canvas left
      drawReceipt(g, data, SW_TEX, 'left');
      return (sheets.side = sheet(c, SL, 12, 48));
    }
    if (sheets.upright) return sheets.upright;
    const c = document.createElement('canvas');
    c.width = TW * 2; // drawn at 2x so the small receipt text stays sharp up close
    c.height = TH * 2;
    const g = c.getContext('2d')!;
    g.scale(2, 2);
    drawReceipt(g, data);
    const up = (sheets.upright = sheet(c, PH, 16, 70));
    const ps = document.createElement('canvas');
    ps.width = 128;
    ps.height = 256;
    const psg = ps.getContext('2d')!;
    psg.filter = 'blur(10px)';
    psg.fillStyle = 'rgba(0,0,0,0.5)';
    psg.fillRect(22, 22, 84, 212);
    paperShadow = new Mesh(new PlaneGeometry(PW + 0.24, PH + 0.24), new MeshBasicMaterial({ map: new CanvasTexture(ps), transparent: true, depthWrite: false }));
    paperShadow.position.set(0.04, -PH / 2 - 0.05, -0.28);
    up.mesh.add(paperShadow);
    return up;
  };
  /** Bend a sheet: the further from the slot, the more it curls (curl < 0 leans back, > 0 toward the viewer), and a
   *  ripple runs along it while it feeds, settling to `sway`. A settled sheet with no sway is left alone. */
  const bend = (sh: Sheet, L: number, now: number, fed: number, curl: number, sway: number) => {
    if (fed >= 1 && !sway && sh.bentAt === L) return;
    sh.bentAt = L;
    const pos = sh.geo.attributes['position'];
    const t = now / 1000, amp = 0.01 * (1 - fed) + sway, speed = fed < 1 ? 2.4 : 1.1;
    for (let i = 0; i < pos.count; i++) {
      const s = sh.base[i * 3 + 1] + L; // distance out of the slot; hidden inside the head when negative
      const d = s / sh.len;
      pos.setZ(i, s <= 0 ? 0 : curl * d * d + Math.sin(s * 7.5 - t * speed) * amp * d);
    }
    pos.needsUpdate = true;
    sh.geo.computeVertexNormals();
  };

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

  let printed = false; // is a receipt out of the printer (or on its way)
  let feedStart = -1, tearStart = -1;
  let fade = 1; // the paper's opacity: it fades as it is torn off
  const FEED_MS = 1200, TEAR_MS = 450;
  // 0 -> 1, fast and eased out, like paper shooting out of the printer then settling.
  const feedNow = (now: number) => (feedStart < 0 ? 0 : 1 - Math.pow(1 - Math.min(1, (now - feedStart) / FEED_MS), 3));

  const startPrint = () => {
    printed = true;
    feedStart = performance.now();
    tearStart = -1;
    fade = 1;
    setScreen('printing');
  };
  const tear = () => {
    if (printed && tearStart < 0) tearStart = performance.now();
  };

  // Payments, on a loop while the chapter is in view: charge, the band curves in and taps, approved, the band
  // leaves, and a moment later the refund. It starts once the terminal has settled in its place.
  let payStart = -1;
  const PAY = { settle: 700, tap: 1300, approve: 1450, leave: 1750, gone: 2800, refund: 4300, loop: 7600 };
  const ROT_FROM = [0.35, -0.55, 0.12], ROT_TAP = [0.15, -0.4, 0.06], ROT_TO = [0.3, -0.75, 0.2];
  const inOut = (x: number) => ((x = Math.min(1, Math.max(0, x))), x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const mix = (a: number[], b: number[], k: number) => a.map((v, i) => v + (b[i] - v) * k);
  const curve = (a: number[], c: number[], b: number[], k: number) => mix(mix(a, c, k), mix(c, b, k), k); // quadratic Bézier
  const payFrame = (now: number, narrow: boolean) => {
    let t = now - payStart - PAY.settle;
    if (t >= PAY.loop - PAY.settle) ((payStart = now - PAY.settle), (t = 0), setScreen('charge'));
    if (t < 0 || t >= PAY.gone) return void (band.visible = false);
    const [from, into, out, to] = BAND_PATH[narrow ? 'narrow' : 'wide'];
    let p: number[], rot: number[], grow = 1;
    if (t < PAY.tap) {
      const k = inOut(t / PAY.tap);
      p = curve(from, into, BAND_TAP, k);
      rot = mix(ROT_FROM, ROT_TAP, k);
      grow = Math.min(1, t / 350);
    } else if (t < PAY.leave) {
      p = [BAND_TAP[0], BAND_TAP[1], BAND_TAP[2] - 0.025 * Math.sin((Math.PI * (t - PAY.tap)) / (PAY.leave - PAY.tap))]; // a gentle press
      rot = ROT_TAP;
    } else {
      const k = inOut((t - PAY.leave) / (PAY.gone - PAY.leave));
      p = curve(BAND_TAP, out, to, k);
      rot = mix(ROT_TAP, ROT_TO, k);
      grow = Math.min(1, (PAY.gone - t) / 350);
    }
    band.position.set(p[0], p[1], p[2]);
    band.rotation.set(rot[0], rot[1], rot[2]);
    band.scale.setScalar(Math.max(0.001, inOut(grow))); // grows in and shrinks away instead of popping
    band.visible = true;
    if (t >= PAY.approve && screenState === 'charge') setScreen('approved');
    if (t >= PAY.refund && screenState === 'approved') setScreen('refund');
  };

  // Shadows read much stronger on the light page, so they are lighter there.
  let shadowK = 1, paperShadowK = 0.9;
  const setTheme = (theme: 'dark' | 'light') => {
    shadowK = theme === 'light' ? 0.45 : 1;
    paperShadowK = theme === 'light' ? 0.7 : 0.9;
    (shadow.material as MeshBasicMaterial).opacity = shadowK;
  };

  /* ---- where the terminal should be: the anchor nearest the middle of the screen */
  // Static template nodes. A box the current layout hides (display: none) has no size and is skipped, so CSS alone
  // decides which boxes exist on phones and on wide screens.
  const anchors = [...document.querySelectorAll<HTMLElement>('[data-anchor]')];
  let active: AnchorKind | null = null;
  let gluedKind: AnchorKind | null = null; // the box the terminal is glued to (phones, and payments on wide screens)
  let pointerX = 0, pointerY = 0;
  const onPointer = (e: PointerEvent) => ((pointerX = e.clientX / innerWidth - 0.5), (pointerY = e.clientY / innerHeight - 0.5));
  addEventListener('pointermove', onPointer, { passive: true });

  const cur: Pose = { x: 6, y: 0, s: 0.6, ry: 0.8, rx: 0.1, rz: 0 };
  const resize = () => {
    // A pixel budget rather than a fixed cap: phones get their full 3x (the receipt must be sharp there),
    // big screens stay near 1.5x.
    renderer.setPixelRatio(Math.min(devicePixelRatio, Math.max(1.5, Math.sqrt(3.2e6 / (innerWidth * innerHeight)))));
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();

  /** Where the terminal sits for one anchor box: the whole device in the hero and payments; for the receipt, a paper
   *  close-up on wide screens and the terminal on its side at the screen edge on phones. */
  const poseFor = (r: DOMRect, at: AnchorKind, wpp: number, narrow: boolean): Pose => {
    const lean = narrow ? 0 : 1; // no pointer lean on phones: a finger is not a cursor
    const ry = TURN[at].ry + pointerX * TURN[at].sway * lean, rx = 0.08 + pointerY * 0.25 * lean;
    const x = (r.left + r.width / 2 - innerWidth / 2) * wpp;
    if (at === 'receipt' && !narrow) {
      // Close-up: the paper fills the box so the numbers are readable; the body runs off below.
      const s = Math.min((r.width * wpp * 0.94) / PW, (r.height * wpp * 0.94) / (PH + 0.12));
      return { x, y: -(r.bottom - innerHeight / 2) * wpp - SLOT_Y * s + 0.06 * s, s, ry, rx, rz: 0 };
    }
    if (at === 'receipt') {
      // Phones: the terminal lies on its side, tilted, at the right edge with its body off screen, and the strip
      // feeds out to the left. Sized so the strip spans the screen width (to 16px from the left), capped so it fits
      // the box's height (.pos-side in styles.css is sized to leave room for it).
      const px = Math.min((r.height * 0.9) / PW, (innerWidth - 16) / (SL + 0.5 * HEAD.h)); // CSS px per world unit
      // A quarter turn exactly and only a slight turn in depth, so the receipt's lines stay level and evenly sized.
      const s = px * wpp, rz = Math.PI / 2;
      // The slot sits so half the printer head shows at the right edge (on a phone the strip then ends 16px from the left).
      const slotX = (innerWidth / 2 - 0.5 * HEAD.h * px) * wpp, slotY = -(r.top + r.height / 2 - innerHeight / 2) * wpp;
      return { x: slotX + Math.sin(rz) * SLOT_Y * s, y: slotY - Math.cos(rz) * SLOT_Y * s, s, ry: 0.07, rx: 0.05, rz };
    }
    const H = BODY.h + HEAD.h + 0.2; // the whole device, head included, with a little air
    const s = Math.min((r.height * wpp * 0.92) / H, (r.width * wpp * 0.9) / 1.3, (innerHeight * wpp * 0.74) / H);
    // Wide screens: when the box is taller than the screen, the device stays centred in the visible part of it.
    const half = (H * s) / wpp / 2;
    const mid = narrow ? r.top + r.height / 2 : Math.min(Math.max(innerHeight / 2, r.top + half), r.bottom - half);
    const y = -(mid - innerHeight / 2) * wpp;
    return { x, y, s, ry, rx, rz: 0 };
  };

  let last = performance.now();
  let calm = 1;
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const wpp = (2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360)) / innerHeight; // world units per CSS px

    // Every laid-out anchor near the middle of the screen pulls the terminal toward its pose; the weights fade
    // smoothly with distance, so the terminal blends between chapters instead of snapping. Leftover weight
    // sends it off to the right.
    const narrow = NARROW.matches;
    // Phones use a shorter reach, so between two far-apart stops nothing pulls and the terminal is not dragged across the text.
    const reach = innerHeight * (narrow ? 0.7 : 1.1);
    const poses: { kind: AnchorKind; w: number; p: Pose }[] = [];
    for (const el of anchors) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.top - innerHeight / 2 > reach || innerHeight / 2 - r.bottom > reach) continue; // the whole box is out of reach
      // Distance from the middle of the screen: of the box for the receipt close-up, of the device itself otherwise
      // (it stays centred in a tall box, so the box's own centre would make it let go too early).
      const kindOf = el.dataset['anchor'] as AnchorKind;
      const p = poseFor(r, kindOf, wpp, narrow);
      const d = kindOf === 'receipt' && !narrow ? Math.abs(r.top + r.height / 2 - innerHeight / 2) : Math.abs(p.y) / wpp;
      const lin = Math.max(0, 1 - d / reach);
      if (!lin) continue;
      poses.push({ kind: kindOf, w: lin * lin * (3 - 2 * lin), p });
    }
    // Two ways to place it. Wide screens glide between the hero and the receipt, which share the right column: those
    // poses blend by weight, and leftover weight sends it off the right edge. Everywhere else (phones, and payments on
    // wide screens) it is glued to one box and scrolls with it like part of the page. It only changes box once it has
    // scrolled out of view, and then grows in right at its new place, so it never travels across the text.
    const pick = (list: typeof poses) => list.reduce<(typeof poses)[number] | null>((a, b) => (!a || b.w > a.w ? b : a), null);
    const blend = narrow ? [] : poses.filter((p) => !TURN[p.kind].glue);
    const lead = pick(poses), blendLead = pick(blend);
    // Any part of it in view: the device reaches about 1.4 of its scale from its centre in any direction.
    const onScreen = rig.visible && Math.abs(cur.x) < (innerWidth / 2) * wpp + 1.4 * cur.s && Math.abs(cur.y) < (innerHeight / 2) * wpp + 1.4 * cur.s;
    const glueLead = narrow || (lead && TURN[lead.kind].glue) ? lead : null;
    let glued: Pose | null = null, arrive = false;
    // While its glued box is still in view it stays there, whichever box now leads (in either scroll direction).
    const kept = onScreen && gluedKind ? poses.find((p) => p.kind === gluedKind) : undefined;
    if (kept) glued = kept.p;
    else if (glueLead && (narrow || !onScreen)) {
      arrive = !rig.visible || gluedKind !== glueLead.kind; // a new place, or back from being parked
      gluedKind = glueLead.kind;
      glued = glueLead.p;
    } else if (!glueLead && gluedKind) {
      // Its glued box scrolled away and the blend takes over (wide screens): reappear at the blend's place.
      gluedKind = null;
      arrive = true;
    } // else: a wide screen whose receipt is still on its way out; it leaves first

    // What the terminal is doing follows where it is. For the blend, hysteresis keeps the current anchor until it
    // clearly fades or another clearly leads, so a slow scroll across a boundary does not flip back and forth.
    const held = active ? (blend.find((p) => p.kind === active)?.w ?? 0) : 0;
    const next = glued ? gluedKind
      : active && held >= 0.4 && !(blendLead && blendLead.kind !== active && blendLead.w >= 0.6) ? active
      : blendLead && blendLead.w >= 0.5 ? blendLead.kind : null;
    if (next !== active) {
      active = next;
      if (active === 'receipt' && (!printed || tearStart >= 0)) startPrint(); // also restarts a receipt that was tearing off
      if (active !== 'receipt' && printed) tear();
      if (active === 'hello') setScreen('idle');
      if (active === 'payments') ((payStart = now), setScreen('charge'));
      else payStart = -1;
    }
    // Back at payments after it scrolled away: the sequence starts over, so the band never shows up mid-swing.
    if (arrive && active === 'payments') ((payStart = now), setScreen('charge'));
    // Off-screen means past the nearest side edge by the terminal's own (scaled) width, however big it currently is.
    const offS = blendLead ? blendLead.p.s : cur.s;
    const side = (blendLead ? blendLead.p.x : cur.x) < 0 ? -1 : 1;
    const off: Pose = { x: side * ((innerWidth / 2 + 60) * wpp + 1.6 * offS), y: blendLead ? blendLead.p.y : cur.y, s: offS, ry: 0.9 * side, rx: 0.1, rz: 0 };
    const sum = blend.reduce((a, b) => a + b.w, 0);
    const norm = Math.max(1, sum);
    const rest = 1 - Math.min(1, sum);
    const target: Pose = { x: 0, y: 0, s: 0, ry: 0, rx: 0, rz: 0 };
    const k = 1 - Math.exp(-dt * (glued ? 8 : 5)); // damped easing toward the target
    for (const key of KEYS) {
      target[key] = glued ? glued[key] : blend.reduce((a, b) => a + (b.w / norm) * b.p[key], 0) + rest * off[key];
      // Glued, it moves with its box exactly (like page content, no lag while scrolling); only its turn and size ease.
      cur[key] = arrive || (glued && (key === 'x' || key === 'y')) ? target[key] : cur[key] + (target[key] - cur[key]) * k;
    }
    if (arrive) cur.s = 0.001; // it grows in at its new place
    // Parked off-screen with nothing pulling it back: hide it, clear the canvas once, and stop the loop.
    // A scroll or resize wakes it again.
    if (!poses.length && Math.abs(target.x - cur.x) < 0.01) {
      if (tearStart >= 0) ((printed = false), (feedStart = -1), (tearStart = -1), (fade = 1)); // finish any tear-off
      rig.visible = false;
      renderer.render(scene, camera);
      renderer.setAnimationLoop(null);
      running = false;
      return;
    }
    // The idle bob and sway calm down while the receipt is out, where moving text would shimmer.
    calm += ((active === 'receipt' ? 0 : 1) - calm) * k;
    rig.position.set(cur.x, cur.y + Math.sin(now / 1100) * 0.03 * cur.s * calm, 0);
    rig.scale.setScalar(cur.s);
    rig.rotation.set(cur.rx, cur.ry, cur.rz + Math.sin(now / 1700) * 0.015 * calm);
    if (payStart >= 0) payFrame(now, narrow);
    else band.visible = false;
    rig.visible = true;

    // Paper: feed, tear, and bend.
    let fed = feedNow(now);
    if (printed && now - feedStart > FEED_MS && screenState === 'printing') setScreen('printed');
    let lift = 0;
    if (tearStart >= 0) {
      const p = Math.min(1, (now - tearStart) / TEAR_MS);
      lift = p * p * 0.8;
      fade = 1 - p;
      if (p >= 1) ((printed = false), (feedStart = -1), (tearStart = -1), (fed = 0), (lift = 0), (fade = 1));
    }
    // Phones feed the sideways strip, wide screens the upright sheet; the other one (if it was ever built) stays hidden.
    // A sheet is only built once something prints, so a visitor who never reaches the receipt never pays for it.
    const idle = sheets[narrow ? 'upright' : 'side'];
    if (idle) idle.mesh.visible = false;
    const sh = printed ? sheetFor(narrow) : sheets[narrow ? 'side' : 'upright'];
    if (sh && !printed) sh.mesh.visible = false;
    if (sh && printed) {
      const L = fed * sh.len;
      sh.mesh.position.set(0, SLOT_Y + L + lift, narrow ? 0.004 : lift * 0.4);
      sh.mesh.visible = L > 0.002;
      sh.mat.opacity = fade;
      if (paperShadow) (paperShadow.material as MeshBasicMaterial).opacity = paperShadowK * fade;
      // Upright: it leans back and holds still once out (sharp text). Strip: it curls toward the viewer and keeps a
      // faint sway, so it reads as soft paper; no sag, which would slant every line.
      if (sh.mesh.visible) bend(sh, L, now, fed, narrow ? 0.05 : -0.1, narrow ? 0.003 : 0);
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
