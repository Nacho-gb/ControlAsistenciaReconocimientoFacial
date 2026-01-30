const { executeQuery, sql } = require('../shared/database');

module.exports = async function (context, req) {
    context.log('Registro de movimiento en sala...');
    try {
        const { socioId, salaId, accion, esInvitado } = req.body; // accion: 'ENTRADA' o 'SALIDA'
        if (!salaId || !accion) {
            context.res = {
                status: 400,
                body: { success: false, error: 'Faltan datos: salaId y accion son obligatorios' }
            };
            return;
        }
        // 1. Verificar capacidad de la sala (solo en ENTRADA)
        if (accion === 'ENTRADA') {
            const aforoQuery = `
                SELECT 
                    s.CapacidadMaxima,
                    COUNT(m.MovimientoId) AS PersonasDentro
                FROM Salas s
                LEFT JOIN MovimientosSala m ON s.SalaId = m.SalaId AND m.FechaHoraSalida IS NULL
                WHERE s.SalaId = @salaId AND s.Activa = 1
                GROUP BY s.SalaId, s.CapacidadMaxima
            `;
            const aforo = await executeQuery(aforoQuery, {
                salaId: sql.Int
            });
            if (aforo.length === 0) {
                context.res = {
                    status: 404,
                    body: { success: false, error: 'Sala no encontrada' }
                };
                return;
            }
            if (aforo[0].PersonasDentro >= aforo[0].CapacidadMaxima) {
                context.res = {
                    status: 400,
                    body: { 
                        success: false, 
                        error: 'Sala llena',
                        capacidadMaxima: aforo[0].CapacidadMaxima,
                        personasDentro: aforo[0].PersonasDentro
                    }
                };
                return;
            }
            // 2. Registrar entrada
            const entradaQuery = `
                INSERT INTO MovimientosSala (SocioId, SalaId, FechaHoraEntrada, EsInvitado)
                OUTPUT INSERTED.MovimientoId
                VALUES (@socioId, @salaId, GETDATE(), @esInvitado)
            `;
            const result = await executeQuery(entradaQuery, {
                socioId: sql.Int,
                salaId: sql.Int,
                esInvitado: sql.Bit
            });
            context.res = {
                status: 200,
                body: {
                    success: true,
                    mensaje: 'Entrada registrada en sala',
                    movimientoId: result[0].MovimientoId,
                    plazasLibres: aforo[0].CapacidadMaxima - aforo[0].PersonasDentro - 1
                }
            };
            return;
        }
        // 3. Registrar salida
        if (accion === 'SALIDA') {
            const salidaQuery = `
                UPDATE MovimientosSala
                SET FechaHoraSalida = GETDATE()
                OUTPUT INSERTED.MovimientoId, INSERTED.TiempoMinutos
                WHERE SocioId = @socioId 
                  AND SalaId = @salaId 
                  AND FechaHoraSalida IS NULL
                  AND EsInvitado = @esInvitado
            `;
            const result = await executeQuery(salidaQuery, {
                socioId: sql.Int,
                salaId: sql.Int,
                esInvitado: sql.Bit
            });
            if (result.length === 0) {
                context.res = {
                    status: 404,
                    body: { success: false, error: 'No hay registro de entrada en esta sala' }
                };
                return;
            }
            context.res = {
                status: 200,
                body: {
                    success: true,
                    mensaje: 'Salida registrada de sala',
                    tiempoMinutos: result[0].TiempoMinutos
                }
            };
            return;
        }
    } catch (error) {
        context.log.error('Error:', error);
        context.res = {
            status: 500,
            body: { 
                success: false, 
                error: 'Error interno del servidor',
                details: error.message 
            }
        };
    }
};