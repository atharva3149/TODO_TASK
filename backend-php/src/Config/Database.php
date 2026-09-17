<?php

declare(strict_types=1);

namespace App\Config;

use PDO;

final class Database
{
    public static function connection(): PDO
    {
        $host = Config::get('DB_HOST');
        $port = Config::integer('DB_PORT', 3306);
        $database = Config::get('DB_NAME');
        $username = Config::get('DB_USER');
        $password = Config::get('DB_PASSWORD');

        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $host, $port, $database);

        return new PDO($dsn, $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
}
