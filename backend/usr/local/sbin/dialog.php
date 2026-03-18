#!/usr/bin/php
<?php
$domains = array();
$hosts = array();
$selected = false;

function startElement($parser, $name, $attrs)
{
    global $domains;

    if ($name == 'DOMAIN') {
        $attrs['COMMENT'] = $attrs['COMMENT'] ? $attrs['COMMENT'] : $attrs['ID'];
        $domains[$attrs['ID']] = $attrs['COMMENT'];
    }
}

function endElement($parser, $name)
{
    // No changes needed here.
}

function selectDomain($parser, $name, $attrs)
{
    global $domains, $hosts, $selected, $wished_domain;

    if ($name == 'DOMAIN' && $attrs['ID'] == $wished_domain) {
        $selected = true;
    }

    if ($name == 'HOST' && $selected) {
        $comment = $attrs['COMMENT'] ? $attrs['COMMENT'] : $attrs['ID'];
        $ip = $attrs['IP'] ? $attrs['IP'] : '';
        $hosts[$attrs['ID']] = [
            'comment' => $comment,
            'ip' => $ip
        ];
    }
}

function endSelectDomain($parser, $name)
{
    global $selected;
    if ($name == 'DOMAIN' && $selected) {
        $selected = false;
    }
}

function &render_file($arch, $start = 'startElement', $end = 'endElement')
{
    if (!($fp = fopen($arch, 'r'))) {
        die("FATAL ERROR: Can't open file <b>$arch</b> for reading.");
    }
    $tmp = fread($fp, filesize($arch));
    fclose($fp);
    return render($tmp, $start, $end);
}

function &render($data, $start = 'startElement', $end = 'endElement')
{
    $xml_parser = xml_parser_create();

    xml_set_element_handler($xml_parser, $start, $end);

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
}

if ($wished_domain = $argv[1]) {
    render_file('/etc/linux/clientes.xml', 'selectDomain', 'endSelectDomain');
    print("--menu \"$wished_domain\" 40 100 80\n");

    foreach ($hosts as $host_id => $host_info) {
        $comment = $host_info['comment'];
        $ip = $host_info['ip'];
        $times = 0;
        $dir = "/opt/linux/log/$wished_domain/$host_id";
        if (is_dir($dir)) {
            $handle = opendir($dir);
            while ($file = readdir($handle)) {
                if (preg_match("/log$/", $file)) {
                    $times++;
                }
            }
            closedir($handle);
        }
        print("$host_id \"$comment ($times) | IP: $ip\"\n");
    }
} else {
    render_file('/etc/linux/clientes.xml');
    print("--menu \"Dominios\" 40 100 80\n");
    foreach ($domains as $domain_id => $comment) {
        print("$domain_id \"$comment\"\n");
    }
}
print "\n";

?>