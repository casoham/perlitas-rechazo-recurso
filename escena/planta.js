// Planta de tratamiento en 3D (procedural, sin modelos ni imágenes): ósmosis → 6 etapas → torre.
// La cámara viaja de estación en estación según data-paso de la sección. Se empaqueta con esbuild en recursos/planta.js.
import * as THREE from 'three';

const COL = { azul: 0x1725ab, cian: 0x62c8f2, agua: 0x3bbdf0, blanco: 0xf3f7ff, lodo: 0xf58a4f, vidrio: 0xd4ecff, acero: 0xb8c4d8, arena: 0xe7d3a0, grava: 0x8e9ab0, carbon: 0x39425a };
const std = (color, r = 0.45, m = 0) => new THREE.MeshStandardMaterial({ color, roughness: r, metalness: m });
const vidrio = () => new THREE.MeshStandardMaterial({ color: COL.vidrio, transparent: true, opacity: 0.2, roughness: 0.08, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
const aguaMat = (op = 0.8) => new THREE.MeshStandardMaterial({ color: COL.agua, transparent: true, opacity: op, roughness: 0.15, depthWrite: false });

function sprite() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.55, 'rgba(255,255,255,0.9)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}
function sombra() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  r.addColorStop(0, 'rgba(23,37,171,0.28)'); r.addColorStop(1, 'rgba(23,37,171,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
const TEX_S = sprite(), TEX_SOMBRA = sombra();

function puntos(n, color, size, op = 1) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(n * 3); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color, size, map: TEX_S, transparent: true, opacity: op, depthWrite: false, sizeAttenuation: true });
  const p = new THREE.Points(g, m); p.frustumCulled = false; return { p, pos, n };
}
function blob(grupo, ancho) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, ancho), new THREE.MeshBasicMaterial({ map: TEX_SOMBRA, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.02; grupo.add(m);
}
function patas(grupo, r, alto) {
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, alto, 12), std(COL.azul, 0.35, 0.1));
    p.position.set(Math.cos(a) * r * 0.82, alto / 2, Math.sin(a) * r * 0.82); grupo.add(p);
  }
}
function aro(grupo, r, y, color = COL.blanco) {
  const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.07, 12, 56), std(color, 0.3)); t.rotation.x = Math.PI / 2; t.position.y = y; grupo.add(t);
}
// Tubería de A a B con agua que fluye; avanza con la propiedad .avance (0–1)
function tuberia(escena, A, B, radio = 0.17, color = 0x1725ab) {
  const dir = new THREE.Vector3().subVectors(B, A); const largo = dir.length();
  const g = new THREE.Group(); g.position.copy(A); g.lookAt(B); escena.add(g);
  const cont = new THREE.Group(); cont.rotation.x = Math.PI / 2; g.add(cont); // el eje del cilindro (Y) pasa a +Z
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radio, radio, largo, 20, 1, true), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.4, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false }));
  m.position.y = largo / 2; cont.add(m);
  const tc = document.createElement('canvas'); tc.width = 8; tc.height = 64; const x = tc.getContext('2d');
  x.fillStyle = '#35b6ec'; x.fillRect(0, 0, 8, 64); x.fillStyle = '#c9f0ff'; x.fillRect(0, 0, 8, 14);
  const tex = new THREE.CanvasTexture(tc); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, largo * 1.1);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(radio * 0.72, radio * 0.72, largo, 16, 1, true), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.2, emissive: 0x0b6e9c, emissiveIntensity: 0.35 }));
  inner.position.y = largo / 2; cont.add(inner);
  for (const f of [0.02, 0.98]) { const br = new THREE.Mesh(new THREE.CylinderGeometry(radio * 1.3, radio * 1.3, 0.14, 20), std(COL.blanco, 0.3)); br.position.y = largo * f; cont.add(br); }
  inner.scale.set(1, 0.0001, 1); inner.position.y = 0;
  return { tex, set(v) { inner.scale.y = Math.max(0.0001, v); inner.position.y = (largo * v) / 2; }, largo };
}

