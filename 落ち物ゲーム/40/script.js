const COLS = 10, ROWS = 20, BS = 30, TARGET_LINES = 40;
const ctx = document.getElementById('game-board').getContext('2d');
const hCtx = document.getElementById('hold-canvas').getContext('2d'), nCtxs = Array.from({length:5}, (_, i) => document.getElementById(`next-canvas-${i+1}`).getContext('2d'));
const COLORS = ['#000', '#0FF', '#00F', '#F80', '#FF0', '#0F0', '#808', '#F00', '#888'];
const SHAPES = [[], [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], [[2,0,0],[2,2,2],[0,0,0]], [[0,0,3],[3,3,3],[0,0,0]], [[4,4],[4,4]], [[0,5,5],[5,5,0],[0,0,0]], [[0,6,0],[6,6,6],[0,0,0]], [[7,7,0],[0,7,7],[0,0,0]]];
const WK = {"0-1":[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]], "1-0":[[0,0],[1,0],[1,-1],[0,2],[1,2]], "1-2":[[0,0],[1,0],[1,-1],[0,2],[1,2]], "2-1":[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]], "2-3":[[0,0],[1,0],[1,1],[0,-2],[1,-2]], "3-2":[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]], "3-0":[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]], "0-3":[[0,0],[1,0],[1,1],[0,-2],[1,-2]]};
const WKI = {"0-1":[[0,0],[-2,0],[1,0],[-2,-1],[1,2]], "1-0":[[0,0],[2,0],[-1,0],[2,1],[-1,-2]], "1-2":[[0,0],[-1,0],[2,0],[-1,2],[2,-1]], "2-1":[[0,0],[1,0],[-2,0],[1,-2],[-2,1]], "2-3":[[0,0],[2,0],[-1,0],[2,1],[-1,-2]], "3-2":[[0,0],[-2,0],[1,0],[-2,-1],[1,2]], "3-0":[[0,0],[1,0],[-2,0],[1,-2],[-2,1]], "0-3":[[0,0],[-1,0],[2,0],[-1,2],[2,-1]]};

let board, cp, next = [], holdP, canH, lines, lastDrop, startT, over, isRot, gamepadIdx = null;
const lineDisp = document.getElementById('remaining'), timeDisp = document.getElementById('timer');

const isValid = (x, y, s = cp.shape) => s.every((r, i) => r.every((v, j) => !v || (x+j >= 0 && x+j < COLS && y+i < ROWS && (!board[y+i] || board[y+i][x+j] === 0))));

const dR = (c, x, y, s, x0=0, y0=0, sz=25) => {
    c.fillStyle = COLORS[s]; c.fillRect(x0+x*sz, y0+y*sz, sz-1, sz-1);
    c.strokeStyle = 'rgba(255,255,255,0.2)'; c.strokeRect(x0+x*sz, y0+y*sz, sz-1, sz-1);
};

function draw() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, COLS*BS, ROWS*BS);
    board.forEach((r, y) => r.forEach((v, x) => v && dR(ctx, x, y, v, 0, 0, BS)));
    if (!cp) return;
    let gy = cp.y; while (isValid(cp.x, gy+1)) gy++;
    cp.shape.forEach((r, i) => r.forEach((v, j) => v && (dR(ctx, cp.x+j, gy+i, 8, 0, 0, BS), dR(ctx, cp.x+j, cp.y+i, cp.color, 0, 0, BS))));
    drawPrv(holdP, hCtx); next.slice(0, 5).forEach((p, i) => drawPrv(p, nCtxs[i]));
}

function drawPrv(id, c) {
    c.setTransform(1,0,0,1,0,0); c.fillStyle = '#000'; c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    if (!id) return;
    const s = SHAPES[id], sz = 20, x0 = (c.canvas.width - s[0].length*sz)/2, y0 = (c.canvas.height - s.length*sz)/2;
    s.forEach((r, i) => r.forEach((v, j) => v && dR(c, j, i, id, x0, y0, sz)));
}

function gen() {
    if (next.length < 7) { let b = [1,2,3,4,5,6,7]; for(let i=6; i>0; i--){ const j=Math.floor(Math.random()*(i+1)); [b[i], b[j]] = [b[j], b[i]]; } next.push(...b); }
    const id = next.shift(); cp = { x:~~((COLS-SHAPES[id][0].length)/2), y:id==1?-2:-1, shape:SHAPES[id], color:id, rot:0 };
    if (!isValid(cp.x, cp.y)) stopGame("GAME OVER");
}

function lock() {
    cp.shape.forEach((r, i) => r.forEach((v, j) => { if(v && cp.y+i >= 0) board[cp.y+i][cp.x+j] = cp.color; }));
    let cl = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(v => v !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            cl++; y++;
        }
    }
    lines += cl;
    lineDisp.innerText = Math.max(0, TARGET_LINES - lines);
    if (lines >= TARGET_LINES) stopGame("CLEAR!"); else { canH = true; isRot = false; gen(); }
}

function stopGame(title) {
    over = true;
    document.getElementById('status-title').innerText = title;
    document.getElementById('final-time').innerText = ((performance.now() - startT) / 1000).toFixed(2);
    document.getElementById('game-over-screen').classList.remove('hidden');
}

const move = (dx, dy) => isValid(cp.x+dx, cp.y+dy) ? (cp.x+=dx, cp.y+=dy, isRot=false, true) : false;

