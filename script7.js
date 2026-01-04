const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzvk8m3qjjTpYAoE2JdjhZc-VqJqzVYhx7r8LQ875VQKUN0cYOFvsVOkmm3gHJkd78/exec";
let matrizDatos = [];

window.onload = async () => { cargarGrados(); };

async function cargarGrados() {
    try {
        const resp = await fetch(`${WEB_APP_URL}?action=obtenerGradosDestino`);
        const grados = await resp.json();
        const select = document.getElementById('selectGrado');
        grados.forEach(g => {
            if(g !== "CURSOS" && g !== "Hoja 1") {
                let opt = document.createElement('option');
                opt.value = g; opt.innerText = g;
                select.appendChild(opt);
            }
        });
    } catch (e) { console.error("Error al cargar grados:", e); }
}

document.getElementById('btnCargarAlumnos').onclick = async () => {
    const grado = document.getElementById('selectGrado').value;
    if(!grado) return alert("Seleccione un grado");
    mostrarLoader("Obteniendo registros anuales...");
    try {
        const resp = await fetch(`${WEB_APP_URL}?action=obtenerDatosHoja&grado=${grado}`);
        matrizDatos = await resp.json();
        renderizarLista();
    } catch (e) { alert("Error de conexión"); }
    ocultarLoader();
};

