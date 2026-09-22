<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use Illuminate\Http\JsonResponse;

/** Group active, approved doctors into specialty-based departments. */
/** Frontend mental model: one database aggregation becomes the department-card collection. */
class DepartmentController extends Controller
{
    /** Return specialties with the number of active, approved doctors in each. */
    public function index(): JsonResponse
    {
        // selectRaw + COUNT performs grouping in SQL rather than counting doctors in JavaScript/PHP.
        $departments = Doctor::query()
            ->selectRaw('specialty as name, COUNT(*) as doctors_count')
            ->where('status', 'active')
            ->where('verification_status', 'approved')
            ->whereNotNull('specialty')
            // One result row is produced for each unique specialty.
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
