const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin= require('./models/adminModel'); 

// Configurar la conexión a MongoDB
const uri = "mongodb+srv://zerontec:97124000@cluster0.mg9ov.mongodb.net/multivecommerce?retryWrites=true&w=majority";

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    initDB();
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
  });

// Función para crear un usuario
const initDB = async () => {
  try {
    const email = "admin@admin.com";

    // Verificar si el usuario ya existe
    const alreadyExists = await Admin.findOne({ email });
    if (alreadyExists) {
      console.log('este email esta tomado intente con otro listo.');
       mongoose.connection.close(); // Cerrar la conexión a la base de datos
     process.exit(0); // Salir del proceso con éxito
    }

    // Crear el nuevo usuario
    const admin = new Admin({
      name: "Jane",
     
      email: email,
      rol:["admin"],
      password: bcrypt.hashSync("mypassword", 8) // Hasheando la contraseña directamente
    });

    // Guardar el usuario en la base de datos
   const savedAdmin = await admin.save();
    console.log('Admin created successfully:', savedAdmin);
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    // Cerrar la conexión a la base de datos y salir del proceso
    mongoose.connection.close();
    process.exit(0); // Salir del proceso con éxito
  }
};


initDB();



