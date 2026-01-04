const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby4ZKPzs95LB84Rd07IgD7dvbSHOGlOBDJUSiozpESxCnwoRiNdkHgP_4MyWlb3FD0i/exec";

document.addEventListener('DOMContentLoaded', cargarProfesores);

async function cargarProfesores() {
    const cuerpo = document.getElementById('cuerpoTabla');
    cuerpo.innerHTML = "<tr><td colspan='4' style='text-align:center'>Cargando datos...</td></tr>";

    try {
        const res = await fetch(SCRIPT_URL);
        const profesores = await res.json();
        
        cuerpo.innerHTML = "";
        profesores.forEach(p => {
            cuerpo.innerHTML += `
                <tr>
                    <td>#${p.id}</td>
                    <td><input type="text" value="${p.nombre}" id="name-${p.id}" class="edit-input"></td>
                    <td><input type="text" value="${p.password}" id="pass-${p.id}" class="edit-input"></td>
                    <td>
                        <button onclick="guardarEdicion(${p.id})" class="btn-update" title="Actualizar">
                            <i data-lucide="refresh-cw"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        lucide.createIcons();
    } catch (error) {
        console.error("Error al cargar:", error);
    }
}

async function enviarDatos() {
    const nombre = document.getElementById('nombreProfesor').value;
    const pass = document.getElementById('passProfesor').value;
    const btn = document.getElementById('btnGuardar');

    if (!nombre || !pass) return alert("Llena los campos");

    btn.disabled = true;
    btn.innerText = "Enviando...";

    await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ nombre: nombre, password: pass })
    });

    setTimeout(() => {
        document.getElementById('nombreProfesor').value = "";
        document.getElementById('passProfesor').value = "";
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="save"></i> Guardar Registro';
        lucide.createIcons();
        cargarProfesores();
    }, 2000);
}

async function guardarEdicion(id) {
    const nuevoNombre = document.getElementById(`name-${id}`).value;
    const nuevaPass = document.getElementById(`pass-${id}`).value;

    // Enviar actualización
    await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ 
            action: 'update', 
            id: id, 
            nombre: nuevoNombre, 
            password: nuevaPass 
        })
    });

    alert("Actualizando datos del profesor #" + id);
    setTimeout(cargarProfesores, 1500);
}