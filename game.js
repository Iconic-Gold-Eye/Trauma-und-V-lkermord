import * as THREE from "https://unpkg.com/three@0.164.1/build/three.module.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1020);
scene.fog = new THREE.Fog(0x0b1020, 20, 120);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 1.7, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0x99bbff, 0x080a16, 1.2);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(12, 20, 5);
sun.castShadow = true;
scene.add(sun);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(280, 280),
  new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.95, metalness: 0.1 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const walls = [];
for (let i = 0; i < 18; i++) {
  const w = new THREE.Mesh(
    new THREE.BoxGeometry(5 + Math.random() * 4, 3 + Math.random() * 3, 2 + Math.random() * 5),
    new THREE.MeshStandardMaterial({ color: 0x374151 })
  );
  w.position.set((Math.random() - 0.5) * 140, w.geometry.parameters.height / 2, (Math.random() - 0.5) * 140);
  w.castShadow = true;
  w.receiveShadow = true;
  scene.add(w);
  walls.push(w);
}

const npc = new THREE.Mesh(
  new THREE.CylinderGeometry(0.65, 0.8, 2.2, 24),
  new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x082f49, emissiveIntensity: 0.8 })
);
npc.position.set(4, 1.1, 2);
scene.add(npc);

const enemies = [];
for (let i = 0; i < 10; i++) {
  const enemy = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 2, 1.1),
    new THREE.MeshStandardMaterial({ color: 0xdc2626 })
  );
  enemy.position.set((Math.random() - 0.5) * 90, 1, (Math.random() - 0.5) * 90);
  enemy.userData.speed = 2.1 + Math.random() * 1.2;
  enemy.castShadow = true;
  scene.add(enemy);
  enemies.push(enemy);
}

const move = { forward: false, back: false, left: false, right: false };
let velocityY = 0;
const playerHeight = 1.7;
const gravity = 22;
const speed = 8.2;
let health = 100;
let ammo = 12;
let kills = 0;
let reloadAt = 0;
let canLook = false;
let yaw = 0;
let pitch = 0;
let lastTime = performance.now();
let talking = false;
let dialogueIndex = 0;

const dialogueScript = [
  "This is your story shell. Replace these lines with your plot later.",
  "You can define missions, character arcs, and branching dialogue here.",
  "For now, clear hostiles and come back when your story is ready."
];

const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const healthEl = document.getElementById("health");
const ammoEl = document.getElementById("ammo");
const killsEl = document.getElementById("kills");
const hintEl = document.getElementById("hint");
const dialogueBox = document.getElementById("dialogueBox");
const lineEl = document.getElementById("line");

function lockGame() {
  renderer.domElement.requestPointerLock();
}

startBtn.addEventListener("click", lockGame);
renderer.domElement.addEventListener("click", () => {
  if (!document.pointerLockElement) lockGame();
});

document.addEventListener("pointerlockchange", () => {
  canLook = document.pointerLockElement === renderer.domElement;
  overlay.style.display = canLook ? "none" : "grid";
});

document.addEventListener("mousemove", (e) => {
  if (!canLook || talking) return;
  yaw -= e.movementX * 0.0025;
  pitch -= e.movementY * 0.0025;
  pitch = Math.max(-1.4, Math.min(1.4, pitch));
  camera.rotation.set(pitch, yaw, 0, "YXZ");
});

function setMove(key, state) {
  if (key === "KeyW") move.forward = state;
  if (key === "KeyS") move.back = state;
  if (key === "KeyA") move.left = state;
  if (key === "KeyD") move.right = state;
}

document.addEventListener("keydown", (e) => {
  setMove(e.code, true);
  if (e.code === "Space" && camera.position.y <= playerHeight + 0.001) velocityY = 8.5;

  if (e.code === "KeyE") {
    const nearNpc = camera.position.distanceTo(npc.position) < 4;
    if (nearNpc && !talking) {
      talking = true;
      dialogueIndex = 0;
      lineEl.textContent = dialogueScript[dialogueIndex];
      dialogueBox.classList.remove("hidden");
    } else if (talking) {
      dialogueIndex += 1;
      if (dialogueIndex >= dialogueScript.length) {
        talking = false;
        dialogueBox.classList.add("hidden");
      } else {
        lineEl.textContent = dialogueScript[dialogueIndex];
      }
    }
  }
});

document.addEventListener("keyup", (e) => setMove(e.code, false));

const raycaster = new THREE.Raycaster();
renderer.domElement.addEventListener("mousedown", (e) => {
  if (e.button !== 0 || talking || !canLook) return;
  if (performance.now() < reloadAt) return;

  if (ammo <= 0) {
    ammo = 12;
    reloadAt = performance.now() + 900;
    ammoEl.textContent = "Ammo: Reloading...";
    return;
  }

  ammo -= 1;
  ammoEl.textContent = `Ammo: ${ammo}`;

  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(enemies, false);
  if (hits.length > 0) {
    const hitEnemy = hits[0].object;
    scene.remove(hitEnemy);
    enemies.splice(enemies.indexOf(hitEnemy), 1);
    kills += 1;
    killsEl.textContent = `Kills: ${kills}`;
  }
});

function updatePlayer(dt) {
  if (talking) return;

  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw) * -1);
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize().negate();

  const dir = new THREE.Vector3();
  if (move.forward) dir.add(forward);
  if (move.back) dir.sub(forward);
  if (move.right) dir.add(right);
  if (move.left) dir.sub(right);

  if (dir.lengthSq() > 0) dir.normalize();

  const step = dir.multiplyScalar(speed * dt);
  const next = camera.position.clone().add(step);

  let blocked = false;
  for (const w of walls) {
    const wBox = new THREE.Box3().setFromObject(w).expandByScalar(0.6);
    if (wBox.containsPoint(new THREE.Vector3(next.x, 1.5, next.z))) {
      blocked = true;
      break;
    }
  }
  if (!blocked) camera.position.copy(next);

  velocityY -= gravity * dt;
  camera.position.y += velocityY * dt;
  if (camera.position.y < playerHeight) {
    camera.position.y = playerHeight;
    velocityY = 0;
  }
}

function updateEnemies(dt) {
  for (const enemy of enemies) {
    const toPlayer = new THREE.Vector3().subVectors(camera.position, enemy.position);
    const distance = toPlayer.length();
    toPlayer.y = 0;
    if (distance > 1.8) {
      enemy.position.add(toPlayer.normalize().multiplyScalar(enemy.userData.speed * dt));
    } else {
      health -= 8 * dt;
    }
  }
}

function updateUI() {
  health = Math.max(0, health);
  healthEl.textContent = `Health: ${Math.round(health)}`;

  const nearNpc = camera.position.distanceTo(npc.position) < 4;
  hintEl.textContent = talking
    ? "Dialogue active"
    : nearNpc
    ? "Press E to talk with the guide"
    : enemies.length === 0
    ? "Area clear. Return to the guide."
    : "Eliminate hostiles and meet your guide.";

  if (health <= 0) {
    hintEl.textContent = "You were defeated. Click to restart.";
    canLook = false;
    document.exitPointerLock();
    health = 100;
    camera.position.set(0, playerHeight, 8);
  }
}

function animate() {
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (canLook) {
    updatePlayer(dt);
    updateEnemies(dt);
    updateUI();
  }

  npc.rotation.y += dt * 0.6;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
