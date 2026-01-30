# Documentación del Sistema de Control de Acceso al Gimnasio

## Descripción General
Este sistema permite registrar socios, controlar el acceso mediante reconocimiento facial (Azure Face API), y gestionar la asistencia y salas de un gimnasio. Incluye backend (Azure Functions), base de datos SQL, integración con Face API y una web-app para usuarios y dashboard.

---

## Estructura del Proyecto

- **azure-functions/**: Backend con Azure Functions (Node.js)
  - **RegistrarSocio/**: Función para registrar nuevos socios
  - **ControlAcceso/**: Función para controlar el acceso (entrada/salida)
  - **shared/database.js**: Módulo de conexión y utilidades SQL
  - **shared/faceapi.js**: Módulo de integración con Azure Face API
- **web-app/**: Frontend web para registro, acceso y gestión
  - **index.html**: Interfaz principal
  - **app.js**: Lógica de UI, cámara, subida de imágenes y llamadas API
  - **styles.css**: Estilos
- **dashboard/**: Dashboard de asistencia y salas (opcional)
- **local.settings.json**: Variables de entorno para Azure Functions

---

## Flujo de Registro de Socio
1. El usuario introduce nombre, email, teléfono y sube una foto (cámara o archivo).
2. El frontend convierte la imagen a base64 y la envía a la API `/RegistrarSocio`.
3. El backend:
   - Valida los datos.
   - Convierte la imagen base64 a buffer.
   - Llama a `detectFace` (Face API) para asegurar que hay un solo rostro.
   - Crea un "Person" en el Person Group de Face API.
   - Añade el rostro a ese Person.
   - Inserta el socio en la tabla Socios de SQL.
   - Lanza el entrenamiento del Person Group.
   - Devuelve el socio registrado.

---

## Flujo de Control de Acceso
1. El usuario selecciona sala y sube una foto (cámara o archivo).
2. El frontend envía la imagen y datos a la API `/ControlAcceso`.
3. El backend:
   - Detecta el rostro en la imagen.
   - Identifica el socio usando Face API.
   - Registra la entrada/salida en la base de datos.
   - Devuelve el resultado (acceso concedido/denegado).

---

## Módulos Backend
### shared/database.js
- Conexión a SQL Server usando variables de entorno.
- Métodos: `executeQuery`, `executeStoredProcedure`.

### shared/faceapi.js
- Integra con Azure Face API usando SDK oficial.
- Funciones:
  - `detectFace(imageBuffer)`: Detecta un rostro en la imagen.
  - `createPerson(nombre)`: Crea un nuevo Person en el grupo.
  - `addFaceToPerson(personId, imageBuffer)`: Añade rostro a Person.
  - `trainPersonGroup()`: Entrena el grupo tras cambios.
  - `identifyFace(faceId)`: Identifica un rostro en el grupo.

### RegistrarSocio/index.js
- Recibe datos del socio y la imagen.
- Usa los módulos anteriores para registrar y asociar el rostro.
- Inserta el socio en la base de datos.

---

## Frontend (web-app)
- Permite registro y acceso usando cámara o archivo.
- Convierte imágenes a base64 y llama a las APIs.
- Muestra mensajes de éxito/error.
- Permite gestionar salas y ver resultados en tiempo real.

---

## Base de Datos
Tabla principal:
```sql
CREATE TABLE Socios (
    SocioId INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100) NOT NULL,
    Telefono NVARCHAR(30),
    FacePersonId NVARCHAR(64) NOT NULL,
    FechaRegistro DATETIME DEFAULT GETDATE()
);
```

---

## Variables de Entorno (local.settings.json)
- `FACE_API_ENDPOINT`, `FACE_API_KEY`, `PERSON_GROUP_ID`: Configuración Face API
- `SQL_SERVER`, `SQL_DATABASE`, `SQL_USER`, `SQL_PASSWORD`: Configuración SQL

---

## Notas y Consejos
- Si usas Azure SQL, permite tu IP en el firewall.
- El Person Group de Face API debe existir antes de registrar socios.
- El sistema soporta imágenes de cámara y archivos.
- El dashboard puede ampliarse para mostrar estadísticas en tiempo real.

---

## Contacto y Soporte
Para dudas técnicas, revisa los logs de Azure Functions y la consola del navegador. Si necesitas ayuda, consulta la documentación de Azure Functions, Face API y SQL Server.
