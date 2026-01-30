const { executeStoredProcedure } = require('../shared/database');

module.exports = async function (context, req) {
    context.log('Obteniendo estadísticas del gimnasio...');
    try {
        const result = await executeStoredProcedure('sp_ObtenerEstadoGimnasio', {});
        // El SP devuelve 2 result sets
        // 1. Aforo por sala
        // 2. Resumen general
        context.res = {
            status: 200,
            body: {
                success: true,
                timestamp: new Date().toISOString(),
                estadisticas: result
            }
        };
    } catch (error) {
        context.log.error('Error:', error);
        context.res = {
            status: 500,
            body: { 
                success: false, 
                error: 'Error al obtener estadísticas',
                details: error.message 
            }
        };
    }
};