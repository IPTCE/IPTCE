const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzvk8m3qjjTpYAoE2JdjhZc-VqJqzVYhx7r8LQ875VQKUN0cYOFvsVOkmm3gHJkd78/exec";
let rankingActual = [];

window.onload = async () => { cargarGrados(); };

async function cargarGrados() {
    try {
        const resp = await fetch(`${WEB_APP_URL}?action=obtenerGradosDestino`);
        const grados = await resp.json();
        const select = document.getElementById('selectGrado');
        select.innerHTML = '';
        grados.forEach(g => {
            if(g !== "CURSOS") {
                let opt = document.createElement('option');
                opt.value = g; opt.innerText = g;
                select.appendChild(opt);
            }
        });
    } catch (e) { console.error(e); }
}

document.getElementById('btnSincronizar').onclick = async () => {
    if(!confirm("¿Sincronizar todas las hojas?")) return;
    mostrarLoader("Sincronizando archivos...");
    try {
        const resp = await fetch(`${WEB_APP_URL}?action=sincronizarHojas`);
        if(await resp.text() === "OK") { alert("Éxito"); cargarGrados(); }
    } catch (e) { alert("Error"); }
    ocultarLoader();
};

document.getElementById('btnGenerarVista').onclick = async () => {
    const gradosSelect = document.getElementById('selectGrado');
    const gradosSeleccionados = Array.from(gradosSelect.selectedOptions).map(option => option.value);
    const bimestre = document.getElementById('selectBimestre').value;

    if(gradosSeleccionados.length === 0) return alert("Selecciona al menos un grado.");

    mostrarLoader(`Procesando ${gradosSeleccionados.length} grados...`);
    let superRanking = [];

    try {
        for (const grado of gradosSeleccionados) {
            const resp = await fetch(`${WEB_APP_URL}?action=obtenerDatosHoja&grado=${grado}`);
            const matriz = await resp.json();
            
            let filaInicio = -1;
            for (let i = 0; i < matriz.length; i++) {
                if (matriz[i][0] && matriz[i][0].toString().trim() === bimestre) {
                    filaInicio = i; break;
                }
            }

            if (filaInicio !== -1) {
                const filaEncabezados = matriz[filaInicio + 1];
                let colProm = -1;
                for (let c = 0; c < filaEncabezados.length; c++) {
                    if (filaEncabezados[c] && filaEncabezados[c].toString().toUpperCase().includes("PROMEDIO")) {
                        colProm = c; break;
                    }
                }

                if (colProm !== -1) {
                    for (let j = filaInicio + 2; j < matriz.length; j++) {
                        const nombre = matriz[j][0];
                        if (!nombre || nombre.toString().trim() === "") break;
                        let valor = parseFloat(matriz[j][colProm]);
                        superRanking.push({
                            nombre: nombre,
                            grado: grado,
                            promedio: isNaN(valor) ? 0 : valor
                        });
                    }
                }
            }
        }

        superRanking.sort((a, b) => b.promedio - a.promedio);
        rankingActual = superRanking;
        renderizarRanking(superRanking, bimestre);

    } catch (e) { alert("Error al consolidar ranking."); }
    ocultarLoader();
};

function renderizarRanking(alumnos, bimestre) {
    const tbody = document.getElementById('tablaRanking');
    tbody.innerHTML = "";
    document.getElementById('labelEstado').innerText = `Ranking General - ${bimestre} (${alumnos.length} alumnos)`;

    alumnos.forEach((al, i) => {
        const tr = document.createElement('tr');
        tr.className = "hover:bg-white/5 border-b border-slate-800 transition-colors";
        const colorPos = i < 3 ? (i === 0 ? 'text-amber-400' : 'text-blue-300') : 'text-slate-500';
        
        tr.innerHTML = `
            <td class="px-6 py-4 text-center font-bold ${colorPos}">${i + 1}</td>
            <td class="px-6 py-4 text-white font-medium uppercase text-xs">${al.nombre}</td>
            <td class="px-6 py-4 text-slate-400 text-xs">${al.grado}</td>
            <td class="px-6 py-4 text-center text-blue-400 font-bold">${al.promedio.toFixed(2)}</td>
            <td class="px-6 py-4 text-center"><span class="status-dot ${al.promedio >= 60 ? 'bg-emerald-500' : 'bg-red-500'}"></span></td>
        `;
        tbody.appendChild(tr);
    });
}

document.getElementById('btnGenerarPDF').onclick = function() {
    if (rankingActual.length === 0) return alert("Genera el ranking primero.");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const bimestre = document.getElementById('selectBimestre').value;

    doc.setFontSize(18);
    doc.text("CUADRO DE HONOR GENERAL", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text("Bimestre: " + bimestre, 105, 30, { align: "center" });

    const cuerpo = rankingActual.map((al, i) => [
        (i + 1).toString(),
        al.nombre,
        al.grado,
        al.promedio.toFixed(2)
    ]);

    doc.autoTable({
        startY: 40,
        head: [['POS', 'NOMBRE DEL ALUMNO', 'GRADO', 'PROMEDIO']],
        body: cuerpo,
        theme: 'grid',
        headStyles: { fillColor: [2, 6, 47], halign: 'center' },
        columnStyles: { 0: {halign:'center'}, 2: {halign:'center'}, 3: {halign:'center'} }
    });

    doc.save(`Ranking_General_${bimestre.replace(" ","_")}.pdf`);
};

function mostrarLoader(msg) { document.getElementById('loaderMsg').innerText = msg; document.getElementById('loader').classList.remove('hidden'); }
function ocultarLoader() { document.getElementById('loader').classList.add('hidden'); }