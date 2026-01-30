
# 📚 Documentación del Sistema de Control de Acceso al Gimnasio

---

## Índice
1. [Descripción General](#descripción-general)
2. [Arquitectura y Diagrama](#arquitectura-y-diagrama)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Flujos Principales](#flujos-principales)
5. [Backend: Azure Functions](#backend-azure-functions)
6. [Frontend: Web-App](#frontend-web-app)
7. [Base de Datos](#base-de-datos)
8. [Variables de Entorno](#variables-de-entorno)
9. [Buenas Prácticas y Consejos](#buenas-prácticas-y-consejos)
10. [Ejemplo de Uso](#ejemplo-de-uso)
11. [Contacto y Soporte](#contacto-y-soporte)

---


## Descripción General
Sistema integral para la gestión de acceso y control de socios en un gimnasio, usando reconocimiento facial (Azure Face API), base de datos SQL y una interfaz web moderna. Permite:
- Registro de socios con foto (cámara o archivo)
- Control de acceso (entrada/salida) por reconocimiento facial
- Gestión de salas y aforo
- Dashboard de estadísticas en tiempo real

---

## Arquitectura y Diagrama

```mermaid
flowchart TD
  A[Web-App (HTML/JS)] --&gt; |API REST| B[Azure Functions]
  B --&gt; |Face API| C[Azure Cognitive Services]
  B --&gt; |SQL| D[Azure SQL Database]
  B --&gt; |Dashboard| E[Web Dashboard]
```

---

---


## Estructura del Proyecto

```text
gimnasio-control/
│
├── azure-functions/           # Backend (Node.js, Azure Functions)
│   ├── RegistrarSocio/        # Registro de socios
│   ├── ControlAcceso/         # Control de acceso facial
│   └── shared/
│       ├── database.js        # Utilidades SQL
│       └── faceapi.js         # Integración Face API
│
├── web-app/                   # Frontend web
│   ├── index.html             # Interfaz principal
│   ├── app.js                 # Lógica JS
│   └── styles.css             # Estilos
│
├── dashboard/                 # Dashboard de estadísticas
│
├── local.settings.json        # Configuración local Azure Functions
└── DOCUMENTACION.md           # Este documento
```

---

---


## Flujos Principales

### Registro de Socio
1. El usuario rellena el formulario y sube una foto (cámara o archivo).
2. El frontend convierte la imagen a base64 y la envía a `/RegistrarSocio`.
3. El backend valida, detecta el rostro, crea el Person en Face API, asocia la foto y guarda el socio en SQL.
4. Se entrena el Person Group y se responde con el socio registrado.

### Control de Acceso
1. El usuario selecciona sala y sube una foto (cámara o archivo).
2. El frontend envía la imagen y datos a `/ControlAcceso`.
3. El backend detecta el rostro, identifica el socio, registra la entrada/salida y responde con el resultado.

---


## Backend: Azure Functions

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

### ControlAcceso/index.js
- Recibe imagen y sala.
- Detecta rostro, identifica socio, registra acceso y responde con resultado.

---


## Frontend: Web-App
- Registro y acceso con cámara o archivo.
- Conversión de imágenes a base64 y envío a la API.
- Mensajes de éxito/error en tiempo real.
- Gestión visual de salas y aforo.
- Responsive y usable desde móvil y PC.

---

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
Puedes añadir tablas para salas, movimientos, invitaciones, etc.

---

---


## Variables de Entorno
Ejemplo de `local.settings.json`:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "FACE_API_ENDPOINT": "<tu-endpoint-face>",
    "FACE_API_KEY": "<tu-clave-face>",
    "PERSON_GROUP_ID": "<tu-person-group>",
    "SQL_SERVER": "<tu-sql-server>",
    "SQL_DATABASE": "<tu-db>",
    "SQL_USER": "<tu-usuario>",
    "SQL_PASSWORD": "<tu-password>"
  },
  "Host": {
    "CORS": "*",
    "CORSCredentials": false
  }
}
```

---

---


## Buenas Prácticas y Consejos
- Usa imágenes nítidas y bien iluminadas para el registro.
- El Person Group de Face API debe existir antes de registrar socios (puedes crearlo con el método `createPersonGroup`).
- Si usas Azure SQL, permite tu IP en el firewall.
- No subas claves ni contraseñas a GitHub (.gitignore).
- El dashboard puede ampliarse para mostrar estadísticas en tiempo real.

---

---


## Ejemplo de Uso

### Registrar Socio
1. Ve a la pestaña "Nuevo Socio".
2. Rellena los datos y sube una foto o usa la cámara.
3. Pulsa "Registrar Socio". Si todo es correcto, verás un mensaje de éxito.

### Acceso al Gimnasio
1. Ve a la pestaña "Acceso".
2. Sube una foto o usa la cámara y pulsa "Registrar ENTRADA" o "Registrar SALIDA".
3. El sistema validará tu rostro y mostrará el resultado.

---

## Contacto y Soporte
Para dudas técnicas, revisa los logs de Azure Functions y la consola del navegador. Si necesitas ayuda, consulta la documentación oficial de Azure Functions, Face API y SQL Server, o contacta con el desarrollador del proyecto.
