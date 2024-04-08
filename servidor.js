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
        next();
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


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor Node.js corriendo en el puerto ${PORT}`);
});
