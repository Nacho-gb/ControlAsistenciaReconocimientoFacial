const API_URL = 'http://localhost:7071/api';
// Para producción: 'https://func-gimnasio-api.azurewebsites.net/api'
let aforoChart = null;
document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    setInterval(cargarDatos, 30000);
});
async function cargarDatos() {
    try {
        const response = await fetch(`${API_URL}/ObtenerEstadisticas`);
        const data = await response.json();
        if (data.success) {
            actualizarDashboard(data.estadisticas);
            actualizarTimestamp();
        }
    } catch (error) {
        console.error('Error al cargar datos:', error);
    }
}
function actualizarDashboard(estadisticas) {
    const salas = estadisticas[0];
    const resumen = estadisticas[1][0];
    document.getElementById('total-socios').textContent = resumen.SociosDentro || 0;
    document.getElementById('total-invitados').textContent = resumen.InvitadosDentro || 0;
    document.getElementById('total-personas').textContent = resumen.TotalPersonas || 0;
    actualizarTablaSalas(salas);
    actualizarGrafico(salas);
}
function actualizarTablaSalas(salas) {
    const tbody = document.getElementById('salas-tbody');
    tbody.innerHTML = '';
    salas.forEach(sala => {
        const porcentaje = sala.PorcentajeOcupacion || 0;
        let barClass = '';
        if (porcentaje >= 90) barClass = 'danger';
        else if (porcentaje >= 70) barClass = 'warning';
        const row = `
            <tr>
                <td><strong>${sala.NombreSala}</strong></td>
                <td>${sala.PersonasDentro}</td>
                <td>${sala.CapacidadMaxima}</td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-fill ${barClass}" style="width: ${porcentaje}%"></div>
                    </div>
                    <small>${porcentaje.toFixed(1)}%</small>
                </td>
                <td>${sala.PlazasLibres}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}
function actualizarGrafico(salas) {
    const ctx = document.getElementById('aforoChart').getContext('2d');
    const labels = salas.map(s => s.NombreSala);
    const dataOcupadas = salas.map(s => s.PersonasDentro);
    const dataLibres = salas.map(s => s.PlazasLibres);
    if (aforoChart) {
        aforoChart.destroy();
    }
    aforoChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Personas Dentro',
                    data: dataOcupadas,
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 2
                },
                {
                    label: 'Plazas Libres',
                    data: dataLibres,
                    backgroundColor: 'rgba(76, 175, 80, 0.8)',
                    borderColor: 'rgba(76, 175, 80, 1)',
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 5
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}
function actualizarTimestamp() {
    const now = new Date();
    const timestamp = now.toLocaleTimeString('es-ES');
    document.getElementById('timestamp').textContent = timestamp;
}
