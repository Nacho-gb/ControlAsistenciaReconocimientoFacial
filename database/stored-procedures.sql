-- ============================================
-- SP: Obtener Estado Actual del Gimnasio
-- ============================================
CREATE OR ALTER PROCEDURE sp_ObtenerEstadoGimnasio
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Socios actualmente dentro
    DECLARE @SociosDentro INT;
    SELECT @SociosDentro = COUNT(DISTINCT SocioId)
    FROM Accesos
    WHERE TipoAcceso = 'ENTRADA'
      AND EsInvitado = 0
      AND SocioId NOT IN (
          SELECT SocioId FROM Accesos 
          WHERE TipoAcceso = 'SALIDA' 
            AND EsInvitado = 0
            AND FechaHora > (SELECT MAX(FechaHora) FROM Accesos a2 WHERE a2.SocioId = Accesos.SocioId AND a2.TipoAcceso = 'ENTRADA')
      );
    
    -- Invitados actualmente dentro
    DECLARE @InvitadosDentro INT;
    SELECT @InvitadosDentro = 
        (SELECT COUNT(*) FROM Accesos WHERE TipoAcceso = 'ENTRADA' AND EsInvitado = 1) -
        (SELECT COUNT(*) FROM Accesos WHERE TipoAcceso = 'SALIDA' AND EsInvitado = 1);
    
    -- Aforo por sala
    SELECT 
        s.NombreSala,
        s.CapacidadMaxima,
        COUNT(m.MovimientoId) AS PersonasDentro,
        s.CapacidadMaxima - COUNT(m.MovimientoId) AS PlazasLibres,
        CAST(COUNT(m.MovimientoId) * 100.0 / s.CapacidadMaxima AS DECIMAL(5,2)) AS PorcentajeOcupacion
    FROM Salas s
    LEFT JOIN MovimientosSala m ON s.SalaId = m.SalaId AND m.FechaHoraSalida IS NULL
    WHERE s.Activa = 1
    GROUP BY s.SalaId, s.NombreSala, s.CapacidadMaxima
    ORDER BY s.NombreSala;
    
    -- Resumen general
    SELECT 
        @SociosDentro AS SociosDentro,
        @InvitadosDentro AS InvitadosDentro,
        @SociosDentro + @InvitadosDentro AS TotalPersonas;
END;
GO

-- ============================================
-- SP: Verificar y Resetear Invitaciones Mensuales
-- ============================================
CREATE OR ALTER PROCEDURE sp_VerificarResetInvitaciones
    @SocioId INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @PrimerDiaMesActual DATE = DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0);
    DECLARE @UltimoReset DATE;
    
    SELECT @UltimoReset = UltimoResetInvitaciones
    FROM Socios
    WHERE SocioId = @SocioId;
    
    -- Si estamos en un mes nuevo, resetear
    IF @UltimoReset < @PrimerDiaMesActual
    BEGIN
        UPDATE Socios
        SET InvitacionesMesActual = 0,
            UltimoResetInvitaciones = @PrimerDiaMesActual
        WHERE SocioId = @SocioId;
    END
    
    -- Devolver estado actual
    SELECT 
        SocioId,
        Nombre,
        InvitacionesMesActual,
        2 - InvitacionesMesActual AS InvitacionesDisponibles
    FROM Socios
    WHERE SocioId = @SocioId;
END;
GO

-- ============================================
-- SP: Registrar Entrada con Invitado
-- ============================================
CREATE OR ALTER PROCEDURE sp_RegistrarEntradaConInvitado
    @SocioId INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    
    BEGIN TRY
        -- Verificar reset mensual
        EXEC sp_VerificarResetInvitaciones @SocioId;
        
        -- Verificar si tiene invitaciones disponibles
        DECLARE @InvitacionesActuales INT;
        SELECT @InvitacionesActuales = InvitacionesMesActual
        FROM Socios
        WHERE SocioId = @SocioId;
        
        IF @InvitacionesActuales >= 2
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 'ERROR' AS Resultado, 'Límite de invitados alcanzado este mes' AS Mensaje;
            RETURN;
        END
        
        -- Registrar entrada del invitado
        INSERT INTO Accesos (SocioId, TipoAcceso, EsInvitado)
        VALUES (@SocioId, 'ENTRADA', 1);
        
        -- Incrementar contador
        UPDATE Socios
        SET InvitacionesMesActual = InvitacionesMesActual + 1
        WHERE SocioId = @SocioId;
        
        -- Registrar en tabla de invitados
        INSERT INTO RegistroInvitados (SocioAnfitrionId)
        VALUES (@SocioId);
        
        COMMIT TRANSACTION;
        
        SELECT 
            'OK' AS Resultado,
            'Invitado registrado correctamente' AS Mensaje,
            InvitacionesMesActual AS InvitacionesUsadas,
            2 - InvitacionesMesActual AS InvitacionesRestantes
        FROM Socios
        WHERE SocioId = @SocioId;
        
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        SELECT 'ERROR' AS Resultado, ERROR_MESSAGE() AS Mensaje;
    END CATCH
END;
GO

-- ============================================
-- SP: Obtener Historial de Socio
-- ============================================
CREATE OR ALTER PROCEDURE sp_ObtenerHistorialSocio
    @SocioId INT,
    @Dias INT = 30
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @FechaInicio DATETIME2 = DATEADD(day, -@Dias, GETDATE());
    
    -- Accesos
    SELECT 
        FechaHora,
        TipoAcceso,
        EsInvitado
    FROM Accesos
    WHERE SocioId = @SocioId
      AND FechaHora >= @FechaInicio
    ORDER BY FechaHora DESC;
    
    -- Movimientos por sala
    SELECT 
        s.NombreSala,
        m.FechaHoraEntrada,
        m.FechaHoraSalida,
        m.TiempoMinutos
    FROM MovimientosSala m
    INNER JOIN Salas s ON m.SalaId = s.SalaId
    WHERE m.SocioId = @SocioId
      AND m.FechaHoraEntrada >= @FechaInicio
    ORDER BY m.FechaHoraEntrada DESC;
    
    -- Resumen de invitaciones
    SELECT 
        InvitacionesMesActual AS InvitacionesUsadas,
        2 - InvitacionesMesActual AS InvitacionesDisponibles,
        UltimoResetInvitaciones AS UltimoReset
    FROM Socios
    WHERE SocioId = @SocioId;
END;
GO

-- Probar los procedimientos
EXEC sp_ObtenerEstadoGimnasio;
