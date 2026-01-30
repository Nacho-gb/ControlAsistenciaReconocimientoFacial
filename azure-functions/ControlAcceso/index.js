const { executeQuery, executeStoredProcedure, sql } = require('../shared/database');
const { detectFace, identifyFace } = require('../shared/faceapi');

module.exports = async function (context, req) {
    context.log('Control de acceso...');
    try {
        const { imagen, tipoAcceso, esInvitado } = req.body; // tipoAcceso: 'ENTRADA' o 'SALIDA'
        if (!imagen || !tipoAcceso) {
            context.res = {
                status: 400,
                body: { success: false, error: 'Faltan datos: imagen y tipoAcceso son obligatorios' }
            };
            return;
        }
        // Convertir imagen
        const imageBuffer = Buffer.from(imagen.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        // 1. Detectar rostro
        const detectResult = await detectFace(imageBuffer);
        if (!detectResult.success) {
            context.res = {
                status: 400,
                body: { success: false, error: detectResult.error }
            };
            return;
        }
        // 2. Intentar identificar
        const identifyResult = await identifyFace(detectResult.faceId);
        if (!identifyResult.success) {
            context.res = {
                status: 500,
                body: { success: false, error: 'Error en identificación' }
            };
            return;
        }
        // 3a. Si es socio identificado
        if (identifyResult.identified) {
            // Buscar socio en BD
            const socioQuery = `
                SELECT SocioId, Nombre, Email
                FROM Socios
                WHERE FacePersonId = @personId AND Activo = 1
            `;
            const socios = await executeQuery(socioQuery, {
                personId: sql.NVarChar
            });
            if (socios.length === 0) {
                context.res = {
                    status: 404,
                    body: { success: false, error: 'Socio no encontrado o inactivo' }
                };
                return;
            }
            const socio = socios[0];
            // Registrar acceso
            const accesoQuery = `
                INSERT INTO Accesos (SocioId, TipoAcceso, EsInvitado)
                VALUES (@socioId, @tipoAcceso, 0)
            `;
            await executeQuery(accesoQuery, {
                socioId: sql.Int,
                tipoAcceso: sql.NVarChar
            });
            context.res = {
                status: 200,
                body: {
                    success: true,
                    tipoPersona: 'SOCIO',
                    socio: socio,
                    tipoAcceso: tipoAcceso,
                    confianza: identifyResult.confidence
                }
            };
            return;
        }
        // 3b. Si NO es socio identificado = INVITADO
        if (esInvitado && tipoAcceso === 'ENTRADA') {
            // Debe venir acompañado de un socio
            const { socioAnfitrionId } = req.body;
            if (!socioAnfitrionId) {
                context.res = {
                    status: 400,
                    body: { success: false, error: 'El invitado debe venir con un socio' }
                };
                return;
            }
            // Registrar entrada de invitado
            const result = await executeStoredProcedure('sp_RegistrarEntradaConInvitado', {
                SocioId: sql.Int
            });
            if (result[0].Resultado === 'ERROR') {
                context.res = {
                    status: 400,
                    body: { success: false, error: result[0].Mensaje }
                };
                return;
            }
            context.res = {
                status: 200,
                body: {
                    success: true,
                    tipoPersona: 'INVITADO',
                    mensaje: result[0].Mensaje,
                    invitacionesRestantes: result[0].InvitacionesRestantes
                }
            };
            return;
        }
        // Si no es socio ni invitado
        context.res = {
            status: 403,
            body: { 
                success: false, 
                error: 'Persona no reconocida. Debe ser socio o invitado acompañado' 
            }
        };
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