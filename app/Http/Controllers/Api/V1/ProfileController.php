<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Return the authenticated user's normalized profile resource. */
/** Frontend mental model: this is the current-user/profile payload used to initialize account UI. */
class ProfileController extends Controller
{
    /** Return the current account with its loaded roles and patient profile. */
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            // The resource controls field names and prevents returning the entire User model accidentally.
            'user' => new UserResource($request->user()->loadMissing(['roles', 'permissions', 'patient'])),
        ]);
    }
}
