<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use Illuminate\Http\JsonResponse;

class DepartmentController extends Controller
{
    public function index(): JsonResponse
    {
        $departments = Doctor::query()
            ->selectRaw('specialty as name, COUNT(*) as doctors_count')
            ->where('status', 'active')
            ->where('verification_status', 'approved')
            ->whereNotNull('specialty')
            ->groupBy('specialty')
            ->orderBy('specialty')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Departments retrieved successfully.',
            'data' => $departments,
        ]);
    }
}