export function iniciar(canvas, seccion) {
  const W = 1920, H = 1080;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const escena = new THREE.Scene();
  escena.add(new THREE.HemisphereLight(0xffffff, 0x9cc9ee, 1.35));
  const sol = new THREE.DirectionalLight(0xffffff, 2.0); sol.position.set(8, 14, 10); escena.add(sol);
  const relleno = new THREE.DirectionalLight(0xa9dcff, 0.7); relleno.position.set(-10, 6, -6); escena.add(relleno);
  const cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 200);

  const SEP = 7.4, X0 = 0;
  const est = []; // estaciones con update(t, dt, paso)
  const yLinea = 2.6;
  const puerto = (i, lado) => new THREE.Vector3(X0 + i * SEP + lado * 1.75, yLinea, 0);

  // ---- 0: Ósmosis inversa (origen del rechazo) ----
  const ro = new THREE.Group(); ro.position.set(X0 - SEP, 0, 0); escena.add(ro); blob(ro, 9);
  { const base = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.3, 2.4), std(COL.azul, 0.4, 0.1)); base.position.y = 0.55; ro.add(base);
    for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 4.4, 28), std(COL.blanco, 0.28)); c.rotation.z = Math.PI / 2; c.position.set(0, 1.25 + k * 1.0, k % 2 ? 0.45 : -0.45); ro.add(c);
      for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.18, 28), std(COL.azul, 0.35)); t.rotation.z = Math.PI / 2; t.position.set(s * 2.2, 1.25 + k * 1.0, k % 2 ? 0.45 : -0.45); ro.add(t); } }
    const bomba = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.3, 24), std(COL.azul, 0.3, 0.2)); bomba.position.set(-2.8, 1.1, 0); ro.add(bomba);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.8, 24), std(COL.acero, 0.25, 0.8)); motor.position.set(-2.8, 2.0, 0); ro.add(motor); }
  // gotas de rechazo cayendo desde el equipo hacia el primer tanque
  const dropsRO = puntos(26, COL.cian, 0.34);
  escena.add(dropsRO.p);

  // ---- 1: Recolección y homogeneización ----
  const e1 = new THREE.Group(); e1.position.set(X0, 0, 0); escena.add(e1); blob(e1, 6);
  patas(e1, 1.7, 1.2); aro(e1, 1.68, 4.2);
  const t1 = new THREE.Mesh(new THREE.CylinderGeometry(1.68, 1.68, 3.0, 56, 1, true), vidrio()); t1.position.y = 2.7; e1.add(t1);
  const fondo1 = new THREE.Mesh(new THREE.CylinderGeometry(1.68, 1.68, 0.1, 56), std(COL.blanco, 0.3)); fondo1.position.y = 1.2; e1.add(fondo1);
  const a1 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 1, 48), aguaMat(0.78)); e1.add(a1);
  const eje1 = new THREE.Group(); e1.add(eje1); eje1.position.y = 2.6;
  { const v = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 10), std(COL.acero, 0.2, 0.8)); eje1.add(v); for (const [h, s] of [[-0.7, 1], [0.1, 0.8]]) { const pala = new THREE.Mesh(new THREE.BoxGeometry(1.5 * s, 0.05, 0.22), std(COL.azul, 0.4)); pala.position.y = h; eje1.add(pala); } }
  const m1 = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.6, 20), std(COL.azul, 0.3, 0.2)); m1.position.y = 4.55; e1.add(m1);
  const chorro1 = puntos(18, COL.agua, 0.3); escena.add(chorro1.p);
  est.push({ id: 1, centro: new THREE.Vector3(X0, 2.6, 0), update(t, dt, paso) {
    const nivel = paso >= 1 ? 2.3 : 0.4; a1._n = (a1._n ?? 0.4) + (nivel - (a1._n ?? 0.4)) * Math.min(1, dt * 0.8);
    a1.scale.y = a1._n; a1.position.y = 1.25 + a1._n / 2; eje1.rotation.y += dt * (paso >= 1 ? 1.4 : 0.3);
    // gotas del tubo hacia el tanque
    const a = chorro1.pos; for (let i = 0; i < chorro1.n; i++) { const ph = ((t * 0.9 + i / chorro1.n) % 1); a[i * 3] = X0 - 1.0 + Math.sin(i * 7.3) * 0.12; a[i * 3 + 1] = 5.2 - ph * (5.2 - 1.25 - a1._n); a[i * 3 + 2] = Math.cos(i * 3.1) * 0.12; }
    chorro1.p.geometry.attributes.position.needsUpdate = true; chorro1.p.material.opacity = paso >= 1 ? 1 : 0.0;
  } });

  // ---- 2: Dosificación y precipitación ----
  const e2 = new THREE.Group(); e2.position.set(X0 + SEP, 0, 0); escena.add(e2); blob(e2, 6);
  patas(e2, 1.7, 1.2); aro(e2, 1.68, 4.2);
  const t2 = new THREE.Mesh(new THREE.CylinderGeometry(1.68, 1.68, 3.0, 56, 1, true), vidrio()); t2.position.y = 2.7; e2.add(t2);
  const fondo2 = fondo1.clone(); e2.add(fondo2);
  const a2 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.4, 48), aguaMat(0.7)); a2.position.y = 2.45; e2.add(a2);
  const eje2 = new THREE.Group(); e2.add(eje2); eje2.position.y = 2.7;
  { const v = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 10), std(COL.acero, 0.2, 0.8)); eje2.add(v);
    for (const h of [-0.9, 0.0]) for (let k = 0; k < 4; k++) { const pala = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.2), std(COL.azul, 0.4)); pala.position.set(0, h, 0); const gp = new THREE.Group(); gp.rotation.y = k * Math.PI / 2; pala.position.x = 0.4; gp.add(pala); gp.position.y = h; eje2.add(gp); } }
  const m2 = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.7, 20), std(COL.azul, 0.3, 0.2)); m2.position.y = 4.6; e2.add(m2);
  // dosificadores: bidón blanco + bomba con pantalla + tubo
  const dosif = (z, color) => { const g = new THREE.Group(); g.position.set(-0.6, 0, z); const bidon = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.8), std(COL.blanco, 0.3)); bidon.position.set(-1.7, 0.55, 0); g.add(bidon);
    const tapa = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 16), std(color, 0.3)); tapa.position.set(-1.7, 1.17, 0); g.add(tapa);
    const bomba = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.55), std(COL.azul, 0.35, 0.1)); bomba.position.set(-1.7, 1.45, 0); g.add(bomba);
    const pant = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.22), new THREE.MeshBasicMaterial({ color: COL.cian })); pant.position.set(0, 0.06, 0.28); bomba.add(pant); return g; };
  const d1 = dosif(2.6, COL.cian), d2 = dosif(-2.6, COL.lodo); e2.add(d1, d2);
  const tubo = (z) => { const c = new THREE.CatmullRomCurve3([new THREE.Vector3(-2.05, 1.6, z), new THREE.Vector3(-2.05, 4.1, z * 0.7), new THREE.Vector3(-0.6, 4.6, z * 0.25), new THREE.Vector3(-0.3, 4.3, z * 0.05)]); const m = new THREE.Mesh(new THREE.TubeGeometry(c, 30, 0.04, 8), std(COL.blanco, 0.4)); e2.add(m); };
  tubo(2.6); tubo(-2.6);
  const goteo = puntos(12, COL.cian, 0.26); e2.add(goteo.p);
  const flocs = puntos(520, 0xffffff, 0.2, 0.95); e2.add(flocs.p);
  const fl = []; for (let i = 0; i < flocs.n; i++) fl.push({ a: Math.random() * 6.28, r: Math.random() * 1.45, y: 1.3 + Math.random() * 2.3, w: 0.4 + Math.random() * 0.9 });
  est.push({ id: 2, centro: new THREE.Vector3(X0 + SEP, 2.6, 0), update(t, dt, paso) {
    eje2.rotation.y += dt * (paso >= 2 ? 6 : 1.2);
    const act = paso >= 2 ? 1 : 0; flocs.p.material.opacity += (act - flocs.p.material.opacity) * Math.min(1, dt * 0.9);
    const A = flocs.pos; for (let i = 0; i < flocs.n; i++) { const f = fl[i]; f.a += dt * f.w * (paso >= 2 ? 1.6 : 0.5); A[i * 3] = Math.cos(f.a) * f.r; A[i * 3 + 1] = f.y + Math.sin(t * 0.8 + i) * 0.05; A[i * 3 + 2] = Math.sin(f.a) * f.r; }
    flocs.p.geometry.attributes.position.needsUpdate = true;
    const G = goteo.pos; for (let i = 0; i < goteo.n; i++) { const ph = ((t * 0.8 + i / goteo.n) % 1); const lado = i % 2 ? 1 : -1; G[i * 3] = -0.35; G[i * 3 + 1] = 4.3 - ph * 1.9; G[i * 3 + 2] = lado * 0.08; }
    goteo.p.geometry.attributes.position.needsUpdate = true; goteo.p.material.opacity = act;
  } });

  // ---- 3: Sedimentación (cono con lodo) ----
  const e3 = new THREE.Group(); e3.position.set(X0 + SEP * 2, 0, 0); escena.add(e3); blob(e3, 6.5);
  const perfil = (r, h, rc) => [new THREE.Vector2(0.001, 0), new THREE.Vector2(0.28, 0), new THREE.Vector2(r, rc), new THREE.Vector2(r, h)];
  patas(e3, 1.7, 1.5);
  const t3 = new THREE.Mesh(new THREE.LatheGeometry(perfil(1.75, 3.4, 1.7), 56), vidrio()); t3.position.y = 1.25; e3.add(t3); aro(e3, 1.75, 4.65);
  const a3 = new THREE.Mesh(new THREE.LatheGeometry(perfil(1.7, 3.0, 1.65).map((v, i) => i === 0 ? v : v), 56), aguaMat(0.55)); a3.position.y = 1.27; a3.scale.set(0.99, 0.97, 0.99); e3.add(a3);
  // Lodo: tronco de cono anclado al fondo del sedimentador; crece en todas las direcciones y siempre queda dentro del cono de vidrio
  const lodo = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.3, 1.1, 40), new THREE.MeshStandardMaterial({ color: 0xf5a46f, emissive: 0xf58a4f, emissiveIntensity: 0.55, roughness: 0.85, transparent: true, opacity: 1, depthTest: false })); lodo.renderOrder = 10; lodo.position.y = 1.27 + 0.03; lodo.scale.setScalar(0.05); e3.add(lodo);
  const part3 = puntos(260, 0xffffff, 0.16, 0.95); e3.add(part3.p);
  const p3 = []; for (let i = 0; i < part3.n; i++) p3.push({ a: Math.random() * 6.28, r: Math.random(), ph: Math.random(), v: 0.07 + Math.random() * 0.07 });
  const tuboLodo = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 1.25, 0), new THREE.Vector3(0, 0.7, 0), new THREE.Vector3(0.4, 0.45, 1.0), new THREE.Vector3(0.4, 0.45, 2.6)]), 20, 0.12, 12), std(COL.lodo, 0.35)); e3.add(tuboLodo);
  const bidon = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.2, 28), std(COL.lodo, 0.4)); bidon.position.set(0.4, 0.6, 3.1); e3.add(bidon);
  const tapaB = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.1, 28), std(0xa8264f, 0.4)); tapaB.position.set(0.4, 1.22, 3.1); e3.add(tapaB);
  est.push({ id: 3, centro: new THREE.Vector3(X0 + SEP * 2, 2.6, 0.6), update(t, dt, paso) {
    const act = paso >= 3 ? 1 : 0; part3.p.material.opacity += (act - part3.p.material.opacity) * Math.min(1, dt);
    const A = part3.pos; for (let i = 0; i < part3.n; i++) { const p = p3[i]; p.ph = (p.ph + dt * p.v * (act ? 1 : 0.2)) % 1; const y = 4.1 - p.ph * 3.2; const rmax = y > 2.95 ? 1.55 : Math.max(0.05, (y - 1.28) / (2.95 - 1.28) * 1.55); A[i * 3] = Math.cos(p.a) * p.r * rmax; A[i * 3 + 1] = y; A[i * 3 + 2] = Math.sin(p.a) * p.r * rmax; }
    part3.p.geometry.attributes.position.needsUpdate = true;
    const s = lodo.scale.x + ((act ? 1 : 0.05) - lodo.scale.x) * Math.min(1, dt * 0.35); lodo.scale.setScalar(s); lodo.position.y = 1.27 + 0.55 * s;
  } });

  // ---- 4: Filtración (lecho de grava y arena) ----
  const e4 = new THREE.Group(); e4.position.set(X0 + SEP * 3, 0, 0); escena.add(e4); blob(e4, 5);
  patas(e4, 1.3, 1.0);
  const cuerpo4 = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 3.2, 48, 1, true), vidrio()); cuerpo4.position.y = 2.6; e4.add(cuerpo4);
  for (const [y, s] of [[4.2, 1], [1.0, 1]]) { const c = new THREE.Mesh(new THREE.SphereGeometry(1.25, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), vidrio()); c.position.y = y + 0.4; if (s && y < 2) c.rotation.x = Math.PI; e4.add(c); }
  const capas = [[1.55, 0.55, COL.grava], [2.1, 0.7, COL.arena], [2.75, 0.5, COL.carbon]]; // grava, arena, antracita
  capas.forEach(([y, h, c]) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, h, 40), std(c, 0.95)); m.position.y = y; e4.add(m); });
  const a4 = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1.0, 40), aguaMat(0.6)); a4.position.y = 3.5; e4.add(a4);
  const part4 = puntos(160, 0xd9f2ff, 0.17, 0.95); e4.add(part4.p); const p4 = []; for (let i = 0; i < part4.n; i++) p4.push({ a: Math.random() * 6.28, r: Math.random() * 1.1, ph: Math.random(), v: 0.18 + Math.random() * 0.12 });
  est.push({ id: 4, centro: new THREE.Vector3(X0 + SEP * 3, 2.6, 0), update(t, dt, paso) {
    const act = paso >= 4 ? 1 : 0; part4.p.material.opacity += (act - part4.p.material.opacity) * Math.min(1, dt);
    const A = part4.pos; for (let i = 0; i < part4.n; i++) { const p = p4[i]; p.ph = (p.ph + dt * p.v) % 1; const y = 3.95 - p.ph * 2.85; A[i * 3] = Math.cos(p.a) * p.r; A[i * 3 + 1] = y; A[i * 3 + 2] = Math.sin(p.a) * p.r; }
    part4.p.geometry.attributes.position.needsUpdate = true;
  } });

  // ---- 5: Acondicionamiento y verificación (pH y semáforo) ----
  const e5 = new THREE.Group(); e5.position.set(X0 + SEP * 4, 0, 0); escena.add(e5); blob(e5, 6);
  patas(e5, 1.5, 1.2); aro(e5, 1.5, 3.9);
  const t5 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 2.7, 52, 1, true), vidrio()); t5.position.y = 2.55; e5.add(t5);
  const f5 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.1, 52), std(COL.blanco, 0.3)); f5.position.y = 1.2; e5.add(f5);
  const a5 = new THREE.Mesh(new THREE.CylinderGeometry(1.43, 1.43, 2.0, 48), aguaMat(0.72)); a5.position.y = 2.3; e5.add(a5);
  const sonda = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 12), std(COL.azul, 0.3)); sonda.position.set(0.5, 3.0, 0.2); e5.add(sonda);
  const punta = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), std(0xffffff, 0.2)); punta.position.set(0.5, 1.75, 0.2); e5.add(punta);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.5, 4.3, 0.2), new THREE.Vector3(0.9, 4.9, 0.6), new THREE.Vector3(2.0, 4.2, 1.6), new THREE.Vector3(2.4, 2.6, 2.4)]), 24, 0.03, 8), std(0x222a44, 0.6)); e5.add(cable);
  const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.8, 10), std(COL.acero, 0.3, 0.6)); poste.position.set(2.4, 0.9, 2.4); e5.add(poste);
  const pc = document.createElement('canvas'); pc.width = 256; pc.height = 128; const pg = pc.getContext('2d'); const ptex = new THREE.CanvasTexture(pc);
  const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshBasicMaterial({ map: ptex })); const cajaPH = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 0.18), std(COL.blanco, 0.3)); cajaPH.position.set(2.4, 2.2, 2.4); pantalla.position.z = 0.1; cajaPH.add(pantalla); cajaPH.rotation.y = -0.5; e5.add(cajaPH);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16), new THREE.MeshStandardMaterial({ color: 0x8aa0c8, emissive: 0x000000, roughness: 0.3 })); led.position.set(2.4, 3.2, 2.4); e5.add(led);
  let phVal = 10.4, phMostrado = '';
  est.push({ id: 5, centro: new THREE.Vector3(X0 + SEP * 4 + 0.6, 2.6, 0.8), update(t, dt, paso) {
    const meta = paso >= 5 ? 7.8 : 10.4; phVal += (meta - phVal) * Math.min(1, dt * 0.7);
    const txt = phVal.toFixed(1); if (txt !== phMostrado) { phMostrado = txt; pg.fillStyle = '#071a52'; pg.fillRect(0, 0, 256, 128); pg.fillStyle = '#7fe0ff'; pg.font = '700 26px Nunito, Arial'; pg.fillText('pH', 18, 40); pg.font = '800 74px Nunito, Arial'; pg.fillText(txt, 70, 108); ptex.needsUpdate = true; }
    const ok = paso >= 5 && Math.abs(phVal - 7.8) < 0.35; led.material.color.set(ok ? 0x2fe08a : 0x8aa0c8); led.material.emissive.set(ok ? 0x19b866 : 0x000000); led.material.emissiveIntensity = ok ? 0.7 + Math.sin(t * 4) * 0.3 : 0; led.scale.setScalar(ok ? 1.1 + Math.sin(t * 4) * 0.08 : 1);
  } });

  // ---- 6: Suministro a refrigeración (torre) ----
  const e6 = new THREE.Group(); e6.position.set(X0 + SEP * 5, 0, 0); escena.add(e6); blob(e6, 8);
  const cuenco = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.45, 0.5, 56), std(COL.azul, 0.4, 0.1)); cuenco.position.y = 0.25; e6.add(cuenco);
  const aguaT = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.08, 56), aguaMat(0.92)); aguaT.position.y = 0.5; e6.add(aguaT);
  const pts = []; for (let i = 0; i <= 28; i++) { const u = i / 28; const r = 1.9 - 1.25 * Math.sin(Math.PI * Math.min(u * 1.15, 1) * 0.5) + (u > 0.8 ? (u - 0.8) * 1.6 : 0); pts.push(new THREE.Vector2(Math.max(0.4, r), 0.5 + u * 4.8)); }
  const torre = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), new THREE.MeshStandardMaterial({ color: 0xe6edf8, roughness: 0.6, side: THREE.DoubleSide })); e6.add(torre);
  for (let k = 0; k < 8; k++) { const l = new THREE.Mesh(new THREE.TorusGeometry(1.0 + k * 0.05, 0.018, 6, 60), std(0xc4d2ea, 0.7)); l.rotation.x = Math.PI / 2; l.position.y = 0.9 + k * 0.58; e6.add(l); }
  const aguaIn = new THREE.Mesh(new THREE.CircleGeometry(1.0, 40), aguaMat(0.9)); aguaIn.rotation.x = -Math.PI / 2; aguaIn.position.y = 5.1; e6.add(aguaIn);
  const vapor = puntos(110, 0xffffff, 0.9, 0.0); vapor.p.material.depthWrite = false; e6.add(vapor.p); const v6 = []; for (let i = 0; i < vapor.n; i++) v6.push({ ph: Math.random(), a: Math.random() * 6.28, r: Math.random() * 0.9, v: 0.12 + Math.random() * 0.1 });
  est.push({ id: 6, centro: new THREE.Vector3(X0 + SEP * 5, 2.8, 0), update(t, dt, paso) {
    const act = paso >= 6 ? 1 : 0; vapor.p.material.opacity += (act * 0.55 - vapor.p.material.opacity) * Math.min(1, dt * 0.8);
    const A = vapor.pos; for (let i = 0; i < vapor.n; i++) { const p = v6[i]; p.ph = (p.ph + dt * p.v) % 1; const y = 5.3 + p.ph * 3.4; A[i * 3] = Math.cos(p.a + p.ph) * (p.r + p.ph * 1.5); A[i * 3 + 1] = y; A[i * 3 + 2] = Math.sin(p.a + p.ph) * (p.r + p.ph * 1.5); }
    vapor.p.geometry.attributes.position.needsUpdate = true;
  } });

  // ---- Tuberías (agua que avanza al llegar el paso) ----
  const tubos = [];
  const L = (i, lado) => puerto(i, lado);
  tubos.push(tuberia(escena, new THREE.Vector3(X0 - SEP + 2.4, 2.25, 0), L(0, -1), 0.17)); // ósmosis → tanque 1 (paso 1)
  tubos.push(tuberia(escena, L(0, 1), L(1, -1), 0.17));  // paso 2
  tubos.push(tuberia(escena, L(1, 1), L(2, -1), 0.17));  // paso 3
  tubos.push(tuberia(escena, L(2, 1), L(3, -1), 0.17));  // paso 4
  tubos.push(tuberia(escena, L(3, 1), L(4, -1), 0.17));  // paso 5
  tubos.push(tuberia(escena, L(4, 1), new THREE.Vector3(X0 + SEP * 5 + 2.3, 2.6, 0), 0.17)); // paso 6
  const lodoFlujo = tuberia(escena, new THREE.Vector3(X0 + SEP * 2 + 0.4, 0.45, 0.0), new THREE.Vector3(X0 + SEP * 2 + 0.4, 0.45, 2.6), 0.12, COL.lodo);
  lodoFlujo.set(0);

  // ---- Cámara ----
  const total = X0 + SEP * 5;
  const planos = [
    { p: [total / 2 - SEP / 2 + 0.5, 13, 47], m: [total / 2 - SEP / 2, 1.8, 0] },
    // Encuadre: la estación completa queda entre el título (arriba) y el rótulo (abajo); más lejos y mirando algo más abajo
    ...est.map((e) => ({ p: [e.centro.x + (e.id === 6 ? 0.5 : 1.8), e.id === 6 ? 6.4 : 5.6, e.id === 6 ? 23 : 20], m: [e.centro.x, e.id === 6 ? 2.2 : 1.2, e.centro.z * 0.5] })),
  ];
  const posC = new THREE.Vector3(...planos[0].p), mira = new THREE.Vector3(...planos[0].m);
  cam.position.copy(posC); cam.lookAt(mira);

  let t = 0, ultimo = performance.now(), pasoAct = 0, anim = 0;
  const lerp = (a, b, k) => a + (b - a) * k;
  function cuadro(ahora) {
    anim = requestAnimationFrame(cuadro);
    const dt = Math.min(0.05, (ahora - ultimo) / 1000); ultimo = ahora; t += dt;
    if (!seccion.classList.contains('activa')) return;
    const paso = Number(seccion.dataset.paso || 0); pasoAct = paso;
    const pl = planos[Math.min(paso, planos.length - 1)];
    const k = 1 - Math.exp(-dt * 1.8);
    posC.x = lerp(posC.x, pl.p[0] + Math.sin(t * 0.25) * 0.5, k); posC.y = lerp(posC.y, pl.p[1], k); posC.z = lerp(posC.z, pl.p[2], k);
    mira.x = lerp(mira.x, pl.m[0], k); mira.y = lerp(mira.y, pl.m[1], k); mira.z = lerp(mira.z, pl.m[2], k);
    cam.position.copy(posC); cam.lookAt(mira);
    // gotas de rechazo del equipo de ósmosis
    const D = dropsRO.pos; for (let i = 0; i < dropsRO.n; i++) { const ph = ((t * 0.6 + i / dropsRO.n) % 1); D[i * 3] = X0 - SEP + 2.5 + ph * (SEP - 3.3) * 0.0 + 0.0; D[i * 3 + 1] = 2.25 - ph * 0.0; D[i * 3 + 2] = 0; }
    dropsRO.p.visible = false;
    tubos.forEach((tb, i) => { const meta = paso > i ? 1 : 0; tb._v = (tb._v ?? 0) + (meta - (tb._v ?? 0)) * Math.min(1, dt * 1.6); tb.set(tb._v); tb.tex.offset.y -= dt * 1.6; });
    lodoFlujo._v = (lodoFlujo._v ?? 0) + ((paso >= 3 ? 1 : 0) - (lodoFlujo._v ?? 0)) * Math.min(1, dt * 1.2); lodoFlujo.set(lodoFlujo._v); lodoFlujo.tex.offset.y -= dt * 1.2;
    est.forEach((e) => e.update(t, dt, paso));
    renderer.render(escena, cam);
  }
  anim = requestAnimationFrame(cuadro);
  return { cerrar() { cancelAnimationFrame(anim); renderer.dispose(); } };
}
window.PlantaPerlitas = { iniciar };
