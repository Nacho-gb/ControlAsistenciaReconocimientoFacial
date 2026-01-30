const { createPersonGroup } = require('../shared/faceapi');

module.exports = async function (context, req) {
    context.log('Inicializando Person Group...');
    try {
        const result = await createPersonGroup();
        if (result.success) {
            context.res = {
                status: 200,
                body: {
                    success: true,
                    message: result.exists 
                        ? 'Person Group ya existía' 
                        : 'Person Group creado correctamente',
                    personGroupId: process.env.PERSON_GROUP_ID
                }
            };
        } else {
            context.res = {
                status: 500,
                body: {
                    success: false,
                    error: 'Error al crear Person Group'
                }
            };
        }
    } catch (error) {
        context.log.error('Error:', error);
        context.res = {
            status: 500,
            body: {
                success: false,
                error: error.message
            }
        };
    }
};