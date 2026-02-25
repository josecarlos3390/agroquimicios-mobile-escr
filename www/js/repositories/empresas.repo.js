import { executeQuery, executeRun } from '../db/sqlite.js';

export async function getEmpresas() {
  const empresas = await executeQuery(
    'SELECT * FROM empresas ORDER BY created_at DESC'
  );
  
  return empresas;
}

export async function getEmpresaById(id) {
  const result = await executeQuery(
    'SELECT * FROM empresas WHERE id = ?',
    [id]
  );
  
  return result[0] || null;
}

export async function createEmpresa(empresa) {
  const result = await executeRun(
    `INSERT INTO empresas (nombre, rut, direccion, telefono, email)
     VALUES (?, ?, ?, ?, ?)`,
    [
      empresa.nombre,
      empresa.rut,
      empresa.direccion,
      empresa.telefono,
      empresa.email
    ]
  );

  return result.lastId;
}

export async function updateEmpresa(id, empresa) {
  await executeRun(
    `UPDATE empresas 
     SET nombre = ?, rut = ?, direccion = ?, telefono = ?, email = ?
     WHERE id = ?`,
    [
      empresa.nombre,
      empresa.rut,
      empresa.direccion,
      empresa.telefono,
      empresa.email,
      id
    ]
  );

  return true;
}

export async function deleteEmpresa(id) {
  await executeRun(
    'DELETE FROM empresas WHERE id = ?',
    [id]
  );

  return true;
}