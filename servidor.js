const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  port: 3307,
  password: '',
  database: 'gheu',
});

// Conectar a la base de datos
db.connect((err) => {
  if (err) {
    console.error('Error de conexión a la base de datos:', err);
    throw err;
  }
  console.log('Conexión a la base de datos MySQL establecida');
});

app.use(cors());

// Middleware para parsear el cuerpo de las solicitudes como JSON
app.use(express.json());

let userEmail = ''; // Variable global para almacenar el email
let userId = ''; // Variable global para almacenar el id del usuario
let aulaId = ''; // Variable global para almacenar el id del aula
let groupMateriaProfesorId;

// Middleware para almacenar el email y el id del usuario en la solicitud
const storeUserMiddleware = (req, res, next) => {
  const { email } = req.body;
  userEmail = email; // Asignar el email a la variable global
  console.log(userEmail)
  const sql = 'SELECT id_profesor FROM profesores WHERE email = ?';
  db.query(sql, [userEmail], (err, result) => {
    if (err) {
      console.error('Error al obtener el id del usuario:', err);
      res.status(500).json({ message: 'Error al obtener el id del usuario' });
    } else {
      console.log('Resultado de la consulta:', result); // Verificar el resultado de la consulta
      if (result.length > 0) {
        userId = result[0].id_profesor; // Asignar el id a la variable global
        console.log('ID del usuario:', userId); // Verificar el ID del usuario
        
        // Realizar la segunda consulta para obtener id_grupo_materia_profesor
        const secondSql = 'SELECT id_grupo_materia_profesor FROM grupo_materia_profesor WHERE id_profesor = ?';
        db.query(secondSql, [userId], (secondErr, secondResult) => {
          if (secondErr) {
            console.error('Error al obtener id_grupo_materia_profesor:', secondErr);
            res.status(500).json({ message: 'Error al obtener id_grupo_materia_profesor' });
          } else {
            if (secondResult.length > 0) {
              groupMateriaProfesorId = secondResult[0].id_grupo_materia_profesor; // Asignar el id_grupo_materia_profesor a la variable global
              console.log('ID del grupo_materia_profesor:', groupMateriaProfesorId); // Verificar el ID del grupo_materia_profesor
              next();
            } else {
              res.status(404).json({ message: 'Grupo de materia de profesor no encontrado' });
            }
          }
        });
      } else {
        res.status(404).json({ message: 'Usuario no encontrado' });
      }
    }
  });
};



// Ruta para manejar la autenticación
app.post('/login', storeUserMiddleware, (req, res) => {
  const { contraseña } = req.body;
  // Verificar si se reciben los datos correctamente
  if (!userEmail || !contraseña) {
    return res.status(400).json({ message: 'Faltan datos de inicio de sesión' });
  }

  // Consulta para verificar las credenciales del usuario
  const sql = 'SELECT * FROM profesores_login WHERE email = ? AND contraseña = ?';
  db.query(sql, [userEmail, contraseña], (err, result) => {
    if (err) {
      console.error('Error al autenticar al usuario:', err);
      res.status(500).json({ message: 'Error al autenticar al usuario' });
    } else {
      if (result.length > 0) {
        // Usuario autenticado correctamente
        res.json({ message: 'Login exitoso' });
      } else {
        // Credenciales incorrectas
        res.status(401).json({ message: 'Credenciales incorrectas' });
      }
    }
  });
});

// Ruta para obtener todos los usuarios
app.get('/usuarios', (req, res) => {
  // Consulta para obtener todos los usuarios de la base de datos
  const sql = 'SELECT * FROM profesores_login';

  // Ejecutar la consulta
  db.query(sql, (err, result) => {
    if (err) {
      console.error('Error al obtener usuarios:', err);
      res.status(500).json({ message: 'Error al obtener usuarios' });
    } else {
      // Enviar los usuarios obtenidos como respuesta
      res.json(result);
    }});
})

app.get('/periodos', (req, res) => {
  const sql = 'SELECT DISTINCT periodo_horario FROM grupo_materia_profesor';
  
  db.query(sql, (err, result) => {
    if (err) {
      console.error('Error al obtener periodos:', err);
      res.status(500).json({ message: 'Error al obtener periodos' });
    } else {
      const periodos = result.map(periodo => periodo.periodo_horario);
      console.log('Periodos:', periodos); // Imprimir periodos en la consola
      res.json(periodos);
    }
  });
});