function rotate(cw) {
    if (cp.color == 4) return;
    const old = cp.rot, nR = (old + (cw?1:3)) % 4, nS = cw ? cp.shape[0].map((_, i) => cp.shape.map(r => r[i]).reverse()) : cp.shape[0].map((_, i) => cp.shape.map(r => r[r.length-1-i]));
    const ks = (cp.color==1?WKI:WK)[`${old}-${nR}`];
    for (const [dx, dy] of ks) if (isValid(cp.x+dx, cp.y-dy, nS)) return (cp.x+=dx, cp.y-=dy, cp.shape=nS, cp.rot=nR, isRot=true);
}

const acts = { moveLeft:()=>move(-1,0), moveRight:()=>move(1,0), softDrop:()=>move(0,1), hardDrop:()=>{while(move(0,1));lock()}, rotateLeft:()=>rotate(0), rotateRight:()=>rotate(1), hold:()=>{if(!canH)return; if(holdP){[holdP,cp.color]=[cp.color,holdP]; cp.shape=SHAPES[cp.color]; cp.y=cp.color==1?-2:-1; cp.x=~~((COLS-cp.shape[0].length)/2)}else{holdP=cp.color;gen()} canH=false} };

// 入力イベント
document.addEventListener('keydown', e => { 
    const k = {'a':'moveLeft','d':'moveRight','s':'softDrop',' ':'hardDrop','q':'rotateLeft','w':'rotateRight','x':'hold'}[e.key.toLowerCase()]; 
    if(k && !over) acts[k](), draw(); 
});

['hold', 'rotate-left', 'rotate-right', 'hard-drop'].forEach(id => { 
    const el = document.getElementById(`btn-${id}`); 
    if(el) el.onclick = () => !over && (acts[id.replace(/-./g, x=>x[1].toUpperCase())](), draw()); 
});

// コントローラー処理
window.addEventListener("gamepadconnected", (e) => gamepadIdx = e.gamepad.index);
let lastGP = 0;
function updateGamepad() {
    if (gamepadIdx === null || over) return;
    const gp = navigator.getGamepads()[gamepadIdx];
    if (!gp) return;
    const now = performance.now();
    if (now - lastGP < 120) return;
    if (gp.axes[0] < -0.5 || gp.buttons[14].pressed) acts.moveLeft(), lastGP = now;
    if (gp.axes[0] > 0.5  || gp.buttons[15].pressed) acts.moveRight(), lastGP = now;
    if (gp.axes[1] > 0.5  || gp.buttons[13].pressed) acts.softDrop(), lastGP = now;
    if (gp.buttons[0].pressed) acts.rotateRight(), lastGP = now;
    if (gp.buttons[1].pressed) acts.rotateLeft(), lastGP = now;
    if (gp.buttons[2].pressed) acts.hardDrop(), lastGP = now;
    if (gp.buttons[3].pressed) acts.hold(), lastGP = now;
    draw();
}

function loop(t) { 
    if(over) return; 
    timeDisp.innerText = ((t - startT) / 1000).toFixed(2);
    updateGamepad();
    if(t - lastDrop > 1000) move(0,1) || lock(), lastDrop = t; 
    draw(); requestAnimationFrame(loop); 
}

window.startGame = () => {
    board = Array.from({length:ROWS},()=>Array(COLS).fill(0));
    lines=0; holdP=null; next=[]; canH=true; over=false;
    lineDisp.innerText = TARGET_LINES;
    document.getElementById('game-over-screen').classList.add('hidden');
    gen(); startT = lastDrop = performance.now(); loop(startT);
};
startGame();
function drawPrv(id, c) {
    c.setTransform(1, 0, 0, 1, 0, 0); 
    c.fillStyle = '#000'; 
    c.fillRect(0, 0, c.canvas.width, c.canvas.height);
    
    if (!id) return;
    
    const s = SHAPES[id];
    // ミノの形状に合わせて、1ブロックのサイズを自動計算（枠に収める）
    // Iミノ(4マス)や小さい枠(60px)でもはみ出さないように調整します
    const maxDimension = Math.max(s.length, s[0].length);
    const sz = (c.canvas.width * 0.8) / maxDimension; 
    
    const x0 = (c.canvas.width - s[0].length * sz) / 2;
    const y0 = (c.canvas.height - s.length * sz) / 2;

    s.forEach((r, i) => {
        r.forEach((v, j) => {
            if (v) {
                // dR関数の引数に合わせた描画
                c.fillStyle = COLORS[id];
                c.fillRect(x0 + j * sz, y0 + i * sz, sz - 1, sz - 1);
                c.strokeStyle = 'rgba(255,255,255,0.2)';
                c.strokeRect(x0 + j * sz, y0 + i * sz, sz - 1, sz - 1);
            }
        });
    });
};
// --- ボタン操作の強化 (タッチ対応) ---
const setupButtons = () => {
    const buttonMap = {
        'btn-hold': 'hold',
        'btn-rotate-left': 'rotateLeft',
        'btn-rotate-right': 'rotateRight',
        'btn-hard-drop': 'hardDrop'
    };

    Object.keys(buttonMap).forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        // タッチ開始時に実行（クリックより反応が速い）
        const handleAction = (e) => {
            e.preventDefault(); // ズームやスクロールを防止
            if (!over) {
                acts[buttonMap[id]]();
                draw();
            }
        };

        el.addEventListener('touchstart', handleAction, { passive: false });
        el.addEventListener('mousedown', (e) => {
            // PCでのマウス操作も維持（touchstartが優先される）
            if (e.type === 'mousedown' && !('ontouchstart' in window)) {
                handleAction(e);
            }
        });
    });
};

// startGameの最後、またはファイルの下の方で実行
setupButtons();