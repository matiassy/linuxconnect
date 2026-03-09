#!/usr/bin/php
<?php

///// VARIABLES GLOBALES
$version = getenv('VERSION'); // versión de PHP
$config = array(); // genera config array vacío
$dominio = ''; // variable dominio vacía
$lcHome = getenv('LC_HOME') ?: '/data/linuxconnect';
$configPath = getenv('LC_CONFIG') ?: ($lcHome . '/config/config.xml');
$defaultLowUser = getenv('LC_USER') ?: 'lunix';
$defaultHighUser = getenv('LC_HIGH_USER') ?: 'root';

$config = getConfig($configPath); // obtiene el archivo y lo parsea mediante getConfig
$password_file = $config['passwords'];

///// REQUERIMIENTOS
require_once('HTML/Template/IT.php'); // librería para convertir exp a html
$tpl = new HTML_Template_IT(dirname(__FILE__));  // genera una instancia de template
$tpl->loadTemplatefile('lc.exp');  // carga el template .exp
$tpl->setVariable('VERSION', $version); // setea versión de PHP en el template
$tpl->setVariable('LC_HOME', $lcHome);

// CLASE PRINCIPAL
class Host {
  // atributos de la clase 
  var $account = array();
  var $ip; 
  var $name; 
  var $port = 22; 
  var $hop = NULL; 
  var $lowUser = 'lunix'; 
  var $highUser = 'root';

  // Constructor de conexión a host
  function __construct($ip, $name, $port = 22, $hop = NULL, $lowUser = 'lunix', $highUser = 'root') {
    $this->ip = $ip;
    $this->name = $name;
    $this->port = $port;
    $this->hop = $hop;
    $this->lowUser = $lowUser;
    $this->highUser = $highUser;
  }

  // Método para setear usuario y password
  function setAccount($user, $pass) {
    $this->account[$user] = $pass;
  }

  // Método de login con usuario sin privilegios y salto con usuario con privilegios
  function _loginLowUser($asHighUser = TRUE) {
    global $config, $tpl;

    if (!isset($this->account[$this->lowUser]) || $this->account[$this->lowUser] === '') {
      debug("------------ERROR------------\n No hay password para el usuario '{$this->lowUser}'\n-----------------------------\n");
      return 0;
    }

    if ($this->hop) {
      $arr = explode('/', $this->hop);
      if (isset($config[$arr[0]][$arr[1]])) {
        $config[$arr[0]][$arr[1]]->_loginLowUser(FALSE);
      } else {
        debug("------------ERROR------------\n No se encuentra el equipo $arr[1]\n-----------------------------\n");
        return 0;
      }
    }

    // Asignación de variables a la instancia de la clase
    $tpl->setCurrentBlock('connect');
    $tpl->setVariable('USER', $this->lowUser);
    $tpl->setVariable('PASSWORD', $this->account[$this->lowUser]);
    $tpl->setVariable('HOST', $this->ip ? $this->ip : $this->name);
    $tpl->setVariable('PORT', $this->port ? $this->port : 22);
    $tpl->parse('connect');

    if ($asHighUser) {
      if (!isset($this->account[$this->highUser]) || $this->account[$this->highUser] === '') {
        debug("Warning: No hay password para '{$this->highUser}', omitiendo su\n");
        return 1;
      }
      $tpl->setCurrentBlock('root');
      $tpl->setVariable('ROOT', $this->highUser);
      $tpl->setVariable('ROOTPASSWORD', $this->account[$this->highUser]);
      $tpl->parse('root');
    }
  }
}

// Función de inicio de conexión
function startElement($parser, $name, $attrs) {
  global $dominio, $config, $defaultLowUser, $defaultHighUser;

  if ($name == 'DOMAIN') {
    $dominio = $attrs['ID'];
  } else if ($name == 'HOST') {
    if (isset($config[$dominio])) {
      if (!is_array($config[$dominio])) {
        $config[$dominio] = array();
      }
    }

    if (!isset($attrs['IP'])) $attrs['IP'] = "";
    if (!isset($attrs['NAME'])) $attrs['NAME'] = "";
    if (!isset($attrs['PORT'])) $attrs['PORT'] = "";
    if (!isset($attrs['HOP'])) $attrs['HOP'] = "";

    $config[$dominio][$attrs['ID']] = new Host(
      $attrs['IP'],
      $attrs['NAME'],
      $attrs['PORT'],
      $attrs['HOP'],
      $defaultLowUser,
      $defaultHighUser
    );
  } else if ($name == 'PASSWORDS') {
    $config['passwords'] = $attrs['SRC'];
  }
}

