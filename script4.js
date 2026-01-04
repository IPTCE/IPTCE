const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzvk8m3qjjTpYAoE2JdjhZc-VqJqzVYhx7r8LQ875VQKUN0cYOFvsVOkmm3gHJkd78/exec"; 
let gradoSeleccionado = "";
let columnaCursoGlobal = 0;
let filaInicioGlobal = 0; // Para saber dónde empezar a guardar
let esAsistencia = false;

window.onload = async () => {
    const resp = await fetch(`${WEB_APP_URL}?action=obtenerGrados`);
    const grados = await resp.json();
    const select = document.getElementById('selectGrado');
    select.innerHTML = '<option value="">Seleccione grado...</option>';
    grados.forEach(g => { let opt = document.createElement('option'); opt.value = g; opt.innerText = g; select.appendChild(opt); });
    setInterval(() => { document.getElementById('reloj').innerText = new Date().toLocaleTimeString(); }, 1000);
};

document.getElementById('selectGrado').onchange = async (e) => {
    gradoSeleccionado = e.target.value;
    const selectCurso = document.getElementById('selectCurso');
    if(!gradoSeleccionado) { selectCurso.disabled = true; return; }
    
    const resp = await fetch(`${WEB_APP_URL}?action=obtenerCursosDeGrado&grado=${gradoSeleccionado}`);
    const cursos = await resp.json();
    selectCurso.innerHTML = '<option value="">Seleccione curso...</option>';
    cursos.forEach(c => { let opt = document.createElement('option'); opt.value = c.nombre; opt.innerText = c.nombre; selectCurso.appendChild(opt); });
    selectCurso.disabled = false;
};

document.getElementById('btnValidar').onclick = async () => {
    const curso = document.getElementById('selectCurso').value;
    const pass = document.getElementById('passDocente').value;
    const bimestre = document.getElementById('selectBimestre').value;

    if(!gradoSeleccionado || !curso || !pass) return alert("Complete todos los campos.");

    const btn = document.getElementById('btnValidar');
    btn.disabled = true; btn.innerText = "...";

    try {
        const resp = await fetch(`${WEB_APP_URL}?action=validarClave&grado=${gradoSeleccionado}&curso=${curso}&pass=${pass}&bimestre=${bimestre}`);
        const data = await resp.json();

        if(data.valido) {
            columnaCursoGlobal = data.columna;
            filaInicioGlobal = data.filaInicio; // El GS ahora nos devuelve la fila exacta
            esAsistencia = curso.toLowerCase().includes("asistencia");
            document.getElementById('lblCursoActivo').innerText = `${bimestre} - ${curso}`;
            renderizarAlumnos(data.datosAlumnos);
            document.getElementById('seccionNotas').classList.remove('hidden');
            document.getElementById('btnValidar').classList.add('bg-green-600');
        } else {
            alert("Contraseña o curso incorrecto para este bimestre.");
        }
    } catch(e) { alert("Error de conexión."); }
    btn.disabled = false; btn.innerText = "Entrar";
};

function renderizarAlumnos(alumnos) {
    const cont = document.getElementById('contenedorAlumnos');
    cont.innerHTML = "";
    alumnos.forEach((a, i) => {
        let zPrev = 0, ePrev = 0;
        if(typeof a.nota === 'string' && a.nota.startsWith('=')) {
            const partes = a.nota.replace('=','').split('+');
            zPrev = partes[0] || 0; ePrev = partes[1] || 0;
        } else { zPrev = a.nota || 0; }

        const div = document.createElement('div');
        div.className = "grid grid-cols-12 gap-2 items-center bg-slate-800/40 p-2 rounded-xl border border-slate-700/50";
        
        let examenHTML = esAsistencia ? `<div class="text-slate-600 text-center">-</div>` : 
            `<input type="number" oninput="sumar(${i})" id="e-${i}" value="${ePrev}" class="w-full bg-slate-950 border border-slate-700 rounded p-1 text-center text-xs text-blue-400">`;

        div.innerHTML = `
            <div class="col-span-1 text-[10px] font-mono text-slate-500 text-center">${i+1}</div>
            <div class="col-span-5 text-xs font-medium truncate">${a.nombre}</div>
            <div class="col-span-2"><input type="number" oninput="sumar(${i})" id="z-${i}" value="${zPrev}" class="w-full bg-slate-950 border border-slate-700 rounded p-1 text-center text-xs"></div>
            <div class="col-span-2">${examenHTML}</div>
            <div class="col-span-2 text-center text-xs font-bold text-emerald-400" id="t-${i}">${Number(zPrev)+Number(ePrev)}</div>
        `;
        cont.appendChild(div);
    });
}

function sumar(idx) {
    const z = Number(document.getElementById(`z-${idx}`).value) || 0;
    const e = Number(document.getElementById(`e-${idx}`).value) || 0;
    document.getElementById(`t-${idx}`).innerText = z + e;
}

document.getElementById('btnGuardarNotas').onclick = async () => {
    const zs = document.querySelectorAll('[id^=\"z-\"]'), es = document.querySelectorAll('[id^=\"e-\"]');
    const formulas = Array.from(zs).map((z, i) => {
        const valE = es[i] ? (es[i].value || 0) : 0;
        return `=${z.value || 0}+${valE}`;
    });
    
    if(!confirm("¿Guardar cambios?")) return;
    const btn = document.getElementById('btnGuardarNotas');
    btn.disabled = true; btn.innerText = "Guardando...";

    const fd = new URLSearchParams();
    fd.append('action', 'guardarNotas');
    fd.append('grado', gradoSeleccionado);
    fd.append('columna', columnaCursoGlobal);
    fd.append('filaInicio', filaInicioGlobal);
    fd.append('notas', JSON.stringify(formulas));

    await fetch(WEB_APP_URL, { method: 'POST', body: fd });
    alert("¡Notas guardadas!");
    btn.disabled = false; btn.innerText = "Guardar Notas Oficiales";
};