// ── Config ──────────────────────────────────────────────
let brushSize = 30;
let isColor   = true;
let imgLoaded = false;
let currentFile = null;

// ── p5 sketch ───────────────────────────────────────────
new p5(function(p) {
  let dropzoneEl = document.getElementById('dropzone');
  
  // Lemos o tamanho exato que o HTML/CSS dão ao contentor no arranque
  let W = dropzoneEl.clientWidth || 640;
  let H = dropzoneEl.clientHeight || 480;
  let isDrawing = false;

  p.setup = function() {
    p.pixelDensity(1); // 💡 CORREÇÃO: Força a densidade 1:1 para alinhar os píxeis lógicos com os físicos
    
    let cnv = p.createCanvas(W, H);
    cnv.parent('dropzone');
    p.background(26);
    p.noLoop();
    let canvasEl = cnv.elt;

    // Captura o clique e o arrastamento do rato de forma nativa
    canvasEl.addEventListener('mousedown', (e) => { isDrawing = true; handleMovement(e); });
    canvasEl.addEventListener('mousemove', (e) => { if (isDrawing) handleMovement(e); });
    window.addEventListener('mouseup', () => { isDrawing = false; });

    // Suporte para Toque / Mobile
    canvasEl.addEventListener('touchstart', (e) => { isDrawing = true; handleMovement(e.touches[0]); });
    canvasEl.addEventListener('touchmove', (e) => { if (isDrawing) { e.preventDefault(); handleMovement(e.touches[0]); } });
    window.addEventListener('touchend', () => { isDrawing = false; });
  };

  // Ajusta o tamanho interno se o ecrã mudar de tamanho
  p.windowResized = function() {
    if (!imgLoaded) {
      W = dropzoneEl.clientWidth;
      H = dropzoneEl.clientHeight;
      p.resizeCanvas(W, H);
    }
  };

  // Traduz a posição real do ecrã para os pixeis exatos do Canvas 1:1
  function handleMovement(e) {
    if (!imgLoaded) return;

    let rect = p.canvas.getBoundingClientRect();
    
    // Mapeamento direto e preciso 1 para 1
    let mouseXReal = Math.round(((e.clientX - rect.left) / rect.width) * W);
    let mouseYReal = Math.round(((e.clientY - rect.top) / rect.height) * H);

    if (mouseXReal >= 0 && mouseXReal < W && mouseYReal >= 0 && mouseYReal < H) {
      distort(mouseXReal, mouseYReal);
    }
  }

  p.keyPressed = function() {
    if (p.key === '+' || p.key === '=') {
      updateBrushSize(Math.min(120, brushSize + 5));
    } else if (p.key === '-' || p.key === '_') {
      updateBrushSize(Math.max(5, brushSize - 5));
    } else if (p.key === 'r' || p.key === 'R') {
      if (currentFile) loadImg(currentFile);
    }
  };

  // Função de desfoque/dispersão circular perfeita
  function distort(cx, cy) {
    let id = p.drawingContext.getImageData(0, 0, W, H);
    let px = id.data;
    let r  = brushSize;
    
    let originalPx = new Uint8ClampedArray(px);

    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        // Garante o corte circular perfeito do pincel
        if (dx * dx + dy * dy > r * r) continue;

        let tx = cx + dx;
        let ty = cy + dy;
        
        if (tx < 0 || tx >= W || ty < 0 || ty >= H) continue;

        // Dispersão proporcional ao tamanho do pincel
        let randomOffsetRange = r * 0.7; 
        let sx = tx + Math.floor((Math.random() * 2 - 1) * randomOffsetRange);
        let sy = ty + Math.floor((Math.random() * 2 - 1) * randomOffsetRange);

        sx = Math.min(W - 1, Math.max(0, sx));
        sy = Math.min(H - 1, Math.max(0, sy));

        let si = 4 * (sy * W + sx);
        let di = 4 * (ty * W + tx);

        let red   = originalPx[si];
        let green = originalPx[si+1];
        let blue  = originalPx[si+2];
        let alpha = originalPx[si+3];

        if (!isColor) {
          let gray = 0.299 * red + 0.587 * green + 0.114 * blue;
          red = green = blue = gray;
        }

        px[di]     = red;
        px[di+1]   = green;
        px[di+2]   = blue;
        px[di+3]   = alpha;
      }
    }
    p.drawingContext.putImageData(id, 0, 0);
  }

  function loadImg(file) {
    currentFile = file;
    const url = URL.createObjectURL(file);
    const native = new Image();
    native.onload = function() {
      // Forçamos o tamanho interno do Canvas a ser rigorosamente IGUAL ao tamanho visual do ecrã
      W = dropzoneEl.clientWidth;
      H = dropzoneEl.clientHeight;
      p.resizeCanvas(W, H);

      // Limpa o fundo com uma cor sólida para remover transparências fantasmas
      p.drawingContext.fillStyle = '#1a1a1a';
      p.drawingContext.fillRect(0, 0, W, H);

      // Calcula a escala ideal para a imagem caber no ecrã sem distorcer
      let scale = Math.min(W / native.width, H / native.height);
      let w = native.width  * scale;
      let h = native.height * scale;
      let x = (W - w) / 2;
      let y = (H - h) / 2;
      
      p.drawingContext.drawImage(native, x, y, w, h);
      URL.revokeObjectURL(url);
      imgLoaded = true;
      document.getElementById('overlay').style.display = 'none';
      document.getElementById('dropzone').classList.add('has-image');
    };
    native.src = url;
  }

  // Controlos de Upload
  document.getElementById('fileBtn').onclick = () => document.getElementById('fileInput').click();
  document.getElementById('fileInput').onchange = e => {
    if (e.target.files[0]) loadImg(e.target.files[0]);
  };

  const dz = document.getElementById('dropzone');
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.style.borderColor = '#4a9eff'; });
  dz.addEventListener('dragleave', () => { dz.style.borderColor = '#444'; });
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.style.borderColor = '#444';
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) loadImg(f);
  });
});

// ── Controlos Externos e Sincronização ───────────────────
const slider = document.getElementById('brushSlider');
const sizeVal = document.getElementById('sizeVal');

function updateBrushSize(val) {
  brushSize = val;
  slider.value = val;
  sizeVal.textContent = val;
}

slider.addEventListener('input', () => {
  updateBrushSize(parseInt(slider.value));
});

document.getElementById('colorToggle').addEventListener('change', function() {
  isColor = this.checked;
});