app.get('/horario', (req, res) => {
  // Verificar si hay un ID de profesor almacenado en la variable global
  if (!userId) {
    return res.status(400).json({ message: 'ID del profesor no encontrado' });
  }

  const periodo = req.query.periodo; // Obtener el periodo de la consulta

  if (!periodo) {
    return res.status(400).json({ message: 'Periodo no proporcionado' });
  }

  // Consulta para obtener los datos de horarios y profesores filtrados por periodo
  const sql = `
    SELECT h.id_hora, g.nombre_grupo, m.nombre_materia
    FROM horario h
    JOIN grupo_materia_profesor gmp ON h.id_grupo_materia_profesor = gmp.id_grupo_materia_profesor
    JOIN grupos g ON gmp.id_grupo = g.id_grupo
    JOIN materias m ON gmp.id_materia = m.id_materia
    WHERE gmp.id_profesor = ? AND gmp.periodo_horario = ?`; // Agregar condición para el periodo

  db.query(sql, [userId, periodo], (err, clases) => {
    if (err) {
      console.error('Error al obtener las clases:', err);
      res.status(500).json({ message: 'Error al obtener las clases' });
    } else {
      res.json(clases);
      console.log("datos:", clases)
    }
  });
});


app.get('/info_aula', (req, res) => {

  // Verificar si hay un ID de profesor almacenado en la variable global
  if (!userId) {
    return res.status(400).json({ message: 'ID del profesor no encontrado' });
  }

  // Obtener la hora actual
  const horaActual = new Date();

  // Restar una hora
  horaActual.setHours(horaActual.getHours() - 1);

  // Formatear la hora actual en formato HH:MM:SS
  const options = { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit', 
    timeZone: 'America/Mexico_City' 
  };

  const horaMenosUnaHora = horaActual.toLocaleTimeString('es-MX', options);
  console.log(horaMenosUnaHora);

  const fechaActual = new Date();
  let dia = fechaActual.getDay(); // 0: Domingo, 1: Lunes, ..., 6: Sábado

  // Convertir Domingo (0) a 7 para que coincida con la convención de Lunes (1) a Domingo (7)
  if (dia === 0) {
    dia = 7;
  }
  
  console.log(dia)

  // Consulta para crear la vista
  const createViewSQL = `
  CREATE OR REPLACE VIEW vista_aulas_profesor AS
  SELECT h.id_grupo_materia_profesor, a.id_aula, a.nombre_aula, h.id_hora, hh.dia_semana
  FROM horario h
  JOIN aulas a ON h.id_aula = a.id_aula
  JOIN grupo_materia_profesor gmp ON h.id_grupo_materia_profesor = gmp.id_grupo_materia_profesor
  JOIN horas_horarios hh ON h.id_hora = hh.id_hora
  WHERE gmp.id_profesor = ? AND gmp.periodo_horario = 'Julio - Diciembre 2024';
  `;



  const selectViewSQL = `
  SELECT id_aula, nombre_aula
  FROM vista_aulas_profesor
  WHERE id_hora = (
    SELECT id_hora
    FROM horas_horarios
    WHERE ? >= hora_inicio AND ? <= hora_fin -- Corregir la comparación de la hora actual con los rangos de horas
    AND dia_semana = ? -- El día de la semana actual debe coincidir
    LIMIT 1 
  )
  LIMIT 1;
  `;

  // Ejecutar la consulta para obtener la información del aula desde la vista
  db.query(selectViewSQL, [horaMenosUnaHora, horaMenosUnaHora, dia], (selectViewErr, selectViewResult) => {
    if (selectViewErr) {
      console.error('Error al obtener la información del aula desde la vista:', selectViewErr);
      res.status(500).json({ error: 'Error interno del servidor' });
      return;
    }

    if (selectViewResult.length === 0) {
      console.log('No se encontró un aula asignada al profesor para esta hora.');
      res.status(404).json({ error: 'No se encontró un aula asignada al profesor para esta hora' });
      return;
    }

    const { id_aula, nombre_aula } = selectViewResult[0];
    aulaId = id_aula; // Asignar el ID del aula a la variable global
    // Envía la información del aula como respuesta
    res.json({ id_aula, nombre_aula });
    console.log('Datos:', id_aula, nombre_aula);
  });
});



// Ruta para cambiar el estado del aula
app.post('/cambiar_estado_aula', (req, res) => {
  const { estado } = req.body;

  // Verificar si el estado es válido (1 para abierto, 0 para cerrado)
  if (estado !== 0 && estado !== 1) {
    return res.status(400).json({ message: 'Estado no válido' });
  }

  // Verificar si hay un ID de aula almacenado en la variable global
  if (!aulaId) {
    return res.status(404).json({ message: 'ID del aula no encontrado' });
  }

  // Actualizar el estado del aula en la base de datos
  const sql = 'UPDATE aulas_iot SET estado = ? WHERE id_aula = ?';
  db.query(sql, [estado, aulaId], (err, result) => {
    if (err) {
      console.error('Error al actualizar el estado del aula:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
      return;
    }

    // Verificar si se actualizó correctamente
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Aula no encontrada' });
      console.log('Aula no encontrada');
    }

    res.json({ message: 'Estado del aula actualizado correctamente' });
    console.log('Estado del aula actualizado correctamente');
  });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor Node.js corriendo en el puerto ${PORT}`);
});
