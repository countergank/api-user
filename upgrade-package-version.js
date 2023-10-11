const fs = require('fs');
const path = require('path');

// Ruta al archivo package.json
const packageJsonPath = path.join(__dirname, 'package.json');

// Leer el contenido del archivo package.json
fs.readFile(packageJsonPath, 'utf-8', (err, data) => {
  if (err) {
    console.error('Error al leer el archivo package.json:', err);
    return;
  }

  try {
    const packageJson = JSON.parse(data);

    // Incrementar la versión especificada (major, minor o patch)
    const versionPart = process.argv[2]; // Debe ser 'major', 'minor' o 'patch'

    if (versionPart === 'major') {
      packageJson.version = upgradeMajorVersion(packageJson.version);
    } else if (versionPart === 'minor') {
      packageJson.version = upgradeMinorVersion(packageJson.version);
    } else if (versionPart === 'patch') {
      packageJson.version = upgradePatchVersion(packageJson.version);
    } else {
      console.error('Debe proporcionar una parte de versión válida: major, minor o patch.');
      return;
    }

    // Guardar el archivo package.json actualizado
    fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8', (err) => {
      if (err) {
        console.error('Error al escribir el archivo package.json:', err);
      } else {
        console.log(`Versión actualizada a ${packageJson.version}`);
      }
    });
  } catch (parseError) {
    console.error('Error al analizar el archivo package.json:', parseError);
  }
});

// Funciones para incrementar las partes de versión
function upgradeMajorVersion(version) {
  const parts = version.split('.');
  parts[0] = (parseInt(parts[0]) + 1).toString();
  parts[1] = '0';
  parts[2] = '0';
  return parts.join('.');
}

function upgradeMinorVersion(version) {
  const parts = version.split('.');
  parts[1] = (parseInt(parts[1]) + 1).toString();
  parts[2] = '0';
  return parts.join('.');
}

function upgradePatchVersion(version) {
  const parts = version.split('.');
  parts[2] = (parseInt(parts[2]) + 1).toString();
  return parts.join('.');
}
