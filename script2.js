const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby4ZKPzs95LB84Rd07IgD7dvbSHOGlOBDJUSiozpESxCnwoRiNdkHgP_4MyWlb3FD0i/exec";
let profesoresCache = []; 

document.addEventListener('DOMContentLoaded', () => {
    // Verificamos que existan los elementos antes de llamar a las funciones
    if (document.getElementById('selectProfesor')) {
        cargarSelectProfesores();
    }
    if (document.getElementById('cuerpoCursos')) {
        cargarTablaCursos();
    }
});

async function cargarSelectProfesores() {
    const select = document.getElementById('selectProfesor');
    try {
        const res = await fetch(SCRIPT_URL);
        if (!res.ok) throw new Error("Error en la red");
        
        profesoresCache = await res.json();
        
        select.innerHTML = '<option value="">-- Seleccionar Profesor --</option>';
        profesoresCache.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.nombre;
            opt.textContent = p.nombre;
            select.appendChild(opt);
        });
    } catch (e) {
        console.error("Fallo al cargar select:", e);
        if(select) select.innerHTML = '<option>Error al cargar lista</option>';
    }
}

async function guardarCurso() {
    const cursoInput = document.getElementById('nombreCurso');
    const selectProfe = document.getElementById('selectProfesor');
    const btn = document.getElementById('btnGuardarCurso');

    if (!cursoInput.value || !selectProfe.value) {
        alert("Completa los campos");
        return;
    }

    const profeInfo = profesoresCache.find(p => p.nombre === selectProfe.value);
    const pass = profeInfo ? profeInfo.password : "";

    btn.disabled = true;
    btn.innerText = "Enviando...";

    try {
        // IMPORTANTE: Al usar no-cors, NO PODEMOS leer la respuesta (res.json() fallaría)
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', 
            body: JSON.stringify({ 
                type: 'curso', 
                curso: cursoInput.value, 
                profesor: selectProfe.value, 
                password: pass 
            })
        });

        // Como no podemos leer la respuesta, confiamos en el timeout
        setTimeout(() => {
            alert("Sincronizado con Google Sheets");
            cursoInput.value = "";
            selectProfe.value = "";
            btn.disabled = false;
            btn.innerText = "CREAR CURSO";
            cargarTablaCursos();
        }, 2000);

    } catch (error) {
        console.error("Error en POST:", error);
        btn.disabled = false;
        btn.innerText = "Reintentar";
    }
}

async function cargarTablaCursos() {
    const cuerpo = document.getElementById('cuerpoCursos');
    if (!cuerpo) return;

    try {
        const res = await fetch(`${SCRIPT_URL}?action=leerCursos`);
        const cursos = await res.json();
        
        cuerpo.innerHTML = "";
        if (cursos.length === 0) {
            cuerpo.innerHTML = "<tr><td colspan='4' style='text-align:center'>Sin registros</td></tr>";
            return;
        }

        cursos.forEach(c => {
            const row = `<tr>
                <td><span class="id-badge">#${c.id}</span></td>
                <td>${c.curso}</td>
                <td>${c.profesor}</td>
                <td>${c.password}</td>
            </tr>`;
            cuerpo.insertAdjacentHTML('beforeend', row);
        });
    } catch (e) {
        console.error("Error en tabla:", e);
        cuerpo.innerHTML = "<tr><td colspan='4'>Error de conexión</td></tr>";
    }
}