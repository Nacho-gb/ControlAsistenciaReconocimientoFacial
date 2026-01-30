-- ============================================
-- DATOS INICIALES - SALAS
-- ============================================

INSERT INTO Salas (NombreSala, CapacidadMaxima) VALUES
('Musculación', 20),
('Fitness', 15),
('Piscina', 24),
('Cycling', 10),
('Cafetería', 40);

-- Verificar
SELECT * FROM Salas;

-- ============================================
-- SOCIOS DE PRUEBA (se añadirán vía app)
-- ============================================
-- Los socios reales se darán de alta mediante la aplicación
-- con captura de foto y registro en Face API
