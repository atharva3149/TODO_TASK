<?php

declare(strict_types=1);

namespace App;

use App\Config\Database;
use App\Controllers\TaskController;
use App\Http\JsonResponse;
use App\Middleware\AuthMiddleware;
use App\Models\Task;
use Throwable;

final class Router
{
    public static function dispatch(): never
    {
        try {
            $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
            $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
            $path = rtrim($path, '/') ?: '/';

            if ($path === '/health' && $method === 'GET') {
                Database::connection()->query('SELECT 1');
                JsonResponse::send(['status' => 'ok']);
            }

            $auth = AuthMiddleware::authenticate();
            $controller = new TaskController(new Task(Database::connection()));

            if ($path === '/tasks' && $method === 'GET') {
                $controller->index($auth);
            }
            if ($path === '/tasks' && $method === 'POST') {
                $controller->store($auth);
            }
            if (preg_match('#^/tasks/(\d+)$#', $path, $matches) === 1) {
                $id = (int) $matches[1];
                if ($method === 'PUT' || $method === 'PATCH') {
                    $controller->update($auth, $id);
                }
                if ($method === 'DELETE') {
                    $controller->destroy($auth, $id);
                }
            }

            JsonResponse::send(['error' => 'Route not found'], 404);
        } catch (Throwable $error) {
            error_log((string) $error);
            JsonResponse::send(['error' => 'An unexpected server error occurred'], 500);
        }
    }
}
