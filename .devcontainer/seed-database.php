<?php

declare(strict_types=1);

define('OC_CONSOLE', true);
require_once getenv('WEBROOT') . '/lib/base.php';

$folder = \OCP\Server::get(\OCP\Files\IRootFolder::class)->getUserFolder('admin');

if ($folder->nodeExists('dummy.kdbx')) {
    echo "Keeping existing admin/dummy.kdbx\n";
    return;
}

$sampleDatabasePath = __DIR__ . '/../dummy.kdbx';
$content = file_get_contents($sampleDatabasePath);
if ($content === false) {
    throw new \RuntimeException("Cannot read the sample database {$sampleDatabasePath}");
}

$folder->newFile('dummy.kdbx', $content);
echo "Created admin/dummy.kdbx\n";
