<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

/** Render the administrative dashboard shell. */
class AdminDashboardController extends Controller
{
    /** Render the main administrator Inertia page. */
    public function index(): Response
    {
        return Inertia::render('Admin/Dashboard');
    }
}
