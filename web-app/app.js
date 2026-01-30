// CONFIGURACIÓN
const API_URL = 'http://localhost:7071/api';
// Para producción: 'https://func-gimnasio-api.azurewebsites.net/api'

let streamAcceso = null;
let streamRegistro = null;
let salaSeleccionadaId = null;
let ultimoSocioAcceso = null;

// ===================================
// TABS
// ===================================
function showTab(tabName) {
    // Ocultar todos los tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    // Mostrar tab seleccionado
    document.getElementById(`tab-${tabName}`).classList.add('active');
    event.target.classList.add('active');
    // Detener cámaras al cambiar de tab
    detenerCamaras();
}
// ===================================
// CÁMARA
// ===================================
async function iniciarCamara(tipo) {
    const video = document.getElementById(`video-${tipo}`);
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });
        video.srcObject = stream;
        if (tipo === 'acceso') {
            streamAcceso = stream;
        } else {
            streamRegistro = stream;
        }
        mostrarMensaje(`resultado-${tipo}`, 'Cámara iniciada correctamente', 'info');
    } catch (error) {
        mostrarMensaje(`resultado-${tipo}`, 'Error al acceder a la cámara: ' + error.message, 'error');
    }
}
function detenerCamaras() {
    if (streamAcceso) {
        streamAcceso.getTracks().forEach(track => track.stop());
        streamAcceso = null;
    }
    if (streamRegistro) {
        streamRegistro.getTracks().forEach(track => track.stop());
        streamRegistro = null;
    }
}
function capturarImagen(tipo) {
    const video = document.getElementById(`video-${tipo}`);
    const canvas = document.getElementById(`canvas-${tipo}`);
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
}
// ===================================
// REGISTRO DE SOCIO
// ===================================
async function registrarSocio() {
    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const fileInput = document.getElementById('file-imagen');
    let imagen = null;
    if (!nombre || !email) {
        mostrarMensaje('resultado-registro', 'Por favor completa nombre y email', 'error');
        return;
    }
    // Si el usuario seleccionó un archivo, usarlo
    if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        imagen = await fileToBase64(file);
    } else if (streamRegistro) {
        // Si no, usar la cámara si está activa
        imagen = capturarImagen('registro');
    } else {
        mostrarMensaje('resultado-registro', 'Debes subir una imagen o usar la cámara', 'error');
        return;
    }
    mostrarMensaje('resultado-registro', 'Procesando... Por favor espera', 'info');
    try {
        const response = await fetch(`${API_URL}/RegistrarSocio`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre,
                email,
                telefono,
                imagen
            })
        });
        const data = await response.json();
        if (data.success) {
            mostrarMensaje('resultado-registro', 
                `✅ Socio registrado: ${data.socio.Nombre} (ID: ${data.socio.SocioId})`, 
                'success');
            // Limpiar formulario
            document.getElementById('form-registro').reset();
            if (fileInput) fileInput.value = '';
            detenerCamaras();
        } else {
            mostrarMensaje('resultado-registro', `❌ Error: ${data.error}`, 'error');
        }
    } catch (error) {
        mostrarMensaje('resultado-registro', `❌ Error de conexión: ${error.message}`, 'error');
    }
}

// Utilidad para convertir archivo a base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}
// ===================================
// CONTROL DE ACCESO
// ===================================
async function capturarAcceso(tipoAcceso) {
    const fileInput = document.getElementById('file-imagen-acceso');
    let imagen = null;
    const esInvitado = document.getElementById('esInvitado').checked;
    // Si el usuario seleccionó un archivo, usarlo
    if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        imagen = await fileToBase64(file);
    } else if (streamAcceso) {
        imagen = capturarImagen('acceso');
    } else {
        mostrarMensaje('resultado-acceso', 'Debes subir una imagen o usar la cámara', 'error');
        return;
    }
    mostrarMensaje('resultado-acceso', 'Procesando... Por favor espera', 'info');
    try {
        const body = {
            imagen,
            tipoAcceso,
            esInvitado
        };
        // Si es invitado, necesitamos el ID del socio anfitrión
        if (esInvitado && ultimoSocioAcceso) {
            body.socioAnfitrionId = ultimoSocioAcceso.SocioId;
        }
        const response = await fetch(`${API_URL}/ControlAcceso`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (data.success) {
            if (data.tipoPersona === 'SOCIO') {
                ultimoSocioAcceso = data.socio;
                mostrarMensaje('resultado-acceso', 
                    `✅ ${tipoAcceso} registrada - Socio: ${data.socio.Nombre} (Confianza: ${Math.round(data.confianza * 100)}%)`, 
                    'success');
            } else if (data.tipoPersona === 'INVITADO') {
                mostrarMensaje('resultado-acceso', 
                    `✅ Invitado registrado - Invitaciones restantes: ${data.invitacionesRestantes}`, 
                    'success');
            }
            if (fileInput) fileInput.value = '';
        } else {
            mostrarMensaje('resultado-acceso', `❌ ${data.error}`, 'error');
        }
    } catch (error) {
        mostrarMensaje('resultado-acceso', `❌ Error de conexión: ${error.message}`, 'error');
    }
}
// ===================================
// SALAS
// ===================================
function seleccionarSala(salaId, nombreSala, capacidad) {
    salaSeleccionadaId = salaId;
    document.getElementById('sala-nombre-selected').textContent = nombreSala;
    document.getElementById('sala-aforo-info').textContent = `Capacidad máxima: ${capacidad} personas`;
    document.getElementById('sala-seleccionada').style.display = 'block';
    mostrarMensaje('resultado-sala', `Sala seleccionada: ${nombreSala}`, 'info');
}
async function registrarMovimientoSala(accion) {
    if (!salaSeleccionadaId) {
        mostrarMensaje('resultado-sala', 'Primero selecciona una sala', 'error');
        return;
    }
    if (!ultimoSocioAcceso) {
        mostrarMensaje('resultado-sala', 'Primero debes registrar el acceso al gimnasio', 'error');
        return;
    }
    mostrarMensaje('resultado-sala', 'Procesando...', 'info');
    try {
        const response = await fetch(`${API_URL}/MovimientoSala`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                socioId: ultimoSocioAcceso.SocioId,
                salaId: salaSeleccionadaId,
                accion,
                esInvitado: false
            })
        });
        const data = await response.json();
        if (data.success) {
            let mensaje = `✅ ${data.mensaje}`;
            if (accion === 'ENTRADA' && data.plazasLibres !== undefined) {
                mensaje += ` - Plazas libres: ${data.plazasLibres}`;
            }
            if (accion === 'SALIDA' && data.tiempoMinutos) {
                mensaje += ` - Tiempo en sala: ${data.tiempoMinutos} min`;
            }
            mostrarMensaje('resultado-sala', mensaje, 'success');
        } else {
            mostrarMensaje('resultado-sala', `❌ ${data.error}`, 'error');
        }
    } catch (error) {
        mostrarMensaje('resultado-sala', `❌ Error de conexión: ${error.message}`, 'error');
    }
}
// ===================================
// UTILIDADES
// ===================================
function mostrarMensaje(elementId, mensaje, tipo) {
    const elemento = document.getElementById(elementId);
    elemento.textContent = mensaje;
    elemento.className = `result-box ${tipo}`;
    // Auto-ocultar después de 10 segundos si es éxito
    if (tipo === 'success') {
        setTimeout(() => {
            elemento.style.display = 'none';
        }, 10000);
    }
}
// Detener cámaras al cerrar la ventana
window.addEventListener('beforeunload', detenerCamaras);
