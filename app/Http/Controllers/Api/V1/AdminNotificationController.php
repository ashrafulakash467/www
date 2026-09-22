<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AdminNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;

/** List and manage database notifications belonging to the current administrator. */
/** Frontend mental model: methods here supply notification state and handle read/delete actions. */
class AdminNotificationController extends Controller
{
    /** Sync, filter, and paginate notifications for the current administrator. */
    public function index(Request $request, AdminNotificationService $service): JsonResponse
    {
        /** @var User $admin */
        $admin = $request->user();

        // Materialize notifications from current system activity before filtering them.
        $service->sync($admin);

        // Query-string inputs are normalized before being applied to the database query builder.
        $filter = $request->string('filter', 'all')->lower()->toString();
        $search = trim($request->string('search')->toString());
        $query = $admin->notifications()->whereNull('data->deleted_at');

        // These conditions progressively modify $query, similar to building URLSearchParams in steps.
        if ($filter === 'unread') $query->whereNull('read_at');
        if ($filter === 'read') $query->whereNotNull('read_at');
        if ($search !== '') {
            $query->where(fn ($builder) => $builder
                ->where('data->title', 'like', "%{$search}%")
                ->orWhere('data->message', 'like', "%{$search}%")
                ->orWhere('data->related_user', 'like', "%{$search}%")
                ->orWhere('data->type', 'like', "%{$search}%"));
        }

        // Pagination sends only one page plus metadata, avoiding a very large frontend payload.
        $notifications = $query->latest()->paginate(min(max($request->integer('per_page', 20), 1), 100));

        return response()->json([
            'success' => true,
            'data' => $notifications->getCollection()->map(fn (DatabaseNotification $notification) => $this->format($notification))->values(),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
                'unread' => $admin->notifications()->whereNull('data->deleted_at')->whereNull('read_at')->count(),
            ],
        ]);
    }

    /** Mark a single owned notification as read. */
    public function markRead(Request $request, string $notificationId): JsonResponse
    {
        $notification = $this->find($request, $notificationId);
        // markAsRead updates Laravel's standard read_at timestamp.
        $notification->markAsRead();

        return response()->json(['success' => true, 'data' => $this->format($notification->fresh())]);
    }

    /** Mark every visible notification for the administrator as read. */
    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications()->whereNull('data->deleted_at')->update(['read_at' => now()]);

        return response()->json(['success' => true, 'message' => 'All notifications marked as read.']);
    }

    /** Soft-hide a notification while retaining its audit history. */
    public function destroy(Request $request, string $notificationId): JsonResponse
    {
        $notification = $this->find($request, $notificationId);
        // Keep the database notification for audit history and hide it with metadata.
        $data = $notification->data;
        $data['deleted_at'] = now()->toISOString();
        // forceFill changes the JSON payload, while save() executes the database UPDATE.
        $notification->forceFill(['data' => $data])->save();

        return response()->json(['success' => true, 'message' => 'Notification deleted.']);
    }

    /** Find a notification through the current user's relationship for ownership safety. */
    private function find(Request $request, string $notificationId): DatabaseNotification
    {
        return $request->user()->notifications()->whereKey($notificationId)->firstOrFail();
    }

    /** Convert Laravel's notification model into the frontend response shape. */
    private function format(DatabaseNotification $notification): array
    {
        $data = $notification->data;

        return [
            'id' => $notification->id,
            'title' => $data['title'] ?? 'System notification',
            'message' => $data['message'] ?? '',
            'type' => $data['type'] ?? 'system',
            'relatedUser' => $data['related_user'] ?? 'System',
            'relatedType' => $data['related_type'] ?? null,
            'relatedId' => $data['related_id'] ?? null,
            'relatedTab' => $data['related_tab'] ?? null,
            'isRead' => $notification->read_at !== null,
            'readAt' => $notification->read_at?->toISOString(),
            'createdAt' => $notification->created_at?->toISOString(),
        ];
    }
}
