const { executeQuery, sql } = require('../shared/database');
const { detectFace, createPerson, addFaceToPerson, trainPersonGroup } = require('../shared/faceapi');

module.exports = async function (context, req) {
    context.log('Registrando nuevo socio...');
    try {
        // Validar datos
        const { nombre, email, telefono, imagen } = req.body;
        if (!nombre || !email || !imagen) {
            context.res = {
                status: 400,
                body: { success: false, error: 'Faltan datos obligatorios: nombre, email, imagen' }
            };
            return;
        }
        // Convertir imagen base64 a buffer
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
        // 2. Crear Person en Face API
        const personResult = await createPerson(nombre);
        if (!personResult.success) {
            context.res = {
                status: 500,
                body: { success: false, error: 'Error al crear person en Face API' }
            };
            return;
        }
        const personId = personResult.personId;
        // 3. Añadir rostro a Person
        const addFaceResult = await addFaceToPerson(personId, imageBuffer);
        if (!addFaceResult.success) {
            context.res = {
                status: 500,
                body: { success: false, error: 'Error al añadir rostro a person' }
            };
            return;
        }
        // 4. Guardar socio en BD
        const query = `
            INSERT INTO Socios (Nombre, Email, Telefono, FacePersonId)
            OUTPUT INSERTED.SocioId, INSERTED.Nombre, INSERTED.Email
            VALUES (@nombre, @email, @telefono, @personId)
        `;
        const result = await executeQuery(query, {
            nombre: sql.NVarChar, 
            email: sql.NVarChar,
            telefono: sql.NVarChar,
            personId: sql.NVarChar
        });
        // 5. Entrenar Person Group
        await trainPersonGroup();
        context.res = {
            status: 200,
            body: {
                success: true,
                message: 'Socio registrado correctamente',
                socio: result[0],
                facePersonId: personId
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