// Función de fin de conexión
function endElement($parser, $name) {
  global $dominio;

  if ($name == 'DOMAIN') {
    $dominio = '';
  }
}

// Función que maneja los datos de los elementos
function characterData($parser, $data) {}

// Renderiza el archivo de configuración
function render_file($arch, $replace = array()) {
  if ($replace == array()) {
    if (!($fp = fopen($arch, 'r'))) {
      die("FATAL ERROR: Can't open file <b>$arch</b> for reading.");
    }
    $tmp = fread($fp, filesize($arch));
    fclose($fp);
  }
  return render($tmp);
}

// Función de parseo XML
function render($data, $replace = array()) {
  global $config;
  $xml_parser = xml_parser_create();
  xml_set_element_handler($xml_parser, 'startElement', 'endElement');

  $tamano = strlen($data);
  if (!xml_parse($xml_parser, $data)) {
    $index = xml_get_current_byte_index($xml_parser);
    $tmp = substr($data, $index - 30, 60);
    die(sprintf(
      "Error XML: %s en la linea %d\n------\n%s\n-----",
      xml_error_string(xml_get_error_code($xml_parser)),
      xml_get_current_line_number($xml_parser),
      $tmp
    ));
  }

  xml_parser_free($xml_parser);
  return $config;
}

// Función que obtiene el archivo config.xml y lo envía a renderizar
function getConfig($file) {
  return render_file($file);
}

// Carga el archivo de password que se genera en la carpeta tmp, lo desencripta y genera un array de password
function assignPasswords($file = 'invalid') {
  global $config;
  $passwordArray = array();
  $tmpfile = tempnam('/tmp/', 'linux-');
  chmod($tmpfile, 0600);
  passthru("gpg -d $file > $tmpfile", $status);

  if ($status != 0) {
    debug("Warning!! gpg returned status $status!\n");
    return 1;
  }

  $fp = fopen($tmpfile, "r");
  while ($data = fgetcsv($fp, 1000, ",")) {
    array_push($passwordArray, $data);
  }
  fclose($fp);

  if (!unlink($tmpfile)) {
    debug("Warning!! unsecure $tmpfile couldn't be deleted\n");
    return 1;
  }

  reset($passwordArray);
  $pass = current($passwordArray);
  do {
    $domain = $config[$pass[0]];
    if (is_array($domain)) {
      $computer = $domain[$pass[1]];
      if ($computer) {
        error_reporting(0);
        $computer->setAccount($pass[2], $pass[3]);
      }
    }
  } while ($pass = next($passwordArray));
}

// Función de debug, escribe un archivo con posibles prints o errores
function debug($str) {
  fwrite(STDERR, $str);
}

// Chequea si existe el equipo
function check_computer($dm, $computer) {
  global $config;
  if (check_domain($dm)) {
    $computers = array_keys($config[$dm]);
    if (!in_array($computer, $computers)) {
      debug("Computer $computer in domain $dm doesn't exist\n");
      debug("Posible computers in $dm:\n * " . join("\n * ", $computers) . "\n");
      return FALSE;
    }
    return TRUE;
  } else {
    return FALSE;
  }
}

// Chequea si existe el dominio
function check_domain($dm) {
  global $config;
  $domains = array_keys($config);

  if (!in_array($dm, $domains)) {
    debug("Domain $dm doesn't exist\n");
    debug("Posible domains:\n * " . join("\n * ", $domains) . "\n");
    return FALSE;
  }
  return TRUE;
}

// Obtiene los parámetros de la vista de usuario
function parseParams() {
  global $argv, $tpl;

  $domain = $argv[1];
  if (isset($argv[2])) {
    $computer = $argv[2];
    if (substr($computer, 0, 1) == '-') {
      $computer = substr($computer, 1);
    }
  } else {
    $computer = "";
  }

  $tpl->setVariable('DOMAIN', $domain);
  $tpl->setVariable('COMPUTER', $computer);

  if (!check_computer($domain, $computer)) {
    debug("\n*** Execution stopped due to errors\n\n");
    return FALSE;
  }
  return array($domain, $computer);
}

// MAIN PRINCIPAL
// Si no es posible obtener el archivo de password en tmp, verificamos
if (assignPasswords($password_file)) {
  exit(1);
}

// Obtiene parámetros de pantalla de usuario y los verifica
$param = parseParams();
if (!$param) {
  exit(1);
}

// Intenta el login, enviando los parámetros host y equipo
$config[$param[0]][$param[1]]->_loginLowUser();

print($tpl->get());

exit(0);

?>
