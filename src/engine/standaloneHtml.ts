/**
 * Generates a complete, self-contained, standalone single-file HTML game
 * that runs directly in any browser (desktop or mobile) without node/build tools.
 */
export function generateStandaloneGameHtml(): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>Cyber Horizon · Путешествие вдвоём</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-user-select: none; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #06090f; font-family: system-ui, -apple-system, sans-serif; color: #fff; touch-action: none; }
    #canvas-container { position: absolute; inset: 0; width: 100%; height: 100%; }
    
    /* HUD Overlay */
    .hud { position: fixed; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; padding: env(safe-area-inset-top, 16px) env(safe-area-inset-right, 16px) env(safe-area-inset-bottom, 16px) env(safe-area-inset-left, 16px); z-index: 10; }
    .interactive { pointer-events: auto; }
    
    /* Top Bar */
    .top-bar { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .title-box { background: rgba(9, 13, 20, 0.85); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.15); padding: 8px 14px; border-radius: 14px; }
    .title-box h1 { font-size: 15px; font-weight: 700; letter-spacing: 0.5px; color: #fff; }
    .title-box .subtitle { font-size: 11px; color: #94a3b8; margin-top: 2px; }
    .title-box .telemetry { font-size: 12px; font-weight: 600; color: #38bdf8; margin-top: 4px; font-family: monospace; }
    
    .top-actions { display: flex; gap: 8px; }
    .btn { background: rgba(9, 13, 20, 0.88); border: 1px solid rgba(255, 255, 255, 0.18); color: #fff; padding: 8px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
    .btn:active { transform: scale(0.95); }
    .btn-pink { background: rgba(244, 63, 94, 0.25); border-color: rgba(251, 113, 133, 0.5); color: #ffe4e6; }
    .btn-amber { background: rgba(245, 158, 11, 0.25); border-color: rgba(251, 191, 36, 0.5); color: #fef3c7; }
    .btn-sky { background: rgba(14, 165, 233, 0.25); border-color: rgba(56, 189, 248, 0.5); color: #e0f2fe; }
    .btn-emerald { background: rgba(16, 185, 129, 0.25); border-color: rgba(52, 211, 153, 0.5); color: #d1fae5; }
    
    /* Speech bubble */
    .speech-bubble { position: fixed; top: 82px; left: 50%; transform: translateX(-50%); background: rgba(19, 13, 22, 0.94); border: 1px solid rgba(251, 113, 133, 0.45); color: #ffe4e6; padding: 10px 16px; border-radius: 18px; font-size: 13px; max-width: 90vw; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 20; transition: opacity 0.3s; pointer-events: none; }
    .toast { position: fixed; top: 136px; left: 50%; transform: translateX(-50%); background: rgba(9, 13, 20, 0.94); border: 1px solid rgba(245, 158, 11, 0.45); color: #fef3c7; padding: 6px 14px; border-radius: 12px; font-size: 12px; font-weight: 500; z-index: 20; pointer-events: none; }
    
    /* Bottom Controls */
    .bottom-controls { display: flex; flex-direction: column; gap: 8px; width: 100%; }
    .context-strip { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; }
    .main-controls { display: flex; justify-content: space-between; align-items: flex-end; width: 100%; gap: 12px; }
    
    /* Steering slider */
    .steer-pad { width: 150px; height: 60px; background: rgba(9, 13, 20, 0.85); border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 16px; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; position: relative; touch-action: none; }
    .steer-track { position: relative; flex: 1; height: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 4px; margin: 0 8px; }
    .steer-knob { position: absolute; top: 50%; transform: translate(-50%, -50%); width: 26px; height: 26px; background: rgba(245, 158, 11, 0.35); border: 1px solid rgba(251, 191, 36, 0.8); border-radius: 10px; }
    
    /* Pedals */
    .pedals { display: flex; gap: 8px; }
    .pedal { width: 70px; height: 60px; border-radius: 16px; font-size: 13px; font-weight: 700; border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(9, 13, 20, 0.85); color: #fff; cursor: pointer; touch-action: none; display: flex; align-items: center; justify-content: center; }
    .pedal:active, .pedal.active { transform: scale(0.94); }
    .pedal-gas { background: rgba(16, 185, 129, 0.35); border-color: rgba(52, 211, 153, 0.6); }
    .pedal-gas:active, .pedal-gas.active { background: rgba(16, 185, 129, 0.6); }
    .pedal-brake { background: rgba(244, 63, 94, 0.3); border-color: rgba(251, 113, 133, 0.6); }
    .pedal-brake:active, .pedal-brake.active { background: rgba(244, 63, 94, 0.6); }
    
    /* Modal Menu */
    .modal { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 16px; }
    .modal-card { width: 100%; max-width: 440px; background: #0c121d; border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 20px; padding: 20px; max-height: 85vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .modal-header h2 { font-size: 16px; font-weight: 700; color: #fff; }
    .close-btn { background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer; }
    .menu-group { margin-bottom: 14px; }
    .menu-group label { display: block; font-size: 12px; color: #94a3b8; margin-bottom: 6px; }
    .pill-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .pill-btn { padding: 8px 4px; border-radius: 10px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: #cbd5e1; font-size: 11px; font-weight: 600; cursor: pointer; text-align: center; }
    .pill-btn.active { background: rgba(245, 158, 11, 0.3); border-color: #f59e0b; color: #fff; }
    
    .hidden { display: none !important; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
</head>
<body>
  <div id="canvas-container"></div>

  <div class="hud">
    <!-- Top info -->
    <div class="top-bar">
      <div class="title-box">
        <h1 id="zone-label">Корускант · Центральные шпили</h1>
        <div class="subtitle" id="env-label">Лето · 16:30 · Ясно</div>
        <div class="telemetry"><span id="speed-val">52</span> км/ч · <span id="alt-val">0</span> м</div>
      </div>
      <div class="top-actions interactive">
        <button class="btn btn-pink" id="btn-kiss">💖 Поцеловать</button>
        <button class="btn btn-pink" id="btn-talk">💬 Поговорить</button>
        <button class="btn" id="btn-settings">⚙️ Настройки</button>
      </div>
    </div>

    <!-- Speech & Toast -->
    <div id="speech-bubble" class="speech-bubble hidden"></div>
    <div id="toast" class="toast hidden"></div>

    <!-- Bottom thumb reach zone -->
    <div class="bottom-controls">
      <div class="context-strip interactive">
        <button class="btn btn-amber" id="btn-flight">🚀 В облака</button>
        <button class="btn btn-sky" id="btn-space">🌌 В космос</button>
        <button class="btn btn-emerald" id="btn-walk">🚶 Выйти</button>
        <button class="btn btn-amber" id="btn-boost">⚡ Форсаж 4с</button>
      </div>

      <div class="main-controls interactive">
        <!-- Steering Slide Pad -->
        <div class="steer-pad" id="steer-pad">
          <span>◀</span>
          <div class="steer-track">
            <div class="steer-knob" id="steer-knob" style="left: 50%;"></div>
          </div>
          <span>▶</span>
        </div>

        <!-- Gas & Brake Pedals -->
        <div class="pedals">
          <button class="pedal pedal-brake" id="btn-brake">Тормоз</button>
          <button class="pedal pedal-gas" id="btn-gas">Газ</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Settings Modal -->
  <div class="modal hidden" id="settings-modal">
    <div class="modal-card interactive">
      <div class="modal-header">
        <h2>Настройки и Атмосфера</h2>
        <button class="close-btn" id="btn-close-modal">✕</button>
      </div>
      
      <div class="menu-group">
        <label>Время суток</label>
        <div class="pill-grid">
          <button class="pill-btn" data-time="dawn">Рассвет</button>
          <button class="pill-btn active" data-time="day">День</button>
          <button class="pill-btn" data-time="sunset">Закат</button>
          <button class="pill-btn" data-time="night">Ночь</button>
        </div>
      </div>

      <div class="menu-group">
        <label>Погода</label>
        <div class="pill-grid">
          <button class="pill-btn active" data-weather="clear">Ясно</button>
          <button class="pill-btn" data-weather="cloudy">Облачно</button>
          <button class="pill-btn" data-weather="rain">Дождь</button>
          <button class="pill-btn" data-weather="snow">Снег</button>
        </div>
      </div>

      <div class="menu-group">
        <label>Время года</label>
        <div class="pill-grid">
          <button class="pill-btn" data-season="spring">Весна</button>
          <button class="pill-btn active" data-season="summer">Лето</button>
          <button class="pill-btn" data-season="autumn">Осень</button>
          <button class="pill-btn" data-season="winter">Зима</button>
        </div>
      </div>

      <div class="menu-group" style="margin-top: 18px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
        <label>Управление с клавиатуры</label>
        <p style="font-size: 11px; color: #94a3b8; line-height: 1.5;">
          <b>W/S</b> или <b>↑/↓</b>: Газ и Тормоз<br/>
          <b>A/D</b> или <b>←/→</b>: Руль влево/вправо<br/>
          <b>Shift</b>: Форсаж · <b>F</b>: Полет · <b>G</b>: Космос<br/>
          <b>K</b>: Поцеловать · <b>T</b>: Поговорить · <b>R</b>: Выйти из машины
        </p>
      </div>
    </div>
  </div>

  <script>
    // --- 3D Standalone Engine ---
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x06090f);
    scene.fog = new THREE.FogExp2(0x06090f, 0.0018);

    const camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.1, 8000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Sunlight & Ambient
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffeedd, 2.2);
    sunLight.position.set(100, 220, 150);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    // --- State Variables ---
    let speed = 40;
    let heading = 0;
    let steerAngle = 0;
    let isFlying = false;
    let inSpace = false;
    let isWalking = false;
    let altitude = 0;
    let boostTimer = 0;
    let weather = 'clear';
    let season = 'summer';
    let timeOfDay = 'day';

    const inputs = { throttle: false, brake: false, steer: 0, boost: false };
    const vehiclePos = new THREE.Vector3(0, 0, 0);

    // --- Infinite Seamless Planetary Ground & Connected Roads ---
    // Ground extends 14000m to the horizon so it NEVER cuts off!
    const groundGeo = new THREE.CircleGeometry(14000, 48);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x141e2e, roughness: 0.8, metalness: 0.2 });
    const planetGround = new THREE.Mesh(groundGeo, groundMat);
    planetGround.position.y = -0.05;
    planetGround.receiveShadow = true;
    scene.add(planetGround);

    // Road Grid System: Seamless, continuous connected avenues (never cut off!)
    const roadGroup = new THREE.Group();
    scene.add(roadGroup);

    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.25 });
    const roadGeo = new THREE.BoxGeometry(1, 1, 1);
    const MAX_ROADS = 180;
    const roadMesh = new THREE.InstancedMesh(roadGeo, roadMat, MAX_ROADS);
    roadMesh.receiveShadow = true;
    roadGroup.add(roadMesh);

    // Buildings & City Towers
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x223046, roughness: 0.4, metalness: 0.6 });
    const towerGeo = new THREE.BoxGeometry(1, 1, 1);
    const MAX_TOWERS = 140;
    const towerMesh = new THREE.InstancedMesh(towerGeo, towerMat, MAX_TOWERS);
    towerMesh.castShadow = true;
    towerMesh.receiveShadow = true;
    scene.add(towerMesh);

    // Trees
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.6 });
    const treeGeo = new THREE.ConeGeometry(3, 8, 6);
    const MAX_TREES = 120;
    const treeMesh = new THREE.InstancedMesh(treeGeo, treeMat, MAX_TREES);
    treeMesh.castShadow = true;
    scene.add(treeMesh);

    // Rebuild local chunks around player
    const dummy = new THREE.Object3D();
    function updateWorldChunks(vx, vz) {
      planetGround.position.x = vx;
      planetGround.position.z = vz;

      const cx0 = Math.round(vx / 240);
      const cz0 = Math.round(vz / 240);
      let rIdx = 0;
      let tIdx = 0;
      let trIdx = 0;

      for (let gx = -2; gx <= 2; gx++) {
        for (let gz = -2; gz <= 2; gz++) {
          const cx = cx0 + gx;
          const cz = cz0 + gz;
          const ox = cx * 240;
          const oz = cz * 240;

          // Continuous Connected Roads (every road leads smoothly into neighbor!)
          if (rIdx < MAX_ROADS) {
            // Main North-South highway arm
            dummy.position.set(ox, 0, oz);
            dummy.scale.set(30, 0.4, 240);
            dummy.updateMatrix();
            roadMesh.setMatrixAt(rIdx++, dummy.matrix);

            // Cross East-West avenue arm
            dummy.position.set(ox, 0.02, oz);
            dummy.scale.set(240, 0.38, 26);
            dummy.updateMatrix();
            roadMesh.setMatrixAt(rIdx++, dummy.matrix);
          }

          // Towers along city avenues
          if (tIdx < MAX_TOWERS && Math.abs(cx % 2) === 1) {
            for (let side of [-45, 45]) {
              if (tIdx < MAX_TOWERS) {
                const th = 40 + Math.abs((cx * 17 + cz * 23) % 80);
                dummy.position.set(ox + side, th / 2, oz + (side > 0 ? 50 : -50));
                dummy.scale.set(36, th, 36);
                dummy.updateMatrix();
                towerMesh.setMatrixAt(tIdx++, dummy.matrix);
              }
            }
          }

          // Trees along parkways
          if (trIdx < MAX_TREES && Math.abs(cz % 2) === 1) {
            for (let side of [-22, 22]) {
              if (trIdx < MAX_TREES) {
                dummy.position.set(ox + side, 4, oz + (side > 0 ? 30 : -30));
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                treeMesh.setMatrixAt(trIdx++, dummy.matrix);
              }
            }
          }
        }
      }
      roadMesh.instanceMatrix.needsUpdate = true;
      towerMesh.instanceMatrix.needsUpdate = true;
      treeMesh.instanceMatrix.needsUpdate = true;
    }
    updateWorldChunks(0, 0);

    // --- Cockpit Vehicle Rig ---
    const vehicleGroup = new THREE.Group();
    scene.add(vehicleGroup);

    // Futuristic Dashboard & Windshield
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.5 });
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.7), cabinMat);
    dash.position.set(0, 0.65, -0.7);
    vehicleGroup.add(dash);

    // Steering Wheel (correct rotation: right turn rotates right!)
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(-0.36, 0.78, -0.42);
    wheelGroup.rotation.x = -0.3;
    const wheelRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.024, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 })
    );
    wheelGroup.add(wheelRing);
    vehicleGroup.add(wheelGroup);

    // Blonde Companion (passenger seat right next to driver)
    const companionGroup = new THREE.Group();
    companionGroup.position.set(0.38, 0.25, -0.15);
    
    // Body & Jacket
    const compBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.65, 12),
      new THREE.MeshStandardMaterial({ color: 0xf5f3ed, roughness: 0.7 })
    );
    compBody.position.y = 0.35;
    companionGroup.add(compBody);

    // Head
    const compHead = new THREE.Group();
    compHead.position.set(0, 0.8, 0);
    const face = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffdfd3, roughness: 0.8 })
    );
    compHead.add(face);

    // Blonde Hair
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.7),
      new THREE.MeshStandardMaterial({ color: 0xd9b375, roughness: 0.85 })
    );
    hair.position.set(0, 0.03, -0.02);
    compHead.add(hair);

    companionGroup.add(compHead);
    vehicleGroup.add(companionGroup);

    // Camera in driver seat
    camera.position.set(-0.36, 1.08, 0.05);
    vehicleGroup.add(camera);

    // --- Weather & Atmosphere Update ---
    function setWeather(w) {
      weather = w;
      if (w === 'rain') {
        roadMat.roughness = 0.08;
        roadMat.metalness = 0.85;
        scene.fog.density = 0.0035;
      } else if (w === 'snow') {
        roadMat.roughness = 0.55;
        roadMat.metalness = 0.1;
        groundMat.color.set('#e2e8f0');
        scene.fog.density = 0.004;
      } else {
        roadMat.roughness = 0.35;
        roadMat.metalness = 0.25;
        scene.fog.density = 0.0018;
      }
    }

    function setSeason(s) {
      season = s;
      if (s === 'winter') {
        groundMat.color.set('#cbd5e1');
        treeMat.color.set('#94a3b8');
      } else if (s === 'autumn') {
        groundMat.color.set('#9a6328');
        treeMat.color.set('#d97706');
      } else if (s === 'spring') {
        groundMat.color.set('#38a169');
        treeMat.color.set('#6ee7b7');
      } else {
        groundMat.color.set('#141e2e');
        treeMat.color.set('#4ade80');
      }
    }

    function setTime(t) {
      timeOfDay = t;
      if (t === 'dawn') {
        scene.background.set('#254b7c');
        ambientLight.intensity = 0.7;
      } else if (t === 'sunset') {
        scene.background.set('#4a1d30');
        ambientLight.intensity = 0.6;
      } else if (t === 'night') {
        scene.background.set('#040712');
        ambientLight.intensity = 0.35;
      } else {
        scene.background.set('#0d2038');
        ambientLight.intensity = 0.9;
      }
      scene.fog.color.copy(scene.background);
    }

    // --- Companion Interaction Messages ---
    const speechEl = document.getElementById('speech-bubble');
    const toastEl = document.getElementById('toast');
    let speechTimer = 0;
    let toastTimer = 0;

    function showSpeech(text, dur = 5) {
      speechEl.innerText = text;
      speechEl.classList.remove('hidden');
      speechTimer = dur;
    }

    function showToast(text, dur = 3) {
      toastEl.innerText = text;
      toastEl.classList.remove('hidden');
      toastTimer = dur;
    }

    function kissCompanion() {
      const phrases = [
        'Она нежно улыбается, её щёчки слегка розовеют: «Ты самый лучший водитель… Люблю тебя!»',
        'Она ласково прижимается к твоему плечу: «С тобой так хорошо и спокойно…»',
        '«Ммм… от тебя всегда так тепло. Спасибо за эту чудесную поездку!»'
      ];
      showSpeech(phrases[Math.floor(Math.random() * phrases.length)], 6);
      showToast('Нежный поцелуй вдвоём 💖', 3);
    }

    function talkCompanion() {
      const phrases = [
        '«Какая бесконечная, красивая дорога… Интересно, куда она приведёт?»',
        '«Мне так нравится путешествовать рядом с тобой!»',
        '«Смотри, какие шпили за окном! Давай поднимемся в облака?»',
        '«Здесь так уютно вдвоём в салоне…»'
      ];
      showSpeech(phrases[Math.floor(Math.random() * phrases.length)], 5);
    }

    // --- UI Controls Binding ---
    document.getElementById('btn-kiss').addEventListener('click', kissCompanion);
    document.getElementById('btn-talk').addEventListener('click', talkCompanion);

    document.getElementById('btn-flight').addEventListener('click', () => {
      isFlying = !isFlying;
      showToast(isFlying ? 'Режим полёта активирован 🚀' : 'Возврат на дорогу');
    });

    document.getElementById('btn-space').addEventListener('click', () => {
      inSpace = !inSpace;
      showToast(inSpace ? 'Выход на орбиту в космос 🌌' : 'Возврат в атмосферу');
    });

    document.getElementById('btn-boost').addEventListener('click', () => {
      boostTimer = 4.0;
      showToast('Форсаж активирован на 4 секунды! ⚡');
    });

    document.getElementById('btn-walk').addEventListener('click', () => {
      isWalking = !isWalking;
      camera.position.set(0, isWalking ? 1.7 : 1.08, isWalking ? 0 : 0.05);
      showToast(isWalking ? 'Пешая прогулка' : 'Сели обратно в машину');
    });

    // Pedals
    const gasBtn = document.getElementById('btn-gas');
    const brakeBtn = document.getElementById('btn-brake');
    const setGas = (active) => { inputs.throttle = active; gasBtn.classList.toggle('active', active); };
    const setBrake = (active) => { inputs.brake = active; brakeBtn.classList.toggle('active', active); };

    gasBtn.addEventListener('pointerdown', () => setGas(true));
    window.addEventListener('pointerup', () => { setGas(false); setBrake(false); });
    brakeBtn.addEventListener('pointerdown', () => setBrake(true));

    // Steering slider touch
    const steerPad = document.getElementById('steer-pad');
    const steerKnob = document.getElementById('steer-knob');
    let steerPointerId = null;

    function updateSteerFromX(clientX) {
      const rect = steerPad.getBoundingClientRect();
      const norm = ((clientX - rect.left) / rect.width) * 2 - 1;
      const clamped = Math.max(-1, Math.min(1, norm));
      inputs.steer = clamped;
      steerKnob.style.left = \`\${(clamped + 1) * 50}%\`;
    }

    steerPad.addEventListener('pointerdown', (e) => {
      steerPointerId = e.pointerId;
      updateSteerFromX(e.clientX);
    });
    window.addEventListener('pointermove', (e) => {
      if (steerPointerId === e.pointerId) updateSteerFromX(e.clientX);
    });
    window.addEventListener('pointerup', (e) => {
      if (steerPointerId === e.pointerId) {
        steerPointerId = null;
        inputs.steer = 0;
        steerKnob.style.left = '50%';
      }
    });

    // Keyboard support
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') setGas(true);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') setBrake(true);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') inputs.steer = -0.7;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') inputs.steer = 0.7;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') boostTimer = 4.0;
      if (e.code === 'KeyK') kissCompanion();
      if (e.code === 'KeyT') talkCompanion();
      if (e.code === 'KeyF') document.getElementById('btn-flight').click();
      if (e.code === 'KeyG') document.getElementById('btn-space').click();
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') setGas(false);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') setBrake(false);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft' || e.code === 'KeyD' || e.code === 'ArrowRight') inputs.steer = 0;
    });

    // Modal settings
    const modal = document.getElementById('settings-modal');
    document.getElementById('btn-settings').addEventListener('click', () => modal.classList.remove('hidden'));
    document.getElementById('btn-close-modal').addEventListener('click', () => modal.classList.add('hidden'));

    document.querySelectorAll('[data-time]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-time]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        setTime(e.target.dataset.time);
      });
    });

    document.querySelectorAll('[data-weather]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-weather]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        setWeather(e.target.dataset.weather);
      });
    });

    document.querySelectorAll('[data-season]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('[data-season]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        setSeason(e.target.dataset.season);
      });
    });

    // --- Main Animation Loop ---
    let lastTime = performance.now();
    let lastChunkUpdate = 0;

    function animate(now) {
      requestAnimationFrame(animate);
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Timers
      if (speechTimer > 0) {
        speechTimer -= delta;
        if (speechTimer <= 0) speechEl.classList.add('hidden');
      }
      if (toastTimer > 0) {
        toastTimer -= delta;
        if (toastTimer <= 0) toastEl.classList.add('hidden');
      }
      if (boostTimer > 0) boostTimer = Math.max(0, boostTimer - delta);

      // Driving physics
      const maxSpeed = boostTimer > 0 ? 110 : (isFlying ? 75 : 55);
      if (inputs.throttle) {
        speed = Math.min(maxSpeed, speed + (boostTimer > 0 ? 42 : 22) * delta);
      } else if (inputs.brake) {
        speed = Math.max(-15, speed - 35 * delta);
      } else {
        speed = Math.max(0, speed - 8 * delta);
      }

      // Steering (Right input turns wheel right!)
      steerAngle = THREE.MathUtils.damp(steerAngle, inputs.steer, 10, delta);
      wheelGroup.rotation.z = -steerAngle * 0.75; // Right turn rotates wheel clockwise

      heading -= steerAngle * (speed / 30) * delta;
      const moveDist = (speed / 3.6) * delta;
      vehiclePos.x += -Math.sin(heading) * moveDist;
      vehiclePos.z += -Math.cos(heading) * moveDist;

      // Flight & Space altitude
      if (inSpace) {
        altitude = THREE.MathUtils.damp(altitude, 850, 2, delta);
      } else if (isFlying) {
        altitude = THREE.MathUtils.damp(altitude, 95, 3, delta);
      } else {
        altitude = THREE.MathUtils.damp(altitude, 0, 5, delta);
      }
      vehiclePos.y = altitude;

      vehicleGroup.position.copy(vehiclePos);
      vehicleGroup.rotation.y = heading;

      // Companion looks at driver when moving or stopped
      compHead.rotation.y = Math.sin(now * 0.0015) * 0.25 - 0.45;

      // Rebuild world chunks smoothly as vehicle moves
      if (now - lastChunkUpdate > 300) {
        lastChunkUpdate = now;
        updateWorldChunks(vehiclePos.x, vehiclePos.z);
      }

      // Update HUD
      document.getElementById('speed-val').innerText = Math.round(Math.abs(speed));
      document.getElementById('alt-val').innerText = Math.round(altitude);

      renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>`;
}
