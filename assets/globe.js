/* Hero globe · Google-Earth style, built with three.js (MIT).
   Imagery: NASA Blue Marble (public domain) with bathymetry; relief and ocean-shine maps from the same source.
   Borders: Natural Earth 1:110m (public domain). Everything is served from /assets, no internet needed.
   Falls back to the Plotly globe (window.heroGlobeFallback) if WebGL or the module cannot load. */
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';

const box = document.getElementById('m-hero');
const DC = [38.9, -77.04];
const PARTNERS = [['Ottawa',45.42,-75.70],['Mexico City',19.43,-99.13],['Brussels',50.85,4.35],['Bahrain',26.22,50.58],['Beijing',39.9,116.4],['Guam',13.44,144.79],['Nuuk',64.18,-51.69]];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function ll(lat, lon, r = 1) { // lat/lon in degrees -> 3D point on a sphere (y up, lon 0 facing +z)
  const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
}
function lineFrom(paths, r, mat) {
  const pos = [];
  paths.forEach(p => { for (let i = 1; i < p.length; i++) { const a = ll(p[i-1][1], p[i-1][0], r), b = ll(p[i][1], p[i][0], r); pos.push(a.x, a.y, a.z, b.x, b.y, b.z); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.LineSegments(g, mat);
}
function arcPoints(a, b, n = 96) { // great circle lifted by distance
  const va = ll(a[0], a[1]), vb = ll(b[0], b[1]), ang = va.angleTo(vb), pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, s = Math.sin(ang);
    const v = va.clone().multiplyScalar(Math.sin((1 - t) * ang) / s).add(vb.clone().multiplyScalar(Math.sin(t * ang) / s));
    v.normalize().multiplyScalar(1.004 + Math.sin(Math.PI * t) * Math.min(0.2, 0.035 + ang * 0.07)); pts.push(v);
  }
  return pts;
}

function start() {
  const W = () => box.clientWidth, H = () => box.clientHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.setSize(W(), H());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  box.innerHTML = ''; box.appendChild(renderer.domElement);
  box.classList.add('earth');
  const labels = document.createElement('div'); labels.className = 'glabels'; box.appendChild(labels);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, W() / H(), 0.1, 100);
  const fit = () => { const fov = camera.fov * Math.PI / 180, vh = 1.23 / Math.tan(fov / 2), vw = 1.23 / (Math.tan(fov / 2) * camera.aspect); return Math.max(vh, vw); };
  camera.position.copy(ll(32, -88, fit()));
  camera.lookAt(0, 0, 0);

  // stars
  const sp = []; for (let i = 0; i < 1400; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(30 + Math.random() * 20); sp.push(v.x, v.y, v.z); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xE9DFC9, size: 0.07, sizeAttenuation: true, transparent: true, opacity: 0.75 })));

  // earth
  const tl = new THREE.TextureLoader(), base = 'assets/';
  const map = tl.load(base + 'earth-blue-marble.jpg'); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), new THREE.MeshPhongMaterial({
    map, bumpMap: tl.load(base + 'earth-topology.jpg'), bumpScale: 2.2, specularMap: tl.load(base + 'earth-water.jpg'),
    specular: new THREE.Color(0x1c2632), shininess: 14 }));
  scene.add(earth);

  // atmosphere (fresnel glow)
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.085, 96, 64), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { c: { value: new THREE.Color(0x79b8ff) } },
    vertexShader: 'varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'uniform vec3 c;varying vec3 vN;void main(){float i=pow(0.66-dot(vN,vec3(0.,0.,1.)),4.0)*1.15;gl_FragColor=vec4(c,1.)*i;}' }));
  scene.add(atmo);

  // lights: evenly lit like Google Earth, a soft key light for relief
  scene.add(new THREE.AmbientLight(0xffffff, 1.9));
  const key = new THREE.DirectionalLight(0xfff4e0, 1.1); scene.add(key);

  // borders and the United States
  const L = window.GLOBE_LINES;
  if (L) {
    scene.add(lineFrom(L.borders, 1.0015, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32 })));
    scene.add(lineFrom(L.states, 1.0018, new THREE.LineBasicMaterial({ color: 0xF6E2B8, transparent: true, opacity: 0.38 })));
    const usOutline = lineFrom(L.us.map(r => r), 1.0022, new THREE.LineBasicMaterial({ color: 0xF2B35C, transparent: true, opacity: 1 }));
    scene.add(usOutline);
  }

  // arcs from Washington with travelling pulses
  const arcs = PARTNERS.map(p => {
    const pts = arcPoints(DC, [p[1], p[2]]);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xE5574B, transparent: true, opacity: 0.85 }));
    scene.add(line);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.011, 12, 12), new THREE.MeshBasicMaterial({ color: 0xFFD7A0 }));
    scene.add(dot);
    return { pts, dot, off: Math.random() };
  });
  const pin = (lat, lon, col, s) => { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 16, 16), new THREE.MeshBasicMaterial({ color: col })); m.position.copy(ll(lat, lon, 1.004)); scene.add(m); return m; };
  const dcPin = pin(DC[0], DC[1], 0xffffff, 0.016);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.026, 40), new THREE.MeshBasicMaterial({ color: 0xF2B35C, transparent: true, side: THREE.DoubleSide }));
  ring.position.copy(ll(DC[0], DC[1], 1.005)); ring.lookAt(0, 0, 0); scene.add(ring);
  PARTNERS.forEach(p => pin(p[1], p[2], 0xF2B35C, 0.009));

  // HTML labels that hide behind the globe
  const tags = [['Washington', DC[0], DC[1], 'dc']].concat(PARTNERS.map(p => [p[0], p[1], p[2], ''])).map(t => {
    const el = document.createElement('span'); el.className = 'glab ' + t[3]; el.textContent = t[0]; labels.appendChild(el);
    return { el, v: ll(t[1], t[2], 1.01) };
  });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = 0.06; controls.rotateSpeed = 0.55;
  controls.minDistance = 1.6; controls.maxDistance = fit() * 1.15; controls.zoomSpeed = 0.6;
  controls.enableZoom = true; controls.autoRotate = !reduce; controls.autoRotateSpeed = 0.35;
  // keep page scroll working: zoom only with ctrl/cmd or pinch
  renderer.domElement.addEventListener('wheel', e => { if (!(e.ctrlKey || e.metaKey)) e.stopImmediatePropagation(); }, { capture: true });
  let idle; controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(idle); });
  controls.addEventListener('end', () => { clearTimeout(idle); if (!reduce) idle = setTimeout(() => controls.autoRotate = true, 5000); });

  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.02 }).observe(box);
  const v = new THREE.Vector3(), camDir = new THREE.Vector3();
  const clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    const t = clock.getElapsedTime();
    controls.update();
    key.position.copy(camera.position).applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.6).add(new THREE.Vector3(0, 1.2, 0));
    arcs.forEach(a => { const k = ((t * 0.22 + a.off) % 1), i = Math.floor(k * (a.pts.length - 1)); a.dot.position.copy(a.pts[i]); });
    const s = 1 + 0.35 * Math.sin(t * 2.4); ring.scale.set(s, s, s); ring.material.opacity = 0.9 - 0.5 * (s - 0.65);
    renderer.render(scene, camera);
    camDir.copy(camera.position).normalize();
    const w = W(), h = H();
    tags.forEach(tg => { const front = tg.v.clone().normalize().dot(camDir) > 0.15; v.copy(tg.v).project(camera);
      tg.el.style.opacity = front ? 1 : 0; tg.el.style.transform = 'translate(' + ((v.x + 1) / 2 * w).toFixed(1) + 'px,' + ((1 - v.y) / 2 * h).toFixed(1) + 'px)'; });
  }
  frame();
  const ro = new ResizeObserver(() => { renderer.setSize(W(), H()); camera.aspect = W() / H(); camera.updateProjectionMatrix(); controls.maxDistance = fit() * 1.15; camera.position.setLength(fit()); controls.update(); renderer.render(scene, camera); });
  ro.observe(box);
  window.__heroGlobe = { renderer, camera, controls };
}

try {
  const c = document.createElement('canvas');
  if (!(c.getContext('webgl2') || c.getContext('webgl'))) throw new Error('no webgl');
  start();
} catch (e) {
  console.warn('3D globe unavailable, using the flat fallback', e);
  window.__heroGlobeFailed = true;
  if (window.heroGlobeFallback) window.heroGlobeFallback();
}
