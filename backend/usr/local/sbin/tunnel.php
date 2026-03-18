#!/usr/bin/php
<?php
$version = '1.1';
$config  = array();
$dominio = '';

$config = getConfig('/etc/linux/clientes.xml');
$password_file = $config['passwords'];

function startElement($parser, $name, $attrs)
{
  global $dominio;
  global $config;

  if ($name == 'DOMAIN') {
    $dominio = $attrs['ID'];
  } else if ($name == 'HOST') {
    if (isset($config[$dominio])) {
      if (!is_array($config[$dominio])) {
        $config[$dominio] = array();
      }
    }

    // Comprobación de valores por defecto
    $attrs['IP'] = $attrs['IP'] ?? "";
    $attrs['NAME'] = $attrs['NAME'] ?? "";
    $attrs['PORT'] = $attrs['PORT'] ?? "";
    $attrs['HOP'] = $attrs['HOP'] ?? "";

    $config[$dominio][$attrs['ID']] = new host(
      $attrs['IP'],
      $attrs['NAME'],
      $attrs['PORT'],
      $attrs['ID'],
      $attrs['HOP']
    );
  } else if ($name == 'PASSWORDS') {
    $config['passwords'] = $attrs['SRC'];
  }
}

function endElement($parser, $name)
{
  global $dominio;

  if ($name == 'DOMAIN') {
    $dominio = '';
  }
}

function characterData($parser, $data)
{
  // Función vacía, tal vez útil para el futuro
}

function render_file($arch, $replace = array())
{
  if ($replace == array()) {
    if (!($fp = fopen($arch, 'r'))) {
      die("FATAL ERROR: Can't open file <b>$arch</b> for reading.");
    }
    $tmp = fread($fp, filesize($arch));
    fclose($fp);
  }
  return render($tmp);
}

function render($data, $replace = array())
{
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

  // PHP 8.5: xml_parser_free() está deprecado; el parser se libera automáticamente.
  if (defined('PHP_VERSION_ID') && PHP_VERSION_ID < 80500) {
    xml_parser_free($xml_parser);
  }
  unset($xml_parser);
  return $config;
}

$previo = rand(14350, 14355);

class host
{
  var $account = array();
  var $ip;
  var $name;
  var $port = 22;
  var $id;
  var $hop = NULL;
  var $lowUser = 'tux';
  var $highUser = 'root';

  function __construct($ip, $name, $port = 22, $id, $hop = NULL, $lowUser = 'tux', $highUser = 'root')
  {
    $this->ip = $ip;
    $this->name = $name;
    $this->port = $port;
    $this->id = $id;
    $this->hop = $hop;
    $this->lowUser = $lowUser;
    $this->highUser = $highUser;
  }

  function setAccount($user, $pass)
  {
    $this->account[$user] = $pass;
  }

  function _loginLowUser($asHighUser, $destino)
  {
    global $config;
    global $tpl;
    global $previo;

    if ($this->hop) {
      $arr = explode('/', $this->hop);
      $config[$arr[0]][$arr[1]]->_loginLowUser(FALSE, $destino);
    }

    $tpl->setCurrentBlock('connect');
    $tpl->setVariable('USER', $this->lowUser);
    $tpl->setVariable('PASSWORD', $this->account[$this->lowUser]);
    $tpl->setVariable('HOST', $this->ip ? $this->ip : $this->name);
    $tpl->setVariable('PORT', $this->port ? $this->port : 22);
    global $argv;

    $domain = $argv[1];
    $computer = $argv[2];

    if ($computer == $this->id) {
      $_destino = $destino;
    } else {
      $_destino = $previo;
    }

    $redirect = "-L 0.0.0.0:${previo}:localhost:${_destino}";
    $tpl->setVariable('REDIRECT', $redirect);
    $tpl->parse('connect');

    if ($asHighUser) {
      $tpl->setCurrentBlock('root');
      $tpl->setVariable('PORT', $this->port ? $this->port : 22);
      $tpl->setVariable('ROOT', $this->highUser);
      $tpl->setVariable('ROOTPASSWORD', $this->account[$this->highUser]);
      $tpl->parse('root');
    }
  }
}

function getConfig($file)
{
  return render_file($file);
}

function assignPasswords($file = 'invalid')
{
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
        $computer->setAccount($pass[2], $pass[3]);
      } 
    }
  } while ($pass = next($passwordArray));
}

function debug($str)
{
  fwrite(STDERR, $str);
}

function check_computer($dm, $computer)
{
  global $config;
  if (check_domain($dm)) {
    $computers = array_keys($config[$dm]);
    if (!in_array($computer, $computers)) {
      debug("Computer $computer in domain $dm doesn't exist\n");
      debug("Possible computers in $dm:\n * " . join("\n * ", $computers) . "\n");
      return FALSE;
    }
    return TRUE;
  } else {
    return FALSE;
  }
}

function check_domain($dm)
{
  global $config;
  $domains = array_keys($config);

  if (!in_array($dm, $domains)) {
    debug("Domain $dm doesn't exist\n");
    debug("Possible domains:\n * " . join("\n * ", $domains) . "\n");
    return FALSE;
  }
  return TRUE;
}

function parseParams()
{
  global $argv;
  global $tpl;

  $domain = $argv[1];
  $computer = $argv[2];
  if (substr($computer, 0, 1) == '-') {
    $computer = substr($computer, 1);
  }
  $destino = $argv[3];

  $tpl->setVariable('DOMAIN', $domain);
  $tpl->setVariable('COMPUTER', $computer);
  $tpl->setVariable('DESTINO', $destino);

  if (!check_computer($domain, $computer)) {
    debug("\n*** Execution stopped due to errors\n\n");
    return FALSE;
  }
  return array($domain, $computer, $destino);
}

if (assignPasswords($password_file)) {
  return 1;
};

require_once('HTML/Template/IT.php');
$tpl = new HTML_Template_IT(dirname(__FILE__));
$tpl->loadTemplatefile('tunnel.exp');
$tpl->setVariable('VERSION', $version);

$param = parseParams();
$tpl->setVariable('REDIRECTPORT', $previo);
$tpl->setVariable('FINALPORT', $param[2]);
if (!$param) {
  return 1;
}

$config[$param[0]][$param[1]]->_loginLowUser(FALSE, $param[2]);

print($tpl->get());

?>
