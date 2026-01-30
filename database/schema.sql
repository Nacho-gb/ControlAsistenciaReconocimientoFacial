-- ============================================
-- GIMNASIO ASISTENCIA - DATABASE SCHEMA
-- ============================================

-- Tabla: Socios
CREATE TABLE Socios (
    SocioId INT PRIMARY KEY IDENTITY(1,1),
    Nombre NVARCHAR(100) NOT NULL,
    Email NVARCHAR(100) UNIQUE NOT NULL,
    Telefono NVARCHAR(20),
    FacePersonId NVARCHAR(100) UNIQUE, -- ID de Face API
    FechaAlta DATETIME2 DEFAULT GETDATE(),
    Activo BIT DEFAULT 1,
    InvitacionesMesActual INT DEFAULT 0,
    UltimoResetInvitaciones DATE DEFAULT DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0), -- Primer día del mes actual
    
    CONSTRAINT CHK_InvitacionesRango CHECK (InvitacionesMesActual BETWEEN 0 AND 2)
);

-- Índices para Socios
CREATE INDEX IDX_Socios_Email ON Socios(Email);
CREATE INDEX IDX_Socios_FacePersonId ON Socios(FacePersonId);
CREATE INDEX IDX_Socios_Activo ON Socios(Activo);

-- ============================================
-- Tabla: Salas
CREATE TABLE Salas (
    SalaId INT PRIMARY KEY IDENTITY(1,1),
    NombreSala NVARCHAR(50) NOT NULL UNIQUE,
    CapacidadMaxima INT NOT NULL,
    Activa BIT DEFAULT 1,
    
    CONSTRAINT CHK_CapacidadPositiva CHECK (CapacidadMaxima > 0)
);

-- ============================================
-- Tabla: Accesos (entrada/salida gimnasio)
CREATE TABLE Accesos (
    AccesoId INT PRIMARY KEY IDENTITY(1,1),
    SocioId INT,
    FechaHora DATETIME2 DEFAULT GETDATE(),
    TipoAcceso NVARCHAR(20) NOT NULL, -- 'ENTRADA', 'SALIDA'
    EsInvitado BIT DEFAULT 0,
    
    CONSTRAINT FK_Accesos_Socios FOREIGN KEY (SocioId) REFERENCES Socios(SocioId),
    CONSTRAINT CHK_TipoAcceso CHECK (TipoAcceso IN ('ENTRADA', 'SALIDA'))
);

-- Índices para Accesos
CREATE INDEX IDX_Accesos_SocioId ON Accesos(SocioId);
CREATE INDEX IDX_Accesos_FechaHora ON Accesos(FechaHora DESC);
CREATE INDEX IDX_Accesos_TipoAcceso ON Accesos(TipoAcceso);

-- ============================================
-- Tabla: MovimientosSala (tracking por sala)
CREATE TABLE MovimientosSala (
    MovimientoId INT PRIMARY KEY IDENTITY(1,1),
    SocioId INT,
    SalaId INT NOT NULL,
    FechaHoraEntrada DATETIME2 DEFAULT GETDATE(),
    FechaHoraSalida DATETIME2,
    TiempoMinutos AS DATEDIFF(MINUTE, FechaHoraEntrada, FechaHoraSalida),
    EsInvitado BIT DEFAULT 0,
    
    CONSTRAINT FK_MovimientosSala_Socios FOREIGN KEY (SocioId) REFERENCES Socios(SocioId),
    CONSTRAINT FK_MovimientosSala_Salas FOREIGN KEY (SalaId) REFERENCES Salas(SalaId),
    CONSTRAINT CHK_SalidaDespuesEntrada CHECK (FechaHoraSalida IS NULL OR FechaHoraSalida > FechaHoraEntrada)
);

-- Índices para MovimientosSala
CREATE INDEX IDX_MovimientosSala_SocioId ON MovimientosSala(SocioId);
CREATE INDEX IDX_MovimientosSala_SalaId ON MovimientosSala(SalaId);
CREATE INDEX IDX_MovimientosSala_FechaEntrada ON MovimientosSala(FechaHoraEntrada DESC);
CREATE INDEX IDX_MovimientosSala_Activos ON MovimientosSala(SalaId) WHERE FechaHoraSalida IS NULL;

-- ============================================
-- Tabla: RegistroInvitados (tracking anónimo)
CREATE TABLE RegistroInvitados (
    RegistroId INT PRIMARY KEY IDENTITY(1,1),
    SocioAnfitrionId INT NOT NULL,
    FechaHora DATETIME2 DEFAULT GETDATE(),
    MesRegistro AS DATEADD(month, DATEDIFF(month, 0, FechaHora), 0) PERSISTED, -- Primer día del mes
    
    CONSTRAINT FK_RegistroInvitados_Socios FOREIGN KEY (SocioAnfitrionId) REFERENCES Socios(SocioId)
);

-- Índice para RegistroInvitados
CREATE INDEX IDX_RegistroInvitados_SocioMes ON RegistroInvitados(SocioAnfitrionId, MesRegistro);
