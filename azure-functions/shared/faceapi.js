const { FaceClient } = require('@azure/cognitiveservices-face');
const { ApiKeyCredentials } = require('@azure/ms-rest-js');

const faceEndpoint = process.env.FACE_API_ENDPOINT;
const faceKey = process.env.FACE_API_KEY;
const personGroupId = process.env.PERSON_GROUP_ID;

// Cliente de Face API
const credentials = new ApiKeyCredentials({ inHeader: { 'Ocp-Apim-Subscription-Key': faceKey } });
const faceClient = new FaceClient(credentials, faceEndpoint);

/**
 * Crear Person Group (ejecutar una sola vez)
 */
async function createPersonGroup() {
    try {
        await faceClient.personGroup.create(personGroupId, {
            name: 'Socios Gimnasio 2026',
            recognitionModel: 'recognition_04',
            userData: 'Socios registrados del gimnasio'
        });
        console.log(`Person Group creado: ${personGroupId}`);
        return { success: true };
    } catch (error) {
        if (error.code === 'PersonGroupExists') {
            console.log('Person Group ya existe');
            return { success: true, exists: true };
        }
        throw error;
    }
}

/**
 * Detectar rostro en imagen
 * @param {Buffer} imageBuffer - Buffer de la imagen
 */
async function detectFace(imageBuffer) {
    try {
        const detectedFaces = await faceClient.face.detectWithStream(
            imageBuffer,
            {
                returnFaceId: true,
                returnFaceLandmarks: false,
                recognitionModel: 'recognition_04',
                detectionModel: 'detection_03'
            }
        );
        
        if (detectedFaces.length === 0) {
            return { success: false, error: 'No se detectó ningún rostro' };
        }
        
        if (detectedFaces.length > 1) {
            return { success: false, error: 'Se detectaron múltiples rostros. Solo debe aparecer una persona' };
        }
        
        return {
            success: true,
            faceId: detectedFaces[0].faceId,
            faceRectangle: detectedFaces[0].faceRectangle
        };
        
    } catch (error) {
        console.error('Error al detectar rostro:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Crear Person en el Person Group
 * @param {string} name - Nombre del socio
 */
async function createPerson(name) {
    try {
        const person = await faceClient.personGroupPerson.create(personGroupId, {
            name: name,
            userData: `Socio: ${name}`
        });
        
        return {
            success: true,
            personId: person.personId
        };
    } catch (error) {
        console.error('Error al crear person:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Añadir rostro a Person
 * @param {string} personId - ID de la persona
 * @param {Buffer} imageBuffer - Buffer de la imagen
 */
async function addFaceToPerson(personId, imageBuffer) {
    try {
        const persistedFace = await faceClient.personGroupPerson.addFaceFromStream(
            personGroupId,
            personId,
            imageBuffer,
            {
                detectionModel: 'detection_03'
            }
        );
        
        return {
            success: true,
            persistedFaceId: persistedFace.persistedFaceId
        };
    } catch (error) {
        console.error('Error al añadir rostro:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Entrenar Person Group
 */
async function trainPersonGroup() {
    try {
        await faceClient.personGroup.train(personGroupId);
        
        // Esperar a que termine el entrenamiento
        let trainingStatus;
        do {
            await new Promise(resolve => setTimeout(resolve, 1000));
            trainingStatus = await faceClient.personGroup.getTrainingStatus(personGroupId);
        } while (trainingStatus.status === 'running');
        
        if (trainingStatus.status === 'succeeded') {
            return { success: true };
        } else {
            return { success: false, error: 'Entrenamiento fallido' };
        }
    } catch (error) {
        console.error('Error al entrenar:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Identificar rostro
 * @param {string} faceId - ID del rostro detectado
 */
async function identifyFace(faceId) {
    try {
        const identifyResults = await faceClient.face.identify(
            [faceId],
            {
                personGroupId: personGroupId,
                maxNumOfCandidatesReturned: 1,
                confidenceThreshold: 0.7
            }
        );
        
        if (identifyResults.length === 0 || identifyResults[0].candidates.length === 0) {
            return {
                success: true,
                identified: false,
                message: 'Rostro no reconocido'
            };
        }
        
        const candidate = identifyResults[0].candidates[0];
        
        return {
            success: true,
            identified: true,
            personId: candidate.personId,
            confidence: candidate.confidence
        };
        
    } catch (error) {
        console.error('Error al identificar:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    createPersonGroup,
    detectFace,
    createPerson,
    addFaceToPerson,
    trainPersonGroup,
    identifyFace
};
