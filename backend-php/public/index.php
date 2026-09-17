<?php

declare(strict_types=1);

require dirname(__DIR__) . '/vendor/autoload.php';

use App\Config\Config;
use App\Router;

Config::load();
Router::dispatch();