function renderizarLista() {
    const tbody = document.getElementById('tablaAlumnos');
    tbody.innerHTML = "";
    let filaInicio = matrizDatos.findIndex(f => f[0] && f[0].toString().includes("1 BIM"));
    for (let i = filaInicio + 2; i < matrizDatos.length; i++) {
        const nombre = matrizDatos[i][0];
        if (!nombre || nombre.toString().trim() === "") break;
        const tr = document.createElement('tr');
        tr.className = "hover:bg-white/5 border-b border-slate-800 transition-colors";
        tr.innerHTML = `
            <td class="px-6 py-4 text-sm text-slate-300 font-medium">${nombre}</td>
            <td class="px-6 py-4 text-right">
                <button onclick="generarBoletaAnual('${nombre}')" class="bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-all">
                    GENERAR REPORTE
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    }
}

// FUNCIÓN CRÍTICA: Carga y confirma la existencia de la imagen
function verificarYCargarImagen(nombreArchivo) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ status: 'ok', img: img });
        img.onerror = () => resolve({ status: 'error', name: nombreArchivo });
        img.src = nombreArchivo;
    });
}

async function generarBoletaAnual(nombreAlumno) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const azulMarino = [0, 33, 71]; 

    mostrarLoader("Verificando firmas y archivos...");

    // 1. CONFIRMACIÓN DE ARCHIVOS
    const archivosRequeridos = ['log.png', 'firm1.png', 'sello.png', 'firm2.png'];
    const resultados = await Promise.all(archivosRequeridos.map(file => verificarYCargarImagen(file)));
    
    const errores = resultados.filter(r => r.status === 'error').map(r => r.name);
    
    if (errores.length > 0) {
        ocultarLoader();
        const continuar = confirm(`ATENCIÓN: No se pudieron cargar los siguientes archivos: ${errores.join(', ')}. \n\n¿Desea generar la boleta sin estos elementos?`);
        if (!continuar) return;
    }

    const getImg = (name) => resultados.find(r => r.name === name || (r.img && r.img.src.includes(name)))?.img;

    // INICIO DE DIBUJO DEL PDF
    const imgLogo = getImg('log.png');
    if(imgLogo) doc.addImage(imgLogo, 'PNG', 15, 12, 25, 25);

    // ENCABEZADO (Mantenemos tu estilo profesional)
    doc.setFont("times", "normal").setTextColor(azulMarino[0], azulMarino[1], azulMarino[2]).setFontSize(14);
    doc.text("Instituto Profesional de Técnicas Comerciales Especializas", 115, 15, { align: "center" });
    doc.setFont("times", "bold").setFontSize(20);
    doc.text("Colegio IPTCE", 115, 23, { align: "center" });
    doc.setFont("times", "normal").setFontSize(9).setTextColor(80, 80, 80);
    doc.text("7a. Av. 3-40 Zona 1 Tels.: 2232-0733  2220-1851  2220-1852  42026779", 115, 29, { align: "center" });
    doc.text("https://www.colegioiptce.edu.gt   Email: iptce@hotmail.com", 115, 34, { align: "center" });
    doc.setDrawColor(azulMarino[0], azulMarino[1], azulMarino[2]).setLineWidth(0.8).line(15, 39, 195, 39);

    // DATOS ESTUDIANTE
    const gradoTextoRaw = matrizDatos[0][0] || "";
    doc.setTextColor(0).setFont("helvetica", "bold").setFontSize(11);
    doc.text("Alumno:", 20, 48);
    doc.setFont("helvetica", "normal").text(nombreAlumno, 40, 48);
    doc.setFont("helvetica", "bold").text("Grado:", 20, 54);
    doc.setFont("helvetica", "normal").text(gradoTextoRaw.replace(/GRADO:/i, "").trim(), 40, 54);
    doc.setFont("helvetica", "bold").text("Ciclo:", 150, 48);
    doc.setFont("helvetica", "normal").text("2026", 175, 48);

    // PROCESAMIENTO (Lógica script7.js intacta)
    const encabezados = matrizDatos[2];
    const filaProfesores = matrizDatos[0];
    const bimestres = ["1 BIM", "2 BIM", "3 BIM", "4 BIM", "5 BIM"];
    let datosTabla = [];
    let asistenciaData = [0,0,0,0,0];
    let promediosBimestrales = [0,0,0,0,0]; 
    let conteoMaterias = 0;

    encabezados.forEach((materia, colIdx) => {
        if (colIdx > 0 && materia && !materia.toString().toUpperCase().includes("PROMEDIO")) {
            const nombreMateria = materia.toString().trim();
            const esAsistencia = nombreMateria.toUpperCase().includes("ASISTENCIA IPTCE");
            let sumaNotasMateria = 0;
            let notasMateria = [];

            bimestres.forEach((bim, bIdx) => {
                let fInicio = matrizDatos.findIndex(f => f[0] && f[0].toString().trim() === bim);
                let fAlu = -1;
                if(fInicio !== -1) {
                    for(let k = fInicio + 2; k < matrizDatos.length; k++){
                        if(matrizDatos[k][0] === nombreAlumno){ fAlu = k; break; }
                    }
                }
                let nota = (fAlu !== -1) ? parseFloat(matrizDatos[fAlu][colIdx]) : 0;
                let valor = isNaN(nota) ? 0 : nota;
                if (esAsistencia) { asistenciaData[bIdx] = valor; } 
                else {
                    notasMateria.push(valor > 0 ? valor : "-");
                    sumaNotasMateria += valor;
                    promediosBimestrales[bIdx] += valor;
                }
            });

            if (!esAsistencia) {
                conteoMaterias++;
                let promMateria = sumaNotasMateria / 5;
                datosTabla.push([conteoMaterias, nombreMateria, ...notasMateria, promMateria.toFixed(1), filaProfesores[colIdx] || "---"]);
            }
        }
    });

    let filaPromsV = ["", "PROMEDIOS POR BIMESTRE"];
    let sumaPromsBim = 0;
    promediosBimestrales.forEach(sum => {
        let pB = sum / conteoMaterias;
        filaPromsV.push(pB.toFixed(2));
        sumaPromsBim += pB;
    });
    const granPromedioFinal = (sumaPromsBim / 5).toFixed(2);
    filaPromsV.push("", ""); 
    datosTabla.push(filaPromsV);

    // TABLA
    doc.autoTable({
        startY: 60,
        head: [['No.', 'NOMBRE DEL CURSO', '1BIM', '2BIM', '3BIM', '4BIM', '5BIM', 'PROM', 'CATEDRÁTICO']],
        body: datosTabla,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2, font: 'helvetica' },
        headStyles: { fillColor: azulMarino, textColor: [255, 255, 255], halign: 'center' },
        columnStyles: { 
            0: { halign: 'center', cellWidth: 10 },
            1: { cellWidth: 50, fontStyle: 'bold' },
            7: { halign: 'center', fontStyle: 'bold', fillColor: [235, 245, 255] },
            8: { cellWidth: 40, fontSize: 6.5 }
        },
        didParseCell: (data) => {
            if (data.row.index === datosTabla.length - 1) {
                data.cell.styles.fillColor = [220, 220, 220];
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = azulMarino;
            }
        }
    });

    // SECCIÓN ASISTENCIA Y PROGRESO
    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(10).setTextColor(azulMarino[0], azulMarino[1], azulMarino[2]).setFont("helvetica", "bold").text("ASISTENCIA IPTCE:", 20, finalY);
    doc.autoTable({
        startY: finalY + 3,
        head: [['1B', '2B', '3B', '4B', '5B']],
        body: [[...asistenciaData.map(n => n + "%")]],
        theme: 'grid',
        styles: { fontSize: 9, halign: 'center' },
        headStyles: { fillColor: azulMarino, textColor: [255, 255, 255] },
        margin: { left: 20 },
        tableWidth: 65
    });

    const progresoX = 100;
    doc.setDrawColor(azulMarino[0], azulMarino[1], azulMarino[2]).setLineWidth(0.6).roundedRect(progresoX, finalY - 2, 90, 22, 3, 3, 'D');
    doc.setFontSize(10).setTextColor(0).setFont("helvetica", "normal").text("TU PROGRESO ES DE:", progresoX + 5, finalY + 7);
    doc.setFontSize(18).setTextColor(azulMarino[0], azulMarino[1], azulMarino[2]).setFont("helvetica", "bold").text(`${granPromedioFinal}%`, progresoX + 45, finalY + 15, { align: "center" });
    doc.setFontSize(9).setTextColor(80, 80, 80).setFont("helvetica", "normal").text("DE PROMEDIO FINAL", progresoX + 45, finalY + 19, { align: "center" });

    // 2. COLOCACIÓN DE FIRMAS Y SELLO (Solo si existen)
    const yImagenes = finalY + 38;
    const f1 = getImg('firm1.png');
    const sl = getImg('sello.png');
    const f2 = getImg('firm2.png');

    if(f1) doc.addImage(f1, 'PNG', 20, yImagenes, 45, 20);
    if(sl) doc.addImage(sl, 'PNG', 85, yImagenes - 5, 30, 30);
    if(f2) doc.addImage(f2, 'PNG', 140, yImagenes, 45, 20);

    // LEMA
    doc.setFontSize(11).setTextColor(azulMarino[0], azulMarino[1], azulMarino[2]).setFont("times", "italic").text("IPTCE, como un segundo hogar..", 105, 280, { align: "center" });

    ocultarLoader();
    doc.save(`Boleta_${nombreAlumno.replace(/ /g,"_")}.pdf`);
}

function mostrarLoader(msg) { document.getElementById('loaderMsg').innerText = msg; document.getElementById('loader').classList.remove('hidden'); }
function ocultarLoader() { document.getElementById('loader').classList.add('hidden'); }