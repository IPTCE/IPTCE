const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzvk8m3qjjTpYAoE2JdjhZc-VqJqzVYhx7r8LQ875VQKUN0cYOFvsVOkmm3gHJkd78/exec";
let datosCursosGlobal = []; 
let listaAlumnosArray = [];
let seleccionCursosOrden = [];

document.getElementById('btnActualizar').addEventListener('click', transferirYRefrescar);
document.getElementById('btnCrearAula').addEventListener('click', crearNuevaAula);
document.getElementById('btnAgregarAlumno').addEventListener('click', agregarAlumnoALista);

function agregarAlumnoALista() {
    const input = document.getElementById('inputAlumno');
    const nombre = input.value.trim();
    if (!nombre) return;
    listaAlumnosArray.push(nombre);
    renderizarAlumnos();
    input.value = '';
    input.focus();
}

function renderizarAlumnos() {
    const contenedor = document.getElementById('listaAlumnos');
    contenedor.innerHTML = '';
    listaAlumnosArray.forEach((alumno, index) => {
        const div = document.createElement('div');
        div.className = "flex justify-between items-center bg-slate-800 p-2 rounded text-xs mb-1";
        div.innerHTML = `<span>${alumno}</span>
            <button onclick="eliminarAlumno(${index})" class="text-red-400 hover:text-red-300"><i class="fas fa-times"></i></button>`;
        contenedor.appendChild(div);
    });
}

function eliminarAlumno(index) {
    listaAlumnosArray.splice(index, 1);
    renderizarAlumnos();
}

async function transferirYRefrescar() {
    const btn = document.getElementById('btnActualizar');
    const icon = document.getElementById('iconSync');
    const tabla = document.getElementById('tablaCursos');
    btn.disabled = true; icon.classList.add('animate-spin');
    
    try {
        const response = await fetch(`${WEB_APP_URL}?action=transferir&t=${Date.now()}`);
        const data = await response.json();
        if (Array.isArray(data)) {
            datosCursosGlobal = data; 
            tabla.innerHTML = '';
            actualizarCheckboxes(data); 
            data.forEach(fila => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-700/30 transition-colors border-b border-slate-800";
                tr.innerHTML = `<td class="px-6 py-4 font-medium text-blue-300">${fila[0] || "---"}</td>
                    <td class="px-6 py-4 text-slate-300">${fila[1] || "---"}</td>
                    <td class="px-6 py-4 text-center">
                        <span class="bg-slate-900 px-3 py-1 rounded font-mono text-xs text-green-400 border border-slate-700">${fila[2] || "---"}</span>
                    </td>`;
                tabla.appendChild(tr);
            });
            mostrarMensaje("Sincronización completada.", "success");
        }
    } catch (e) { mostrarMensaje("Error de conexión.", "error"); }
    finally { btn.disabled = false; icon.classList.remove('animate-spin'); }
}

function actualizarCheckboxes(cursos) {
    const contenedor = document.getElementById('listaCursosCheck');
    contenedor.innerHTML = '';
    seleccionCursosOrden = []; 
    actualizarContador();

    cursos.forEach((curso, index) => {
        const div = document.createElement('div');
        div.className = "flex items-center gap-3 p-2 hover:bg-slate-800 rounded transition-colors cursor-pointer group";
        div.innerHTML = `
            <div class="relative flex items-center justify-center">
                <input type="checkbox" id="c${index}" value="${index}" onchange="manejarSeleccion(${index})" 
                    class="curso-item w-5 h-5 accent-blue-600 cursor-pointer appearance-none border border-slate-600 rounded checked:bg-blue-600 checked:border-transparent">
                <span id="badge-${index}" class="badge-select pointer-events-none absolute"></span>
            </div>
            <label for="c${index}" class="text-sm text-slate-400 group-hover:text-white cursor-pointer flex-1">${curso[0]}</label>
        `;
        contenedor.appendChild(div);
    });
}

function manejarSeleccion(index) {
    const cb = document.getElementById(`c${index}`);
    if (cb.checked) {
        seleccionCursosOrden.push(index);
    } else {
        seleccionCursosOrden = seleccionCursosOrden.filter(i => i !== index);
    }
    recalcularNumeros();
    actualizarContador();
}

function recalcularNumeros() {
    document.querySelectorAll('.badge-select').forEach(b => {
        b.style.display = 'none';
        b.innerText = '';
    });

    seleccionCursosOrden.forEach((cursoIndex, posicion) => {
        const badge = document.getElementById(`badge-${cursoIndex}`);
        badge.style.display = 'flex';
        badge.innerText = posicion + 1;
    });
}

function actualizarContador() {
    document.getElementById('contadorSeleccion').innerText = `${seleccionCursosOrden.length} Seleccionados`;
}

async function crearNuevaAula() {
    // Cambio: Captura de ambos nombres
    const nombreAbrevia = document.getElementById('nombreAbreviado').value.trim();
    const nombreCompleto = document.getElementById('nombreCompleto').value.trim();
    const btn = document.getElementById('btnCrearAula');

    if (!nombreAbrevia || !nombreCompleto) return alert("Por favor complete ambos nombres del grado.");
    if (seleccionCursosOrden.length === 0) return alert("Selecciona los cursos.");
    if (listaAlumnosArray.length === 0) return alert("Agrega alumnos.");

    const cursosSeleccionados = seleccionCursosOrden.map(idx => datosCursosGlobal[idx]);
    
    btn.disabled = true;
    btn.innerText = "Creando...";

    try {
        const formData = new URLSearchParams();
        formData.append('action', 'crearGrado');
        formData.append('nombreGrado', nombreAbrevia); // Nombre corto para la pestaña
        formData.append('nombreCompleto', nombreCompleto); // Nombre largo para A1
        formData.append('cursos', JSON.stringify(cursosSeleccionados));
        formData.append('alumnos', JSON.stringify(listaAlumnosArray));

        await fetch(WEB_APP_URL, { method: 'POST', body: formData, mode: 'no-cors' });
        alert("¡Éxito! Hoja de grado generada.");
        
        document.getElementById('nombreAbreviado').value = "";
        document.getElementById('nombreCompleto').value = "";
        listaAlumnosArray = [];
        seleccionCursosOrden = [];
        renderizarAlumnos();
        document.querySelectorAll('.curso-item').forEach(c => c.checked = false);
        recalcularNumeros();
        actualizarContador();
    } catch (e) { alert("Error al procesar."); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Generar Hoja de Grado'; }
}

function mostrarMensaje(texto, tipo) {
    const statusMsg = document.getElementById('statusMsg');
    statusMsg.textContent = texto;
    statusMsg.className = `mb-6 p-4 rounded-lg text-center font-medium ${tipo === 'success' ? 'bg-green-900/30 text-green-400 border border-green-500/30' : 'bg-red-900/30 text-red-400 border border-red-500/30'}`;
    statusMsg.classList.remove('hidden');
    setTimeout(() => statusMsg.classList.add('hidden'), 4000);
}